-- Posting limits raised: new accounts can make 6 posts in their first 7 days
-- (was 3), and members can have 6 live job posts at a time (was 2).
-- Same function as before otherwise.

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
      if v_recent >= 6 then
        raise exception 'New accounts can make up to 6 posts in their first 7 days. Please try again later.';
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
    if v_active_jobs >= 6 then
      raise exception 'You can have up to 6 active job posts. Close one first.';
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
