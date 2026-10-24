-- Admins can see members' email addresses (read only) in Admin > Members.
-- Moderators can't: emails stay with the site owner, as the Privacy Policy says.

create or replace function public.admin_member_emails(p_ids uuid[])
returns table (id uuid, email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and role = 'admin' and not is_banned
  ) then
    raise exception 'Only admins can see email addresses';
  end if;
  return query
    select u.id, u.email::text from auth.users u where u.id = any (p_ids[1:200]);
end;
$$;

revoke execute on function public.admin_member_emails from public, anon;
grant execute on function public.admin_member_emails to authenticated;
