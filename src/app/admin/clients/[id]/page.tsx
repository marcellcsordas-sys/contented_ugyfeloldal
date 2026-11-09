import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { STATUS, formatPostDate, formatShortDate, monthLabel, normalizeMonth, shiftMonth, monthRange } from '@/lib/format';
import type { Client, Offer, Package, Post } from '@/lib/types';
import TopBar from '@/components/TopBar';
import ClientAccess from '@/components/admin/ClientAccess';
import { createAdminClient } from '@/lib/supabase/admin';
import ActionForm from '@/components/admin/ActionForm';
import PostRowActions from '@/components/admin/PostRowActions';
import OfferOff from '@/components/admin/OfferOff';
import { saveAdReport, saveOffer, savePackage } from '../../actions';
import { goalText, type MonthlyInput } from '@/lib/brief';
import type { AdReport } from '@/lib/types';

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

  const [{ data: client }, { data: pkg }, { data: offer }, { data: posts }, { data: members }, { data: brief }, { data: ads }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).maybeSingle<Client>(),
    supabase.from('packages').select('*').eq('client_id', id).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', id).eq('active', true).order('created_at', { ascending: false })
      .limit(1).maybeSingle<Offer>(),
    supabase.from('posts').select('*').eq('client_id', id).gte('publish_date', start).lt('publish_date', end)
      .order('publish_date').order('number').returns<Post[]>(),
    supabase.from('profiles').select('id, full_name').eq('client_id', id).returns<Member[]>(),
    supabase.from('monthly_inputs').select('*').eq('client_id', id).eq('month', `${month}-01`).maybeSingle<MonthlyInput>(),
    supabase.from('ad_reports').select('*').eq('client_id', id).eq('month', `${month}-01`).returns<AdReport[]>(),
  ]);
  // A tagok e-mail címe az auth táblában van: service role-lal olvassuk (az oldal csak adminnak érhető el)
  const adminSb = createAdminClient();
  const access = await Promise.all((members ?? []).map(async (u) => {
    const { data } = await adminSb.auth.admin.getUserById(u.id);
    return { id: u.id, full_name: u.full_name ?? (data.user?.email ?? '').split('@')[0], email: data.user?.email ?? '', pending: Boolean(data.user?.user_metadata?.pw_temp) };
  }));
  const adOf = (p: 'meta' | 'google') => (ads ?? []).find((r) => r.platform === p);
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
                <div className="row month-row">
                  <Link className="chip month-nav" href={`${base}?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
                  <span className="eyebrow">{client.name} · {ml.full}</span>
                  <Link className="chip month-nav" href={`${base}?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
                </div>
                <h1 className="h1">
                  {client.name}.
                  <span className="second">{posts?.length ?? 0} tartalom ebben a hónapban.</span>
                </h1>
              </div>
              <div className="row head-actions">
                <Link className="btn btn-ghost" href={`${base}/preview?m=${month}`}>Ügyfélnézet</Link>
                <Link className="btn btn-light" href={`${base}/posts/new?m=${month}`}>Új tartalom</Link>
              </div>
            </div>

            {(posts ?? []).length === 0 ? (
              <div className="empty">Ebben a hónapban még nincs tartalom. Kattints az „Új tartalom” gombra.</div>
            ) : (
              <div className="card scroll-x" style={{ padding: 6 }}>
                <table className="table table-stack">
                  <thead>
                    <tr><th>#</th><th>Dátum</th><th>Platform · típus</th><th>Vizuál</th><th>Státusz</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(posts ?? []).map((p) => (
                      <tr key={p.id}>
                        <td className="ts-num">{p.number ? `#${p.number}` : ''}</td>
                        <td className="ts-date" style={{ whiteSpace: 'nowrap' }}>{formatPostDate(p.publish_date)}</td>
                        <td className="ts-main">
                          <Link href={`${base}/posts/${p.id}`} style={{ fontWeight: 500 }}>{p.platform} · {p.content_type}</Link>
                          <div className="tiny muted">{(p.visual_headline || p.caption).slice(0, 60)}</div>
                        </td>
                        <td className="tiny muted ts-file">{p.visual_path ? (p.is_video ? 'Videó feltöltve' : 'Kép feltöltve') : 'Nincs fájl'}</td>
                        <td className="ts-status"><span className={`pill ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span></td>
                        <td className="ts-actions"><PostRowActions clientId={id} postId={p.id} status={p.status} /></td>
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

            <div className="card stack">
              <div className="row between">
                <span className="eyebrow">Havi tervező · {ml.full}</span>
                <Link className="tiny muted" href={`${base}/preview/brief?m=${month}`}>Megnyitás ügyfélnézetben</Link>
              </div>
              {!brief ? (
                <span className="small muted">Erre a hónapra még nem töltötték ki.</span>
              ) : (
                <>
                  <span className={`pill ${brief.submitted ? 'pill-ok' : 'pill-keszul'}`} style={{ alignSelf: 'flex-start' }}>
                    {brief.submitted ? `Elküldve${brief.submitted_by_name ? ` · ${brief.submitted_by_name}` : ''}${brief.submitted_at ? ` · ${formatShortDate(brief.submitted_at)}` : ''}` : 'Piszkozat, még nincs elküldve'}
                  </span>
                  <dl className="brief-dl">
                    <dt>Cél</dt><dd>{goalText(brief.answers) || '–'}</dd>
                    <dt>Kiemelés</dt><dd>{brief.answers.highlight || '–'}</dd>
                    <dt>Dátumok</dt><dd>{brief.answers.no_dates ? 'Nincs' : (brief.answers.dates ?? []).map((d) => `${d.date.slice(5).replace('-', '.')}. ${d.label}`).join('\n') || '–'}</dd>
                    <dt>Részvétel</dt><dd>{(brief.answers.participation ?? []).join('\n') || '–'}</dd>
                    <dt>Mi újság</dt><dd>{brief.answers.news || '–'}</dd>
                    <dt>Visszajelzés</dt><dd>{[
                      Object.values(brief.answers.feedback_posts ?? {}).filter((v) => v === 'up').length ? `👍 ${Object.values(brief.answers.feedback_posts ?? {}).filter((v) => v === 'up').length} poszt` : '',
                      Object.values(brief.answers.feedback_posts ?? {}).filter((v) => v === 'down').length ? `👎 ${Object.values(brief.answers.feedback_posts ?? {}).filter((v) => v === 'down').length} poszt` : '',
                      brief.answers.feedback ?? '',
                    ].filter(Boolean).join('\n') || '–'}</dd>
                    <dt>Anyagok</dt><dd>{brief.answers.assets ? <a href={brief.answers.assets} target="_blank" rel="noreferrer">{brief.answers.assets}</a> : '–'}</dd>
                  </dl>
                </>
              )}
            </div>

            {(['meta', 'google'] as const).map((p) => {
              const r = adOf(p);
              const hl = r?.highlight;
              return (
                <ActionForm key={p} action={saveAdReport.bind(null, id, month, p)} submitLabel="Riport mentése" successText="Elmentve, az ügyfél látja.">
                  <div className="row between">
                    <span className="eyebrow">{p === 'meta' ? 'Meta' : 'Google'} hirdetési riport · {ml.full}</span>
                    <Link className="tiny muted" href={`${base}/preview/hirdetesek?m=${month}`}>Ügyfélnézet</Link>
                  </div>
                  <span className="tiny muted">Pozitív hangvétel: az ügyfél ebből egy áttekinthető dashboardot lát. Üresen hagyott platform nem jelenik meg.</span>
                  <div className="form-grid">
                    <div className="field"><label>Időszak</label><input name="period_label" className="input" placeholder="november 1–30." defaultValue={r?.period_label ?? ''} /></div>
                    <div className="field"><label>Teljes költés (Ft)</label><input name="spend" className="input" inputMode="numeric" defaultValue={r?.spend ?? ''} /></div>
                    <div className="field"><label>Ajánlatkérés (db)</label><input name="leads" className="input" inputMode="numeric" defaultValue={r?.leads ?? ''} /></div>
                    <div className="field"><label>Ajánlatkérő kampányok költése (Ft)</label><input name="leads_spend" className="input" inputMode="numeric" defaultValue={r?.leads_spend ?? ''} /></div>
                    <div className="field"><label>Elért emberek</label><input name="reach" className="input" inputMode="numeric" defaultValue={r?.reach ?? ''} /></div>
                    <div className="field"><label>Megjelenés</label><input name="impressions" className="input" inputMode="numeric" defaultValue={r?.impressions ?? ''} /></div>
                    <div className="field"><label>Interakció</label><input name="engagements" className="input" inputMode="numeric" defaultValue={r?.engagements ?? ''} /></div>
                    <div className="field"><label>Új követő</label><input name="new_followers" className="input" inputMode="numeric" defaultValue={r?.new_followers ?? ''} /></div>
                    <div className="field"><label>Aktív hirdetések</label><input name="active_ads" className="input" inputMode="numeric" defaultValue={r?.active_ads ?? ''} /></div>
                  </div>
                  <div className="field"><label>Keret elosztása (soronként: cél | költés | eredmény)</label><textarea name="breakdown" className="textarea" placeholder="Ajánlatkérés | 22189 | 1 ajánlatkérés" defaultValue={(r?.breakdown ?? []).map((b) => `${b.label} | ${b.spend} | ${b.result}`).join('\n')} /></div>
                  <span className="eyebrow" style={{ marginTop: 6 }}>A hónap kedvence</span>
                  <div className="form-grid">
                    <div className="field"><label>Cím</label><input name="hl_title" className="input" defaultValue={hl?.title ?? ''} /></div>
                    <div className="field"><label>Alcím</label><input name="hl_subtitle" className="input" defaultValue={hl?.subtitle ?? ''} /></div>
                    <div className="field">
                      <label>Kép (a hónap posztjaiból)</label>
                      <select name="hl_image" className="select" defaultValue={hl?.image_path ?? ''}>
                        <option value="">Nincs kép</option>
                        {(posts ?? []).filter((x) => x.visual_path).map((x) => (
                          <option key={x.id} value={x.visual_path!}>{formatPostDate(x.publish_date)} · {x.content_type}</option>
                        ))}
                        {hl?.image_path && !(posts ?? []).some((x) => x.visual_path === hl.image_path) && <option value={hl.image_path}>Korábbi kép</option>}
                      </select>
                    </div>
                  </div>
                  <div className="field"><label>Számok (soronként: érték | címke)</label><textarea name="hl_stats" className="textarea" placeholder="6 158 | interakció" defaultValue={(hl?.stats ?? []).map((x) => `${x.value} | ${x.label}`).join('\n')} /></div>
                  <div className="field"><label>Egy mondat róla</label><input name="hl_note" className="input" defaultValue={hl?.note ?? ''} /></div>
                  <div className="field"><label>A hónap röviden (soronként egy eredmény)</label><textarea name="summary" className="textarea" style={{ minHeight: 120 }} defaultValue={r?.summary ?? ''} /></div>
                </ActionForm>
              );
            })}
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
                <div className="field"><label htmlFor="p-rev">Módosítási kör / hó (havi kör)</label><input id="p-rev" name="revisions_quota" className="input" inputMode="numeric" defaultValue={pkg?.revisions_quota ?? 0} /></div>
                <div className="field"><label htmlFor="p-since">Mióta</label><input id="p-since" name="since_label" className="input" placeholder="2025. március óta" defaultValue={pkg?.since_label ?? ''} /></div>
              </div>
              <div className="field"><label htmlFor="p-inc">Mit tartalmaz (soronként egy)</label><textarea id="p-inc" name="includes" className="textarea" defaultValue={(pkg?.includes ?? []).join('\n')} /></div>
              <div className="field"><label htmlFor="p-terms">Feltételek (soronként egy)</label><textarea id="p-terms" name="terms" className="textarea" style={{ minHeight: 160 }} defaultValue={(pkg?.terms ?? []).join('\n')} /></div>
              <div className="field"><label htmlFor="p-contract">Szerződés</label><input id="p-contract" name="contract_note" className="input" placeholder="Határozatlan idejű, 30 napos felmondással." defaultValue={pkg?.contract_note ?? ''} /></div>
            </ActionForm>

            <ClientAccess clientId={id} clientName={client.name} members={access} />
          </aside>
        </div>
      </div>
    </>
  );
}
