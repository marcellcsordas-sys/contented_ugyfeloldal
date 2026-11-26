alter table public.comments add column if not exists attachments text[] not null default '{}';
alter table public.comments add constraint comments_attachments_max3 check (cardinality(attachments) <= 3);
-- Ügyfél a saját mappája comments/ almappájába tölthet fel képet
create policy media_client_comment_upload on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.my_client_id()::text
    and (storage.foldername(name))[2] = 'comments'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','heic','gif')
  );
