-- Az ügyfél a "Készülőben" státuszú tartalmat is elfogadhatja
CREATE OR REPLACE FUNCTION public.client_set_post_status(p_post uuid, p_status post_status)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
     and (status in ('var', 'mod') or (p_status = 'ok' and status = 'keszul'));
  if not found then
    raise exception 'A poszt nem módosítható';
  end if;
end;
$function$;
