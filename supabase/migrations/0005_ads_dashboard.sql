alter table public.ad_reports
  add column if not exists period_label text,
  add column if not exists leads integer not null default 0,
  add column if not exists leads_spend integer not null default 0,
  add column if not exists engagements integer not null default 0,
  add column if not exists new_followers integer not null default 0,
  add column if not exists highlight jsonb,
  add column if not exists breakdown jsonb not null default '[]'::jsonb;
