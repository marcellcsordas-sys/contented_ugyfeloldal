'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { missingRequired, type BriefAnswers } from '@/lib/brief';

type Result = { ok: true } | { ok: false; error: string };
type Sb = Awaited<ReturnType<typeof createClient>>;

// Aktivitás napló (hibát nem dob, csak ügyfél-felhasználónál ír)
async function log(supabase: Sb, section: string, detail: string) {
  await supabase.rpc('log_activity', { p_kind: 'action', p_section: section, p_detail: detail }).then(() => {}, () => {});
}
// Csatolt képek ellenőrzése: max 3, csak az ügyfél saját comments/ mappájából
async function cleanAttachments(supabase: Sb, postId: string, attachments?: string[]) {
  const list = (attachments ?? []).filter(Boolean);
  if (list.length === 0) return [];
  if (list.length > 3) throw new Error('Legfeljebb 3 képet csatolhatsz.');
  const { data } = await supabase.from('posts').select('client_id').eq('id', postId).maybeSingle();
  const prefix = `${data?.client_id}/comments/`;
  if (!data || list.some((a) => !a.startsWith(prefix) || a.includes('..'))) throw new Error('Érvénytelen csatolmány.');
  return list;
}
async function postLabel(supabase: Sb, postId: string) {
  const { data } = await supabase.from('posts').select('number, publish_date').eq('id', postId).maybeSingle();
  return data ? `#${data.number ?? ''} ${data.publish_date}`.trim() : '';
}

export async function addComment(postId: string, body: string, timecode?: number | null, attachments?: string[]): Promise<Result> {
  const supabase = await createClient();
  let files: string[];
  try { files = await cleanAttachments(supabase, postId, attachments); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const text = body.trim() || (files.length ? 'Képet csatoltam.' : '');
  if (!text) return { ok: false, error: 'Üres komment.' };
  const { error } = await supabase.from('comments').insert({ post_id: postId, body: text, timecode: timecode ?? null, attachments: files });
  if (error) return { ok: false, error: error.message };
  await log(supabase, 'poszt', `Hozzászólt: ${await postLabel(supabase, postId)}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function setPostStatus(postId: string, status: 'ok' | 'mod', comment: string, timecode?: number | null, attachments?: string[]): Promise<Result> {
  const supabase = await createClient();
  let files: string[];
  try { files = await cleanAttachments(supabase, postId, attachments); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const text = comment.trim() || (status === 'mod' ? 'Módosítást kérek, egyeztessünk.' : files.length ? 'Képet csatoltam.' : '');
  if (text) {
    const { error } = await supabase.from('comments').insert({ post_id: postId, body: text, timecode: timecode ?? null, attachments: files });
    if (error) return { ok: false, error: error.message };
  }
  const { error } = await supabase.rpc('client_set_post_status', { p_post: postId, p_status: status });
  if (error) return { ok: false, error: error.message };
  await log(supabase, 'poszt', `${status === 'ok' ? 'Jóváhagyta' : 'Módosítást kért'}: ${await postLabel(supabase, postId)}`);
  revalidatePath('/portal');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function approveMonth(month: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('client_approve_month', { p_month: `${month}-01` });
  if (error) return { ok: false, error: error.message };
  await log(supabase, 'naptar', `Az egész hónapot jóváhagyta (${month})`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function requestOffer(offerId: string, clientId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Nincs belépve.' };
  const { error } = await supabase
    .from('offer_requests')
    .insert({ offer_id: offerId, client_id: clientId, requested_by: user.id });
  if (error) return { ok: false, error: error.message };
  await log(supabase, 'csomag', 'Ajánlatot kért');
  revalidatePath('/portal');
  return { ok: true };
}

// Havi tervező: piszkozat mentése (submit=false) vagy beküldés (submit=true).
export async function saveBrief(
  clientId: string,
  month: string,
  answers: BriefAnswers,
  submit: boolean
): Promise<Result> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: 'Hibás hónap.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Nincs belépve.' };
  if (submit) {
    const miss = missingRequired(answers);
    if (miss.length) return { ok: false, error: `Még hiányzik: ${miss.join(', ')}.` };
  }
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const monthDate = `${month}-01`;
  const now = new Date().toISOString();
  const extra = submit
    ? { submitted: true, submitted_by: user.id, submitted_by_name: me?.full_name ?? null, submitted_at: now }
    : {};

  const { data: existing } = await supabase
    .from('monthly_inputs').select('id').eq('client_id', clientId).eq('month', monthDate).maybeSingle();
  const { error } = existing
    ? await supabase.from('monthly_inputs').update({ answers, updated_at: now, ...extra }).eq('id', existing.id)
    : await supabase.from('monthly_inputs').insert({ client_id: clientId, month: monthDate, answers, updated_at: now, ...extra });
  if (error) return { ok: false, error: error.message };
  await log(supabase, 'brief', submit ? `Beküldte a tervezőt (${month})` : `Kitöltötte a tervezőt (${month})`);
  if (submit) {
    revalidatePath('/portal', 'layout');
    revalidatePath('/admin', 'layout');
  }
  return { ok: true };
}
