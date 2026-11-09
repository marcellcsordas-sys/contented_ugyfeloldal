'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return setState('error');
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="email">E-mail cím</label>
        <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nev@ceged.hu" />
      </div>
      <div className="field">
        <label htmlFor="password">Jelszó</label>
        <input id="password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {state === 'error' && (
        <p className="error small" style={{ margin: 0 }}>Hibás e-mail cím vagy jelszó.</p>
      )}
      <button className="btn btn-light" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Belépés...' : 'Belépek'}
      </button>
      <p className="tiny muted" style={{ margin: 0 }}>
        Elfelejtetted a jelszavad? Írj nekünk a <a href="mailto:hello@contented.hu" style={{ color: 'inherit' }}>hello@contented.hu</a> címre, és küldünk új ideiglenes jelszót.
      </p>
    </form>
  );
}
