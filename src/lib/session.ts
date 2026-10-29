import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

export async function getSessionProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, client_id')
    .eq('id', user.id)
    .single<Profile>();
  return { supabase, user, profile };
}

export async function requireAdmin() {
  const s = await getSessionProfile();
  if (s.profile?.role !== 'admin') redirect('/');
  return s;
}

// Privát bucket: 1 órás aláírt linkek a képekhez, videókhoz
export async function signPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[]
) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from('media').createSignedUrls(paths, 3600);
  data?.forEach((row) => {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  });
  return map;
}
