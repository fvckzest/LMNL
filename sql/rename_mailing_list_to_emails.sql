-- Rename the admin contact table from mailing_list to emails.
-- Run this once in the Supabase SQL Editor before deploying the code that reads public.emails.

do $$
begin
  if to_regclass('public.emails') is null and to_regclass('public.mailing_list') is not null then
    alter table public.mailing_list rename to emails;
  end if;
end
$$;

create table if not exists public.emails (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text not null unique,
  source text default 'manual',
  sources jsonb default '[]'::jsonb,
  record_count integer default 1,
  latest_seen_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.emails add column if not exists sources jsonb default '[]'::jsonb;
alter table public.emails add column if not exists record_count integer default 1;
alter table public.emails add column if not exists latest_seen_at timestamp with time zone;

alter table public.emails enable row level security;

drop policy if exists "mailing_list_admin_only" on public.emails;
drop policy if exists "emails_admin_only" on public.emails;

create policy "emails_admin_only"
on public.emails
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
