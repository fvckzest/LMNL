-- LMNL Phase 5 invite request archiving
-- Adds a persisted archive flag for invite requests so archiving does not
-- overwrite the request lifecycle status.

alter table if exists public.requests
  add column if not exists is_archived boolean not null default false;

alter table if exists public.requests
  add column if not exists archived_at timestamptz;

-- Migrate legacy rows that previously stored archive state in `status`.
-- Best-effort restoration rules:
-- - issued ticket => fulfilled
-- - linked Square order => approved
-- - otherwise => pending
update public.requests as request
set
  is_archived = true,
  archived_at = coalesce(request.archived_at, now()),
  status = case
    when exists (
      select 1
      from public.tickets as ticket
      where ticket.square_order_id = request.square_order_id
    ) then 'fulfilled'
    when request.square_order_id is not null then 'approved'
    else 'pending'
  end
where request.status = 'archived';
