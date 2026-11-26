'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { PostWithMedia } from '@/lib/types';
import { STATUS, formatPostDate, formatShortDate } from '@/lib/format';
import { addComment, setPostStatus, suggestCaption } from '@/app/portal/actions';
import CaptionDiff from './CaptionDiff';
import { createClient } from '@/lib/supabase/browser';
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
  const [editing, setEditing] = useState(false);
  const [capDraft, setCapDraft] = useState('');
  const canEditCaption = post.status !== 'pub' && !!post.caption;
  const hasSuggestion = post.caption_suggestion != null && post.caption_suggestion !== post.caption;

  function startEdit() {
    setCapDraft(post.caption_suggestion ?? post.caption);
    setEditing(true);
  }
  function saveCaption() {
    setError(null);
    startTransition(async () => {
      const r = await suggestCaption(post.id, capDraft);
      if (r.ok) setEditing(false);
      else setError(r.error ?? 'Hiba történt.');
    });
  }
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasInput = !!draft.trim() || files.length > 0;

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) { setError(`${tooBig.name}: legfeljebb 10 MB lehet egy kép.`); return; }
    setFiles((cur) => {
      const next = [...cur, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))];
      if (next.length > 3) setError('Legfeljebb 3 képet csatolhatsz.');
      return next.slice(0, 3);
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return [];
    const supabase = createClient();
    const paths: string[] = [];
    for (const { file } of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${post.client_id}/comments/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type });
      if (error) throw new Error(`Képfeltöltési hiba: ${error.message}`);
      paths.push(path);
    }
    return paths;
  }
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

  function run(fn: (attachments: string[]) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const attachments = await uploadFiles();
        const r = await fn(attachments);
        if (r.ok) { setDraft(''); setTc(null); setFiles([]); }
        else setError(r.error ?? 'Hiba történt.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hiba történt.');
      }
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
            <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="eyebrow">Poszt szöveg</span>
              {canEditCaption && !editing && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
                  {hasSuggestion ? 'Javításaim szerkesztése' : 'Beleírok a szövegbe'}
                </button>
              )}
            </div>
            {editing ? (
              <div className="stack" style={{ gap: 8 }}>
                <textarea className="textarea caption-edit" value={capDraft} onChange={(e) => setCapDraft(e.target.value)} rows={8} aria-label="Posztszöveg szerkesztése" />
                <span className="tiny muted">Írd át úgy, ahogy szeretnéd. Az eredeti szöveg megmarad, a te javításaid pirossal látszanak.</span>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <button type="button" className="btn btn-light btn-sm" disabled={pending} onClick={saveCaption}>Javítás mentése</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setEditing(false)}>Mégse</button>
                </div>
              </div>
            ) : hasSuggestion ? (
              <>
                <CaptionDiff caption={post.caption} suggestion={post.caption_suggestion!} />
                <span className="tiny muted"><span className="sugg-add">Pirossal</span> a javasolt módosítás{post.caption_suggested_by ? ` (${post.caption_suggested_by})` : ''}.</span>
              </>
            ) : (
              <p className="caption">{post.caption || 'A szöveg készül.'}</p>
            )}
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
                  {(c.attachment_urls?.length ?? 0) > 0 && (
                    <div className="att-row">
                      {c.attachment_urls!.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="att-thumb" title="Megnyitás nagyban">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt={`Csatolt kép ${i + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}
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
            <div className="att-bar">
              {files.map((f, i) => (
                <span key={f.url} className="att-thumb att-pending">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.file.name} />
                  <button type="button" aria-label="Kép eltávolítása" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
              {files.length < 3 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={pending}>
                  + Kép csatolása{files.length > 0 ? ` (${files.length}/3)` : ''}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            </div>
          </div>

          {!actionable && <span className="small muted">{lockedText}</span>}
          {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}

          {/* Mobilon a képernyő aljára tapad */}
          <div className="detail-actions">
            {actionable ? (
              <>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <button className="btn btn-light" style={{ flex: '1 1 0' }} disabled={pending}
                    onClick={() => run((a) => setPostStatus(post.id, 'ok', draft, tc, a))}>
                    Elfogadom
                  </button>
                  <button className="btn btn-ghost" style={{ flex: '1 1 0' }} disabled={pending}
                    onClick={() => run((a) => setPostStatus(post.id, 'mod', draft, tc, a))}>
                    Módosítást kérek
                  </button>
                </div>
                {hasInput && (
                  <button className="btn btn-ghost btn-sm" disabled={pending}
                    onClick={() => run((a) => addComment(post.id, draft, tc, a))}>
                    Csak kommentet küldök
                  </button>
                )}
              </>
            ) : post.status === 'keszul' ? (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="btn btn-light" style={{ flex: '1 1 0' }} disabled={pending}
                  onClick={() => run((a) => setPostStatus(post.id, 'ok', draft, tc, a))}>
                  Elfogadom
                </button>
                <button className="btn btn-ghost" style={{ flex: '1 1 0' }} disabled={pending || !hasInput}
                  onClick={() => run((a) => addComment(post.id, draft, tc, a))}>
                  Komment küldése
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !hasInput}
                onClick={() => run((a) => addComment(post.id, draft, tc, a))}>
                Komment küldése
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
