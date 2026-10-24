-- Kabayan Events, part 2. Events are posts (kind = 'event'), so they get
-- comments, reports, photos, follows, search and the review queue for free.
-- Rules: free or pay-at-the-door only (no "pay first to reserve"), no
-- political events, and a reminder not to publish private home addresses.

alter table public.posts
  add column event_starts_at timestamptz,
  add column event_ends_at timestamptz,
  add column venue text check (venue is null or char_length(trim(venue)) between 2 and 120),
  add column map_url text check (
    map_url is null
    or map_url ~* '^https://((www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl/maps)/'
  ),
  add constraint event_fields check (
    kind <> 'event' or (
      event_starts_at is not null and venue is not null and job_type is null
      and price_type in ('free', 'fixed')
      and (price_type <> 'fixed' or price_bhd is not null)
      and (event_ends_at is null or event_ends_at > event_starts_at)
    )
  ),
  add constraint event_fields_only_on_events check (
    kind = 'event' or (event_starts_at is null and event_ends_at is null and venue is null and map_url is null)
  );

create index posts_event_starts_idx on public.posts (event_starts_at) where kind = 'event';

insert into public.categories (slug, name, kind, sort_order) values
  ('community',         'Community & Socials',  'event', 10),
  ('sports',            'Sports',               'event', 20),
  ('faith',             'Church & Faith',       'event', 30),
  ('workshops-charity', 'Workshops & Charity',  'event', 40);

insert into public.flag_terms (term, applies_to) values
  ('registration fee', 'event'),
  ('reservation fee', 'event'),
  ('reserve your slot', 'event'),
  ('deposit', 'event'),
  ('pay in advance', 'event'),
  ('advance payment', 'event'),
  ('downpayment', 'event'),
  ('down payment', 'event'),
  ('gcash', 'event'),
  ('benefit pay', 'event'),
  ('rally', 'event'),
  ('protest', 'event'),
  ('election', 'event'),
  ('campaign', 'event')
on conflict (term) do nothing;

insert into public.synonym_groups (terms) values
  ('{event,events,party,gathering,salu-salo,handaan,celebration}'),
  ('{"simbang gabi",misa,mass,church,simbahan}'),
  ('{liga,league,basketball,tournament}'),
  ('{seminar,workshop,training}');

-- ---------------------------------------------------------------------------
-- Post rules, now with event checks
-- ---------------------------------------------------------------------------

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

  -- Events: start in the future (when created or when the time changes),
  -- and within a year.
  if new.kind = 'event'
     and (tg_op = 'INSERT' or new.event_starts_at is distinct from old.event_starts_at) then
    if new.event_starts_at < now() then
      raise exception 'The event date and time must be in the future.';
    end if;
    if new.event_starts_at > now() + interval '1 year' then
      raise exception 'Events can be posted up to a year ahead.';
    end if;
  end if;
  if new.kind = 'event' and new.event_ends_at > new.event_starts_at + interval '7 days' then
    raise exception 'An event can last up to 7 days.';
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
     or new.description is distinct from old.description
     or new.venue is distinct from old.venue then
    v_flags := public.matched_flag_terms(new.kind, new.title || ' ' || new.description || ' ' || coalesce(new.venue, ''));
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
     and not (old.status = 'closed' and new.status = 'active' and new.kind <> 'event')
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
-- Going / Interested
-- ---------------------------------------------------------------------------

create table public.event_rsvps (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  status text not null check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index event_rsvps_post_idx on public.event_rsvps (post_id);

create or replace function public.enforce_rsvp_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.posts
    where id = new.post_id and kind = 'event' and status = 'active'
      and coalesce(event_ends_at, event_starts_at) > now()
  ) then
    raise exception 'This event is no longer open.';
  end if;
  return new;
end;
$$;

create trigger event_rsvps_rules
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_rsvp_rules();

-- Who is going is private (it can reveal where someone will be).
-- Everyone sees the counts; each member sees only their own answer.
create or replace function public.event_rsvp_counts(p_post_ids uuid[])
returns table (post_id uuid, going int, interested int)
language sql stable security definer set search_path = ''
as $$
  select r.post_id,
    count(*) filter (where r.status = 'going')::int,
    count(*) filter (where r.status = 'interested')::int
  from public.event_rsvps r
  join public.profiles p on p.id = r.user_id and not p.is_banned
  where r.post_id = any (p_post_ids)
  group by r.post_id;
$$;

-- ---------------------------------------------------------------------------
-- Notifications: event changed or cancelled
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_reason_check;
alter table public.notifications add constraint notifications_reason_check
  check (reason in ('followed_member', 'followed_category', 'saved_search', 'comment', 'reply',
                    'also_commented', 'event_updated', 'event_cancelled'));

-- A post can now have several kinds of notification for the same person
-- (new post, then "time changed"), but only one of each kind.
drop index public.notifications_post_once;
create unique index notifications_post_once on public.notifications (user_id, post_id, reason) where comment_id is null;

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
  on conflict (user_id, post_id, reason) where comment_id is null do nothing;

  update public.posts set notified_at = now() where id = new.id;
  return null;
end;
$$;

-- Tell everyone who is going or interested when the time or place changes,
-- or when the event is cancelled. Repeated changes bring the same
-- notification back to the top instead of piling up.
create or replace function public.notify_event_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text;
begin
  if new.kind <> 'event' then
    return null;
  end if;
  if old.status = 'active' and new.status in ('closed', 'removed') then
    v_reason := 'event_cancelled';
  elsif new.status = 'active' and old.status = 'active' and (
    new.event_starts_at is distinct from old.event_starts_at
    or new.event_ends_at is distinct from old.event_ends_at
    or new.venue is distinct from old.venue
    or new.area is distinct from old.area
    or new.map_url is distinct from old.map_url
  ) then
    v_reason := 'event_updated';
  else
    return null;
  end if;

  insert into public.notifications (user_id, post_id, reason)
  select r.user_id, new.id, v_reason
  from public.event_rsvps r
  join public.profiles p on p.id = r.user_id and not p.is_banned
  where r.post_id = new.id and r.user_id <> new.author_id
  on conflict (user_id, post_id, reason) where comment_id is null
  do update set created_at = now(), read_at = null;
  return null;
end;
$$;

create trigger posts_notify_event_change
  after update on public.posts
  for each row execute function public.notify_event_change();

-- ---------------------------------------------------------------------------
-- Search: events list soonest first, and past events drop off
-- ---------------------------------------------------------------------------

create or replace function public.search_posts(
  p_query text default null,
  p_kind public.post_kind default null,
  p_category text default null,
  p_area text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_verified_only boolean default false,
  p_limit int default 24,
  p_offset int default 0
)
returns setof public.posts
language sql stable set search_path = ''
as $$
  with q as (
    select
      nullif(trim(coalesce(p_query, '')), '') as raw,
      public.build_search_query(p_query) as tsq
  )
  select p.*
  from public.posts p
  join public.profiles a on a.id = p.author_id
  cross join q
  where p.status = 'active'
    and (p_kind is null or p.kind = p_kind)
    and (p.kind <> 'event' or coalesce(p.event_ends_at, p.event_starts_at + interval '4 hours') > now())
    and (p_category is null or p.category = p_category)
    and (p_area is null or p.area ilike p_area)
    and (p_min_price is null or p.price_bhd >= p_min_price)
    and (p_max_price is null or p.price_bhd <= p_max_price or p.price_type = 'free')
    and (not p_verified_only or a.is_verified)
    and (
      q.raw is null
      or (q.tsq is not null and p.search @@ q.tsq)
      or extensions.word_similarity(lower(q.raw), lower(p.title)) >= 0.5
    )
  order by
    case when q.raw is null then 0
      else coalesce(ts_rank(p.search, q.tsq), 0)
         + extensions.word_similarity(lower(q.raw), lower(p.title))
    end desc,
    case when p_kind = 'event' then p.event_starts_at end asc nulls last,
    p.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

-- Cancelled events stay viewable (marked as cancelled), so the people who
-- were going can open the "cancelled" notification. Closed listings and
-- jobs stay hidden as before.
drop policy posts_select on public.posts;
create policy posts_select on public.posts for select
  using (
    author_id = auth.uid()
    or public.is_staff()
    or (
      (status = 'active' or (status = 'closed' and kind = 'event'))
      and not public.is_blocked_by(author_id)
      and exists (select 1 from public.profiles a where a.id = author_id and not a.is_banned)
    )
  );

alter table public.event_rsvps enable row level security;
create policy event_rsvps_own on public.event_rsvps for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_active_member());
revoke all on public.event_rsvps from anon, authenticated;
grant select, insert, update, delete on public.event_rsvps to authenticated;

grant insert (event_starts_at, event_ends_at, venue, map_url) on public.posts to authenticated;
grant update (event_starts_at, event_ends_at, venue, map_url) on public.posts to authenticated;

revoke execute on function public.enforce_rsvp_rules, public.notify_event_change from public, anon, authenticated;
revoke execute on function public.event_rsvp_counts from public;
grant execute on function public.event_rsvp_counts to anon, authenticated;
grant execute on function public.search_posts to anon, authenticated;
