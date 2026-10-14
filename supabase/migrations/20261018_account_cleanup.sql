-- 1) Deleting a user also deletes their rows (these were NO ACTION, which made
--    "Delete user" fail with "Database error deleting user").
alter table public.feedback_replies drop constraint if exists feedback_replies_sender_id_fkey,
  add constraint feedback_replies_sender_id_fkey foreign key (sender_id) references auth.users(id) on delete cascade;
alter table public.todos drop constraint if exists todos_user_id_fkey,
  add constraint todos_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.materials drop constraint if exists materials_user_id_fkey,
  add constraint materials_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.courses drop constraint if exists courses_user_id_fkey,
  add constraint courses_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.schedule_profiles drop constraint if exists schedule_profiles_user_id_fkey,
  add constraint schedule_profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.events drop constraint if exists events_user_id_fkey,
  add constraint events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- 2) Sign-ups that never confirm their email are removed after 30 minutes.
--    Only accounts that never confirmed AND never signed in are touched.
create extension if not exists pg_cron;

select cron.unschedule('delete-unverified-users')
where exists (select 1 from cron.job where jobname = 'delete-unverified-users');

select cron.schedule(
  'delete-unverified-users',
  '*/5 * * * *',
  $$
    delete from auth.users
    where email_confirmed_at is null
      and last_sign_in_at is null
      and created_at < now() - interval '30 minutes';
  $$
);
