-- Comments on posts, Facebook-style: anyone can read, members can write,
-- one level of replies. Comments get the same protection as posts: flag
-- words go to review, reports auto-hide, and contact details are blocked
-- so the "members only" contact rule can't be bypassed in public comments.

create type public.comment_status as enum ('active', 'pending_review', 'hidden', 'removed');

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status public.comment_status not null default 'active',
  flagged_terms text[] not null default '{}',
  notified_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id) where parent_id is not null;
create index comments_author_idx on public.comments (author_id, created_at desc);
create index comments_status_idx on public.comments (status) where status <> 'active';

-- True when the text contains a phone number, email address or link.
create or replace function public.has_contact_details(p_text text)
returns boolean
language sql immutable set search_path = ''
as $$
  select p_text ~ '\d([\s.()/-]*\d){6,}'
      or p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or p_text ~* '(https?://|www\.|wa\.me|t\.me/|\m[a-z0-9-]+\.(com|net|org|ph|bh|me|ly|io|co)\M)';
$$;

create or replace function public.enforce_comment_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_author public.profiles;
  v_post public.posts;
  v_parent public.comments;
  v_recent int;
  v_limit int;
  v_flags text[];
begin
  select * into v_post from public.posts where id = new.post_id;

  if tg_op = 'INSERT' then
    select * into v_author from public.profiles where id = new.author_id;
    if v_author.is_banned then
      raise exception 'Your account is banned.';
    end if;
    if v_post.status is distinct from 'active' then
      raise exception 'Comments are closed on this post.';
    end if;
    if exists (select 1 from public.blocks where blocker_id = v_post.author_id and blocked_id = new.author_id) then
      raise exception 'You cannot comment on this post.';
    end if;

    -- Replies stay one level deep, like Facebook: a reply to a reply joins
    -- the same thread.
    if new.parent_id is not null then
      select * into v_parent from public.comments where id = new.parent_id;
      if v_parent.id is null or v_parent.post_id <> new.post_id then
        raise exception 'That comment no longer exists.';
      end if;
      if v_parent.parent_id is not null then
        new.parent_id := v_parent.parent_id;
      end if;
    end if;

    select count(*) into v_recent from public.comments
    where author_id = new.author_id and created_at > now() - interval '1 hour';
    v_limit := case when v_author.created_at > now() - interval '7 days' then 10 else 60 end;
    if v_recent >= v_limit then
      raise exception 'You are commenting very fast. Please wait a while and try again.';
    end if;
  end if;

  if tg_op = 'INSERT' or new.body is distinct from old.body then
    if public.has_contact_details(new.body) then
      raise exception 'Please don''t put phone numbers, emails or links in comments. Everyone can read them. Use the Contact button on the post instead.';
    end if;
    v_flags := public.matched_flag_terms(v_post.kind, new.body);
    new.flagged_terms := v_flags;
    if array_length(v_flags, 1) > 0 and not public.is_staff() then
      new.status := 'pending_review';
    end if;
    if tg_op = 'UPDATE' then
      new.edited_at := now();
    end if;
  end if;

  -- pg_trigger_depth() > 1: status set by the database's own rules (auto-hide).
  if tg_op = 'UPDATE' and new.status is distinct from old.status and not public.is_staff()
     and pg_trigger_depth() = 1
     and not (new.status = 'pending_review' and array_length(new.flagged_terms, 1) > 0
              and old.status in ('active', 'pending_review')) then
    raise exception 'You cannot change this comment''s status.';
  end if;
  return new;
end;
$$;

create trigger comments_enforce_rules
  before insert or update on public.comments
  for each row execute function public.enforce_comment_rules();

-- Fix: auto-hide after reports was refused when the third reporter was an
-- ordinary member, because the "members can't change status" rule saw the
-- reporter as the one changing the post. Changes made by the database's own
-- triggers are now allowed through.
create or replace function public.enforce_post_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_author public.profiles;
  v_recent int;
  v_active_jobs int;
  v_flags text[];
  v_category_kind public.post_kind;
begin
  if tg_op = 'INSERT' then
    select * into v_author from public.profiles where id = new.author_id;
    if v_author.is_banned then
      raise exception 'Your account is banned.';
    end if;

    select kind into v_category_kind from public.categories where slug = new.category;
    if v_category_kind is distinct from new.kind then
      raise exception 'That category does not match the post type.';
    end if;

    if v_author.created_at > now() - interval '7 days' and v_author.role = 'member' then
      select count(*) into v_recent from public.posts
      where author_id = new.author_id and created_at > now() - interval '7 days';
      if v_recent >= 3 then
        raise exception 'New accounts can make up to 3 posts in their first 7 days. Please try again later.';
      end if;
    end if;
  end if;

  -- Job posts: category and job type must agree.
  if new.kind = 'job' and new.category <> replace(new.job_type::text, '_', '-') then
    raise exception 'That category does not match the job type.';
  end if;

  if new.kind = 'job' and new.status in ('active', 'pending_review')
     and (tg_op = 'INSERT' or old.status not in ('active', 'pending_review')) then
    select count(*) into v_active_jobs from public.posts
    where author_id = new.author_id and kind = 'job'
      and status in ('active', 'pending_review') and id <> new.id;
    if v_active_jobs >= 2 then
      raise exception 'You can have up to 2 active job posts. Close one first.';
    end if;
  end if;

  -- Re-check flag words on every insert and every edit of the text,
  -- so a post cannot be approved and then edited into something else.
  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.description is distinct from old.description then
    v_flags := public.matched_flag_terms(new.kind, new.title || ' ' || new.description);
    new.flagged_terms := v_flags;
    if array_length(v_flags, 1) > 0 and not public.is_staff() then
      new.status := 'pending_review';
    end if;
  end if;

  -- Members may only close or re-open their own post. Every other status
  -- change goes through the admin functions or the database's own rules
  -- (pg_trigger_depth() > 1: e.g. auto-hide after reports), which members
  -- cannot trigger directly.
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and not public.is_staff()
     and pg_trigger_depth() = 1
     and not (old.status = 'active' and new.status = 'closed')
     and not (old.status = 'closed' and new.status = 'active')
     and not (new.status = 'pending_review' and array_length(new.flagged_terms, 1) > 0
              and old.status in ('active', 'closed', 'pending_review')) then
    raise exception 'You cannot change this post''s status.';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications for comments and replies
-- ---------------------------------------------------------------------------

alter table public.notifications add column comment_id uuid references public.comments (id) on delete cascade;
alter table public.notifications drop constraint notifications_reason_check;
alter table public.notifications add constraint notifications_reason_check
  check (reason in ('followed_member', 'followed_category', 'saved_search', 'comment', 'reply'));
-- One "new post" notification per post, but any number of comment ones.
alter table public.notifications drop constraint notifications_user_id_post_id_key;
create unique index notifications_post_once on public.notifications (user_id, post_id) where comment_id is null;
create unique index notifications_comment_once on public.notifications (user_id, comment_id) where comment_id is not null;

-- Same as before, with the conflict target matching the new partial index.
create or replace function public.fan_out_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status <> 'active' or new.notified_at is not null then
    return null;
  end if;

  insert into public.notifications (user_id, post_id, reason)
  select distinct on (f.follower_id) f.follower_id, new.id,
    case
      when f.followed_user_id is not null then 'followed_member'
      when f.category_slug is not null then 'followed_category'
      else 'saved_search'
    end
  from public.follows f
  join public.profiles fp on fp.id = f.follower_id and not fp.is_banned
  where f.follower_id <> new.author_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = new.author_id and b.blocked_id = f.follower_id)
         or (b.blocker_id = f.follower_id and b.blocked_id = new.author_id)
    )
    and (
      f.followed_user_id = new.author_id
      or f.category_slug = new.category
      or (
        f.search_query is not null
        and (f.search_kind is null or f.search_kind = new.kind)
        and new.search @@ public.build_search_query(f.search_query)
      )
    )
  order by f.follower_id,
    case when f.followed_user_id is not null then 0 when f.category_slug is not null then 1 else 2 end
  on conflict (user_id, post_id) where comment_id is null do nothing;

  update public.posts set notified_at = now() where id = new.id;
  return null;
end;
$$;

-- When a comment goes live (immediately, or after a moderator approves it),
-- tell the post owner, and the person being replied to.
create or replace function public.notify_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_post_author uuid;
  v_parent_author uuid;
begin
  if new.status <> 'active' or new.notified_at is not null then
    return null;
  end if;
  select author_id into v_post_author from public.posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
  end if;

  insert into public.notifications (user_id, post_id, comment_id, reason)
  select t.user_id, new.post_id, new.id, t.reason
  from (values (v_parent_author, 'reply'), (v_post_author, 'comment')) as t (user_id, reason)
  join public.profiles p on p.id = t.user_id and not p.is_banned
  where t.user_id is not null and t.user_id <> new.author_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = t.user_id and b.blocked_id = new.author_id)
         or (b.blocker_id = new.author_id and b.blocked_id = t.user_id)
    )
  on conflict (user_id, comment_id) where comment_id is not null do nothing;

  update public.comments set notified_at = now() where id = new.id;
  return null;
end;
$$;

create trigger comments_notify
  after insert or update of status on public.comments
  for each row execute function public.notify_comment();

-- ---------------------------------------------------------------------------
-- Reports on comments
-- ---------------------------------------------------------------------------

alter table public.reports add column comment_id uuid references public.comments (id) on delete cascade;
alter table public.reports drop constraint reports_check;
alter table public.reports add constraint reports_one_target
  check (num_nonnulls(post_id, profile_id, comment_id) = 1);
create unique index reports_comment_once on public.reports (reporter_id, comment_id) where comment_id is not null;

create or replace function public.enforce_report_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.post_id is not null
     and (select author_id from public.posts where id = new.post_id) = new.reporter_id then
    raise exception 'You cannot report your own post.';
  end if;
  if new.comment_id is not null
     and (select author_id from public.comments where id = new.comment_id) = new.reporter_id then
    raise exception 'You cannot report your own comment.';
  end if;
  if new.profile_id = new.reporter_id then
    raise exception 'You cannot report yourself.';
  end if;
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You have sent a lot of reports today. Please try again tomorrow.';
  end if;
  return new;
end;
$$;

create or replace function public.auto_hide_reported_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  if new.post_id is null and new.comment_id is null then
    return null;
  end if;
  select count(distinct r.reporter_id) into v_count
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  where r.status = 'open'
    and (r.post_id = new.post_id or r.comment_id = new.comment_id)
    and (rp.is_verified or rp.created_at <= now() - interval '3 days');
  if v_count >= 3 then
    if new.post_id is not null then
      update public.posts set status = 'hidden' where id = new.post_id and status = 'active';
    else
      update public.comments set status = 'hidden' where id = new.comment_id and status = 'active';
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.admin_set_comment_status(p_comment uuid, p_status public.comment_status, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_staff();
  update public.comments set status = p_status where id = p_comment;
  if not found then
    raise exception 'Comment not found.';
  end if;
  if p_status in ('active', 'removed') then
    update public.reports
    set status = case when p_status = 'active' then 'dismissed'::public.report_status else 'actioned' end,
        resolved_by = auth.uid(), resolved_at = now()
    where comment_id = p_comment and status = 'open';
  end if;
  insert into public.admin_actions (admin_id, action, target_post_id, note)
  select auth.uid(), 'comment_' || p_status::text, c.post_id, p_note
  from public.comments c where c.id = p_comment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

alter table public.comments enable row level security;

-- Anyone can read live comments on posts they can see. Authors see their
-- own comments waiting for review; staff see everything.
create policy comments_select on public.comments for select
  using (
    author_id = auth.uid()
    or public.is_staff()
    or (
      status = 'active'
      and exists (select 1 from public.posts p where p.id = post_id)
      and not public.is_blocked_by(author_id)
      and exists (select 1 from public.profiles a where a.id = author_id and not a.is_banned)
    )
  );
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_member());
create policy comments_update_own on public.comments for update to authenticated
  using (author_id = auth.uid() and public.is_active_member())
  with check (author_id = auth.uid());
-- Delete: the comment's author, the post's owner, or a moderator.
create policy comments_delete on public.comments for delete to authenticated
  using (
    author_id = auth.uid()
    or public.is_staff()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (id, post_id, author_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

revoke insert on public.reports from authenticated;
grant insert (reporter_id, post_id, profile_id, comment_id, reason, details) on public.reports to authenticated;

revoke execute on function public.has_contact_details, public.enforce_comment_rules,
  public.notify_comment, public.admin_set_comment_status
  from public, anon, authenticated;
grant execute on function public.admin_set_comment_status to authenticated;
