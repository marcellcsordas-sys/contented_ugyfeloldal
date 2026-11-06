'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { missingRequired, type BriefAnswers } from '@/lib/brief';

type Result = { ok: true } | { ok: false; error: string };

export async function addComment(postId: string, body: string): Promise<Result> {
  const text = body.trim();
  if (!text) return { ok: false, error: 'Üres komment.' };
  const supabase = await createClient();
  const { error } = await supabase.from('comments').insert({ post_id: postId, body: text });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal');
  return { ok: true };
}

export async function setPostStatus(postId: string, status: 'ok' | 'mod', comment: string): Promise<Result> {
  const supabase = await createClient();
  const text = comment.trim() || (status === 'mod' ? 'Módosítást kérek, egyeztessünk.' : '');
  if (text) {
    const { error } = await supabase.from('comments').insert({ post_id: postId, body: text });
    if (error) return { ok: false, error: error.message };
  }
  const { error } = await supabase.rpc('client_set_post_status', { p_post: postId, p_status: status });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function approveMonth(month: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('client_approve_month', { p_month: `${month}-01` });
  if (error) return { ok: false, error: error.message };
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
  if (submit) {
    revalidatePath('/portal', 'layout');
    revalidatePath('/admin', 'layout');
  }
  return { ok: true };
}
