'use client';

import { useTransition } from 'react';
import { markRequestHandled } from '@/app/admin/actions';

export default function HandledButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await markRequestHandled(id); })}>
      Lezárom
    </button>
  );
}
