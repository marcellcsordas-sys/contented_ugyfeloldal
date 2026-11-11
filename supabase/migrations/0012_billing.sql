-- Számlák: Billingo partner azonosító és a hirdetési számlák Drive mappája ügyfelenként
alter table public.clients add column if not exists billingo_partner_id bigint;
alter table public.clients add column if not exists ad_invoices_url text;
