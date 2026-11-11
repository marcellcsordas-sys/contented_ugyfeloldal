import { formatFt } from '@/lib/format';
import { getPortalCtx } from '@/lib/portal';
import { billingoConfigured, currentInvoice, partnerInvoices, type Invoice, type InvoiceStatus } from '@/lib/billingo';
import PortalShell, { NoClient } from '@/components/PortalShell';

const LABEL: Record<InvoiceStatus, string> = { open: 'Fizetésre vár', overdue: 'Lejárt', paid: 'Kifizetve' };

function d(iso: string | null) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}
function money(i: Invoice) {
  return i.currency === 'HUF' ? formatFt(i.total) : `${i.total.toLocaleString('hu-HU')} ${i.currency}`;
}

export default async function InvoicePage({ previewId }: { previewId?: string }) {
  const ctx = await getPortalCtx(previewId);
  if (!ctx) return <NoClient userName="" />;
  const { client, clientId } = ctx;
  const partnerId = client.billingo_partner_id ?? null;
  const list = partnerId ? await partnerInvoices(partnerId) : null;
  const cur = list ? currentInvoice(list) : null;
  const pdfHref = (id: number) => `/szamla/pdf/${id}${ctx.mode === 'preview' ? `?client=${clientId}` : ''}`;

  return (
    <PortalShell
      active="szamla"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      clientRow={client}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}` } : undefined}
    >
      <div className="wrap stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Számlák</span>
          <h1 className="h1">
            Aktuális számlám.
            <span className="second">
              {cur ? (cur.status === 'paid' ? 'Minden rendben, köszönjük.' : cur.status === 'overdue' ? 'Ez a számla már lejárt.' : 'Ez a számla fizetésre vár.') : 'Itt találod a számláidat.'}
            </span>
          </h1>
        </div>

        {cur ? (
          <div className={`card stack inv-card s-${cur.status}`} style={{ gap: 20 }}>
            <div className="inv-hero">
              <div className="stack" style={{ gap: 6 }}>
                <span className={`inv-status s-${cur.status}`} style={{ alignSelf: 'flex-start' }}>● {LABEL[cur.status]}</span>
                <span className="big-number">{money(cur)}</span>
                <span className="small muted">Számlaszám: {cur.number}</span>
              </div>
              <a className="btn btn-light" href={pdfHref(cur.id)} target="_blank" rel="noreferrer">Számla megnyitása (PDF)</a>
            </div>
            <div className="inv-meta">
              <div><span className="tiny muted">Kiállítva</span><span className="small">{d(cur.date)}</span></div>
              <div><span className="tiny muted">Fizetési határidő</span><span className="small" style={cur.status === 'overdue' ? { color: '#ff6b6b' } : undefined}>{d(cur.due)}</span></div>
              <div><span className="tiny muted">Állapot</span><span className="small">{LABEL[cur.status]}</span></div>
            </div>
            {cur.status !== 'paid' && (
              <p className="small muted" style={{ margin: 0 }}>
                Ha már utaltál, nincs teendőd: a befizetés pár napon belül megjelenik itt. Kérdésed van? Írj a <a href="mailto:hello@contented.hu" style={{ color: 'inherit' }}>hello@contented.hu</a> címre.
              </p>
            )}
          </div>
        ) : (
          <div className="empty">
            {partnerId && !billingoConfigured() ? 'A számlák betöltése hamarosan elérhető.' : partnerId ? 'Jelenleg nincs megjeleníthető számla.' : 'A számláid hamarosan itt lesznek.'}
          </div>
        )}

        {list && list.length > 1 && (
          <div className="card stack" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ paddingBottom: 8 }}>Korábbi számlák</span>
            {list.filter((i) => i.id !== cur?.id).map((i) => (
              <div key={i.id} className="inv-row">
                <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                  <span className="small" style={{ fontWeight: 500 }}>{i.number}</span>
                  <span className="tiny muted">{d(i.date)}</span>
                </div>
                <span className={`inv-status s-${i.status} inv-hide-m`}>{LABEL[i.status]}</span>
                <span className="small inv-hide-m">{money(i)}</span>
                <a className="btn btn-ghost btn-sm" href={pdfHref(i.id)} target="_blank" rel="noreferrer">PDF</a>
              </div>
            ))}
          </div>
        )}

        {client.ad_invoices_url && (
          <div className="card stack">
            <span className="eyebrow">Hirdetési számlák</span>
            <p className="small muted" style={{ margin: 0 }}>
              A Meta és a Google hirdetési számláit egy Google Drive mappában gyűjtjük neked. Itt bármikor megtalálod és letöltheted őket.
            </p>
            <a className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} href={client.ad_invoices_url} target="_blank" rel="noreferrer">
              Hirdetési számlák megnyitása (Google Drive)
            </a>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
