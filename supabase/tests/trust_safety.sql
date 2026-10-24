-- Trust & safety tests for SPEC.md. Run with: npm run test:db
\set ON_ERROR_STOP 1

create schema t;
grant usage on schema t to anon, authenticated;

create function t.ok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'TEST FAILED: %', p_label;
  end if;
  raise notice 'ok - %', p_label;
end $$;

create function t.expect_error(p_sql text, p_pattern text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'TEST FAILED: % (no error)', p_label;
exception when others then
  if sqlerrm like 'TEST FAILED%' then raise; end if;
  if sqlerrm !~* p_pattern then
    raise exception 'TEST FAILED: % (got "%")', p_label, sqlerrm;
  end if;
  raise notice 'ok - %', p_label;
end $$;
grant execute on all functions in schema t to anon, authenticated;

-- Users -----------------------------------------------------------------
-- a = admin, b = member, c/d/e = established members, f = brand-new account
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.test', '{"display_name":"Ate Admin","rules_agreed":true}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.test', '{"display_name":"Ben","rules_agreed":true,"area":"Juffair"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.test', '{"display_name":"Cora","rules_agreed":true}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@x.test', '{"display_name":"Dan","rules_agreed":true}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@x.test', '{"display_name":"Eli","rules_agreed":true}'),
  ('00000000-0000-0000-0000-00000000000f', 'f@x.test', '{"display_name":"Fresh","rules_agreed":true}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set created_at = now() - interval '30 days' where id <> '00000000-0000-0000-0000-00000000000f';

select t.expect_error(
  $$insert into auth.users (email, raw_user_meta_data) values ('g@x.test', '{"display_name":"Gus"}')$$,
  'community rules', 'sign-up without the community checkbox is refused');
select t.ok((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Ben',
  'profile is created from sign-up data');
select t.ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name ~* 'nation|filipino|ethnic'),
  'no nationality column is stored');

-- Member: Ben -------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;

select t.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$,
  'permission denied', 'member cannot make themselves admin');
select t.expect_error($$update public.profiles set is_verified = true where id = auth.uid()$$,
  'permission denied', 'member cannot give themselves the badge');
select t.expect_error($$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000c/x.jpg' where id = auth.uid()$$,
  'row-level security', 'member cannot point their avatar at someone else''s file');

insert into public.posts (id, author_id, kind, category, title, description, price_type, area)
values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'listing', 'housing',
        'Bedspace in Juffair for a lady', 'Clean bedspace near the bus stop, wifi included.', 'negotiable', 'Juffair');
insert into public.post_contacts (post_id, method, value)
values ('10000000-0000-0000-0000-000000000001', 'whatsapp', '+97333334444');
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000001') = 'active',
  'a normal listing goes live');

select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type, status)
  values (auth.uid(), 'listing', 'other', 'Sneaky status', 'Trying to set status directly.', 'free', 'active')$$,
  'permission denied', 'member cannot set status on insert');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type)
  values ('00000000-0000-0000-0000-00000000000c', 'listing', 'other', 'Posting as Cora', 'Impersonating another member.', 'free')$$,
  'row-level security', 'member cannot post as someone else');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type)
  values (auth.uid(), 'listing', 'household', 'Wrong category', 'Listing in a job category.', 'free')$$,
  'category does not match', 'listing cannot use a job category');

select t.expect_error($$insert into public.posts (author_id, kind, category, job_type, title, description)
  values (auth.uid(), 'job', 'looking-for-work', 'looking_for_work', 'Need work as cashier', 'Experienced cashier, 5 years.')$$,
  'job_fields', 'job post needs the "my own post, no fees" confirmation');
select t.expect_error($$insert into public.posts (author_id, kind, category, job_type, title, description, own_post_confirmed)
  values (auth.uid(), 'job', 'referral', 'referral', 'My company is hiring', 'Hiring two waiters at our cafe.', true)$$,
  'referral_needs_link', 'referral needs a link to the official listing');
select t.expect_error($$insert into public.posts (author_id, kind, category, job_type, title, description, own_post_confirmed)
  values (auth.uid(), 'job', 'household', 'household', 'Hiring full-time yaya', 'Family in Riffa needs a nanny.', true)$$,
  'household_needs_sponsorship', 'household hiring must confirm proper sponsorship');

insert into public.posts (id, author_id, kind, category, job_type, title, description, own_post_confirmed)
values ('10000000-0000-0000-0000-000000000002', auth.uid(), 'job', 'looking-for-work', 'looking_for_work',
        'Experienced kasambahay looking for work', 'Five years as a housemaid, good with kids.', true);
insert into public.posts (id, author_id, kind, category, job_type, title, description, own_post_confirmed, reference_url)
values ('10000000-0000-0000-0000-000000000003', auth.uid(), 'job', 'referral', 'referral',
        'Cafe hiring, visa processing fee 200 BD', 'Pay the processing fee first then we send the visa.', true, 'https://example.com/job');
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000003') = 'pending_review',
  'job mentioning visa/processing fee goes to review instead of going live');
select t.ok((select flagged_terms from public.posts where id = '10000000-0000-0000-0000-000000000003') @> '{processing,visa}',
  'flagged words are recorded for the moderator');
select t.expect_error($$insert into public.posts (author_id, kind, category, job_type, title, description, own_post_confirmed)
  values (auth.uid(), 'job', 'looking-for-work', 'looking_for_work', 'Third job post today', 'One more job post than allowed.', true)$$,
  'up to 2 active job posts', 'members can have at most 2 active job posts');

select t.expect_error($$update public.posts set status = 'active' where id = '10000000-0000-0000-0000-000000000003'$$,
  'cannot change', 'member cannot approve their own flagged post');
update public.posts set status = 'closed' where id = '10000000-0000-0000-0000-000000000001';
update public.posts set status = 'active' where id = '10000000-0000-0000-0000-000000000001';
select t.ok(true, 'member can close and re-open their own post');

update public.posts set description = 'Room available. Also offering money transfer to PH, best rate.'
where id = '10000000-0000-0000-0000-000000000001';
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000001') = 'pending_review',
  'editing a live post to add a banned service sends it back to review');
update public.posts set description = 'Clean bedspace near the bus stop, wifi included.'
where id = '10000000-0000-0000-0000-000000000001';
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000001') = 'pending_review',
  'removing the words again does not auto-approve it');
reset role;
-- Setup only: clear the review so later tests start from a live post.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.posts set status = 'active', notified_at = null where id = '10000000-0000-0000-0000-000000000001';

-- Fresh account limits ------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
insert into public.posts (author_id, kind, category, title, description, price_type)
select auth.uid(), 'listing', 'other', 'Item number ' || g, 'A perfectly normal item for sale.', 'free'
from generate_series(1, 3) g;
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type)
  values (auth.uid(), 'listing', 'other', 'Item number 4', 'One more than a new account may post.', 'free')$$,
  'first 7 days', 'new accounts are limited to 3 posts in their first week');

-- Visibility --------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t.ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000002') = 1,
  'logged-out visitors can see live posts');
select t.ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000003') = 0,
  'logged-out visitors cannot see posts waiting for review');
select t.expect_error($$select * from public.post_contacts$$, 'permission denied',
  'logged-out visitors cannot see contact details');
select t.expect_error($$select public.admin_set_ban('00000000-0000-0000-0000-00000000000b', true, 'test ban')$$,
  'permission denied', 'logged-out visitors cannot call admin functions');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
select t.ok((select value from public.post_contacts where post_id = '10000000-0000-0000-0000-000000000001') = '+97333334444',
  'logged-in members can see contact details');
select t.ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000003') = 0,
  'other members cannot see posts waiting for review');
select t.expect_error($$select public.admin_set_ban('00000000-0000-0000-0000-00000000000b', true, 'test ban')$$,
  'only moderators', 'members cannot ban anyone');

-- Search ------------------------------------------------------------------
select t.ok(exists (select 1 from public.search_posts('kasambahay') where id = '10000000-0000-0000-0000-000000000002'),
  'search: "kasambahay" finds the post');
select t.ok(exists (select 1 from public.search_posts('helper') where id = '10000000-0000-0000-0000-000000000002'),
  'search: "helper" finds a kasambahay post (synonym)');
select t.ok(exists (select 1 from public.search_posts('kwarto juffair') where id = '10000000-0000-0000-0000-000000000001'),
  'search: "kwarto juffair" finds a bedspace post (Filipino synonym + area)');
select t.ok(exists (select 1 from public.search_posts('bedspce') where id = '10000000-0000-0000-0000-000000000001'),
  'search: misspelled "bedspce" still finds it');
select t.ok(not exists (select 1 from public.search_posts('visa') where id = '10000000-0000-0000-0000-000000000003'),
  'search never returns posts waiting for review');
select t.ok(exists (select 1 from public.search_posts(null, 'job') where id = '10000000-0000-0000-0000-000000000002')
  and not exists (select 1 from public.search_posts(null, 'listing') where kind = 'job'),
  'search: filtering by post type works');

-- Follows, blocks, notifications --------------------------------------------
insert into public.follows (follower_id, followed_user_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000b');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
set role authenticated;
insert into public.follows (follower_id, category_slug) values (auth.uid(), 'filipino-food');
insert into public.follows (follower_id, search_query) values (auth.uid(), 'pasalobong');
select t.ok((select count(*) from public.follows) = 2, 'members see their own follows');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select t.ok((select count(*) from public.follows where followed_user_id = auth.uid()) = 0,
  'follower lists are private (Ben cannot see who follows him)');
select t.ok(public.my_follower_count() = 1, 'Ben can see his own follower count');

insert into public.posts (id, author_id, kind, category, title, description, price_type, price_bhd)
values ('10000000-0000-0000-0000-000000000004', auth.uid(), 'listing', 'filipino-food',
        'Fresh pasalubong from Cebu', 'Dried mangoes and otap, just arrived.', 'fixed', 2.500);
reset role;
select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000c' and post_id = '10000000-0000-0000-0000-000000000004') = 'followed_member',
  'followers of a member are notified of new posts');
select t.ok((select count(*) from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000d' and post_id = '10000000-0000-0000-0000-000000000004') = 1,
  'a member following both the category and a matching search gets one notification, not two');
delete from public.follows where follower_id = '00000000-0000-0000-0000-00000000000d' and category_slug is not null;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
insert into public.posts (id, author_id, kind, category, title, description, price_type)
values ('10000000-0000-0000-0000-000000000005', auth.uid(), 'listing', 'filipino-food',
        'Homemade pasalubong boxes', 'Polvoron and pastillas, order by Friday.', 'negotiable');
reset role;
select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000d' and post_id = '10000000-0000-0000-0000-000000000005') = 'saved_search',
  'a misspelled saved search ("pasalobong") still matches new posts');
select t.ok(not exists (select 1 from public.notifications where post_id = '10000000-0000-0000-0000-000000000003'),
  'posts waiting for review notify nobody');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000c');
reset role;
select t.ok(not exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000c'
                        and followed_user_id = '00000000-0000-0000-0000-00000000000b'),
  'blocking removes the blocked member''s follow');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
select t.expect_error($$insert into public.follows (follower_id, followed_user_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000b')$$,
  'cannot follow', 'a blocked member cannot follow again');
select t.ok((select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 0,
  'a blocked member cannot see the blocker''s posts while logged in');
select t.expect_error($$update public.follows set followed_user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'permission denied', 'follows cannot be edited to dodge the block check');
reset role;

-- Reports -----------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select t.expect_error($$insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'spam')$$,
  'own post', 'members cannot report their own post');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
set role authenticated;
select t.expect_error($$insert into public.reports (reporter_id, profile_id, reason) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'not_community')$$,
  'reports_check', '"Not part of the community" needs an explanation');
select t.expect_error($$insert into public.reports (reporter_id, post_id, reason, status) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'spam', 'dismissed')$$,
  'permission denied', 'reporters cannot set a report''s status');
insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'scam');
select t.expect_error($$insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'spam')$$,
  'duplicate', 'the same member cannot report a post twice');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'scam');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
set role authenticated;
insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'scam');
reset role;
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000004') = 'active',
  'reports from brand-new accounts do not count toward auto-hide');
-- The third reporter is an ordinary member, not staff.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
insert into public.reports (reporter_id, post_id, reason) values (auth.uid(), '10000000-0000-0000-0000-000000000004', 'scam');
reset role;
select t.ok((select status from public.posts where id = '10000000-0000-0000-0000-000000000004') = 'hidden',
  'a post reported by 3 established members is hidden automatically');

-- Admin -------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select public.admin_set_post_status('10000000-0000-0000-0000-000000000004', 'active', 'Checked, legit seller');
select t.ok((select count(*) from public.reports where post_id = '10000000-0000-0000-0000-000000000004' and status = 'open') = 0,
  'restoring a hidden post dismisses its open reports');
select public.admin_set_post_status('10000000-0000-0000-0000-000000000003', 'removed', 'Charging a fee');
select t.ok((select count(*) from public.admin_actions) = 2, 'every admin action is logged');

select public.admin_set_ban('00000000-0000-0000-0000-00000000000e', true, 'Scam posts');
reset role;
select t.ok((select banned_until from auth.users where id = '00000000-0000-0000-0000-00000000000e') = 'infinity',
  'banning blocks future logins');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
set role authenticated;
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type)
  values (auth.uid(), 'listing', 'other', 'Posting while banned', 'Should not be allowed at all.', 'free')$$,
  'row-level security|banned', 'banned members cannot post');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t.expect_error($$select public.admin_set_ban('00000000-0000-0000-0000-00000000000a', true, 'oops self')$$,
  'yourself', 'admins cannot ban themselves');
reset role;

-- Verified Kabayan ----------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select t.expect_error($$insert into public.verification_requests (user_id, social_url, status) values (auth.uid(), 'https://facebook.com/ben', 'approved')$$,
  'permission denied', 'members cannot approve their own verification');
select t.expect_error($$insert into public.verification_requests (user_id, social_url, ph_mobile) values (auth.uid(), 'https://facebook.com/ben', '09171234567')$$,
  'check constraint', 'PH mobile must be in +639XXXXXXXXX format');
insert into public.verification_requests (user_id, social_url, ph_mobile) values (auth.uid(), 'https://facebook.com/ben', '+639171234567');
select t.ok((select code from public.verification_requests where user_id = auth.uid()) ~ '^KABAYAN-[0-9A-F]{6}$',
  'a one-time code is generated for the profile bio');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select public.admin_review_verification(
  (select id from public.verification_requests where user_id = '00000000-0000-0000-0000-00000000000b'), true, 'Code found in bio');
select t.ok((select is_verified from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'admin approval gives the Verified Kabayan badge');
reset role;

-- Account deletion ----------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
set role authenticated;
select public.delete_my_account();
reset role;
select t.ok(not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000d')
  and not exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000d'),
  'deleting an account removes the profile and everything linked to it');

-- Comments --------------------------------------------------------------------
-- Post 5 ("Homemade pasalubong boxes") is Ben's and live. f is a fresh account.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
insert into public.comments (id, post_id, author_id, body)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', auth.uid(), 'Is this still available? Can I pick up in Riffa?');
select t.ok((select status from public.comments where id = '20000000-0000-0000-0000-000000000001') = 'active',
  'comments: a normal comment goes live');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', auth.uid(), 'Cheaper here, WhatsApp me 3333 4444')$$,
  'phone numbers', 'comments: phone numbers are refused');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', auth.uid(), 'Message me at seller@example.com')$$,
  'phone numbers, emails or links', 'comments: email addresses are refused');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', auth.uid(), 'See more at wa.me/97333334444 or bit.ly/abc')$$,
  'phone numbers, emails or links', 'comments: links are refused');
insert into public.comments (id, post_id, author_id, body)
values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', auth.uid(), 'Pay first then I deliver');
select t.ok((select status from public.comments where id = '20000000-0000-0000-0000-000000000002') = 'pending_review',
  'comments: flagged words send the comment to review');
select t.expect_error($$update public.comments set status = 'active' where id = '20000000-0000-0000-0000-000000000002'$$,
  'permission denied', 'comments: authors cannot approve their own comment');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000003', auth.uid(), 'Comment on a removed post')$$,
  'closed', 'comments: cannot comment on a post that is not live');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Pretending to be the admin')$$,
  'row-level security', 'comments: cannot comment as someone else');
update public.comments set body = 'Is this still available? Pick up in Riffa tonight?'
where id = '20000000-0000-0000-0000-000000000001';
select t.ok((select edited_at is not null from public.comments where id = '20000000-0000-0000-0000-000000000001'),
  'comments: authors can edit, and edits are marked');
reset role;

select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000b' and comment_id = '20000000-0000-0000-0000-000000000001') = 'comment',
  'comments: the post owner is notified of a new comment');
select t.ok(not exists (select 1 from public.notifications where comment_id = '20000000-0000-0000-0000-000000000002'),
  'comments: comments waiting for review notify nobody');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
insert into public.comments (id, post_id, author_id, parent_id, body)
values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', auth.uid(),
        '20000000-0000-0000-0000-000000000001', 'Yes, still available. Friday works.');
insert into public.comments (id, post_id, author_id, parent_id, body)
values ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', auth.uid(),
        '20000000-0000-0000-0000-000000000003', 'Also Saturday.');
select t.ok((select parent_id from public.comments where id = '20000000-0000-0000-0000-000000000004') = '20000000-0000-0000-0000-000000000001',
  'comments: a reply to a reply joins the same thread (one level, like Facebook)');
select t.ok((select count(*) from public.comments where id = '20000000-0000-0000-0000-000000000002') = 0,
  'comments: others cannot see a comment waiting for review');
reset role;
select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000f' and comment_id = '20000000-0000-0000-0000-000000000003') = 'reply',
  'comments: the person replied to is notified');

select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t.ok((select count(*) from public.comments where post_id = '10000000-0000-0000-0000-000000000005') = 3,
  'comments: logged-out visitors can read live comments');
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000f', 'Anonymous comment')$$,
  'permission denied', 'comments: logged-out visitors cannot comment');
reset role;

-- Everyone in the conversation is notified ("also commented"), unless they muted the post.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
insert into public.comments (id, post_id, author_id, body)
values ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', auth.uid(), 'Looks delicious, how many pieces per box?');
reset role;
select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000f' and comment_id = '20000000-0000-0000-0000-000000000005') = 'also_commented',
  'comments: earlier commenters are notified of new comments ("also commented")');
select t.ok((select reason from public.notifications
             where user_id = '00000000-0000-0000-0000-00000000000b' and comment_id = '20000000-0000-0000-0000-000000000005') = 'comment',
  'comments: the post owner gets one notification, as the owner (not twice)');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
insert into public.post_mutes (user_id, post_id) values (auth.uid(), '10000000-0000-0000-0000-000000000005');
select t.expect_error($$insert into public.post_mutes (user_id, post_id) values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000005')$$,
  'row-level security', 'comments: members cannot mute posts for someone else');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
insert into public.comments (id, post_id, author_id, body)
values ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', auth.uid(), 'Also, do you deliver to Riffa?');
reset role;
select t.ok(not exists (select 1 from public.notifications
                        where user_id = '00000000-0000-0000-0000-00000000000f' and comment_id = '20000000-0000-0000-0000-000000000006'),
  'comments: a member who turned off notifications for a post gets none');

-- Cora was blocked by Ben earlier.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
set role authenticated;
select t.expect_error($$insert into public.comments (post_id, author_id, body)
  values ('10000000-0000-0000-0000-000000000005', auth.uid(), 'Blocked but commenting')$$,
  'cannot comment', 'comments: a blocked member cannot comment on the blocker''s posts');
reset role;

-- Reports: Cora and the admin (established) report f's comment; one more hides it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
select t.expect_error($$insert into public.reports (reporter_id, comment_id, reason) values (auth.uid(), '20000000-0000-0000-0000-000000000001', 'spam')$$,
  'own comment', 'comments: members cannot report their own comment');
reset role;
do $$
declare r uuid;
begin
  foreach r in array array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c']::uuid[] loop
    perform set_config('request.jwt.claim.sub', r::text, false);
    set local role authenticated;
    insert into public.reports (reporter_id, comment_id, reason) values (r, '20000000-0000-0000-0000-000000000001', 'spam');
    reset role;
  end loop;
end $$;
select t.ok((select status from public.comments where id = '20000000-0000-0000-0000-000000000001') = 'hidden',
  'comments: a comment reported by 3 established members is hidden automatically');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select public.admin_set_comment_status('20000000-0000-0000-0000-000000000002', 'active', 'Fine in context');
reset role;
select t.ok((select status from public.comments where id = '20000000-0000-0000-0000-000000000002') = 'active'
  and exists (select 1 from public.notifications where comment_id = '20000000-0000-0000-0000-000000000002' and reason = 'comment'),
  'comments: a moderator can approve a comment, and the post owner is then notified');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
delete from public.comments where id = '20000000-0000-0000-0000-000000000002';
reset role;
select t.ok(not exists (select 1 from public.comments where id = '20000000-0000-0000-0000-000000000002'),
  'comments: the post owner can delete any comment on their post');

-- Events ----------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
insert into public.posts (id, author_id, kind, category, title, description, price_type, area, venue, event_starts_at, map_url)
values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'event', 'community', 'Pinoy Independence Day picnic',
        'Bring food to share. Games for kids.', 'free', 'Manama', 'Andalus Garden', now() + interval '10 days',
        'https://maps.app.goo.gl/abc123');
select t.ok((select status from public.posts where id = '30000000-0000-0000-0000-000000000001') = 'active',
  'events: a normal event goes live');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type, venue, event_starts_at)
  values (auth.uid(), 'event', 'sports', 'Basketball last week', 'This already happened.', 'free', 'Isa Town court', now() - interval '1 day')$$,
  'future', 'events: the date must be in the future');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type, venue, event_starts_at, map_url)
  values (auth.uid(), 'event', 'sports', 'Basketball league', 'Weekly games.', 'free', 'Isa Town court', now() + interval '3 days', 'https://evil.example.com/maps/x')$$,
  'map_url', 'events: map links must be Google Maps');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type, price_bhd, venue, event_starts_at)
  values (auth.uid(), 'event', 'community', 'Christmas party', 'Dinner and games.', 'negotiable', 5, 'Hall', now() + interval '3 days')$$,
  'event_fields', 'events: price is free or a fixed pay-at-the-door amount');
select t.expect_error($$insert into public.posts (author_id, kind, category, title, description, price_type, venue, event_starts_at)
  values (auth.uid(), 'event', 'household', 'Wrong category', 'Event in a job category.', 'free', 'Hall', now() + interval '3 days')$$,
  'category does not match', 'events: must use an event category');
insert into public.posts (id, author_id, kind, category, title, description, price_type, price_bhd, venue, event_starts_at)
values ('30000000-0000-0000-0000-000000000002', auth.uid(), 'event', 'community', 'Pinoy Night dinner',
        'Pay the registration fee by GCash to reserve your slot.', 'fixed', 5, 'Seef hall', now() + interval '20 days');
select t.ok((select status from public.posts where id = '30000000-0000-0000-0000-000000000002') = 'pending_review',
  'events: "registration fee" / GCash events wait for a moderator');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
insert into public.event_rsvps (user_id, post_id, status) values (auth.uid(), '30000000-0000-0000-0000-000000000001', 'going');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
insert into public.event_rsvps (user_id, post_id, status) values (auth.uid(), '30000000-0000-0000-0000-000000000001', 'interested');
select t.ok((select count(*) from public.event_rsvps) = 1, 'events: members only see their own Going/Interested answer');
select t.ok((select going = 1 and interested = 1 from public.event_rsvp_counts(array['30000000-0000-0000-0000-000000000001']::uuid[])),
  'events: everyone sees the Going/Interested counts');
select t.expect_error($$insert into public.event_rsvps (user_id, post_id, status) values ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', 'going')$$,
  'row-level security', 'events: cannot answer for someone else');
select t.expect_error($$insert into public.event_rsvps (user_id, post_id, status) values (auth.uid(), '10000000-0000-0000-0000-000000000005', 'going')$$,
  'no longer open', 'events: cannot RSVP to something that is not an event');
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select t.expect_error($$select * from public.event_rsvps$$, 'permission denied', 'events: visitors cannot see who is going');
select t.ok(exists (select 1 from public.search_posts(null, 'event') where id = '30000000-0000-0000-0000-000000000001'),
  'events: upcoming events are listed');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
update public.posts set event_starts_at = now() + interval '11 days' where id = '30000000-0000-0000-0000-000000000001';
update public.posts set venue = 'Andalus Garden, near the fountain' where id = '30000000-0000-0000-0000-000000000001';
reset role;
select t.ok((select count(*) from public.notifications where post_id = '30000000-0000-0000-0000-000000000001' and reason = 'event_updated') = 2,
  'events: everyone going or interested is told when the time or place changes (one notification each)');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
update public.posts set status = 'closed' where id = '30000000-0000-0000-0000-000000000001';
select t.expect_error($$update public.posts set status = 'active' where id = '30000000-0000-0000-0000-000000000001'$$,
  'cannot change', 'events: a cancelled event cannot be re-opened');
reset role;
select t.ok((select count(*) from public.notifications where post_id = '30000000-0000-0000-0000-000000000001' and reason = 'event_cancelled') = 2,
  'events: everyone going or interested is told when it is cancelled');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t.ok(exists (select 1 from public.posts where id = '30000000-0000-0000-0000-000000000001' and status = 'closed'),
  'events: a cancelled event can still be opened (shown as cancelled)');
select t.ok(not exists (select 1 from public.search_posts(null, 'event') where id = '30000000-0000-0000-0000-000000000001'),
  'events: a cancelled event is not listed');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
set role authenticated;
select t.expect_error($$update public.event_rsvps set status = 'going' where post_id = '30000000-0000-0000-0000-000000000001'$$,
  'no longer open', 'events: cannot RSVP to a cancelled event');
reset role;

-- Past events drop off the list (set the date directly, skipping the "future" rule).
alter table public.posts disable trigger posts_enforce_rules;
update public.posts set status = 'active', event_starts_at = now() - interval '1 day' where id = '30000000-0000-0000-0000-000000000001';
alter table public.posts enable trigger posts_enforce_rules;
select t.ok(not exists (select 1 from public.search_posts(null, 'event') where id = '30000000-0000-0000-0000-000000000001'),
  'events: past events are no longer listed');

-- Site visits ---------------------------------------------------------------
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select public.record_visit('/marketplace', true);
select public.record_visit('/marketplace', false);
select public.record_visit('/posts/30000000-0000-0000-0000-000000000001', false);
select public.record_visit('/admin/reports', true);
select public.record_visit('/x?<script>', true);
select public.record_visit(repeat('/a', 100), true);
select t.expect_error($$select * from public.site_visits$$, 'permission denied', 'visits: visitors cannot read the counts');
select t.expect_error($$select * from public.visit_totals(7)$$, 'permission denied', 'visits: visitors cannot read the totals');
select t.expect_error($$insert into public.site_visits (day, path, views) values (current_date, '/', 1000000)$$,
  'permission denied', 'visits: visitors cannot write counts directly');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
select public.record_visit('/events', true);
select t.ok(not exists (select 1 from public.site_visits), 'visits: members cannot read the counts');
select t.ok((select sum(views) from public.visit_totals(7)) = 0, 'visits: members see no totals');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
select t.ok((select views from public.site_visits where path = '/marketplace') = 2
  and (select visitors from public.site_visits where path = '/marketplace') = 1,
  'visits: views and new visitors are counted per page');
select t.ok(not exists (select 1 from public.site_visits where path like '/admin%' or path like '%script%' or length(path) > 120),
  'visits: admin pages and junk paths are not counted');
select t.ok((select count(*) from public.visit_totals(7)) = 7
  and (select views from public.visit_totals(7) order by day desc limit 1) = 4
  and (select visitors from public.visit_totals(7) order by day desc limit 1) = 2,
  'visits: staff see daily totals, with empty days included');
select t.ok((select path from public.top_pages(7) limit 1) = '/marketplace', 'visits: staff see the top pages');
reset role;
insert into public.site_visits (day, path, views)
  select (now() at time zone 'Asia/Bahrain')::date, '/p' || g, 1 from generate_series(1, 2000) g;
select public.record_visit('/one-too-many', true);
select t.ok(exists (select 1 from public.site_visits where path = '(other)')
  and not exists (select 1 from public.site_visits where path = '/one-too-many'),
  'visits: past 2,000 pages a day, new pages are counted as (other)');
