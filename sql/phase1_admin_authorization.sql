-- LMNL Phase 1 admin authorization hardening
-- Apply this in Supabase SQL Editor before enabling community OAuth.
-- This script creates a table-backed admin allowlist and policy helpers so
-- admin-only tables stop relying on `auth.role() = 'authenticated'`.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  notes text
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin_user(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (
  public.is_admin_user()
  and user_id = auth.uid()
);

do $$
begin
  if to_regclass('public.events') is not null then
    execute 'alter table public.events enable row level security';
    execute 'drop policy if exists "events_public_read" on public.events';
    execute '' ||
      'create policy "events_public_read" on public.events ' ||
      'for select to anon, authenticated using (true)';
    execute 'drop policy if exists "events_admin_write" on public.events';
    execute '' ||
      'create policy "events_admin_write" on public.events ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.community_credits') is not null then
    execute 'alter table public.community_credits enable row level security';
    execute 'drop policy if exists "community_credits_public_read" on public.community_credits';
    execute '' ||
      'create policy "community_credits_public_read" on public.community_credits ' ||
      'for select to anon, authenticated using (true)';
    execute 'drop policy if exists "community_credits_admin_write" on public.community_credits';
    execute '' ||
      'create policy "community_credits_admin_write" on public.community_credits ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.requests') is not null then
    execute 'alter table public.requests enable row level security';
    execute 'drop policy if exists "requests_public_insert" on public.requests';
    execute '' ||
      'create policy "requests_public_insert" on public.requests ' ||
      'for insert to anon with check (true)';
    execute 'drop policy if exists "requests_admin_read_write" on public.requests';
    execute '' ||
      'create policy "requests_admin_read_write" on public.requests ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.tickets') is not null then
    execute 'alter table public.tickets enable row level security';
    execute 'drop policy if exists "tickets_admin_only" on public.tickets';
    execute '' ||
      'create policy "tickets_admin_only" on public.tickets ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.merch_preorders') is not null then
    execute 'alter table public.merch_preorders enable row level security';
    execute 'drop policy if exists "merch_preorders_public_read_open" on public.merch_preorders';
    execute '' ||
      'create policy "merch_preorders_public_read_open" on public.merch_preorders ' ||
      'for select to anon, authenticated using (status = ''open'')';
    execute 'drop policy if exists "merch_preorders_admin_write" on public.merch_preorders';
    execute '' ||
      'create policy "merch_preorders_admin_write" on public.merch_preorders ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.emails') is not null then
    execute 'alter table public.emails enable row level security';
    execute 'drop policy if exists "emails_admin_only" on public.emails';
    execute '' ||
      'create policy "emails_admin_only" on public.emails ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.artist_interest') is not null then
    execute 'alter table public.artist_interest enable row level security';
    execute 'drop policy if exists "artist_interest_public_insert" on public.artist_interest';
    execute '' ||
      'create policy "artist_interest_public_insert" on public.artist_interest ' ||
      'for insert to anon, authenticated with check (true)';
    execute 'drop policy if exists "artist_interest_admin_read_write" on public.artist_interest';
    execute '' ||
      'create policy "artist_interest_admin_read_write" on public.artist_interest ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.service_inquiries') is not null then
    execute 'alter table public.service_inquiries enable row level security';
    execute 'drop policy if exists "service_inquiries_public_insert" on public.service_inquiries';
    execute '' ||
      'create policy "service_inquiries_public_insert" on public.service_inquiries ' ||
      'for insert to anon, authenticated with check (true)';
    execute 'drop policy if exists "service_inquiries_admin_read_write" on public.service_inquiries';
    execute '' ||
      'create policy "service_inquiries_admin_read_write" on public.service_inquiries ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.blog_posts') is not null then
    execute 'alter table public.blog_posts enable row level security';
    execute 'drop policy if exists "blog_posts_public_read_published" on public.blog_posts';
    execute '' ||
      'create policy "blog_posts_public_read_published" on public.blog_posts ' ||
      'for select to anon, authenticated using (status = ''published'')';
    execute 'drop policy if exists "blog_posts_admin_only" on public.blog_posts';
    execute '' ||
      'create policy "blog_posts_admin_only" on public.blog_posts ' ||
      'for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())';
  end if;
end
$$;

-- Optional seed example:
-- insert into public.admin_users (user_id, notes)
-- values ('00000000-0000-0000-0000-000000000000', 'Initial LMNL admin');
