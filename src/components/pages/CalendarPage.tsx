import { loadMonthPosts } from '@/lib/load';
import { currentMonthKey, normalizeMonth, shiftMonth } from '@/lib/format';
import { getPortalCtx } from '@/lib/portal';
import type { Offer, Package } from '@/lib/types';
import PortalView from '@/components/PortalView';
import PortalShell, { NoClient } from '@/components/PortalShell';

export default async function CalendarPage({ previewId, m }: { previewId?: string; m?: string }) {
  const ctx = await getPortalCtx(previewId);
  if (!ctx) return <NoClient userName="" />;
  const { supabase, clientId, client } = ctx;
  const month = normalizeMonth(m);
  const briefMonth = shiftMonth(currentMonthKey(), 1);

  const [{ data: pkg }, { data: offer }, { data: requests }, { data: brief }, posts] = await Promise.all([
    supabase.from('packages').select('*').eq('client_id', clientId).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', clientId).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<Offer>(),
    supabase.from('offer_requests').select('offer_id').eq('client_id', clientId),
    supabase.from('monthly_inputs').select('submitted').eq('client_id', clientId).eq('month', `${briefMonth}-01`)
      .maybeSingle<{ submitted: boolean }>(),
    loadMonthPosts(supabase, clientId, month),
  ]);
  const requested = new Set((requests ?? []).map((r: { offer_id: string }) => r.offer_id));

  return (
    <PortalShell
      active="naptar"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}?m=${month}` } : undefined}
    >
      <PortalView
        month={month}
        clientId={clientId}
        clientName={client.name}
        contactName={ctx.mode === 'client' ? ctx.userName : client.contact_name ?? ''}
        pkg={pkg ?? null}
        offer={offer ?? null}
        offerRequested={offer ? requested.has(offer.id) : false}
        posts={posts}
        mode={ctx.mode}
        basePath={ctx.base}
        brief={{ month: briefMonth, state: brief?.submitted ? 'done' : brief ? 'draft' : 'none' }}
      />
    </PortalShell>
  );
}
