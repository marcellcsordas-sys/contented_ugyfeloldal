'use client';

import { useRef, useState, useTransition } from 'react';

type Res = { ok: true; link: string; isNew: boolean } | { ok: false; error: string };

// Belépő link készítése kézi kiküldéshez (e-mail küldés nélkül).
export default function AccessLinkForm({ action, children }: { action: (fd: FormData) => Promise<Res>; children?: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setRes(null);
        setCopied(false);
        start(async () => setRes(await action(fd)));
      }}
    >
      {children}
      <div className="field"><label htmlFor="i-name">Név</label><input id="i-name" name="full_name" className="input" placeholder="Attila" /></div>
      <div className="field"><label htmlFor="i-email">E-mail</label><input id="i-email" name="email" type="email" required className="input" placeholder="attila@ceg.hu" /></div>
      <button className="btn btn-light" type="submit" disabled={pending}>{pending ? 'Készül...' : 'Belépő link készítése'}</button>
      {res && !res.ok && <span className="small error" role="status">{res.error}</span>}
      {res && res.ok && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ color: '#7ee6a8' }}>
            {res.isNew ? 'Kész. Másold be a linket az ügyfélnek írt e-mailbe.' : 'Ő már fel van véve. Itt egy új belépő link neki.'}
          </span>
          <input className="input" readOnly value={res.link} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12 }} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => { await navigator.clipboard.writeText(res.link); setCopied(true); }}
          >
            {copied ? 'Kimásolva' : 'Link másolása'}
          </button>
          <span className="tiny muted">24 óráig érvényes, egyszer használható. Első belépéskor az ügyfél jelszót állít be magának.</span>
        </div>
      )}
    </form>
  );
}
