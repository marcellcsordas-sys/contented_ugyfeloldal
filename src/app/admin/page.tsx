import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { currentMonthKey, formatShortDate, monthLabel, monthRange, shiftMonth } from '@/lib/format';
import { briefDeadline } from '@/lib/brief';
import TopBar from '@/components/TopBar';
import { createClientAction } from './actions';
import HandledButton from '@/components/admin/HandledButton';
import { fmtTime } from '@/components/admin/ActivityCard';

type Row = { id: string; name: string; contact_name: string | null };
type PostRow = { client_id: string; status: string };
type Req = { id: string; created_at: string; client_id: string; offers: { title: string } | null };

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin();
  const month = currentMonthKey();
  const { start, end } = monthRange(month);

  const briefMonth = shiftMonth(month, 1);
  const bml = monthLabel(briefMonth);
  const dl = briefDeadline(briefMonth);
  const dlText = `${monthLabel(`${dl.getFullYear()}-${String(dl.getMonth() + 1).padStart(2, '0')}`).name} ${dl.getDate()}.`;

  const [{ data: clients }, { data: posts }, { data: reqs }, { data: briefs }, { data: acts }] = await Promise.all([
    supabase.from('clients').select('id, name, contact_name').order('name').returns<Row[]>(),
    supabase.from('posts').select('client_id, status').gte('publish_date', start).lt('publish_date', end).returns<PostRow[]>(),
    supabase.from('offer_requests').select('id, created_at, client_id, offers(title)').eq('handled', false)
      .order('created_at', { ascending: false }).returns<Req[]>(),
    supabase.from('monthly_inputs').select('client_id, submitted, submitted_at').eq('month', `${briefMonth}-01`)
      .returns<{ client_id: string; submitted: boolean; submitted_at: string | null }[]>(),
    supabase.from('activity_log').select('client_id, created_at').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('created_at', { ascending: false }).limit(2000).returns<{ client_id: string; created_at: string }[]>(),
  ]);
  const lastAct = (id: string) => (acts ?? []).find((a) => a.client_id === id)?.created_at;
  const briefOf = (id: string) => (briefs ?? []).find((b) => b.client_id === id);
  const doneCount = (clients ?? []).filter((c) => briefOf(c.id)?.submitted).length;

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
              <span className="small muted">
                {bml.name.charAt(0).toUpperCase() + bml.name.slice(1)}i social media tervező: {doneCount} / {clients?.length ?? 0} kitöltve. Határidő: {dlText}
              </span>
            </div>

            {(clients ?? []).length === 0 ? (
              <div className="empty">Még nincs ügyfél. Hozd létre az elsőt jobb oldalt.</div>
            ) : (
              <div className="card scroll-x" style={{ padding: 6 }}>
                <table className="table table-stack table-stats">
                  <thead>
                    <tr><th>Ügyfél</th><th>Összes</th><th>Vár</th><th>Módosítás</th><th>Elfogadva</th><th>Tervező · {bml.name}</th><th>Utolsó aktivitás</th><th></th></tr>
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
                        <td className="ts-brief">
                          {(() => {
                            const b = briefOf(c.id);
                            const cls = b?.submitted ? 'pill-ok' : b ? 'pill-mod' : 'pill-keszul';
                            const text = b?.submitted
                              ? `Kitöltve${b.submitted_at ? ` · ${formatShortDate(b.submitted_at)}` : ''}`
                              : b ? 'Elkezdte' : 'Nincs kitöltve';
                            return (
                              <Link href={`/admin/clients/${c.id}?m=${briefMonth}`} className={`pill ${cls}`} style={{ textDecoration: 'none' }}>
                                {text}
                              </Link>
                            );
                          })()}
                        </td>
                        <td className="ts-stat" data-label="Utolsó aktivitás">
                          <span className="tiny muted">{lastAct(c.id) ? fmtTime(lastAct(c.id)!) : 'Még nem'}</span>
                        </td>
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
