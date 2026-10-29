import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="login-shell">
      <div className="card login-card stack" style={{ gap: 18 }}>
        <div className="row">
          <span className="brand-word">contented</span>
          <span className="badge">Jóváhagyó portál</span>
        </div>
        <h1 className="h1" style={{ fontSize: 40 }}>
          Belépés.
          <span className="second">Jelszó nélkül.</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Írd be az e-mail címed, és küldünk egy belépő linket. Egy kattintás, és bent vagy.
        </p>
        {error && <p className="error small" style={{ margin: 0 }}>A belépő link lejárt vagy hibás. Kérj újat.</p>}
        <LoginForm />
      </div>
    </div>
  );
}
