'use client';

import { useState, useTransition } from 'react';
import { createClientUser, removeClientUser, resetClientUserPassword } from '@/app/admin/actions';

type Member = { id: string; full_name: string; email: string; pending: boolean; lastSeen: string | null };
type Cred = { email: string; password: string; name: string };

// Ügyfél-hozzáférések kezelése: több ember egy ügyfélhez, e-mail + ideiglenes jelszó.
export default function ClientAccess({ clientId, clientName, members }: { clientId: string; clientName: string; members: Member[] }) {
  const [cred, setCred] = useState<Cred | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const message = cred
    ? `Szia ${cred.name}!\n\nItt a belépésed a Contented ügyfélfelületére, ahol a ${clientName} tartalomnaptárát, hirdetési eredményeit, havi tervezőjét és csomagját látod.\n\nCím: https://ugyfel.contented.hu\nE-mail: ${cred.email}\nIdeiglenes jelszó: ${cred.password}\n\nAz első belépéskor kérni fogja, hogy állíts be saját jelszót.\n\nÜdv,\nMarci`
    : '';

  return (
    <div className="card stack">
      <span className="eyebrow">Hozzáférések</span>

      {members.length === 0 ? (
        <span className="small muted">Még senki nem fér hozzá ehhez az ügyfélhez.</span>
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {members.map((u) => (
            <div key={u.id} className="access-row">
              <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                <span className="small" style={{ fontWeight: 500 }}>{u.full_name}</span>
                <span className="tiny muted" style={{ overflowWrap: 'anywhere' }}>{u.email}{u.pending ? ' · még nem lépett be' : u.lastSeen ? ` · utoljára belépett: ${u.lastSeen}` : ''}</span>
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={pending}
                  onClick={() => start(async () => {
                    setErr(null);
                    const r = await resetClientUserPassword(clientId, u.id);
                    if (r.ok) { setCred({ email: r.email, password: r.password, name: u.full_name }); setCopied(false); } else setErr(r.error);
                  })}
                >
                  Új jelszó
                </button>
                {confirmDel === u.id ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ff7a7a' }}
                    disabled={pending}
                    onClick={() => start(async () => {
                      const r = await removeClientUser(clientId, u.id);
                      setConfirmDel(null);
                      if (!r.ok) setErr(r.error);
                    })}
                  >
                    Biztos?
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(u.id)}>Törlés</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        className="stack"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const name = String(fd.get('full_name') ?? '').trim();
          setErr(null);
          start(async () => {
            const r = await createClientUser(clientId, fd);
            if (r.ok) { setCred({ email: r.email, password: r.password, name: name || r.email.split('@')[0] }); setCopied(false); form.reset(); } else setErr(r.error);
          });
        }}
      >
        <hr className="divider" />
        <span className="small" style={{ fontWeight: 500 }}>Új ember hozzáadása</span>
        <div className="field"><label htmlFor="a-name">Név</label><input id="a-name" name="full_name" className="input" placeholder="Attila" /></div>
        <div className="field"><label htmlFor="a-email">E-mail</label><input id="a-email" name="email" type="email" required className="input" placeholder="attila@ceg.hu" /></div>
        <button className="btn btn-light" type="submit" disabled={pending}>{pending ? 'Dolgozom...' : 'Hozzáférés létrehozása'}</button>
      </form>

      {err && <span className="small error" role="status">{err}</span>}

      {cred && (
        <div className="panel stack" style={{ gap: 10 }}>
          <span className="small" style={{ color: '#7ee6a8', fontWeight: 500 }}>Kész. Küldd el neki ezt az üzenetet:</span>
          <textarea className="textarea" readOnly value={message} style={{ minHeight: 230, fontSize: 13 }} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn btn-light btn-sm" onClick={async () => { await navigator.clipboard.writeText(message); setCopied(true); }}>
            {copied ? 'Kimásolva' : 'Üzenet másolása'}
          </button>
          <span className="tiny muted">Az ideiglenes jelszót csak most látod. Ha elveszik, adj neki új jelszót.</span>
        </div>
      )}
    </div>
  );
}
