'use client';

import { useTransition } from 'react';
import { deletePost, setStatusAdmin } from '@/app/admin/actions';
import { STATUS, STATUS_ORDER } from '@/lib/format';
import type { PostStatus } from '@/lib/types';

export default function PostRowActions({ clientId, postId, status }: { clientId: string; postId: string; status: PostStatus }) {
  const [pending, start] = useTransition();
  return (
    <div className="row row-actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
      <label className="sr-only" htmlFor={`st-${postId}`} style={{ position: 'absolute', left: -9999 }}>Státusz</label>
      <select
        id={`st-${postId}`}
        className="select row-select"
        value={status}
        disabled={pending}
        onChange={(e) => start(async () => { await setStatusAdmin(clientId, postId, e.target.value as PostStatus); })}
      >
        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
      </select>
      <button
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => {
          if (confirm('Biztosan törlöd ezt a posztot és a fájlját?')) start(async () => { await deletePost(clientId, postId); });
        }}
      >
        Törlés
      </button>
    </div>
  );
}
