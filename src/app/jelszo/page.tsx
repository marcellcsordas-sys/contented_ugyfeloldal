import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PasswordForm from './PasswordForm';

export default async function PasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="login-shell">
      <div className="card login-card stack" style={{ gap: 18 }}>
        <span className="brand-word">contented</span>
        <h1 className="h1" style={{ fontSize: 40 }}>
          Üdv a felületen.
          <span className="second">Állíts be saját jelszót.</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Az ideiglenes jelszó helyett ezzel lépsz be legközelebb, az e-mail címeddel együtt: <strong>{user.email}</strong>
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
