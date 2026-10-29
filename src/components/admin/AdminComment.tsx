'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addComment } from '@/app/portal/actions';

export default function AdminComment({ postId }: { postId: string }) {
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="stack" style={{ gap: 10 }}>
      <label htmlFor="admin-comment" className="tiny muted">Válasz az ügyfélnek</label>
      <textarea id="admin-comment" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Rendben, csütörtökre küldjük az új verziót." />
      <button
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start' }}
        disabled={pending || !text.trim()}
        onClick={() => start(async () => {
          const r = await addComment(postId, text);
          if (r.ok) { setText(''); router.refresh(); }
        })}
      >
        Komment küldése
      </button>
    </div>
  );
}
