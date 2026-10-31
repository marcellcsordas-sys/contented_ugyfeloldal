import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { currentMonthKey, formatShortDate, monthRange } from '@/lib/format';
import TopBar from '@/components/TopBar';
import { createClientAction } from './actions';
import HandledButton from '@/components/admin/HandledButton';

type Row = { id: string; name: string; contact_name: string | null };
type PostRow = { client_id: string; status: string };
type Req = { id: string; created_at: string; client_id: string; offers: { title: string } | null };

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin();
  const month = currentMonthKey();
  const { start, end } = monthRange(month);

  const [{ data: clients }, { data: posts }, { data: reqs }] = await Promise.all([
    supabase.from('clients').select('id, name, contact_name').order('name').returns<Row[]>(),
    supabase.from('posts').select('client_id, status').gte('publish_date', start).lt('publish_date', end).returns<PostRow[]>(),
    supabase.from('offer_requests').select('id, created_at, client_id, offers(title)').eq('handled', false)
      .order('created_at', { ascending: false }).returns<Req[]>(),
  ]);

  const stat = (id: string, s?: string) => (posts ?? []).filter((p) => p.client_id === id && (!s || p.status === s)).length;
  const nameOf = (id: string) => clients?.find((c) => c.id === id)?.name ?? '';

  return (
    <>
      <TopBar name={profile?.full_name ?? 'Admin'} sub="Contented" admin />
      <div className="wrap">
        <div className="split">
          <section className="split-main">
            <div className="stack" style={{ gap: 10 }}>
              <span className="eyebrow">Ügyfelek · ez a hónap</span>
              <h1 className="h1">
                {clients?.length ?? 0} ügyfél.
                <span className="second">{(posts ?? []).filter((p) => p.status === 'var').length} tartalom vár jóváhagyásra.</span>
              </h1>
            </div>

            {(clients ?? []).length === 0 ? (
              <div className="empty">Még nincs ügyfél. Hozd létre az elsőt jobb oldalt.</div>
            ) : (
              <div className="card scroll-x" style={{ padding: 6 }}>
                <table className="table table-stack table-stats">
                  <thead>
                    <tr><th>Ügyfél</th><th>Összes</th><th>Vár</th><th>Módosítás</th><th>Elfogadva</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(clients ?? []).map((c) => (
                      <tr key={c.id}>
                        <td className="ts-main">
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          <div className="tiny muted">{c.contact_name}</div>
                        </td>
                        <td className="ts-stat" data-label="Összes">{stat(c.id)}</td>
                        <td className="ts-stat" data-label="Vár">{stat(c.id, 'var')}</td>
                        <td className="ts-stat" data-label="Módosítás">{stat(c.id, 'mod')}</td>
                        <td className="ts-stat" data-label="Elfogadva">{stat(c.id, 'ok')}</td>
                        <td className="ts-actions" style={{ textAlign: 'right' }}>
                          <Link className="btn btn-ghost btn-sm" href={`/admin/clients/${c.id}`}>Megnyitom</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="split-side">
            <div className="card card-glow stack">
              <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>Ajánlat-kérések</span>
              {(reqs ?? []).length === 0 && <span className="small muted">Nincs új kérés.</span>}
              {(reqs ?? []).map((r) => (
                <div key={r.id} className="row between panel">
                  <div className="stack" style={{ gap: 2 }}>
                    <span className="small" style={{ fontWeight: 500 }}>{nameOf(r.client_id)}</span>
                    <span className="tiny muted">{r.offers?.title} · {formatShortDate(r.created_at)}</span>
                  </div>
                  <HandledButton id={r.id} />
                </div>
              ))}
            </div>

            <form action={createClientAction} className="card stack">
              <span className="eyebrow">Új ügyfél</span>
              <div className="field">
                <label htmlFor="name">Cégnév</label>
                <input id="name" name="name" className="input" required placeholder="Pl. AD Klíma" />
              </div>
              <div className="field">
                <label htmlFor="contact_name">Kapcsolattartó</label>
                <input id="contact_name" name="contact_name" className="input" placeholder="Pl. Dominik" />
              </div>
              <button className="btn btn-light" type="submit">Létrehozom</button>
            </form>
          </aside>
        </div>
      </div>
    </>
  );
}
