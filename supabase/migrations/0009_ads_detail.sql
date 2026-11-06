alter table public.ad_reports add column if not exists intro text;
alter table public.ad_reports add column if not exists items jsonb not null default '[]'::jsonb;
