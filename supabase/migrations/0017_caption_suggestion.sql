alter table public.posts add column if not exists caption_suggestion text;
alter table public.posts add column if not exists caption_suggested_by text;
alter table public.posts add column if not exists caption_suggested_at timestamptz;

-- Ügyfél javasolt posztszövege (az eredeti szöveg nem íródik felül)
create or replace function public.client_suggest_caption(p_post uuid, p_text text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_name text;
begin
  select coalesce(full_name, 'Ügyfél') into v_name from profiles where id = auth.uid();
  update posts
     set caption_suggestion = nullif(p_text, caption),
         caption_suggested_by = v_name,
         caption_suggested_at = now(),
         updated_at = now()
   where id = p_post
     and (client_id = public.my_client_id() or public.is_admin())
     and status <> 'pub';
  if not found then raise exception 'A szöveg nem módosítható'; end if;
end $$;
grant execute on function public.client_suggest_caption(uuid, text) to authenticated;
