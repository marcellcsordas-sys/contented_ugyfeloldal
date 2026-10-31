'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { Offer, Package, PostStatus, PostWithMedia } from '@/lib/types';
import { STATUS, STATUS_ORDER, capitalize, formatFt, formatPostDate, monthLabel, shiftMonth } from '@/lib/format';
import { approveMonth, requestOffer } from '@/app/portal/actions';
import PostVisual from './PostVisual';
import PostDetail from './PostDetail';
import OfferModal from './OfferModal';

type Props = {
  month: string;
  clientId: string;
  clientName: string;
  contactName: string;
  pkg: Package | null;
  offer: Offer | null;
  offerRequested: boolean;
  posts: PostWithMedia[];
  mode: 'client' | 'preview';
  basePath?: string;
};

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}

export function CheckIcon({ color = 'currentColor', size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PortalView(props: Props) {
  const { month, posts, pkg, offer, mode } = props;
  const basePath = props.basePath ?? '/portal';
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(mode === 'client' && !!offer && !props.offerRequested);
  const [offerSent, setOfferSent] = useState(props.offerRequested);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    posts.forEach((p) => (c[p.status] += 1));
    return c;
  }, [posts]);

  const visible = filter === 'all' ? posts : posts.filter((p) => p.status === filter);
  const open = posts.find((p) => p.id === openId) ?? null;
  const waiting = counts.var;
  const ml = monthLabel(month);

  const usage = pkg
    ? [
        { label: 'Poszt', used: posts.filter((p) => !p.is_video).length, total: pkg.posts_quota },
        { label: 'Videó', used: posts.filter((p) => p.is_video).length, total: pkg.videos_quota },
        { label: 'Módosítási kör', used: posts.reduce((a, p) => a + p.revision_count, 0), total: pkg.revisions_quota },
      ].filter((u) => u.total > 0)
    : [];

  function onApproveAll() {
    setError(null);
    startTransition(async () => {
      const r = await approveMonth(month);
      if (!r.ok) setError(r.error);
    });
  }

  function onAcceptOffer() {
    if (!offer) return;
    startTransition(async () => {
      const r = await requestOffer(offer.id, props.clientId);
      if (r.ok) {
        setOfferSent(true);
        setOfferOpen(false);
      } else setError(r.error);
    });
  }

  const filterKeys: ('all' | PostStatus)[] = ['all', ...STATUS_ORDER];

  return (
    <div className="wrap">
      <div className="split">
        <section className="split-main" aria-label="Havi tartalmak">
          <div className="row between" style={{ alignItems: 'flex-end', gap: 18 }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="row month-row">
                <Link className="chip month-nav" href={`${basePath}?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
                <span className="eyebrow"><span className="hide-mobile">Tartalomnaptár · </span>{ml.full}</span>
                <Link className="chip month-nav" href={`${basePath}?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
              </div>
              <h1 className="h1">
                {capitalize(ml.name)}. {posts.length} tartalom.
                <span className="second">
                  {posts.length === 0
                    ? 'Ebben a hónapban még nincs feltöltve.'
                    : waiting > 0
                      ? `${waiting} vár a jóváhagyásodra.`
                      : 'Mindent átnéztél.'}
                </span>
              </h1>
            </div>
            {mode === 'client' && waiting > 0 && (
              <button className="btn btn-light approve-all" onClick={onApproveAll} disabled={pending}>
                <CheckIcon />
                Mind a {waiting} tartalmat elfogadom
              </button>
            )}
          </div>

          {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}

          <div className="row filter-row" role="group" aria-label="Szűrés státusz szerint" style={{ gap: 6 }}>
            {filterKeys.map((k) => (
              <button
                key={k}
                className={`chip ${filter === k ? 'active' : ''}`}
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
              >
                <span className={`dot dot-${k}`} />
                {k === 'all' ? 'Mind' : STATUS[k].label}
                <span className="count">{counts[k]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="empty">Ebben a státuszban most nincs tartalom.</div>
          ) : (
            <div className="grid-cards">
              {visible.map((p) => {
                const text = p.caption.replace(/\n+/g, ' ');
                return (
                  <article key={p.id} className="post-card" onClick={() => setOpenId(p.id)}>
                    <PostVisual post={p} />
                    <div className="post-body">
                      <div className="row between card-meta">
                        <span className="tiny secondary ellipsis">
                          {p.number ? `#${p.number} · ` : ''}{p.platform} · {p.content_type}
                        </span>
                        <span className={`pill ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                      </div>
                      <span className="small" style={{ fontWeight: 500 }}>{formatPostDate(p.publish_date)}</span>
                      <p className="excerpt">{text.length > 130 ? text.slice(0, 127) + '...' : text || 'A szöveg készül.'}</p>
                      <div className="row between card-foot" style={{ marginTop: 'auto', paddingTop: 6 }}>
                        <span className="tiny muted row" style={{ gap: 6 }}>
                          <CommentIcon /> {p.comments.length} komment
                        </span>
                        <button className="btn btn-ghost btn-sm card-open" onClick={(e) => { e.stopPropagation(); setOpenId(p.id); }}>
                          {p.status === 'var' ? 'Átnézem' : 'Megnyitom'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="split-side" aria-label="Csomag és feltételek">
          {pkg ? (
            <div className="card stack" style={{ gap: 18 }}>
              <span className="eyebrow">Aktuális csomagod</span>
              <div className="stack" style={{ gap: 6 }}>
                <h2 className="h2">{pkg.name}</h2>
                {pkg.since_label && <span className="muted">{pkg.since_label}</span>}
              </div>
              <div className="stack" style={{ gap: 2 }}>
                <span className="big-number">{formatFt(pkg.monthly_fee)}</span>
                <span className="small muted">{pkg.fee_note}</span>
              </div>
              {pkg.includes.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pkg.includes.map((t, i) => (
                    <li key={i} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', fontSize: 15, lineHeight: '22px' }}>
                      <CheckIcon color="#0055fe" size={20} />
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <hr className="divider" />
              <div className="stack">
                <span className="eyebrow">Felhasználás · {ml.name}</span>
                {usage.map((u) => {
                  const pct = u.total > 0 ? Math.min(100, Math.round((u.used / u.total) * 100)) : 0;
                  return (
                    <div key={u.label} className="stack" style={{ gap: 6 }}>
                      <div className="row between small">
                        <span className="secondary">{u.label}</span>
                        <span style={{ fontWeight: 600 }}>{u.used} / {u.total}</span>
                      </div>
                      <div className="bar"><span className={pct >= 100 ? 'full' : ''} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card muted">A csomag adatai hamarosan itt lesznek.</div>
          )}

          {offer && (
            <div className="card card-glow stack">
              <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>Ajánlat neked</span>
              <h3 className="h3">{offer.title}</h3>
              {offer.subtitle && <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: '24px' }}>{offer.subtitle}</p>}
              {offer.price_label && <span style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1 }}>{offer.price_label}</span>}
              {offerSent ? (
                <p className="notice" style={{ margin: 0 }}>Megkaptuk a kérésed. 1 munkanapon belül jelentkezünk a részletekkel.</p>
              ) : mode === 'client' ? (
                <button className="btn btn-blue" onClick={onAcceptOffer} disabled={pending}>{offer.cta_label}</button>
              ) : (
                <span className="tiny muted">Előnézet: az ügyfél itt választhatja ki.</span>
              )}
            </div>
          )}

          {pkg && (
            <div className="card stack">
              <span className="eyebrow">Együttműködési feltételek</span>
              <ol className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pkg.terms.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
              {pkg.contract_note && <span className="small secondary">{pkg.contract_note}</span>}
              <a className="btn btn-yellow" href="https://contented.hu" target="_blank" rel="noreferrer">
                AI Marketing konzultáció
              </a>
            </div>
          )}
        </aside>
      </div>

      {open && <PostDetail post={open} onClose={() => setOpenId(null)} />}

      {offerOpen && offer && !offerSent && (
        <OfferModal
          offer={offer}
          contactName={props.contactName}
          pending={pending}
          onAccept={onAcceptOffer}
          onClose={() => setOfferOpen(false)}
        />
      )}
    </div>
  );
}
