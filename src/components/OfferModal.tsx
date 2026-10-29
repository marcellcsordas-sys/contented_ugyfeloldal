'use client';

import type { Offer } from '@/lib/types';
import { CloseIcon } from './PostDetail';

type Props = { offer: Offer; contactName: string; pending: boolean; onAccept: () => void; onClose: () => void };

export default function OfferModal({ offer, contactName, pending, onAccept, onClose }: Props) {
  const first = contactName.split(' ').pop() || contactName;
  return (
    <div className="overlay center" role="dialog" aria-modal="true" aria-label="Ajánlat" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="offer-modal">
        <button className="btn btn-ghost icon-btn close-x" onClick={onClose} aria-label="Bezárás"><CloseIcon /></button>
        <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>
          Ajánlat neked{first ? `, ${first}` : ''}
        </span>
        <h2 className="h1" style={{ fontSize: 40, lineHeight: '42px', letterSpacing: -1.6 }}>
          {offer.title}
          {offer.price_label && <span className="second">{offer.price_label}</span>}
        </h2>
        {offer.subtitle && <p className="muted" style={{ margin: 0 }}>{offer.subtitle}</p>}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-blue" style={{ flex: '1 1 180px' }} onClick={onAccept} disabled={pending}>{offer.cta_label}</button>
          <button className="btn btn-ghost" style={{ flex: '1 1 140px' }} onClick={onClose}>Most nem</button>
        </div>
      </div>
    </div>
  );
}
