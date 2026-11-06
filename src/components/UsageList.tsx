import { CheckIcon } from './PortalView';

type Row = { label: string; used: number; total: number };

// Poszt és videó: ha megvan a havi mennyiség, zöld pipa. Módosítási kör: ha elfogyott, narancs.
export default function UsageList({ rows }: { rows: Row[] }) {
  return (
    <>
      {rows.map((u) => {
        const pct = u.total > 0 ? Math.min(100, Math.round((u.used / u.total) * 100)) : 0;
        const isRevision = u.label === 'Módosítási kör';
        const done = !isRevision && u.used >= u.total;
        const spent = isRevision && u.used >= u.total;
        return (
          <div key={u.label} className="stack" style={{ gap: 6 }}>
            <div className="row between small">
              <span className="secondary row" style={{ gap: 6 }}>
                {done && <span className="done-badge"><CheckIcon size={12} /></span>}
                {u.label}
              </span>
              <span style={{ fontWeight: 600 }}>{u.used} / {u.total}</span>
            </div>
            <div className="bar"><span className={done ? 'done' : spent ? 'full' : ''} style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </>
  );
}
