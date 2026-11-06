import Link from 'next/link';
import { capitalize, formatFt, monthLabel, normalizeMonth, shiftMonth } from '@/lib/format';
import { getPortalCtx } from '@/lib/portal';
import type { AdReport } from '@/lib/types';
import PortalShell, { NoClient } from '@/components/PortalShell';

const PLATFORM: Record<AdReport['platform'], string> = { meta: 'Meta (Facebook, Instagram)', google: 'Google Ads' };

function n(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('hu-HU').replace(/ /g, ' ');
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <span className="tiny muted">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

export default async function AdsPage({ previewId, m }: { previewId?: string; m?: string }) {
  const ctx = await getPortalCtx(previewId);
  if (!ctx) return <NoClient userName="" />;
  const { supabase, clientId, client } = ctx;
  const month = normalizeMonth(m);
  const ml = monthLabel(month);

  const { data } = await supabase
    .from('ad_reports')
    .select('*')
    .eq('client_id', clientId)
    .eq('month', `${month}-01`)
    .order('platform')
    .returns<AdReport[]>();
  const reports = data ?? [];

  const spend = reports.reduce((a, r) => a + r.spend, 0);
  const results = reports.reduce((a, r) => a + r.results, 0);
  const active = reports.reduce((a, r) => a + r.active_ads, 0);
  const updated = reports.map((r) => r.updated_at).sort().at(-1);
  const sameLabel = new Set(reports.map((r) => r.result_label)).size === 1 ? reports[0]?.result_label : 'Eredmény';

  return (
    <PortalShell
      active="hirdetesek"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}?m=${month}` } : undefined}
    >
      <div className="wrap stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 10 }}>
          <div className="row month-row">
            <Link className="chip month-nav" href={`${ctx.base}/hirdetesek?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
            <span className="eyebrow"><span className="hide-mobile">Hirdetések · </span>{ml.full}</span>
            <Link className="chip month-nav" href={`${ctx.base}/hirdetesek?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
          </div>
          <h1 className="h1">
            {reports.length === 0 ? `${capitalize(ml.name)}.` : `${formatFt(spend)} hirdetésre.`}
            <span className="second">
              {reports.length === 0
                ? 'Ehhez a hónaphoz még nincs hirdetési riport.'
                : `${n(results)} ${sameLabel?.toLowerCase()}, ${n(active)} aktív hirdetés.`}
            </span>
          </h1>
        </div>

        {reports.length === 0 ? (
          <div className="empty">
            A hónap hirdetési adatait itt látod majd: mennyit költöttünk, hány hirdetés fut, és milyen eredményt hoztak.
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <Stat label="Elköltött összeg" value={formatFt(spend)} />
              <Stat label={sameLabel ?? 'Eredmény'} value={n(results)} />
              <Stat label={`Egy ${(sameLabel ?? 'eredmény').toLowerCase()} ára`} value={results ? formatFt(Math.round(spend / results)) : '–'} />
              <Stat label="Aktív hirdetések" value={n(active)} />
            </div>

            {reports.map((r) => {
              const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(2).replace('.', ',') + '%' : '–';
              const budgetPct = r.budget ? Math.min(100, Math.round((r.spend / r.budget) * 100)) : null;
              return (
                <div key={r.id} className="card stack" style={{ gap: 20 }}>
                  <div className="row between">
                    <h2 className="h3">{PLATFORM[r.platform]}</h2>
                    <span className="badge">{r.active_ads} aktív hirdetés</span>
                  </div>

                  {budgetPct !== null && (
                    <div className="stack" style={{ gap: 6 }}>
                      <div className="row between small">
                        <span className="secondary">Havi keret felhasználása</span>
                        <span style={{ fontWeight: 600 }}>{formatFt(r.spend)} / {formatFt(r.budget!)}</span>
                      </div>
                      <div className="bar"><span style={{ width: `${budgetPct}%` }} /></div>
                    </div>
                  )}

                  <div className="stat-grid compact">
                    <Stat label="Költés" value={formatFt(r.spend)} />
                    <Stat label={r.result_label} value={n(r.results)} hint={r.results ? `${formatFt(Math.round(r.spend / r.results))} / db` : undefined} />
                    <Stat label="Megjelenés" value={n(r.impressions)} hint={r.reach ? `${n(r.reach)} elért ember` : undefined} />
                    <Stat label="Kattintás" value={n(r.clicks)} hint={`Átkattintási arány: ${ctr}`} />
                  </div>

                  {r.top_ads.length > 0 && (
                    <div className="stack" style={{ gap: 8 }}>
                      <span className="eyebrow">Legjobb hirdetések</span>
                      {r.top_ads.map((a, i) => (
                        <div key={i} className="panel row between" style={{ flexWrap: 'nowrap' }}>
                          <span className="small ellipsis" style={{ minWidth: 0 }}>{a.name}</span>
                          <span className="small" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {r.summary && (
                    <div className="stack" style={{ gap: 6 }}>
                      <span className="eyebrow">Mit látunk</span>
                      <p className="small secondary" style={{ margin: 0, whiteSpace: 'pre-line' }}>{r.summary}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {updated && (
              <span className="tiny muted">
                Utolsó frissítés: {new Date(updated).toLocaleDateString('hu-HU')}. A számok a hirdetési fiókokból származnak, és a hónap végéig változhatnak.
              </span>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
