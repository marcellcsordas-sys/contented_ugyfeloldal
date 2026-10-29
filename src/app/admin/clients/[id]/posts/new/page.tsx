import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { normalizeMonth } from '@/lib/format';
import TopBar from '@/components/TopBar';
import PostForm from '@/components/admin/PostForm';

export default async function NewPostPage({
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
  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).maybeSingle();
  if (!client) notFound();

  return (
    <>
      <TopBar name={profile?.full_name ?? 'Admin'} sub="Contented" admin />
      <div className="wrap" style={{ maxWidth: 960 }}>
        <div className="stack" style={{ gap: 24 }}>
          <Link className="chip" href={`/admin/clients/${id}?m=${month}`} style={{ alignSelf: 'flex-start' }}>‹ {client.name}</Link>
          <h1 className="h1">Új tartalom.<span className="second">{client.name}</span></h1>
          <PostForm clientId={id} month={month} />
        </div>
      </div>
    </>
  );
}
