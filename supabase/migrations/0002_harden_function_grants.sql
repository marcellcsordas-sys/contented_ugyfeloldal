-- Senki ne hívhassa kívülről a trigger-függvényeket
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_comment_author() from public, anon, authenticated;

-- Kijelentkezett látogató semmit ne hívhasson
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.my_client_id() from public, anon;
revoke execute on function public.client_set_post_status(uuid, public.post_status) from public, anon;
revoke execute on function public.client_approve_month(date) from public, anon;

-- Belépett felhasználó: a jogosultság-ellenőrzők és a két ügyfél-művelet kell
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_client_id() to authenticated;
grant execute on function public.client_set_post_status(uuid, public.post_status) to authenticated;
grant execute on function public.client_approve_month(date) to authenticated;
