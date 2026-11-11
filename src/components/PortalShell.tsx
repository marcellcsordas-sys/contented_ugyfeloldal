import Link from 'next/link';
import TopBar from './TopBar';
import TrackView from './TrackView';
import { currentInvoice, partnerInvoices, type InvoiceStatus } from '@/lib/billingo';

export type PortalTab = 'naptar' | 'brief' | 'hirdetesek' | 'csomag' | 'szamla';

const TABS: { key: PortalTab; label: string; short: string; path: string }[] = [
  { key: 'naptar', label: 'Tartalomnaptár', short: 'Naptár', path: '' },
  { key: 'brief', label: 'Havi tervező', short: 'Tervező', path: '/brief' },
  { key: 'hirdetesek', label: 'Hirdetések', short: 'Hirdetések', path: '/hirdetesek' },
  { key: 'csomag', label: 'Csomagom', short: 'Csomagom', path: '/csomag' },
];

function Icon({ tab }: { tab: PortalTab }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (tab === 'naptar') return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
  if (tab === 'brief') return <svg {...p}><path d="M9 4h6M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="m9 13 2 2 4-4" /></svg>;
  if (tab === 'hirdetesek') return <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
  if (tab === 'szamla') return <svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>;
  return <svg {...p}><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 21V7M12 7S10.5 3 8 3a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4" /></svg>;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = { open: 'Fizetésre vár', overdue: 'Lejárt', paid: 'Kifizetve' };

export default async function PortalShell({
  active,
  base,
  userName,
  clientName,
  clientRow,
  preview,
  children,
}: {
  active: PortalTab;
  base: string;
  userName: string;
  clientName: string;
  clientRow?: { billingo_partner_id?: number | null; ad_invoices_url?: string | null };
  preview?: { backHref: string };
  children: React.ReactNode;
}) {
  // Aktuális számla állapota a menühöz (sárga: fizetésre vár, piros: lejárt, zöld: kifizetve)
  let inv: InvoiceStatus | null = null;
  if (clientRow?.billingo_partner_id) {
    const list = await partnerInvoices(clientRow.billingo_partner_id);
    inv = list ? currentInvoice(list)?.status ?? null : null;
  }
  const showInvoices = Boolean(clientRow?.billingo_partner_id || clientRow?.ad_invoices_url);
  return (
    <>
      {!preview && <TrackView section={active} />}
      {!preview && <TrackView section={active} />}
      <TopBar name={userName} sub={preview ? 'Ügyfélnézet előnézet' : clientName} admin={!!preview} />
      <nav className="portal-nav" aria-label="Ügyfél menü">
        <div className="portal-nav-inner">
          {[...TABS, ...(showInvoices ? [{ key: 'szamla' as PortalTab, label: 'Aktuális számlám', short: 'Számla', path: '/szamla' }] : [])].map((t) => (
            <Link
              key={t.key}
              href={`${base}${t.path}`}
              className={`portal-tab ${active === t.key ? 'active' : ''} ${t.key === 'szamla' && inv ? `inv-${inv}` : ''}`}
              title={t.key === 'szamla' && inv ? STATUS_LABEL[inv] : undefined}
              aria-current={active === t.key ? 'page' : undefined}
            >
              <Icon tab={t.key} />
              <span className="tab-long">{t.label}</span>
              <span className="tab-short">{t.short}</span>
              {t.key === 'szamla' && inv && <span className="inv-dot" aria-label={STATUS_LABEL[inv]} />}
            </Link>
          ))}
        </div>
      </nav>
      {preview && (
        <div className="wrap" style={{ paddingBottom: 0, paddingTop: 20 }}>
          <div className="notice row between">
            <span className="small">Előnézet: így látja {clientName} a portált.</span>
            <Link className="btn btn-ghost btn-sm" href={preview.backHref}>Vissza a szerkesztéshez</Link>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

export function NoClient({ userName }: { userName: string }) {
  return (
    <>
      <TopBar name={userName} sub="" />
      <div className="wrap">
        <div className="empty">A fiókod még nincs ügyfélhez rendelve. Szólj a Contentednek, és beállítjuk.</div>
      </div>
    </>
  );
}
