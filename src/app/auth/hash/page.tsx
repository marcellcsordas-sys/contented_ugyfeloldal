'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

// A Supabase alap meghívó linkje a tokeneket a URL # részében adja át,
// amit a szerver nem lát. Ez az oldal a böngészőben olvassa ki és lépteti be a felhasználót.
export default function HashAuthPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setFailed(true);
      return;
    }

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setFailed(true);
        else {
          window.history.replaceState(null, '', '/auth/hash');
          router.replace('/');
          router.refresh();
        }
      });
  }, [router]);

  return (
    <div className="login-shell">
      <div className="card login-card stack">
        <span className="brand-word">contented</span>
        {failed ? (
          <>
            <p className="error" style={{ margin: 0 }}>A belépő link lejárt vagy már felhasználták.</p>
            <a className="btn btn-light" href="/login">Kérek új belépő linket</a>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Beléptetünk...</p>
        )}
      </div>
    </div>
  );
}
