-- PinoyBH v1 schema.
-- Trust & safety rules from SPEC.md are enforced here, in the database,
-- so they hold no matter which client talks to Supabase.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('member', 'moderator', 'admin');
create type public.post_kind as enum ('listing', 'job');
create type public.job_type as enum ('looking_for_work', 'referral', 'household');
create type public.post_status as enum ('active', 'pending_review', 'hidden', 'removed', 'closed');
create type public.price_type as enum ('fixed', 'negotiable', 'free');
create type public.contact_method as enum ('whatsapp', 'phone', 'email');
create type public.report_reason as enum ('scam', 'spam', 'illegal_item', 'fake_job', 'not_community', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'revoked');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  area text check (area is null or char_length(area) <= 40),
  bio text check (bio is null or char_length(bio) <= 300),
  avatar_path text,
  role public.user_role not null default 'member',
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  -- Only the agreement is stored. No nationality field (Bahrain PDPL).
  rules_agreed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin') and not is_banned
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_banned);
$$;

-- Sign-up: the community checkbox is enforced here, not only in the form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((new.raw_user_meta_data ->> 'rules_agreed')::boolean, false) is not true then
    raise exception 'You must confirm you are part of the Filipino community in Bahrain and agree to the community rules.';
  end if;

  insert into public.profiles (id, display_name, area, rules_agreed_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Kabayan'),
    nullif(trim(new.raw_user_meta_data ->> 'area'), ''),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

create table public.categories (
  slug text primary key,
  name text not null,
  kind public.post_kind not null,
  sort_order int not null default 0
);

insert into public.categories (slug, name, kind, sort_order) values
  ('electronics',      'Electronics & Phones',         'listing', 10),
  ('furniture',        'Furniture & Appliances',       'listing', 20),
  ('clothes',          'Clothes & Shoes',              'listing', 30),
  ('baby-kids',        'Baby & Kids',                  'listing', 40),
  ('vehicles',         'Cars & Vehicles',              'listing', 50),
  ('filipino-food',    'Filipino Food & Pasalubong',   'listing', 60),
  ('housing',          'Housing & Bedspace',           'listing', 70),
  ('box-sharing',      'Balikbayan Box Sharing',       'listing', 80),
  ('free',             'Free / Giveaway',              'listing', 90),
  ('lost-found',       'Lost & Found',                 'listing', 100),
  ('other',            'Other Items',                  'listing', 110),
  ('looking-for-work', 'Looking for Work',             'job',     10),
  ('referral',         'Job Referrals',                'job',     20),
  ('household',        'Household Hiring',             'job',     30);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.post_kind not null,
  category text not null references public.categories (slug),
  job_type public.job_type,
  title text not null check (char_length(trim(title)) between 5 and 100),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  price_type public.price_type,
  price_bhd numeric(10, 3) check (price_bhd is null or price_bhd >= 0),
  area text check (area is null or char_length(area) <= 40),
  reference_url text check (reference_url is null or reference_url ~* '^https?://'),
  own_post_confirmed boolean not null default false,
  sponsorship_confirmed boolean not null default false,
  status public.post_status not null default 'active',
  flagged_terms text[] not null default '{}',
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,

  constraint listing_fields check (
    kind <> 'listing' or (job_type is null and price_type is not null
      and (price_type <> 'fixed' or price_bhd is not null))
  ),
  constraint job_fields check (
    kind <> 'job' or (job_type is not null and own_post_confirmed)
  ),
  constraint referral_needs_link check (
    job_type is distinct from 'referral' or reference_url is not null
  ),
  constraint household_needs_sponsorship check (
    job_type is distinct from 'household' or sponsorship_confirmed
  )
);

create index posts_status_created_idx on public.posts (status, created_at desc);
create index posts_author_idx on public.posts (author_id);
create index posts_category_idx on public.posts (category);
create index posts_search_idx on public.posts using gin (search);
create index posts_title_trgm_idx on public.posts using gin (title extensions.gin_trgm_ops);

-- Contact details live in their own table so that RLS can hide them from
-- logged-out visitors while the post itself stays public.
create table public.post_contacts (
  post_id uuid primary key references public.posts (id) on delete cascade,
  method public.contact_method not null,
  value text not null check (char_length(trim(value)) between 3 and 100)
);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index post_photos_post_idx on public.post_photos (post_id, position);

-- Words that send a post to the review queue. Admins can edit this list.
create table public.flag_terms (
  term text primary key check (term = lower(term)),
  applies_to public.post_kind -- null = both
);

insert into public.flag_terms (term, applies_to) values
  ('visa', 'job'),
  ('processing', 'job'),
  ('placement fee', 'job'),
  ('placement', 'job'),
  ('deposit', 'job'),
  ('pay first', null),
  ('agency', 'job'),
  ('agent', 'job'),
  ('recruitment', 'job'),
  ('recruiter', 'job'),
  ('training fee', 'job'),
  ('medical fee', 'job'),
  ('part time maid', 'job'),
  ('part-time maid', 'job'),
  ('part time kasambahay', 'job'),
  ('freelance maid', 'job'),
  ('remittance', 'listing'),
  ('money transfer', 'listing'),
  ('send money', 'listing'),
  ('hand carry', 'listing'),
  ('handcarry', 'listing'),
  ('pa-hand carry', 'listing'),
  ('cpr for sale', 'listing'),
  ('visa for sale', 'listing'),
  ('alcohol', 'listing'),
  ('cargo services', 'listing'),
  ('door to door', 'listing');

create or replace function public.matched_flag_terms(p_kind public.post_kind, p_text text)
returns text[]
language sql stable set search_path = ''
as $$
  select coalesce(array_agg(term order by term), '{}')
  from public.flag_terms
  where (applies_to is null or applies_to = p_kind)
    and lower(p_text) ~ ('\m' || regexp_replace(term, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M');
$$;

-- Limits from SPEC.md section 4.
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
  -- change goes through the admin functions.
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and not public.is_staff()
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

create trigger posts_enforce_rules
  before insert or update on public.posts
  for each row execute function public.enforce_post_rules();

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.post_photos where post_id = new.post_id) >= 6 then
    raise exception 'A post can have up to 6 photos.';
  end if;
  return new;
end;
$$;

create trigger post_photos_limit
  before insert on public.post_photos
  for each row execute function public.enforce_photo_limit();

-- ---------------------------------------------------------------------------
-- Blocks and follows
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_by(p_author uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks where blocker_id = p_author and blocked_id = auth.uid()
  );
$$;

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_user_id uuid references public.profiles (id) on delete cascade,
  category_slug text references public.categories (slug) on delete cascade,
  search_query text check (search_query is null or char_length(trim(search_query)) between 2 and 80),
  search_kind public.post_kind,
  created_at timestamptz not null default now(),
  check (num_nonnulls(followed_user_id, category_slug, search_query) = 1),
  check (followed_user_id is distinct from follower_id)
);

create unique index follows_member_uniq on public.follows (follower_id, followed_user_id) where followed_user_id is not null;
create unique index follows_category_uniq on public.follows (follower_id, category_slug) where category_slug is not null;
create unique index follows_search_uniq on public.follows (follower_id, lower(search_query), search_kind) where search_query is not null;
create index follows_followed_user_idx on public.follows (followed_user_id) where followed_user_id is not null;
create index follows_category_idx on public.follows (category_slug) where category_slug is not null;

create or replace function public.enforce_follow_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.follows where follower_id = new.follower_id) >= 200 then
    raise exception 'You can follow up to 200 members, categories and searches.';
  end if;
  if new.followed_user_id is not null and exists (
    select 1 from public.blocks
    where (blocker_id = new.followed_user_id and blocked_id = new.follower_id)
       or (blocker_id = new.follower_id and blocked_id = new.followed_user_id)
  ) then
    raise exception 'You cannot follow this member.';
  end if;
  return new;
end;
$$;

create trigger follows_enforce_rules
  before insert on public.follows
  for each row execute function public.enforce_follow_rules();

-- Blocking removes follows in both directions.
create or replace function public.handle_block()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocked_id and followed_user_id = new.blocker_id)
     or (follower_id = new.blocker_id and followed_user_id = new.blocked_id);
  return new;
end;
$$;

create trigger blocks_remove_follows
  after insert on public.blocks
  for each row execute function public.handle_block();

-- Follower lists are private: a member can see only their own count.
create or replace function public.my_follower_count()
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.follows where followed_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Search (synonyms + spelling tolerance)
-- ---------------------------------------------------------------------------

create table public.synonym_groups (
  id bigint generated always as identity primary key,
  terms text[] not null check (array_length(terms, 1) >= 2),
  created_at timestamptz not null default now()
);

insert into public.synonym_groups (terms) values
  ('{padala,pa-dala,cargo,courier,"balikbayan box",balikbayan,forwarder,box}'),
  ('{pasalubong,gifts,gift,snacks,"filipino food",souvenir}'),
  ('{kasambahay,"kasama sa bahay",helper,housemaid,maid,"domestic worker",katulong}'),
  ('{yaya,nanny,babysitter,"child care"}'),
  ('{bayad,payment,price,fee,sahod,salary}'),
  ('{bedspace,"bed space",room,partition,sharing,kwarto,"room for rent"}'),
  ('{ulam,"lutong bahay","home cooked",viand,food,pagkain}'),
  ('{tsinelas,slippers,sandals}'),
  ('{driver,drayber,chauffeur}'),
  ('{trabaho,work,job,hiring}'),
  ('{damit,clothes,clothing}'),
  ('{sapatos,shoes}'),
  ('{libre,free,giveaway}');

create or replace function public.normalize_term(p text)
returns text
language sql immutable set search_path = ''
as $$
  select trim(regexp_replace(lower(p), '[^a-z0-9ñ\- ]+', ' ', 'g'));
$$;

-- Turns "pasalobong juffair" into
--   (pasalubong | gift | snack | ...) & juffair
-- using synonym groups, with trigram matching so near-misspellings of a
-- known term still expand.
create or replace function public.build_search_query(p_query text)
returns tsquery
language plpgsql stable set search_path = ''
as $$
declare
  v_token text;
  v_word_query tsquery;
  v_alt text;
  v_result tsquery;
begin
  for v_token in
    select t from unnest(string_to_array(public.normalize_term(p_query), ' ')) as t
    where char_length(t) >= 2
  loop
    v_word_query := null;
    for v_alt in
      select distinct alt from (
        select v_token as alt
        union all
        select unnest(g.terms)
        from public.synonym_groups g
        where exists (
          select 1 from unnest(g.terms) term
          where term = v_token
             or (char_length(v_token) >= 4 and extensions.similarity(term, v_token) >= 0.45)
        )
      ) alts
    loop
      if numnode(plainto_tsquery('english', v_alt)) > 0 then
        v_word_query := case
          when v_word_query is null then plainto_tsquery('english', v_alt)
          else v_word_query || plainto_tsquery('english', v_alt)
        end;
      end if;
    end loop;
    if v_word_query is not null then
      v_result := case when v_result is null then v_word_query else v_result && v_word_query end;
    end if;
  end loop;
  return v_result;
end;
$$;

-- Security invoker: RLS on posts still applies to the caller.
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
    p.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Notifications (fan-out when a post goes live)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  reason text not null check (reason in ('followed_member', 'followed_category', 'saved_search')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.fan_out_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Only once, and only when the post is actually visible.
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
  on conflict (user_id, post_id) do nothing;

  update public.posts set notified_at = now() where id = new.id;
  return null;
end;
$$;

create trigger posts_fan_out
  after insert or update of status on public.posts
  for each row execute function public.fan_out_post();

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, profile_id) = 1),
  -- "Other" and "Not part of the community" need an explanation, so the
  -- latter can't be used just because of someone's name or appearance.
  check (reason not in ('other', 'not_community') or char_length(trim(coalesce(details, ''))) >= 10)
);

create unique index reports_post_once on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_profile_once on public.reports (reporter_id, profile_id) where profile_id is not null;
create index reports_open_idx on public.reports (status, created_at);

create or replace function public.enforce_report_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.post_id is not null
     and (select author_id from public.posts where id = new.post_id) = new.reporter_id then
    raise exception 'You cannot report your own post.';
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

create trigger reports_enforce_rules
  before insert on public.reports
  for each row execute function public.enforce_report_rules();

-- Auto-hide after 3 reports. Only reporters whose accounts are at least
-- 3 days old (or verified) count, so a burst of fresh accounts can't take
-- down someone's post.
create or replace function public.auto_hide_reported_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  if new.post_id is null then
    return null;
  end if;
  select count(distinct r.reporter_id) into v_count
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  where r.post_id = new.post_id and r.status = 'open'
    and (rp.is_verified or rp.created_at <= now() - interval '3 days');
  if v_count >= 3 then
    update public.posts set status = 'hidden' where id = new.post_id and status = 'active';
  end if;
  return null;
end;
$$;

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_post();

-- ---------------------------------------------------------------------------
-- Verified Kabayan
-- ---------------------------------------------------------------------------

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  social_url text not null check (social_url ~* '^https://'),
  ph_mobile text check (ph_mobile is null or ph_mobile ~ '^\+639[0-9]{9}$'),
  code text not null default ('KABAYAN-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  status public.verification_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index verification_one_pending on public.verification_requests (user_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Admin action log and admin functions
-- ---------------------------------------------------------------------------

create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_user_id uuid,
  target_post_id uuid,
  target_report_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.require_staff()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only moderators can do this.';
  end if;
end;
$$;

create or replace function public.admin_set_post_status(p_post uuid, p_status public.post_status, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_staff();
  update public.posts set status = p_status where id = p_post;
  if not found then
    raise exception 'Post not found.';
  end if;
  -- Restoring a post clears its open reports, otherwise the next single
  -- report would hide it again. Removing it marks them as actioned.
  if p_status in ('active', 'removed') then
    update public.reports
    set status = case when p_status = 'active' then 'dismissed'::public.report_status else 'actioned' end,
        resolved_by = auth.uid(), resolved_at = now()
    where post_id = p_post and status = 'open';
  end if;
  insert into public.admin_actions (admin_id, action, target_post_id, note)
  values (auth.uid(), 'post_' || p_status::text, p_post, p_note);
end;
$$;

create or replace function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_staff();
  if p_status = 'open' then
    raise exception 'Choose actioned or dismissed.';
  end if;
  update public.reports
  set status = p_status, resolved_by = auth.uid(), resolved_at = now()
  where id = p_report;
  insert into public.admin_actions (admin_id, action, target_report_id, note)
  values (auth.uid(), 'report_' || p_status::text, p_report, p_note);
end;
$$;

create or replace function public.admin_set_ban(p_user uuid, p_banned boolean, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_target_role public.user_role;
begin
  perform public.require_staff();
  if p_user = auth.uid() then
    raise exception 'You cannot ban yourself.';
  end if;
  select role into v_target_role from public.profiles where id = p_user;
  if v_target_role = 'admin'
     or (v_target_role = 'moderator'
         and (select role from public.profiles where id = auth.uid()) <> 'admin') then
    raise exception 'Only an admin can ban a moderator, and admins cannot be banned here.';
  end if;
  if char_length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'Write a short reason.';
  end if;

  update public.profiles
  set is_banned = p_banned, is_verified = case when p_banned then false else is_verified end
  where id = p_user;
  -- Stops new logins and token refreshes. If the project's database role
  -- may not write to auth.users, the ban still holds through RLS and the
  -- app signing banned members out.
  begin
    update auth.users set banned_until = case when p_banned then 'infinity'::timestamptz else null end
    where id = p_user;
  exception when insufficient_privilege then
    null;
  end;

  insert into public.admin_actions (admin_id, action, target_user_id, note)
  values (auth.uid(), case when p_banned then 'ban' else 'unban' end, p_user, p_note);
end;
$$;

create or replace function public.admin_review_verification(p_request uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform public.require_staff();
  update public.verification_requests
  set status = case when p_approve then 'approved'::public.verification_status else 'rejected' end,
      admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request and status = 'pending'
  returning user_id into v_user;
  if v_user is null then
    raise exception 'Request not found or already reviewed.';
  end if;
  if p_approve then
    update public.profiles set is_verified = true where id = v_user;
  end if;
  insert into public.admin_actions (admin_id, action, target_user_id, note)
  values (auth.uid(), case when p_approve then 'verify_approve' else 'verify_reject' end, v_user, p_note);
end;
$$;

create or replace function public.admin_revoke_verification(p_user uuid, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_staff();
  update public.profiles set is_verified = false where id = p_user;
  update public.verification_requests set status = 'revoked'
  where user_id = p_user and status = 'approved';
  insert into public.admin_actions (admin_id, action, target_user_id, note)
  values (auth.uid(), 'verify_revoke', p_user, p_note);
end;
$$;

-- Account deletion. Photos are removed from Storage by the app first.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_contacts enable row level security;
alter table public.post_photos enable row level security;
alter table public.flag_terms enable row level security;
alter table public.blocks enable row level security;
alter table public.follows enable row level security;
alter table public.synonym_groups enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.admin_actions enable row level security;

-- Profiles: public, except banned members (visible to staff).
create policy profiles_select on public.profiles for select
  using (not is_banned or id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and (avatar_path is null or split_part(avatar_path, '/', 1) = id::text));

create policy categories_select on public.categories for select using (true);

-- Posts: active posts are public, minus authors who blocked you or are banned.
create policy posts_select on public.posts for select
  using (
    author_id = auth.uid()
    or public.is_staff()
    or (
      status = 'active'
      and not public.is_blocked_by(author_id)
      and exists (select 1 from public.profiles a where a.id = author_id and not a.is_banned)
    )
  );
create policy posts_insert on public.posts for insert
  with check (author_id = auth.uid() and public.is_active_member());
create policy posts_update_own on public.posts for update
  using (author_id = auth.uid() and public.is_active_member())
  with check (author_id = auth.uid());
create policy posts_delete_own on public.posts for delete
  using (author_id = auth.uid() or public.is_staff());

-- Contacts: logged-in, non-banned members only.
create policy post_contacts_select on public.post_contacts for select to authenticated
  using (
    public.is_active_member()
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy post_contacts_write on public.post_contacts for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy post_photos_select on public.post_photos for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_photos_write on public.post_photos for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    and split_part(path, '/', 1) = auth.uid()::text
  );

create policy flag_terms_staff on public.flag_terms for all
  using (public.is_staff()) with check (public.is_staff());

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Follows: you only ever see your own.
create policy follows_own on public.follows for all to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid() and public.is_active_member());

create policy synonyms_select on public.synonym_groups for select using (true);
create policy synonyms_staff on public.synonym_groups for all
  using (public.is_staff()) with check (public.is_staff());

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_member());
create policy reports_select on public.reports for select
  using (reporter_id = auth.uid() or public.is_staff());

create policy verification_own on public.verification_requests for select
  using (user_id = auth.uid() or public.is_staff());
create policy verification_insert on public.verification_requests for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_member());

create policy admin_actions_staff on public.admin_actions for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
-- Every grant is spelled out instead of relying on Supabase's default
-- privileges, which changed for new projects in 2026 (tables are no longer
-- exposed to the API automatically). Start from nothing, then allow only
-- what the app needs. RLS policies above still decide which rows.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Public reading (logged-out visitors too)
grant select on public.profiles, public.categories, public.posts, public.post_photos,
  public.synonym_groups to anon, authenticated;

-- Members can only edit these profile columns. role / is_verified /
-- is_banned are changed by the admin functions.
grant update (display_name, area, bio, avatar_path) on public.profiles to authenticated;

-- Posts: status, flags and notified_at are set by the database, not members
-- (members may change status only to close or re-open; the trigger checks).
grant insert (id, author_id, kind, category, job_type, title, description, price_type, price_bhd,
              area, reference_url, own_post_confirmed, sponsorship_confirmed)
  on public.posts to authenticated;
grant update (title, description, price_type, price_bhd, area, reference_url,
              own_post_confirmed, sponsorship_confirmed, status)
  on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- Contact details: never visible to logged-out visitors.
grant select, insert, update, delete on public.post_contacts to authenticated;
grant insert, update, delete on public.post_photos to authenticated;

-- Blocks and follows: no updates, so the block check can't be skipped.
grant select, insert, delete on public.blocks, public.follows to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.reports to authenticated;
grant insert (reporter_id, post_id, profile_id, reason, details) on public.reports to authenticated;

grant select on public.verification_requests to authenticated;
grant insert (user_id, social_url, ph_mobile) on public.verification_requests to authenticated;

-- Staff-only tables (RLS limits these to moderators and admins).
grant select, insert, update, delete on public.flag_terms to authenticated;
grant insert, update, delete on public.synonym_groups to authenticated;
grant usage on sequence public.synonym_groups_id_seq to authenticated;
grant select on public.admin_actions to authenticated;

-- Functions used by RLS policies and search.
grant execute on function public.is_staff, public.is_active_member, public.is_blocked_by,
  public.normalize_term, public.build_search_query, public.search_posts
  to anon, authenticated;

-- Member and admin functions. Each admin function checks for staff itself.
grant execute on function public.admin_set_post_status, public.admin_resolve_report,
  public.admin_set_ban, public.admin_review_verification, public.admin_revoke_verification,
  public.delete_my_account, public.my_follower_count
  to authenticated;
-- Trigger functions (handle_new_user, enforce_*, fan_out_post, ...) get no
-- grants: triggers run them without needing execute rights.
