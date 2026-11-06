import Link from 'next/link';
import { capitalize, formatFt, formatNum, monthLabel, normalizeMonth, shiftMonth } from '@/lib/format';
import { getPortalCtx } from '@/lib/portal';
import { signPaths } from '@/lib/session';
import type { AdReport } from '@/lib/types';
import PortalShell, { NoClient } from '@/components/PortalShell';

function n(v: number | null | undefined) {
  return formatNum(v ?? 0);
}

const BAR_COLORS = ['#0055fe', '#7ea6ff', '#3cc878', '#ffb37a'];

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
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
  const reports = [...(data ?? [])].sort((a, b) => (a.platform === b.platform ? 0 : a.platform === 'meta' ? -1 : 1));
  const intro = reports.find((r) => r.intro)?.intro;
  const PNAME = { meta: 'Facebook és Instagram', google: 'Google' } as const;

  const sum = (f: (r: AdReport) => number) => reports.reduce((a, r) => a + f(r), 0);
  const spend = sum((r) => r.spend);
  const reach = sum((r) => r.reach ?? 0);
  const impressions = sum((r) => r.impressions);
  const leads = sum((r) => r.leads);
  const leadsSpend = sum((r) => r.leads_spend);
  const engagements = sum((r) => r.engagements);
  const followers = sum((r) => r.new_followers);
  const active = sum((r) => r.active_ads);
  const clicks = sum((r) => r.clicks);
  const leadLabel = reports.find((r) => r.leads > 0 && r.result_label && r.result_label !== 'Eredmény')?.result_label ?? 'Ajánlatkérés';
  const lower = leadLabel.split(' (')[0].toLowerCase();
  const period = reports.find((r) => r.period_label)?.period_label;
  const updated = reports.map((r) => r.updated_at).sort().at(-1);
  const highlight = reports.find((r) => r.highlight)?.highlight ?? null;
  const breakdown = reports.flatMap((r) => r.breakdown ?? []);
  const bdTotal = breakdown.reduce((a, b) => a + b.spend, 0);
  const summaryLines = reports.flatMap((r) => (r.summary ?? '').split('\n').map((l) => l.trim()).filter(Boolean));
  const platforms = reports.map((r) => PNAME[r.platform]).join(', ');

  const urls = highlight?.image_path ? await signPaths(supabase, [highlight.image_path]) : new Map<string, string>();
  const hlImg = highlight?.image_path ? urls.get(highlight.image_path) : undefined;

  return (
    <PortalShell
      active="hirdetesek"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}?m=${month}` } : undefined}
    >
      <div className="wrap stack" style={{ gap: 24 }}>
        <div className="row between" style={{ alignItems: 'flex-end', gap: 16 }}>
          <div className="stack" style={{ gap: 10 }}>
            <div className="row month-row">
              <Link className="chip month-nav" href={`${ctx.base}/hirdetesek?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
              <span className="eyebrow"><span className="hide-mobile">Hirdetések · </span>{ml.full}</span>
              <Link className="chip month-nav" href={`${ctx.base}/hirdetesek?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
            </div>
            <h1 className="h1">
              {capitalize(ml.name)}.
              <span className="second">
                {reports.length === 0 ? 'A riport hamarosan itt lesz.' : 'Így dolgoztak a hirdetéseid.'}
              </span>
            </h1>
          </div>
          {reports.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {period && <span className="badge">Időszak: {period}</span>}
              <span className="tiny muted">{platforms}</span>
            </div>
          )}
        </div>

        {intro && <p className="ads-intro">{intro}</p>}

        {reports.length === 0 ? (
          <div className="empty">
            Itt látod majd havonta, mit hoztak a hirdetések, hány emberhez jutottunk el, és melyik hirdetés teljesített a legjobban.
          </div>
        ) : (
          <>
            <div className="kpi-grid">
              {leads > 0 ? (
                <Kpi
                  accent
                  label={leadLabel}
                  value={n(leads)}
                  hint={leadsSpend > 0 ? `${formatFt(Math.round(leadsSpend / leads))} / ${lower}` : undefined}
                />
              ) : (
                <Kpi accent label="Kattintás a weboldalra" value={n(clicks)} hint={clicks > 0 ? `${formatFt(Math.round(spend / clicks))} / kattintás` : undefined} />
              )}
              <Kpi label="Elért emberek" value={n(reach)} hint={`${n(impressions)} megjelenés`} />
              <Kpi label="Interakció" value={n(engagements)} hint="megtekintés, kedvelés, hozzászólás, megosztás" />
              {followers > 0 || leads === 0 ? (
                <Kpi label="Új követő" value={n(followers)} hint={active > 0 ? `${n(active)} hirdetés fut most` : undefined} />
              ) : (
                <Kpi label="Kattintás a weboldalra" value={n(clicks)} hint={clicks > 0 ? `${formatFt(Math.round(spend / clicks))} / kattintás` : undefined} />
              )}
            </div>

            <div className="dash-row">
              {highlight && (
                <div className={`card highlight-card ${hlImg ? '' : 'hl-noimg'}`}>
                  {hlImg ? (
                    <div className="hl-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hlImg} alt={highlight.title} />
                      <span className="badge badge-blue hl-badge">A hónap kedvence</span>
                    </div>
                  ) : (
                    <span className="badge badge-blue" style={{ alignSelf: 'flex-start', margin: '14px 0 0 14px' }}>A hónap kedvence</span>
                  )}
                  <div className="stack hl-body">
                    <div className="stack hl-head" style={{ gap: 4 }}>
                      <h2 className="h3">{highlight.title}</h2>
                      {highlight.subtitle && <span className="small muted">{highlight.subtitle}</span>}
                    </div>
                    <div className="hl-stats">
                      {highlight.stats.map((s) => (
                        <div key={s.label} className="stack" style={{ gap: 0 }}>
                          <span className="hl-stat-value">{s.value}</span>
                          <span className="tiny muted">{s.label}</span>
                        </div>
                      ))}
                    </div>
                    {highlight.note && <p className="small secondary hl-note" style={{ margin: 0 }}>{highlight.note}</p>}
                  </div>
                </div>
              )}

              <div className="card stack" style={{ gap: 18 }}>
                <div className="row between">
                  <span className="eyebrow">A keret elosztása</span>
                  <span className="small" style={{ fontWeight: 600 }}>{formatFt(spend)}</span>
                </div>
                {bdTotal > 0 && (
                  <>
                    <div className="stack-bar" role="img" aria-label="A hirdetési keret elosztása célok szerint">
                      {breakdown.map((b, i) => (
                        <span key={b.label} style={{ width: `${(b.spend / bdTotal) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      ))}
                    </div>
                    <div className="stack" style={{ gap: 12 }}>
                      {breakdown.map((b, i) => (
                        <div key={b.label} className="bd-row">
                          <span className="dot" style={{ background: BAR_COLORS[i % BAR_COLORS.length], marginTop: 8 }} />
                          <div className="stack" style={{ gap: 0, minWidth: 0, flex: 1 }}>
                            <span className="small" style={{ fontWeight: 500 }}>{b.label}</span>
                            <span className="tiny" style={{ color: '#7ee6a8' }}>{b.result}</span>
                          </div>
                          <div className="stack" style={{ gap: 0, alignItems: 'flex-end' }}>
                            <span className="small">{formatFt(b.spend)}</span>
                            <span className="tiny muted">{Math.round((b.spend / bdTotal) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {reports.length > 1 && (
              <div className="platform-grid">
                {reports.map((r) => {
                  const lbl = r.result_label && r.result_label !== 'Eredmény' ? r.result_label.split(' (')[0].toLowerCase() : 'konverzió';
                  return (
                    <div key={r.id} className="card stack platform-card" style={{ gap: 14 }}>
                      <div className="row between">
                        <span className="row" style={{ gap: 8 }}>
                          <span className={`pf-dot pf-${r.platform}`} />
                          <span className="eyebrow" style={{ margin: 0 }}>{PNAME[r.platform]}</span>
                        </span>
                        <span className="small" style={{ fontWeight: 600 }}>{formatFt(r.spend)}</span>
                      </div>
                      <div className="pf-stats">
                        {r.leads > 0 ? (
                          <div><b>{n(r.leads)}</b><span>{lbl}</span></div>
                        ) : r.results > 0 ? (
                          <div><b>{n(r.results)}</b><span>{lbl}</span></div>
                        ) : (
                          <div><b>{n(r.reach ?? 0)}</b><span>elért ember</span></div>
                        )}
                        <div><b>{n(r.clicks)}</b><span>kattintás</span></div>
                        <div><b>{n(r.impressions)}</b><span>megjelenés</span></div>
                        {r.clicks > 0 && <div><b>{formatFt(Math.round(r.spend / r.clicks))}</b><span>/ kattintás</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {reports.some((r) => (r.items ?? []).length > 0) && (
              <div className="stack" style={{ gap: 14 }}>
                <div className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Hirdetéseid részletesen</span>
                  <span className="small muted">Melyik hirdetés mire fut, mennyi keretet kapott, és mit hozott eddig.</span>
                </div>
                {reports.filter((r) => (r.items ?? []).length > 0).map((r) => {
                  const max = Math.max(...r.items.map((i) => i.spend), 1);
                  return (
                    <div key={r.id} className="card stack ad-items" style={{ gap: 4 }}>
                      <div className="row between" style={{ paddingBottom: 8 }}>
                        <span className="row" style={{ gap: 8 }}>
                          <span className={`pf-dot pf-${r.platform}`} />
                          <span className="small" style={{ fontWeight: 600 }}>{r.platform === 'google' ? 'Google kampányok' : 'Facebook és Instagram hirdetések'}</span>
                        </span>
                        <span className="tiny muted">{r.items.length} {r.platform === 'google' ? 'kampány' : 'hirdetés'}</span>
                      </div>
                      {r.items.map((it, i) => (
                        <div key={i} className="ad-item">
                          <div className="stack ai-main" style={{ gap: 4, minWidth: 0 }}>
                            <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                              <span className="small" style={{ fontWeight: 500 }}>{it.name}</span>
                              {it.star && <span className="badge badge-blue" style={{ fontSize: 10 }}>Legjobb</span>}
                            </span>
                            <span className="tiny muted">{it.goal}{it.extra ? ` · ${it.extra}` : ''}</span>
                            <span className="ai-bar"><span style={{ width: `${(it.spend / max) * 100}%` }} /></span>
                          </div>
                          <div className="stack ai-res" style={{ gap: 2 }}>
                            <span className="small" style={{ color: '#7ee6a8', fontWeight: 500 }}>{it.result}</span>
                            {it.cost && <span className="tiny muted">{it.cost}</span>}
                          </div>
                          <span className="small ai-spend">{formatFt(it.spend)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {summaryLines.length > 0 && (
              <div className="card stack">
                <span className="eyebrow">A hónap röviden</span>
                <ul className="win-list">
                  {summaryLines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            )}

            {updated && (
              <span className="tiny muted">
                Utolsó frissítés: {new Date(updated).toLocaleDateString('hu-HU')} A számok a hirdetési fiókból származnak, a hónap végéig tovább nőnek.
              </span>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
