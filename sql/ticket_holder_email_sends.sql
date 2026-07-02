create table if not exists public.ticket_holder_email_sends (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  recipient_email text not null,
  subject text not null default '',
  content_hash text not null,
  resend_email_id text,
  status text not null default 'sent',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists ticket_holder_email_sends_event_id_idx
  on public.ticket_holder_email_sends (event_id, created_at desc);

create index if not exists ticket_holder_email_sends_content_hash_idx
  on public.ticket_holder_email_sends (content_hash);

create unique index if not exists ticket_holder_email_sends_sent_unique
  on public.ticket_holder_email_sends (event_id, recipient_email, content_hash);

alter table public.ticket_holder_email_sends enable row level security;

drop policy if exists "ticket_holder_email_sends_admin_only" on public.ticket_holder_email_sends;

create policy "ticket_holder_email_sends_admin_only"
on public.ticket_holder_email_sends
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
