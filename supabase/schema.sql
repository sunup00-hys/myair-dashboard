-- Personal myAir project only; never run this in DIFF AX Contest.
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
create table if not exists public.myair_device_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check(length(token_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.myair_records enable row level security;
alter table public.myair_device_tokens enable row level security;
revoke all on public.myair_records from public, anon, authenticated;
revoke all on public.myair_device_tokens from public, anon, authenticated;
grant select on public.myair_records to authenticated;
drop policy if exists myair_select_own on public.myair_records;
create policy myair_select_own on public.myair_records for select to authenticated using(user_id=(select auth.uid()));
-- The auto-RLS security definer function must not be directly callable from APIs.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
