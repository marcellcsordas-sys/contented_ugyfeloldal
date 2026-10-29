'use client';

import { useTransition } from 'react';
import { deactivateOffers } from '@/app/admin/actions';

export default function OfferOff({ clientId }: { clientId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await deactivateOffers(clientId); })}>
      Ajánlat kikapcsolása
    </button>
  );
}
