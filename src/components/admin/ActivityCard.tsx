// Ügyfél-aktivitás az adminban: ki, mikor, mit nézett meg vagy csinált a portálon
export type ActivityRow = { id: number; user_id: string | null; kind: string; section: string | null; detail: string | null; created_at: string };

const SECTION: Record<string, string> = {
  naptar: 'Tartalomnaptár',
  brief: 'Havi tervező',
  hirdetesek: 'Hirdetések',
  csomag: 'Csomagom',
  poszt: 'Poszt',
  belepes: 'Belépés',
};

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ActivityCard({ rows, names }: { rows: ActivityRow[]; names: Record<string, string> }) {
  return (
    <div className="card stack">
      <span className="eyebrow">Aktivitás</span>
      {rows.length === 0 ? (
        <span className="small muted">Még nincs rögzített aktivitás. Ha az ügyfél belép, itt látod, mit nézett meg és mit csinált.</span>
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {rows.map((r) => {
            const what = r.kind === 'view'
              ? `Megnézte: ${SECTION[r.section ?? ''] ?? r.section}${r.section === 'poszt' && r.detail ? ` ${r.detail}` : ''}`
              : r.detail ?? SECTION[r.section ?? ''] ?? '';
            return (
              <div key={r.id} className="act-row">
                <span className={`act-dot ${r.kind === 'action' ? 'act-action' : ''}`} />
                <div className="stack" style={{ gap: 0, minWidth: 0, flex: 1 }}>
                  <span className="small">{what}</span>
                  <span className="tiny muted">{(r.user_id && names[r.user_id]) || 'Ügyfél'} · {fmtTime(r.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
