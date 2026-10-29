'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const supabase = createClient();
    // Mindig arra a címre jön vissza a link, ahol a belépést kérték (ugyfel.contented.hu vagy vercel.app)
    const site = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${site}/auth/callback`, shouldCreateUser: false },
    });
    setState(error ? 'error' : 'sent');
  }

  if (state === 'sent') {
    return (
      <p className="notice" style={{ margin: 0 }}>
        Elküldtük a belépő linket a(z) {email} címre. Nézd meg a postafiókod, a spam mappát is.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="email">E-mail cím</label>
        <input
          id="email"
          className="input"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nev@ceged.hu"
        />
      </div>
      {state === 'error' && (
        <p className="error small" style={{ margin: 0 }}>
          Ezzel a címmel nincs hozzáférés. Írj nekünk, és meghívunk.
        </p>
      )}
      <button className="btn btn-light" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Küldjük...' : 'Kérem a belépő linket'}
      </button>
    </form>
  );
}
