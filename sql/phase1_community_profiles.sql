create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  profile_slug text unique,
  avatar_url text,
  website_url text,
  x_url text,
  instagram_url text,
  bio text,
  primary_role text,
  visibility text not null default 'private',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_visibility_check check (visibility in ('private', 'public'))
);

create table if not exists user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  provider_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_identities_user_provider_key unique (user_id, provider)
);

create index if not exists user_identities_user_id_idx on user_identities (user_id);
create index if not exists user_identities_provider_idx on user_identities (provider);

create or replace function set_phase1_community_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row
execute function set_phase1_community_updated_at();

drop trigger if exists user_identities_set_updated_at on user_identities;
create trigger user_identities_set_updated_at
before update on user_identities
for each row
execute function set_phase1_community_updated_at();

alter table profiles enable row level security;
alter table user_identities enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_public_read" on profiles;
create policy "profiles_public_read"
on profiles
for select
to anon, authenticated
using (visibility = 'public');

drop policy if exists "user_identities_select_own" on user_identities;
create policy "user_identities_select_own"
on user_identities
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "user_identities_insert_own" on user_identities;
create policy "user_identities_insert_own"
on user_identities
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "user_identities_update_own" on user_identities;
create policy "user_identities_update_own"
on user_identities
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
