import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { STATUS, formatPostDate, monthLabel, normalizeMonth, shiftMonth, monthRange } from '@/lib/format';
import type { Client, Offer, Package, Post } from '@/lib/types';
import TopBar from '@/components/TopBar';
import ActionForm from '@/components/admin/ActionForm';
import PostRowActions from '@/components/admin/PostRowActions';
import OfferOff from '@/components/admin/OfferOff';
import { inviteUser, saveOffer, savePackage } from '../../actions';

type Member = { id: string; full_name: string | null };

export default async function ClientAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  const month = normalizeMonth(m);
  const { start, end } = monthRange(month);
  const { supabase, profile } = await requireAdmin();

  const [{ data: client }, { data: pkg }, { data: offer }, { data: posts }, { data: members }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).maybeSingle<Client>(),
    supabase.from('packages').select('*').eq('client_id', id).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', id).eq('active', true).order('created_at', { ascending: false })
      .limit(1).maybeSingle<Offer>(),
    supabase.from('posts').select('*').eq('client_id', id).gte('publish_date', start).lt('publish_date', end)
      .order('publish_date').order('number').returns<Post[]>(),
    supabase.from('profiles').select('id, full_name').eq('client_id', id).returns<Member[]>(),
  ]);
  if (!client) notFound();

  const ml = monthLabel(month);
  const base = `/admin/clients/${id}`;

  return (
    <>
      <TopBar name={profile?.full_name ?? 'Admin'} sub="Contented" admin />
      <div className="wrap">
        <div className="split">
          <section className="split-main">
            <div className="row between" style={{ alignItems: 'flex-end', gap: 18 }}>
              <div className="stack" style={{ gap: 10 }}>
                <div className="row">
                  <Link className="chip" href={`${base}?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
                  <span className="eyebrow">{client.name} · {ml.full}</span>
                  <Link className="chip" href={`${base}?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
                </div>
                <h1 className="h1">
                  {client.name}.
                  <span className="second">{posts?.length ?? 0} tartalom ebben a hónapban.</span>
                </h1>
              </div>
              <div className="row">
                <Link className="btn btn-ghost" href={`${base}/preview?m=${month}`}>Ügyfélnézet</Link>
                <Link className="btn btn-light" href={`${base}/posts/new?m=${month}`}>Új tartalom</Link>
              </div>
            </div>

            {(posts ?? []).length === 0 ? (
              <div className="empty">Ebben a hónapban még nincs tartalom. Kattints az „Új tartalom” gombra.</div>
            ) : (
              <div className="card scroll-x" style={{ padding: 6 }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Dátum</th><th>Platform · típus</th><th>Vizuál</th><th>Státusz</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(posts ?? []).map((p) => (
                      <tr key={p.id}>
                        <td>{p.number ?? ''}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatPostDate(p.publish_date)}</td>
                        <td>
                          <Link href={`${base}/posts/${p.id}`} style={{ fontWeight: 500 }}>{p.platform} · {p.content_type}</Link>
                          <div className="tiny muted">{(p.visual_headline || p.caption).slice(0, 60)}</div>
                        </td>
                        <td className="tiny muted">{p.visual_path ? (p.is_video ? 'Videó feltöltve' : 'Kép feltöltve') : 'Nincs fájl'}</td>
                        <td><span className={`pill ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                        <td><PostRowActions clientId={id} postId={p.id} status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ActionForm action={saveOffer.bind(null, id)} submitLabel="Ajánlat élesítése" successText="Az ajánlat élesben van." resetOnSuccess>
              <div className="row between">
                <span className="eyebrow">Felugró ajánlat (upsell)</span>
                {offer && <OfferOff clientId={id} />}
              </div>
              {offer ? (
                <div className="panel stack" style={{ gap: 4 }}>
                  <span className="small" style={{ fontWeight: 500 }}>Most aktív: {offer.title}</span>
                  <span className="tiny muted">{offer.price_label} · {offer.cta_label}</span>
                </div>
              ) : (
                <span className="small muted">Nincs aktív ajánlat. Egy új ajánlat élesítése felváltja az előzőt.</span>
              )}
              <div className="form-grid">
                <div className="field"><label htmlFor="o-title">Cím</label><input id="o-title" name="title" className="input" placeholder="Havi 8 videó 4 helyett." required /></div>
                <div className="field"><label htmlFor="o-price">Ár</label><input id="o-price" name="price_label" className="input" placeholder="+120 000 Ft / hó" /></div>
                <div className="field"><label htmlFor="o-cta">Gomb felirat</label><input id="o-cta" name="cta_label" className="input" placeholder="Ezt választom" /></div>
              </div>
              <div className="field"><label htmlFor="o-sub">Indoklás</label><textarea id="o-sub" name="subtitle" className="textarea" placeholder="Mind a 4 novemberi videód elfogyott..." /></div>
            </ActionForm>
          </section>

          <aside className="split-side">
            <ActionForm action={savePackage.bind(null, id)} submitLabel="Csomag mentése" successText="Elmentve.">
              <span className="eyebrow">Csomag</span>
              <div className="field"><label htmlFor="p-name">Csomag neve</label><input id="p-name" name="name" className="input" defaultValue={pkg?.name ?? ''} /></div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field"><label htmlFor="p-fee">Havidíj (Ft)</label><input id="p-fee" name="monthly_fee" className="input" inputMode="numeric" defaultValue={pkg?.monthly_fee ?? 0} /></div>
                <div className="field"><label htmlFor="p-note">Díj megjegyzés</label><input id="p-note" name="fee_note" className="input" defaultValue={pkg?.fee_note ?? ''} /></div>
                <div className="field"><label htmlFor="p-posts">Poszt / hó</label><input id="p-posts" name="posts_quota" className="input" inputMode="numeric" defaultValue={pkg?.posts_quota ?? 0} /></div>
                <div className="field"><label htmlFor="p-videos">Videó / hó</label><input id="p-videos" name="videos_quota" className="input" inputMode="numeric" defaultValue={pkg?.videos_quota ?? 0} /></div>
                <div className="field"><label htmlFor="p-rev">Módosítási kör / hó</label><input id="p-rev" name="revisions_quota" className="input" inputMode="numeric" defaultValue={pkg?.revisions_quota ?? 0} /></div>
                <div className="field"><label htmlFor="p-since">Mióta</label><input id="p-since" name="since_label" className="input" placeholder="2025. március óta" defaultValue={pkg?.since_label ?? ''} /></div>
              </div>
              <div className="field"><label htmlFor="p-inc">Mit tartalmaz (soronként egy)</label><textarea id="p-inc" name="includes" className="textarea" defaultValue={(pkg?.includes ?? []).join('\n')} /></div>
              <div className="field"><label htmlFor="p-terms">Feltételek (soronként egy)</label><textarea id="p-terms" name="terms" className="textarea" style={{ minHeight: 160 }} defaultValue={(pkg?.terms ?? []).join('\n')} /></div>
              <div className="field"><label htmlFor="p-contract">Szerződés</label><input id="p-contract" name="contract_note" className="input" placeholder="Határozatlan idejű, 30 napos felmondással." defaultValue={pkg?.contract_note ?? ''} /></div>
            </ActionForm>

            <ActionForm action={inviteUser.bind(null, id)} submitLabel="Meghívót küldök" successText="Meghívó elküldve." resetOnSuccess>
              <span className="eyebrow">Hozzáférés</span>
              {(members ?? []).length === 0 ? (
                <span className="small muted">Még senki nem fér hozzá ehhez az ügyfélhez.</span>
              ) : (
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                  {(members ?? []).map((u) => <li key={u.id}>{u.full_name}</li>)}
                </ul>
              )}
              <div className="field"><label htmlFor="i-name">Név</label><input id="i-name" name="full_name" className="input" placeholder="Dominik" /></div>
              <div className="field"><label htmlFor="i-email">E-mail</label><input id="i-email" name="email" type="email" required className="input" placeholder="dominik@ceg.hu" /></div>
            </ActionForm>
          </aside>
        </div>
      </div>
    </>
  );
}
