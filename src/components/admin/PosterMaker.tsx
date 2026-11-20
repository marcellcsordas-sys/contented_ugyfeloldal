'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { setPostVisual } from '@/app/admin/actions';

type Item = { id: string; number: number | null; src: string };

function grab(src: string, at = 1.5): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.preload = 'auto';
    v.src = src;
    v.onloadedmetadata = () => { v.currentTime = Math.min(at, (v.duration || at) / 2); };
    v.onseeked = () => {
      const w = 720;
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/jpeg', 0.82);
    };
    v.onerror = () => reject(new Error('A videó nem tölthető be.'));
  });
}

export default function PosterMaker({ clientId, items }: { clientId: string; items: Item[] }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const supabase = createClient();
    for (const it of items) {
      try {
        const blob = await grab(it.src);
        const path = `${clientId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw new Error(error.message);
        const r = await setPostVisual(it.id, path);
        if (!r.ok) throw new Error(r.error);
        setLog((l) => [...l, `#${it.number ?? '?'} kész`]);
      } catch (e) {
        setLog((l) => [...l, `#${it.number ?? '?'} hiba: ${e instanceof Error ? e.message : e}`]);
      }
    }
    setLog((l) => [...l, 'VÉGE']);
    setBusy(false);
  }

  return (
    <div className="card stack">
      <span className="small muted">{items.length} videóhoz nincs még nézőkép.</span>
      <button className="btn btn-light" onClick={run} disabled={busy || items.length === 0} id="make-posters">
        {busy ? 'Dolgozom...' : 'Nézőképek generálása'}
      </button>
      <pre id="poster-log" className="small">{log.join('\n')}</pre>
    </div>
  );
}
