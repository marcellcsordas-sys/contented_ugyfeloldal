import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { loadMonthPosts } from '@/lib/load';
import { normalizeMonth } from '@/lib/format';
import type { Client, Offer, Package } from '@/lib/types';
import TopBar from '@/components/TopBar';
import PortalView from '@/components/PortalView';

// Így látja az ügyfél. Adminként itt is lehet kommentelni és státuszt váltani.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  const month = normalizeMonth(m);
  const { supabase, profile } = await requireAdmin();

  const [{ data: client }, { data: pkg }, { data: offer }, posts] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).maybeSingle<Client>(),
    supabase.from('packages').select('*').eq('client_id', id).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', id).eq('active', true).order('created_at', { ascending: false })
      .limit(1).maybeSingle<Offer>(),
    loadMonthPosts(supabase, id, month),
  ]);
  if (!client) notFound();

  return (
    <>
      <TopBar name={profile?.full_name ?? 'Admin'} sub="Ügyfélnézet előnézet" admin />
      <div className="wrap" style={{ paddingBottom: 0 }}>
        <div className="notice row between">
          <span className="small">Előnézet: így látja {client.name} a portált.</span>
          <Link className="btn btn-ghost btn-sm" href={`/admin/clients/${id}?m=${month}`}>Vissza a szerkesztéshez</Link>
        </div>
      </div>
      <PortalView
        month={month}
        clientId={id}
        clientName={client.name}
        contactName={client.contact_name ?? ''}
        pkg={pkg ?? null}
        offer={offer ?? null}
        offerRequested={false}
        posts={posts}
        mode="preview"
        basePath={`/admin/clients/${id}/preview`}
      />
    </>
  );
}
