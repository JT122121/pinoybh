-- Older Supabase projects (created before 30 May 2026) grant everything in
-- public to the API roles by default. The migration must be just as strict
-- on those projects, so the tests run once with and once without this file.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
