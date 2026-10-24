-- Site visits: a simple daily counter for the admin dashboard.
--
-- Counts page views per day (Bahrain time) and page. Nothing about the visitor
-- is stored: no IP address, no cookie, no account. The browser only remembers
-- the last day it was counted, to tell a new visitor from a returning page view.

create table public.site_visits (
  day date not null,
  path text not null,
  views integer not null default 0,
  -- Visitors whose first page that day was this one. Summed over a day's
  -- pages, this is the number of visitors that day.
  visitors integer not null default 0,
  primary key (day, path)
);

alter table public.site_visits enable row level security;

create policy site_visits_select on public.site_visits
  for select to authenticated using (public.is_staff());

-- Called by every page view (logged in or not). Only known page shapes are
-- counted, and a day holds at most 2,000 pages, so nobody can fill the table
-- with junk. Anything past that is counted under '(other)'.
create or replace function public.record_visit(p_path text, p_new_visitor boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Bahrain')::date;
  v_path text := lower(coalesce(p_path, ''));
begin
  if v_path !~ '^/([a-z0-9-]+(/[a-z0-9-]+)*)?$' or length(v_path) > 120 then
    return;
  end if;
  if v_path like '/admin%' or v_path like '/auth/%' then
    return;
  end if;
  if not exists (select 1 from public.site_visits where day = v_day and path = v_path)
     and (select count(*) from public.site_visits where day = v_day) >= 2000 then
    v_path := '(other)';
  end if;
  insert into public.site_visits as s (day, path, views, visitors)
  values (v_day, v_path, 1, case when p_new_visitor then 1 else 0 end)
  on conflict (day, path) do update
    set views = s.views + 1, visitors = s.visitors + excluded.visitors;
end;
$$;

-- Daily totals for the last p_days days, including days with no visits.
-- Runs as the caller, so only staff see numbers.
create or replace function public.visit_totals(p_days integer)
returns table (day date, views bigint, visitors bigint)
language sql stable set search_path = ''
as $$
  select d::date, coalesce(sum(v.views), 0), coalesce(sum(v.visitors), 0)
  from generate_series(
    (now() at time zone 'Asia/Bahrain')::date - (least(greatest(p_days, 1), 366) - 1),
    (now() at time zone 'Asia/Bahrain')::date,
    interval '1 day') as d
  left join public.site_visits v on v.day = d::date
  group by d
  order by d;
$$;

-- Most viewed pages over the last p_days days.
create or replace function public.top_pages(p_days integer, p_limit integer default 10)
returns table (path text, views bigint, visitors bigint)
language sql stable set search_path = ''
as $$
  select path, sum(views), sum(visitors)
  from public.site_visits
  where day > (now() at time zone 'Asia/Bahrain')::date - least(greatest(p_days, 1), 366)
  group by path
  order by sum(views) desc, path
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on public.site_visits from anon, authenticated;
grant select on public.site_visits to authenticated;

revoke execute on function public.record_visit, public.visit_totals, public.top_pages from public, anon;
grant execute on function public.record_visit to anon, authenticated;
grant execute on function public.visit_totals, public.top_pages to authenticated;
