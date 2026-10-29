-- Contented Jóváhagyó Portál: alap séma
-- Futtatás: Supabase Dashboard > SQL Editor > ide bemásolni > Run

-- ============ Típusok ============
create type public.post_status as enum ('keszul', 'var', 'mod', 'ok', 'pub');
create type public.user_role as enum ('admin', 'client');

-- ============ Táblák ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'client',
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.packages (
  client_id uuid primary key references public.clients(id) on delete cascade,
  name text not null default 'AI Marketing Partnership',
  monthly_fee integer not null default 350000,
  fee_note text not null default '+ ÁFA, havonta számlázva',
  since_label text,
  contract_note text,
  includes text[] not null default '{}',
  terms text[] not null default array[
    'Posztonként 1 módosítási kör benne van a havidíjban.',
    'Irányváltás (új téma, új koncepció) külön egyeztetés, és új munkának számít.',
    'Jóváhagyás 3 munkanapon belül. Ha addig nem jön visszajelzés, a publikálás csúszik.',
    'A következő havi brief és aktualitások a tárgyhónapot megelőző hónap 20-áig.',
    'Pontos árakat, akciókat és állításokat a megbízó ellenőriz a jóváhagyás előtt.'
  ],
  posts_quota integer not null default 12,
  videos_quota integer not null default 4,
  revisions_quota integer not null default 12,
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  subtitle text,
  price_label text,
  cta_label text not null default 'Ezt választom',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.offer_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number integer,
  platform text not null,
  content_type text not null,
  publish_date date not null,
  format text not null default '4:5',
  is_video boolean not null default false,
  visual_path text,
  visual_headline text,
  caption text not null default '',
  internal_note text,
  status public.post_status not null default 'keszul',
  revision_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_client_date_idx on public.posts (client_id, publish_date);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  author_role public.user_role,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- ============ Segédfüggvények ============
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- Új felhasználó: profil létrehozása a meghívó adataiból
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'client',
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Komment szerzője mindig a belépett felhasználó (nem hamisítható)
create or replace function public.set_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  select full_name, role into new.author_name, new.author_role from public.profiles where id = auth.uid();
  return new;
end;
$$;
create trigger comments_set_author before insert on public.comments
  for each row execute function public.set_comment_author();

-- ============ Ügyfél műveletek (csak ezeken át változtathat státuszt) ============
create or replace function public.client_set_post_status(p_post uuid, p_status public.post_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('ok', 'mod') then
    raise exception 'Nem engedélyezett státusz';
  end if;
  update public.posts
     set status = p_status,
         revision_count = revision_count + case when p_status = 'mod' then 1 else 0 end,
         updated_at = now()
   where id = p_post
     and (client_id = public.my_client_id() or public.is_admin())
     and status in ('var', 'mod');
  if not found then
    raise exception 'A poszt nem módosítható';
  end if;
end;
$$;

create or replace function public.client_approve_month(p_month date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.posts
     set status = 'ok', updated_at = now()
   where client_id = public.my_client_id()
     and status = 'var'
     and date_trunc('month', publish_date) = date_trunc('month', p_month);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ============ RLS ============
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.offers enable row level security;
alter table public.offer_requests enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- clients
create policy clients_admin_all on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy clients_own_read on public.clients for select using (id = public.my_client_id());

-- profiles
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy profiles_self_read on public.profiles for select using (id = auth.uid());

-- packages
create policy packages_admin_all on public.packages for all using (public.is_admin()) with check (public.is_admin());
create policy packages_own_read on public.packages for select using (client_id = public.my_client_id());

-- offers
create policy offers_admin_all on public.offers for all using (public.is_admin()) with check (public.is_admin());
create policy offers_own_read on public.offers for select using (client_id = public.my_client_id() and active);

-- offer_requests
create policy offer_requests_admin_all on public.offer_requests for all using (public.is_admin()) with check (public.is_admin());
create policy offer_requests_own_insert on public.offer_requests for insert
  with check (client_id = public.my_client_id() and requested_by = auth.uid());
create policy offer_requests_own_read on public.offer_requests for select using (client_id = public.my_client_id());

-- posts: ügyfél csak olvas, státuszt az RPC-n át vált
create policy posts_admin_all on public.posts for all using (public.is_admin()) with check (public.is_admin());
create policy posts_own_read on public.posts for select using (client_id = public.my_client_id());

-- comments
create policy comments_admin_all on public.comments for all using (public.is_admin()) with check (public.is_admin());
create policy comments_own_read on public.comments for select
  using (exists (select 1 from public.posts p where p.id = post_id and p.client_id = public.my_client_id()));
create policy comments_own_insert on public.comments for insert
  with check (exists (select 1 from public.posts p where p.id = post_id and p.client_id = public.my_client_id()));

grant execute on function public.client_set_post_status(uuid, public.post_status) to authenticated;
grant execute on function public.client_approve_month(date) to authenticated;

-- ============ Fájltárolás (képek, videók) ============
-- Mappa-szerkezet: <client_id>/<fájlnév>
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do nothing;

create policy media_admin_all on storage.objects for all
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy media_client_read on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_client_id()::text);
