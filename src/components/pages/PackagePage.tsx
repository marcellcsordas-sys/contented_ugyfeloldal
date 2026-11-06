import { currentMonthKey, formatFt, monthLabel, monthRange } from '@/lib/format';
import { getPortalCtx, usageRows } from '@/lib/portal';
import type { Offer, Package, Post } from '@/lib/types';
import PortalShell, { NoClient } from '@/components/PortalShell';
import { CheckIcon } from '@/components/PortalView';
import UsageList from '@/components/UsageList';

export default async function PackagePage({ previewId }: { previewId?: string; m?: string }) {
  const ctx = await getPortalCtx(previewId);
  if (!ctx) return <NoClient userName="" />;
  const { supabase, clientId, client } = ctx;
  const month = currentMonthKey();
  const { start, end } = monthRange(month);

  const [{ data: pkg }, { data: offer }, { data: posts }] = await Promise.all([
    supabase.from('packages').select('*').eq('client_id', clientId).maybeSingle<Package>(),
    supabase.from('offers').select('*').eq('client_id', clientId).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<Offer>(),
    supabase.from('posts').select('is_video, revision_count').eq('client_id', clientId)
      .gte('publish_date', start).lt('publish_date', end).returns<Pick<Post, 'is_video' | 'revision_count'>[]>(),
  ]);
  const usage = usageRows(pkg ?? null, posts ?? []);
  const ml = monthLabel(month);

  return (
    <PortalShell
      active="csomag"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}` } : undefined}
    >
      <div className="wrap">
        {!pkg ? (
          <div className="empty">A csomag adatai hamarosan itt lesznek.</div>
        ) : (
          <div className="split">
            <section className="split-main">
              <div className="stack" style={{ gap: 10 }}>
                <span className="eyebrow">Aktuális csomagod</span>
                <h1 className="h1">
                  {pkg.name}.
                  {pkg.since_label && <span className="second">{pkg.since_label} dolgozunk együtt.</span>}
                </h1>
              </div>

              <div className="card stack" style={{ gap: 22 }}>
                <div className="stack" style={{ gap: 2 }}>
                  <span className="big-number">{formatFt(pkg.monthly_fee)}</span>
                  <span className="small muted">{pkg.fee_note}</span>
                </div>
                {pkg.includes.length > 0 && (
                  <>
                    <hr className="divider" />
                    <span className="eyebrow">Mit tartalmaz</span>
                    <ul className="include-list">
                      {pkg.includes.map((t, i) => (
                        <li key={i}><CheckIcon color="#0055fe" size={20} />{t}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="card stack">
                <span className="eyebrow">Együttműködési feltételek</span>
                <ol className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pkg.terms.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
                {pkg.contract_note && <span className="small secondary">{pkg.contract_note}</span>}
              </div>
            </section>

            <aside className="split-side">
              {usage.length > 0 && (
                <div className="card stack">
                  <span className="eyebrow">Felhasználás · {ml.name}</span>
                  <UsageList rows={usage} />
                  <span className="tiny muted">
                    A módosítási kör havi szinten számít: egy körben az összes posztra jelezheted a kéréseidet.
                  </span>
                </div>
              )}

              {offer && (
                <div className="card card-glow stack">
                  <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>Ajánlat neked</span>
                  <h3 className="h3">{offer.title}</h3>
                  {offer.subtitle && <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: '24px' }}>{offer.subtitle}</p>}
                  {offer.price_label && <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1 }}>{offer.price_label}</span>}
                  <span className="tiny muted">Az ajánlatot a Tartalomnaptár oldalon tudod kiválasztani.</span>
                </div>
              )}

              <div className="card stack">
                <span className="eyebrow">Kérdésed van?</span>
                <p className="small muted" style={{ margin: 0 }}>
                  Bővítenéd a csomagot, vagy új ötleted van? Beszéljük át egy konzultáción.
                </p>
                <a className="btn btn-yellow" href="https://www.contented.hu/ai-marketing-konzult%C3%A1ci%C3%B3" target="_blank" rel="noreferrer">
                  AI Marketing konzultáció
                </a>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
