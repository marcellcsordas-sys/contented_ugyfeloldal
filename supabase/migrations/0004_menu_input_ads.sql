-- Havi kommunikációs input, hirdetési riport, havi 1 módosítási kör

-- 1) Komment szerző: importnál (nincs bejelentkezett felhasználó) a megadott nevet tartjuk meg
create or replace function public.set_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.author_id := auth.uid();
  select full_name, role into new.author_name, new.author_role from public.profiles where id = auth.uid();
  return new;
end;
$$;
revoke execute on function public.set_comment_author() from public, anon, authenticated;

-- 2) Havi kommunikációs input (kérdőív). month = a hónap, AMIRŐL az input szól.
create table if not exists public.monthly_inputs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  answers jsonb not null default '{}'::jsonb,
  submitted boolean not null default false,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_by_name text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);
alter table public.monthly_inputs enable row level security;

create policy "inputs admin all" on public.monthly_inputs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inputs client read" on public.monthly_inputs
  for select to authenticated using (client_id = public.my_client_id());
create policy "inputs client insert" on public.monthly_inputs
  for insert to authenticated with check (client_id = public.my_client_id());
create policy "inputs client update" on public.monthly_inputs
  for update to authenticated using (client_id = public.my_client_id()) with check (client_id = public.my_client_id());

-- 3) Hirdetési riport havonta, platformonként (meta / google)
create table if not exists public.ad_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  platform text not null check (platform in ('meta', 'google')),
  spend integer not null default 0,
  budget integer,
  impressions integer not null default 0,
  reach integer,
  clicks integer not null default 0,
  results integer not null default 0,
  result_label text not null default 'Eredmény',
  active_ads integer not null default 0,
  summary text,
  top_ads jsonb not null default '[]'::jsonb,
  source text not null default 'kézi',
  updated_at timestamptz not null default now(),
  unique (client_id, month, platform)
);
alter table public.ad_reports enable row level security;

create policy "ads admin all" on public.ad_reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ads client read" on public.ad_reports
  for select to authenticated using (client_id = public.my_client_id());

-- 4) Havi 1 módosítási kör: egy körben az összes posztra jelezhető visszajelzés
alter table public.packages alter column revisions_quota set default 1;
update public.packages set revisions_quota = 1;
update public.packages
   set terms = array_replace(terms,
         'Posztonként 1 módosítási kör benne van a havidíjban.',
         'Havonta 1 módosítási kör benne van a havidíjban: ebben az összes posztra egyszerre jelezheted a kéréseidet.');
update public.packages
   set terms = array_replace(terms,
         'Posztonként 1 módosítási kör benne van a havidíjban. Az irányváltás (új téma, új koncepció) új munkának számít.',
         'Havonta 1 módosítási kör benne van a havidíjban: ebben az összes posztra egyszerre jelezheted a kéréseidet. Az irányváltás (új téma, új koncepció) új munkának számít.');
alter table public.packages alter column terms set default array[
  'Havonta 1 módosítási kör benne van a havidíjban: ebben az összes posztra egyszerre jelezheted a kéréseidet.',
  'Irányváltás (új téma, új koncepció) külön egyeztetés, és új munkának számít.',
  'Jóváhagyás 3 munkanapon belül. Ha addig nem jön visszajelzés, a publikálás csúszik.',
  'A következő havi brief és aktualitások a tárgyhónapot megelőző hónap 20-áig.',
  'Pontos árakat, akciókat és állításokat a megbízó ellenőriz a jóváhagyás előtt.'
]::text[];
