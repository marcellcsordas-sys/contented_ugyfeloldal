-- A tulajdonos címe meghíváskor automatikusan admin lesz
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_owner boolean := lower(new.email) = 'marcellcsordas@contented.hu';
begin
  insert into public.profiles (id, full_name, role, client_id)
  values (
    new.id,
    case when is_owner then 'Marci'
         else coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) end,
    case when is_owner then 'admin'::public.user_role else 'client'::public.user_role end,
    case when is_owner then null else nullif(new.raw_user_meta_data->>'client_id', '')::uuid end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
