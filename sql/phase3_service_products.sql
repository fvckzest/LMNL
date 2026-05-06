create extension if not exists pgcrypto;

create table if not exists public.service_products (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  product text not null,
  scope text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists service_products_sort_order_idx
  on public.service_products (sort_order asc, created_at asc);
