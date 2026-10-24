-- Kabayan Events, part 1. Run this on its own, before part 2: Postgres
-- needs the new type value saved before other statements can use it.
alter type public.post_kind add value if not exists 'event';
