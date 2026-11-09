-- Ügyfél-aktivitás napló: oldalmegtekintések és műveletek (csak ügyfél-felhasználóktól)
create table if not exists public.activity_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null,          -- 'view' | 'action'
  section text,                -- naptar | brief | hirdetesek | csomag | poszt
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_client_idx on public.activity_log (client_id, created_at desc);
alter table public.activity_log enable row level security;
create policy "activity admin read" on public.activity_log for select to authenticated using (public.is_admin());
revoke all on public.activity_log from anon;

create or replace function public.log_activity(p_kind text, p_section text, p_detail text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := public.my_client_id();
begin
  if auth.uid() is null or cid is null or public.is_admin() then return; end if;
  -- ugyanaz az esemény 15 percen belül csak egyszer
  if exists (
    select 1 from public.activity_log
    where user_id = auth.uid() and kind = p_kind and coalesce(section,'') = coalesce(p_section,'')
      and coalesce(detail,'') = coalesce(p_detail,'') and created_at > now() - interval '15 minutes'
  ) then return; end if;
  insert into public.activity_log (user_id, client_id, kind, section, detail)
  values (auth.uid(), cid, left(p_kind, 20), left(p_section, 40), left(p_detail, 200));
end;
$$;
revoke execute on function public.log_activity(text, text, text) from public, anon;
grant execute on function public.log_activity(text, text, text) to authenticated;
