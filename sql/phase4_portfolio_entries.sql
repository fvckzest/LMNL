-- LMNL Phase 4 portfolio entries and media

create extension if not exists pgcrypto;

create table if not exists public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  slug text not null unique,
  year integer not null,
  client_name text not null default '',
  project_type text not null default '',
  website_url text not null default '',
  summary text not null default '',
  result text not null default '',
  capabilities text[] not null default '{}'::text[],
  outputs text[] not null default '{}'::text[],
  focus_areas text[] not null default '{}'::text[],
  featured boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_entry_id uuid not null references public.portfolio_entries(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'pdf', 'embed')),
  asset_role text not null default 'gallery' check (asset_role in ('gallery', 'website_preview')),
  url text not null default '',
  alt_text text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_entries_status_sort_idx
  on public.portfolio_entries (status, sort_order, year desc, created_at desc);

create index if not exists portfolio_media_entry_sort_idx
  on public.portfolio_media (portfolio_entry_id, sort_order, created_at);

alter table public.portfolio_entries
  add column if not exists website_url text not null default '';

alter table public.portfolio_media
  add column if not exists asset_role text not null default 'gallery';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_media_asset_role_check'
  ) then
    alter table public.portfolio_media
      add constraint portfolio_media_asset_role_check
      check (asset_role in ('gallery', 'website_preview'));
  end if;
end
$$;

create or replace function public.set_phase4_portfolio_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_entries_set_updated_at on public.portfolio_entries;
create trigger portfolio_entries_set_updated_at
before update on public.portfolio_entries
for each row
execute function public.set_phase4_portfolio_updated_at();

drop trigger if exists portfolio_media_set_updated_at on public.portfolio_media;
create trigger portfolio_media_set_updated_at
before update on public.portfolio_media
for each row
execute function public.set_phase4_portfolio_updated_at();

alter table public.portfolio_entries enable row level security;
alter table public.portfolio_media enable row level security;

drop policy if exists "portfolio_entries_public_read" on public.portfolio_entries;
create policy "portfolio_entries_public_read"
on public.portfolio_entries
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "portfolio_entries_admin_write" on public.portfolio_entries;
create policy "portfolio_entries_admin_write"
on public.portfolio_entries
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "portfolio_media_public_read" on public.portfolio_media;
create policy "portfolio_media_public_read"
on public.portfolio_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.portfolio_entries
    where public.portfolio_entries.id = public.portfolio_media.portfolio_entry_id
      and public.portfolio_entries.status = 'published'
  )
);

drop policy if exists "portfolio_media_admin_write" on public.portfolio_media;
create policy "portfolio_media_admin_write"
on public.portfolio_media
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
