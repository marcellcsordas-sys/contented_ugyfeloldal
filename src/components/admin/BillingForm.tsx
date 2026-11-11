'use client';

import { useState, useTransition } from 'react';
import { findBillingoPartners, saveBilling } from '@/app/admin/actions';

// Számlák beállítása az ügyfélhez: Billingo partner (névkereséssel) és a hirdetési számlák Drive mappája.
export default function BillingForm({ clientId, clientName, partnerId, driveUrl, configured }: {
  clientId: string; clientName: string; partnerId: number | null; driveUrl: string | null; configured: boolean;
}) {
  const [pid, setPid] = useState(partnerId ? String(partnerId) : '');
  const [url, setUrl] = useState(driveUrl ?? '');
  const [q, setQ] = useState(clientName);
  const [hits, setHits] = useState<{ id: number; name: string; taxcode: string | null }[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card stack">
      <span className="eyebrow">Számlák</span>
      {!configured && <span className="tiny muted">A Billingo kapcsolat még nincs bekötve (BILLINGO_API_KEY). A partner azonosítót már most beírhatod.</span>}
      <div className="field">
        <label htmlFor="b-pid">Billingo partner azonosító</label>
        <input id="b-pid" className="input" inputMode="numeric" value={pid} onChange={(e) => setPid(e.target.value)} placeholder="pl. 1234567" />
      </div>
      {configured && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Partner neve a Billingóban" />
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending}
              onClick={() => start(async () => {
                const r = await findBillingoPartners(q);
                if (r.ok) setHits(r.partners); else setMsg({ ok: false, text: r.error });
              })}>Keresés</button>
          </div>
          {hits && (hits.length === 0
            ? <span className="tiny muted">Nincs találat.</span>
            : hits.map((h) => (
              <button key={h.id} type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setPid(String(h.id)); setHits(null); }}>
                {h.name}{h.taxcode ? ` · ${h.taxcode}` : ''} · #{h.id}
              </button>
            )))}
        </div>
      )}
      <div className="field">
        <label htmlFor="b-url">Hirdetési számlák (Google Drive mappa linkje)</label>
        <input id="b-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
      </div>
      <div className="row">
        <button type="button" className="btn btn-light" disabled={pending}
          onClick={() => start(async () => {
            const fd = new FormData();
            fd.set('billingo_partner_id', pid);
            fd.set('ad_invoices_url', url);
            const r = await saveBilling(clientId, fd);
            setMsg(r.ok ? { ok: true, text: 'Elmentve.' } : { ok: false, text: r.error });
          })}>Mentés</button>
        {msg && <span className={`small ${msg.ok ? 'muted' : 'error'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
