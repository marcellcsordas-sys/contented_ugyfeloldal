'use client';

import { useEffect, useState, useTransition } from 'react';
import type { PostWithMedia } from '@/lib/types';
import { STATUS, formatPostDate, formatShortDate } from '@/lib/format';
import { addComment, setPostStatus } from '@/app/portal/actions';
import PostVisual from './PostVisual';

export function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export default function PostDetail({ post, onClose }: { post: PostWithMedia; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const actionable = post.status === 'var' || post.status === 'mod';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) setDraft('');
      else setError(r.error ?? 'Hiba történt.');
    });
  }

  const lockedText =
    post.status === 'ok' ? 'Ezt már elfogadtad. Kommentet még írhatsz.'
    : post.status === 'keszul' ? 'Még készül. Ha van ötleted, írd meg kommentben.'
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
            <span className={`pill ${STATUS[post.status].cls}`}>{STATUS[post.status].label}</span>
            <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Bezárás"><CloseIcon /></button>
          </div>
        </div>

        <div className="modal-visual">
          <PostVisual post={post} large />
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
                  <span className="small" style={{ color: 'rgba(255,255,255,0.78)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{c.body}</span>
                </div>
              </div>
            ))}
            <label htmlFor="komment" className="tiny muted" style={{ marginTop: 6 }}>Új komment</label>
            <textarea
              id="komment"
              className="textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Pl. a második bekezdésből vegyük ki az árat."
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
                    onClick={() => run(() => setPostStatus(post.id, 'ok', draft))}>
                    Elfogadom
                  </button>
                  <button className="btn btn-ghost" style={{ flex: '1 1 0' }} disabled={pending}
                    onClick={() => run(() => setPostStatus(post.id, 'mod', draft))}>
                    Módosítást kérek
                  </button>
                </div>
                {draft.trim() && (
                  <button className="btn btn-ghost btn-sm" disabled={pending}
                    onClick={() => run(() => addComment(post.id, draft))}>
                    Csak kommentet küldök
                  </button>
                )}
              </>
            ) : (
              <button className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !draft.trim()}
                onClick={() => run(() => addComment(post.id, draft))}>
                Komment küldése
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
