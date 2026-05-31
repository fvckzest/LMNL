-- LMNL Phase 6 ticket idempotency hardening
-- Apply after cleaning any existing duplicate ticket rows reported by the
-- diagnostic query below. The unique indexes make Square webhook replays and
-- concurrent payment/order updates resolve to one ticket instead of sending two.

-- Diagnostic: show duplicate tickets currently tied to the same Square order.
-- Pick the ticket URL the guest should retain for each order, then delete the
-- duplicate rows before creating the indexes below.
select
  square_order_id,
  count(*) as ticket_count,
  array_agg(id order by created_at asc, id asc) as ticket_ids,
  array_agg(customer_email order by created_at asc, id asc) as customer_emails,
  min(created_at) as first_created_at,
  max(created_at) as last_created_at
from public.tickets
where square_order_id is not null
group by square_order_id
having count(*) > 1
order by last_created_at desc;

create unique index if not exists tickets_square_order_id_unique
  on public.tickets (square_order_id)
  where square_order_id is not null;

create unique index if not exists tickets_qr_code_payload_unique
  on public.tickets (qr_code_payload)
  where qr_code_payload is not null;
