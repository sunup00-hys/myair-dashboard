-- myAir personal health data: execute ONLY in a separate personal Supabase project
create table if not exists public.myair_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  used_on date not null,
  usage_minutes integer not null check (usage_minutes between 0 and 1440),
  events_per_hour numeric(6,2) check (events_per_hour between 0 and 100),
  mask_off integer check (mask_off between 0 and 100),
  mask_seal text check (mask_seal is null or length(mask_seal) <= 60),
  updated_at timestamptz not null default now(),
  primary key (user_id, used_on)
);
alter table public.myair_records enable row level security;
revoke all on table public.myair_records from anon, authenticated;
grant select on table public.myair_records to authenticated;
drop policy if exists "read_own_myair_records" on public.myair_records;
create policy "read_own_myair_records" on public.myair_records
for select to authenticated using ((select auth.uid()) = user_id);
-- All writes only through an authenticated Edge Function with a private device secret.
