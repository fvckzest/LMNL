create extension if not exists pgcrypto;

create table if not exists public.website_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  current_website text,
  social_links text,
  business_location text,
  service_area text,
  website_goal text not null,
  primary_action text not null,
  target_audience text,
  desired_feeling text,
  requested_pages jsonb not null default '[]'::jsonb,
  existing_assets jsonb not null default '[]'::jsonb,
  style_references text,
  disliked_references text,
  needed_features jsonb not null default '[]'::jsonb,
  timeline text,
  budget_range text,
  decision_makers text,
  additional_notes text,
  source text not null default 'website_intake',
  status text not null default 'new'
);

create index if not exists website_intake_submissions_created_at_idx
  on public.website_intake_submissions (created_at desc);

create index if not exists website_intake_submissions_status_idx
  on public.website_intake_submissions (status);

alter table public.website_intake_submissions enable row level security;

revoke all on public.website_intake_submissions from anon, authenticated;
grant insert on public.website_intake_submissions to anon, authenticated;
grant all on public.website_intake_submissions to service_role;

drop policy if exists "website_intake_submissions_public_insert"
  on public.website_intake_submissions;

create policy "website_intake_submissions_public_insert"
on public.website_intake_submissions
for insert
to anon, authenticated
with check (
  source = 'website_intake'
  and status = 'new'
);
