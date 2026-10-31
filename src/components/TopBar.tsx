import Link from 'next/link';

export default function TopBar({ name, sub, admin = false }: { name: string; sub: string; admin?: boolean }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-word">contented</span>
        <span className="badge topbar-badge">{admin ? 'Admin' : 'Jóváhagyó portál'}</span>
      </Link>
      <div className="row topbar-right" style={{ gap: 14 }}>
        {admin && (
          <nav className="row topbar-nav" aria-label="Admin menü">
            <Link className="chip" href="/admin">Ügyfelek</Link>
          </nav>
        )}
        <div className="row">
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{initial}</div>
          <div className="who-text" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="small" style={{ fontWeight: 500 }}>{name}</span>
            {sub && <span className="tiny muted">{sub}</span>}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost btn-sm" type="submit">Kilépés</button>
        </form>
      </div>
    </header>
  );
}
