'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function PasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr('Legalább 8 karakter legyen.');
    if (pw !== pw2) return setErr('A két jelszó nem egyezik.');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message.includes('different') ? 'Ez megegyezik a régi jelszavaddal.' : 'Nem sikerült menteni. Próbáld újra.');
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="pw">Új jelszó</label>
        <input id="pw" className="input" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pw2">Még egyszer</label>
        <input id="pw2" className="input" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      {err && <p className="error small" style={{ margin: 0 }}>{err}</p>}
      <button className="btn btn-light" type="submit" disabled={busy}>{busy ? 'Mentés...' : 'Jelszó mentése és belépés'}</button>
    </form>
  );
}
