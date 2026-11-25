'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { PostWithMedia } from '@/lib/types';
import { STATUS, formatPostDate, formatShortDate } from '@/lib/format';
import { addComment, setPostStatus } from '@/app/portal/actions';
import PostVisual from './PostVisual';

export function fmtTc(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

type Nav = { index: number; total: number; onPrev?: () => void; onNext?: () => void };

function PostNav({ nav }: { nav: Nav }) {
  return (
    <div className="post-nav" role="group" aria-label="Lapozás a tartalmak között">
      <button className="btn btn-ghost icon-btn" onClick={nav.onPrev} disabled={!nav.onPrev} aria-label="Előző tartalom">‹</button>
      <span className="tiny secondary post-nav-count">{nav.index + 1} / {nav.total}</span>
      <button className="btn btn-ghost icon-btn" onClick={nav.onNext} disabled={!nav.onNext} aria-label="Következő tartalom">›</button>
    </div>
  );
}

export default function PostDetail({ post, onClose, nav }: { post: PostWithMedia; onClose: () => void; nav?: Nav }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tc, setTc] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const actionable = post.status === 'var' || post.status === 'mod';
  const nativeVideo = !!post.video_src || (post.is_video && /\.(mp4|mov|webm|m4v)$/i.test(post.visual_path ?? ''));

  function markTime() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setTc(v.currentTime);
    document.getElementById('komment')?.focus();
  }

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
    v.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const typing = (e.target as HTMLElement | null)?.closest?.('textarea, input');
      if (typing) return;
      if (e.key === 'ArrowLeft') nav?.onPrev?.();
      if (e.key === 'ArrowRight') nav?.onNext?.();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, nav]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) { setDraft(''); setTc(null); }
      else setError(r.error ?? 'Hiba történt.');
    });
  }

  const lockedText =
    post.status === 'ok' ? 'Ezt már elfogadtad. Kommentet még írhatsz.'
    : post.status === 'keszul' ? 'Ha így jó, fogadd el. Ha van ötleted, írd meg kommentben.'
    : 'Már kint van. Kommentet még írhatsz.';

  return (
    <div className="overlay overlay-sheet" role="dialog" aria-modal="true" aria-label="Tartalom részletei" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {/* Mobilon rögzített fejléc: mindig elérhető a bezárás */}
        <div className="sheet-head">
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="tiny secondary ellipsis">
              {post.number ? `#${post.number} · ` : ''}{post.platform} · {post.content_type}
            </span>
            <span className="sheet-date">{formatPostDate(post.publish_date)}</span>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            {nav && <PostNav nav={nav} />}
            <span className={`pill ${STATUS[post.status].cls}`}>{STATUS[post.status].label}</span>
            <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Bezárás"><CloseIcon /></button>
          </div>
        </div>

        <div className="modal-visual">
          <PostVisual post={post} large videoRef={videoRef} />
        </div>
        <div className="modal-body">
          <div className="row between desktop-only" style={{ alignItems: 'flex-start' }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className="tiny secondary">
                {post.number ? `#${post.number} · ` : ''}{post.platform} · {post.content_type}
              </span>
              <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5 }}>{formatPostDate(post.publish_date)}</span>
            </div>
            <div className="row">
              {nav && <PostNav nav={nav} />}
              <span className={`pill ${STATUS[post.status].cls}`}>{STATUS[post.status].label}</span>
              <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Bezárás"><CloseIcon /></button>
            </div>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Poszt szöveg</span>
            <p className="caption">{post.caption || 'A szöveg készül.'}</p>
          </div>

          {post.internal_note && (
            <div className="panel stack" style={{ gap: 4 }}>
              <span className="badge" style={{ border: 0, padding: 0 }}>Contented jegyzet</span>
              <span className="small muted">{post.internal_note}</span>
            </div>
          )}

          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">Kommentek</span>
            {post.comments.length === 0 && <span className="small muted">Még nincs komment. Írd meg, ha változtatnál.</span>}
            {post.comments.map((c) => (
              <div key={c.id} className="comment">
                <div className={`avatar ${c.author_role === 'admin' ? 'agency' : ''}`}>
                  {(c.author_name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                  <span className="tiny secondary">
                    <strong style={{ color: '#fff', fontWeight: 600 }}>{c.author_name ?? 'Ismeretlen'}</strong>
                    {' · '}{c.author_role === 'admin' ? 'Contented' : 'Ügyfél'}{' · '}{formatShortDate(c.created_at)}
                  </span>
                  <span className="small" style={{ color: 'rgba(255,255,255,0.78)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                    {c.timecode != null && (
                      <button type="button" className="tc-chip" onClick={() => seek(Number(c.timecode))} title="Ugrás erre a pontra">{fmtTc(Number(c.timecode))}</button>
                    )}
                    {c.body}
                  </span>
                </div>
              </div>
            ))}
            <div className="row between" style={{ marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
              <label htmlFor="komment" className="tiny muted">Új komment</label>
              {nativeVideo && (
                tc != null ? (
                  <button type="button" className="tc-chip tc-active" onClick={() => setTc(null)} title="Időpont törlése">{fmtTc(tc)} ×</button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={markTime}>Megjegyzés ehhez a ponthoz</button>
                )
              )}
            </div>
            <textarea
              id="komment"
              className="textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={nativeVideo ? (tc != null ? `Mi legyen másképp ${fmtTc(tc)}-nál?` : 'Állítsd meg a videót ott, ahol változtatnál, és nyomd meg a „Megjegyzés ehhez a ponthoz” gombot.') : post.is_video ? 'Pl. 0:12-nél vegyük ki ezt a mondatot, vagy cseréljük a zenét.' : 'Pl. a második bekezdésből vegyük ki az árat.'}
            />
          </div>

          {!actionable && <span className="small muted">{lockedText}</span>}
          {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}

          {/* Mobilon a képernyő aljára tapad */}
          <div className="detail-actions">
            {actionable ? (
              <>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <button className="btn btn-light" style={{ flex: '1 1 0' }} disabled={pending}
                    onClick={() => run(() => setPostStatus(post.id, 'ok', draft, tc))}>
                    Elfogadom
                  </button>
                  <button className="btn btn-ghost" style={{ flex: '1 1 0' }} disabled={pending}
                    onClick={() => run(() => setPostStatus(post.id, 'mod', draft, tc))}>
                    Módosítást kérek
                  </button>
                </div>
                {draft.trim() && (
                  <button className="btn btn-ghost btn-sm" disabled={pending}
                    onClick={() => run(() => addComment(post.id, draft, tc))}>
                    Csak kommentet küldök
                  </button>
                )}
              </>
            ) : post.status === 'keszul' ? (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="btn btn-light" style={{ flex: '1 1 0' }} disabled={pending}
                  onClick={() => run(() => setPostStatus(post.id, 'ok', draft, tc))}>
                  Elfogadom
                </button>
                <button className="btn btn-ghost" style={{ flex: '1 1 0' }} disabled={pending || !draft.trim()}
                  onClick={() => run(() => addComment(post.id, draft, tc))}>
                  Komment küldése
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !draft.trim()}
                onClick={() => run(() => addComment(post.id, draft, tc))}>
                Komment küldése
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
