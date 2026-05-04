create extension if not exists pgcrypto;

create table if not exists attendance_verification_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  source_type text not null,
  source_id text,
  verification_method text not null,
  verification_status text not null default 'verified',
  participation_tier text not null default 'attendee',
  verified_at timestamptz,
  verified_by_admin_user_id uuid references auth.users(id) on delete set null,
  contact_email text,
  contact_name text,
  resolved_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_verification_sources_source_type_check
    check (source_type in ('ticket', 'request', 'invite', 'manual_staff')),
  constraint attendance_verification_sources_verification_method_check
    check (verification_method in ('ticket_check_in', 'invite_qr_claim', 'staff_confirmed', 'retroactive_staff_attach')),
  constraint attendance_verification_sources_verification_status_check
    check (verification_status in ('pending_resolution', 'verified', 'revoked')),
  constraint attendance_verification_sources_participation_tier_check
    check (participation_tier in ('attendee', 'performer'))
);

create unique index if not exists attendance_verification_sources_source_key
  on attendance_verification_sources (source_type, source_id)
  where source_id is not null;

create index if not exists attendance_verification_sources_event_id_idx
  on attendance_verification_sources (event_id);

create index if not exists attendance_verification_sources_resolved_user_id_idx
  on attendance_verification_sources (resolved_user_id);

create index if not exists attendance_verification_sources_contact_email_idx
  on attendance_verification_sources (lower(contact_email));

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  verification_source_id uuid references attendance_verification_sources(id) on delete set null,
  attendance_state text not null default 'verified',
  participation_tier text not null default 'attendee',
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_attendance_state_check
    check (attendance_state in ('verified', 'revoked')),
  constraint attendance_records_participation_tier_check
    check (participation_tier in ('attendee', 'performer')),
  constraint attendance_records_user_event_key unique (user_id, event_id)
);

create index if not exists attendance_records_user_id_idx
  on attendance_records (user_id);

create index if not exists attendance_records_event_id_idx
  on attendance_records (event_id);

create index if not exists attendance_records_verification_source_id_idx
  on attendance_records (verification_source_id);

create table if not exists attendance_artifacts (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance_records(id) on delete cascade,
  artifact_type text not null default 'event_proof',
  title text,
  subtitle text,
  issued_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint attendance_artifacts_attendance_id_key unique (attendance_id)
);

create index if not exists attendance_artifacts_issued_at_idx
  on attendance_artifacts (issued_at desc);

create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance_id uuid references attendance_records(id) on delete cascade,
  reason text not null,
  points_delta integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists point_transactions_user_id_idx
  on point_transactions (user_id);

create index if not exists point_transactions_attendance_id_idx
  on point_transactions (attendance_id);

create index if not exists point_transactions_reason_idx
  on point_transactions (reason);

create or replace function set_phase2_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_verification_sources_set_updated_at on attendance_verification_sources;
create trigger attendance_verification_sources_set_updated_at
before update on attendance_verification_sources
for each row
execute function set_phase2_attendance_updated_at();

drop trigger if exists attendance_records_set_updated_at on attendance_records;
create trigger attendance_records_set_updated_at
before update on attendance_records
for each row
execute function set_phase2_attendance_updated_at();

alter table attendance_verification_sources enable row level security;
alter table attendance_records enable row level security;
alter table attendance_artifacts enable row level security;
alter table point_transactions enable row level security;

drop policy if exists "attendance_verification_sources_select_resolved" on attendance_verification_sources;
create policy "attendance_verification_sources_select_resolved"
on attendance_verification_sources
for select
to authenticated
using ((select auth.uid()) is not null and resolved_user_id = (select auth.uid()));

drop policy if exists "attendance_records_select_own" on attendance_records;
create policy "attendance_records_select_own"
on attendance_records
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "attendance_artifacts_select_own" on attendance_artifacts;
create policy "attendance_artifacts_select_own"
on attendance_artifacts
for select
to authenticated
using (
  exists (
    select 1
    from attendance_records
    where attendance_records.id = attendance_artifacts.attendance_id
      and attendance_records.user_id = (select auth.uid())
  )
);

drop policy if exists "point_transactions_select_own" on point_transactions;
create policy "point_transactions_select_own"
on point_transactions
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));
