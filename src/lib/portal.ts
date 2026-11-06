import { notFound } from 'next/navigation';
import { getSessionProfile, requireAdmin } from './session';
import type { Client } from './types';
import type { createClient } from './supabase/server';

type Supa = Awaited<ReturnType<typeof createClient>>;

export type PortalCtx = {
  supabase: Supa;
  userName: string;
  clientId: string;
  client: Client;
  mode: 'client' | 'preview';
  base: string; // a menü linkjeinek alapja
};

// Ügyfél: a saját ügyfele. Admin előnézet: a megadott ügyfél.
export async function getPortalCtx(previewId?: string): Promise<PortalCtx | null> {
  if (previewId) {
    const { supabase, profile } = await requireAdmin();
    const { data: client } = await supabase.from('clients').select('*').eq('id', previewId).maybeSingle<Client>();
    if (!client) notFound();
    return {
      supabase,
      userName: profile?.full_name ?? 'Admin',
      clientId: previewId,
      client,
      mode: 'preview',
      base: `/admin/clients/${previewId}/preview`,
    };
  }
  const { supabase, profile } = await getSessionProfile();
  if (!profile?.client_id) return null;
  const { data: client } = await supabase.from('clients').select('*').eq('id', profile.client_id).maybeSingle<Client>();
  if (!client) return null;
  return {
    supabase,
    userName: profile.full_name ?? '',
    clientId: profile.client_id,
    client,
    mode: 'client',
    base: '/portal',
  };
}

export { revisionRounds, usageRows } from './usage';
