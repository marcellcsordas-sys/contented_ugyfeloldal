'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { savePost, type PostInput } from '@/app/admin/actions';
import { STATUS, STATUS_ORDER } from '@/lib/format';
import type { Post, PostStatus } from '@/lib/types';

const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Facebook + Instagram'];
const TYPES = ['Kreatív', 'Carousel', 'Reels', 'Videó', 'Story', 'Szakmai poszt', 'Hirdetés'];
const FORMATS = ['4:5', '1:1', '9:16', '16:9'];
const MAX_MB = 50;

export default function PostForm({ clientId, post, month }: { clientId: string; post?: Post; month: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function upload(file: File) {
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Feltöltési hiba: ${error.message}`);
    return path;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File | null;
    setError(null);

    start(async () => {
      try {
        let visualPath = post?.visual_path ?? null;
        if (file && file.size > 0) {
          if (file.size > MAX_MB * 1024 * 1024) throw new Error(`A fájl nagyobb, mint ${MAX_MB} MB.`);
          setProgress('Fájl feltöltése...');
          visualPath = await upload(file);
        }
        setProgress('Mentés...');
        const num = String(fd.get('number') ?? '').trim();
        const input: PostInput = {
          number: num ? parseInt(num, 10) : null,
          platform: String(fd.get('platform')),
          content_type: String(fd.get('content_type')),
          publish_date: String(fd.get('publish_date')),
          format: String(fd.get('format')),
          is_video: fd.get('is_video') === 'on',
          visual_path: visualPath,
          visual_headline: String(fd.get('visual_headline') ?? '').trim() || null,
          caption: String(fd.get('caption') ?? ''),
          internal_note: String(fd.get('internal_note') ?? '').trim() || null,
          status: String(fd.get('status')) as PostStatus,
        };
        const r = await savePost(clientId, post?.id ?? null, input);
        if (!r.ok) throw new Error(r.error);
        router.push(`/admin/clients/${clientId}?m=${input.publish_date.slice(0, 7)}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hiba történt.');
        setProgress(null);
      }
    });
  }

  const defaultDate = post?.publish_date ?? `${month}-01`;

  return (
    <form onSubmit={onSubmit} className="card stack" style={{ gap: 18 }}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="number">Sorszám</label>
          <input id="number" name="number" type="number" min={1} className="input" defaultValue={post?.number ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="platform">Platform</label>
          <select id="platform" name="platform" className="select" defaultValue={post?.platform ?? 'Facebook'}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="content_type">Tartalomtípus</label>
          <select id="content_type" name="content_type" className="select" defaultValue={post?.content_type ?? 'Kreatív'}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="publish_date">Közzététel</label>
          <input id="publish_date" name="publish_date" type="date" required className="input" defaultValue={defaultDate} />
        </div>
        <div className="field">
          <label htmlFor="format">Formátum</label>
          <select id="format" name="format" className="select" defaultValue={post?.format ?? '4:5'}>
            {FORMATS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Státusz</label>
          <select id="status" name="status" className="select" defaultValue={post?.status ?? 'var'}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </div>
      </div>

      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" name="is_video" defaultChecked={post?.is_video ?? false} />
        Ez videós tartalom (a videókeretbe számít)
      </label>

      <div className="field">
        <label htmlFor="file">Vizuál vagy videó (kép, mp4, max. {MAX_MB} MB){post?.visual_path ? ' · üresen hagyva a mostani marad' : ''}</label>
        <input id="file" name="file" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="input" />
        <span className="tiny muted">Tipp: telefonos .mov helyett mp4-et tölts fel, azt minden böngésző lejátssza.</span>
      </div>

      <div className="field">
        <label htmlFor="visual_headline">Vizuál címe (amíg nincs feltöltve kép, ez látszik)</label>
        <input id="visual_headline" name="visual_headline" className="input" defaultValue={post?.visual_headline ?? ''} />
      </div>

      <div className="field">
        <label htmlFor="caption">Poszt szöveg</label>
        <textarea id="caption" name="caption" className="textarea" style={{ minHeight: 220 }} defaultValue={post?.caption ?? ''} />
      </div>

      <div className="field">
        <label htmlFor="internal_note">Contented jegyzet (az ügyfél is látja)</label>
        <textarea id="internal_note" name="internal_note" className="textarea" defaultValue={post?.internal_note ?? ''} />
      </div>

      {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
      <div className="row">
        <button className="btn btn-light" type="submit" disabled={pending}>
          {pending ? progress ?? 'Mentés...' : post ? 'Mentem a változásokat' : 'Hozzáadom a naptárhoz'}
        </button>
      </div>
    </form>
  );
}
