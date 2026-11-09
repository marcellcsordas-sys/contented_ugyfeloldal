create table if not exists public.shop_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  source text not null default 'shopify',
  period_label text,
  orders integer not null default 0,
  revenue integer not null default 0,
  net_sales integer not null default 0,
  avg_order integer not null default 0,
  channels jsonb not null default '[]'::jsonb,
  products jsonb not null default '[]'::jsonb,
  note text,
  updated_at timestamptz not null default now(),
  unique (client_id, month, source)
);
alter table public.shop_reports enable row level security;
create policy "shop admin all" on public.shop_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shop client read" on public.shop_reports for select to authenticated using (client_id = public.my_client_id());
revoke all on public.shop_reports from anon;
