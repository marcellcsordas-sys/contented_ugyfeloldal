-- Videós jóváhagyási mód (pl. APPLiA) és időbélyeges kommentek
alter table clients add column if not exists portal_mode text not null default 'standard';
alter table comments add column if not exists timecode numeric;
update clients set portal_mode = 'video' where id = '8692106a-8f27-4801-ab15-89b28d4b3ae7';
