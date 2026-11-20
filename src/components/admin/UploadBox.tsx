'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Admin: fájlok közvetlen feltöltése az ügyfél tárhelyére; a kapott útvonalakat kiírja.
export default function UploadBox({ clientId }: { clientId: string }) {
  const [log, setLog] = useState<string[]>([]);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const supabase = createClient();
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, f, { contentType: f.type });
      setLog((l) => [...l, error ? `${f.name} HIBA ${error.message}` : `${f.name} ${path}`]);
    }
    setLog((l) => [...l, 'VÉGE']);
  }
  return (
    <div className="card stack">
      <label htmlFor="upload-box" className="small muted">Fájlok feltöltése a tárhelyre</label>
      <input id="upload-box" type="file" multiple accept="video/*,image/*" onChange={onChange} />
      <pre id="upload-log" className="small">{log.join('\n')}</pre>
    </div>
  );
}
