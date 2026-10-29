'use client';

import { useRef, useState, useTransition } from 'react';

type Result = { ok: boolean; error?: string };

// Űrlap szerver-akcióval, visszajelzéssel. Az akciót a szerveroldal .bind()-dal adja át.
export default function ActionForm({
  action,
  submitLabel,
  successText,
  resetOnSuccess = false,
  className = 'card stack',
  children,
}: {
  action: (fd: FormData) => Promise<Result>;
  submitLabel: string;
  successText: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        start(async () => {
          const r = await action(fd);
          setMsg(r.ok ? { ok: true, text: successText } : { ok: false, text: r.error ?? 'Hiba történt.' });
          if (r.ok && resetOnSuccess) ref.current?.reset();
        });
      }}
    >
      {children}
      <div className="row">
        <button className="btn btn-light" type="submit" disabled={pending}>{pending ? 'Mentés...' : submitLabel}</button>
        {msg && <span className={`small ${msg.ok ? 'muted' : 'error'}`} role="status">{msg.text}</span>}
      </div>
    </form>
  );
}
