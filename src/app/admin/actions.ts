'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PostStatus } from '@/lib/types';

type Result = { ok: true; id?: string } | { ok: false; error: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim();
}
function lines(fd: FormData, key: string) {
  return str(fd, key).split('\n').map((l) => l.trim()).filter(Boolean);
}
function int(fd: FormData, key: string, fallback: number) {
  const n = parseInt(str(fd, key).replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function createClientAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(fd, 'name');
  if (!name) return;
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, contact_name: str(fd, 'contact_name') || null })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Nem sikerült létrehozni.');
  await supabase.from('packages').insert({ client_id: data.id });
  revalidatePath('/admin');
  redirect(`/admin/clients/${data.id}`);
}

export async function savePackage(clientId: string, fd: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('packages').upsert({
    client_id: clientId,
    name: str(fd, 'name') || 'AI Marketing Partnership',
    monthly_fee: int(fd, 'monthly_fee', 0),
    fee_note: str(fd, 'fee_note'),
    since_label: str(fd, 'since_label') || null,
    contract_note: str(fd, 'contract_note') || null,
    includes: lines(fd, 'includes'),
    terms: lines(fd, 'terms'),
    posts_quota: int(fd, 'posts_quota', 0),
    videos_quota: int(fd, 'videos_quota', 0),
    revisions_quota: int(fd, 'revisions_quota', 0),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function saveOffer(clientId: string, fd: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const title = str(fd, 'title');
  if (!title) return { ok: false, error: 'Az ajánlat címe kötelező.' };
  // Egyszerre egy aktív ajánlat ügyfelenként
  await supabase.from('offers').update({ active: false }).eq('client_id', clientId);
  const { error } = await supabase.from('offers').insert({
    client_id: clientId,
    title,
    subtitle: str(fd, 'subtitle') || null,
    price_label: str(fd, 'price_label') || null,
    cta_label: str(fd, 'cta_label') || 'Ezt választom',
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function deactivateOffers(clientId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('offers').update({ active: false }).eq('client_id', clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function markRequestHandled(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('offer_requests').update({ handled: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function inviteUser(clientId: string, fd: FormData): Promise<Result> {
  await requireAdmin();
  const email = str(fd, 'email').toLowerCase();
  const fullName = str(fd, 'full_name');
  if (!email) return { ok: false, error: 'Az e-mail cím kötelező.' };
  const admin = createAdminClient();
  // A meghívó arra a címre mutat, amin az admin épp dolgozik
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const site = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? '');
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { client_id: clientId, full_name: fullName || undefined },
    redirectTo: `${site}/auth/callback`,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

// Belépő link kézi kiküldéshez: e-mail küldés nélkül készít egyszer használható linket.
// Új címnél meghívást hoz létre az ügyfélhez, meglévőnél új belépő linket ad.
export async function createAccessLink(
  clientId: string,
  fd: FormData,
): Promise<{ ok: true; link: string; isNew: boolean } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();
  const email = str(fd, 'email').toLowerCase();
  const fullName = str(fd, 'full_name');
  if (!email) return { ok: false, error: 'Az e-mail cím kötelező.' };
  const admin = createAdminClient();
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const site = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? '');

  let isNew = true;
  let res = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { client_id: clientId, full_name: fullName || undefined }, redirectTo: `${site}/auth/callback` },
  });
  if (res.error) {
    // Már létező felhasználó: csak akkor adunk linket, ha ehhez az ügyfélhez tartozik
    isNew = false;
    res = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (res.error || !res.data.user) return { ok: false, error: res.error?.message ?? 'Nem sikerült linket készíteni.' };
    const { data: prof } = await supabase.from('profiles').select('client_id, role').eq('id', res.data.user.id).maybeSingle();
    if (!prof || (prof.role !== 'admin' && prof.client_id !== clientId)) {
      return { ok: false, error: 'Ez az e-mail cím egy másik ügyfélhez tartozik.' };
    }
  }
  if (isNew && res.data.user) {
    // A generateLink a felhasználót előbb hozza létre, mint a meghívás dátumát: az ügyfélhez itt kötjük hozzá
    await admin.from('profiles').update({ client_id: clientId, full_name: fullName || undefined }).eq('id', res.data.user.id);
  }
  const token = res.data.properties?.hashed_token;
  if (!token) return { ok: false, error: 'Nem sikerült linket készíteni.' };
  const type = isNew ? 'invite' : 'magiclink';
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, isNew, link: `${site}/auth/callback?token_hash=${token}&type=${type}&next=/jelszo` };
}

export type PostInput = {
  number: number | null;
  platform: string;
  content_type: string;
  publish_date: string;
  format: string;
  is_video: boolean;
  visual_path: string | null;
  visual_headline: string | null;
  caption: string;
  internal_note: string | null;
  video_url: string | null;
  status: PostStatus;
};

export async function savePost(clientId: string, postId: string | null, input: PostInput): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!input.platform || !input.publish_date) return { ok: false, error: 'Platform és dátum kötelező.' };
  const row = { ...input, client_id: clientId, updated_at: new Date().toISOString() };

  if (postId) {
    // Ha új fájl jött, a régit töröljük a tárhelyről
    const { data: old } = await supabase.from('posts').select('visual_path').eq('id', postId).single();
    const { error } = await supabase.from('posts').update(row).eq('id', postId);
    if (error) return { ok: false, error: error.message };
    if (old?.visual_path && old.visual_path !== input.visual_path) {
      await supabase.storage.from('media').remove([old.visual_path]);
    }
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/portal');
    return { ok: true, id: postId };
  }

  const { data, error } = await supabase.from('posts').insert(row).select('id').single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Mentési hiba.' };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true, id: data.id };
}

export async function setStatusAdmin(clientId: string, postId: string, status: PostStatus): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function deletePost(clientId: string, postId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data: old } = await supabase.from('posts').select('visual_path').eq('id', postId).single();
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) return { ok: false, error: error.message };
  if (old?.visual_path) await supabase.storage.from('media').remove([old.visual_path]);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function saveAdReport(clientId: string, month: string, platform: 'meta' | 'google', fd: FormData): Promise<Result> {
  const { supabase } = await requireAdmin();
  const num = (v?: string) => {
    const x = parseInt((v ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(x) ? x : 0;
  };
  // Soronként: cél | költés | eredmény
  const breakdown = lines(fd, 'breakdown').map((l) => {
    const [label, spend, result] = l.split('|').map((x) => x.trim());
    return { label, spend: num(spend), result: result ?? '' };
  }).filter((b) => b.label);
  // Soronként: érték | címke
  const stats = lines(fd, 'hl_stats').map((l) => {
    const [value, label] = l.split('|').map((x) => x.trim());
    return { value, label: label ?? '' };
  }).filter((x) => x.value);
  const hlTitle = str(fd, 'hl_title');
  const highlight = hlTitle
    ? { title: hlTitle, subtitle: str(fd, 'hl_subtitle') || undefined, image_path: str(fd, 'hl_image') || undefined, stats, note: str(fd, 'hl_note') || undefined }
    : null;
  const { error } = await supabase.from('ad_reports').upsert({
    client_id: clientId,
    month: `${month}-01`,
    platform,
    period_label: str(fd, 'period_label') || null,
    spend: int(fd, 'spend', 0),
    reach: int(fd, 'reach', 0),
    impressions: int(fd, 'impressions', 0),
    leads: int(fd, 'leads', 0),
    leads_spend: int(fd, 'leads_spend', 0),
    engagements: int(fd, 'engagements', 0),
    new_followers: int(fd, 'new_followers', 0),
    active_ads: int(fd, 'active_ads', 0),
    summary: str(fd, 'summary') || null,
    breakdown,
    highlight,
    source: 'kézi',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'client_id,month,platform' });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal', 'layout');
  return { ok: true };
}

export async function deleteAdReport(clientId: string, month: string, platform: 'meta' | 'google'): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('ad_reports').delete()
    .eq('client_id', clientId).eq('month', `${month}-01`).eq('platform', platform);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/portal', 'layout');
  return { ok: true };
}
