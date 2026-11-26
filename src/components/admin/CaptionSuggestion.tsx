'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveCaptionSuggestion } from '@/app/admin/actions';
import CaptionDiff from '@/components/CaptionDiff';

export default function CaptionSuggestion({ postId, caption, suggestion, by }: { postId: string; caption: string; suggestion: string; by: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function resolve(accept: boolean) {
    setError(null);
    start(async () => {
      const r = await resolveCaptionSuggestion(postId, accept);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }
  return (
    <div className="card stack">
      <span className="eyebrow">Szövegjavaslat{by ? ` · ${by}` : ''}</span>
      <CaptionDiff caption={caption} suggestion={suggestion} />
      <span className="tiny muted"><span className="sugg-add">Piros</span>: az ügyfél beírta. Áthúzott: kivette.</span>
      {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
      <div className="row">
        <button className="btn btn-light btn-sm" disabled={pending} onClick={() => resolve(true)}>Elfogadom, bekerül a szövegbe</button>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => resolve(false)}>Elvetem</button>
      </div>
    </div>
  );
}
