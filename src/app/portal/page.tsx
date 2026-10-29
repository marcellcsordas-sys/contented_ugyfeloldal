import { getSessionProfile } from '@/lib/session';
import { loadMonthPosts } from '@/lib/load';
import { normalizeMonth } from '@/lib/format';
import type { Client, Offer, Package } from '@/lib/types';
import PortalView from '@/components/PortalView';
import TopBar from '@/components/TopBar';

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const month = normalizeMonth(m);
  const { supabase, profile } = await getSessionProfile();

  if (!profile?.client_id) {
    return (
      <>
        <TopBar name={profile?.full_name ?? ''} sub="" />
        <div className="wrap">
          <div className="empty">A fiókod még nincs ügyfélhez rendelve. Szólj a Contentednek, és beállítjuk.</div>
        </div>
      </>
    );
  }

  const clientId = profile.client_id;
  const [{ data: client }, { data: pkg }, { data: offer }, { data: requests }, posts] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single<Client>(),
    supabase.from('packages').select('*').eq('client_id', clientId).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', clientId).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<Offer>(),
    supabase.from('offer_requests').select('offer_id').eq('client_id', clientId),
    loadMonthPosts(supabase, clientId, month),
  ]);

  const requested = new Set((requests ?? []).map((r: { offer_id: string }) => r.offer_id));

  return (
    <>
      <TopBar name={profile.full_name ?? ''} sub={client?.name ?? ''} />
      <PortalView
        month={month}
        clientId={clientId}
        clientName={client?.name ?? ''}
        contactName={profile.full_name ?? client?.contact_name ?? ''}
        pkg={pkg ?? null}
        offer={offer ?? null}
        offerRequested={offer ? requested.has(offer.id) : false}
        posts={posts}
        mode="client"
      />
    </>
  );
}
