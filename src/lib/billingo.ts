// Szerveroldali modul: kliens komponensből ne importáld.

// Billingo API v3: csak szerveren, a kulcs a BILLINGO_API_KEY környezeti változóban van.
const BASE = 'https://api.billingo.hu/v3';

export type InvoiceStatus = 'paid' | 'overdue' | 'open';
export type Invoice = {
  id: number;
  number: string;
  date: string;
  due: string | null;
  total: number;
  currency: string;
  status: InvoiceStatus;
  partnerId: number | null;
};

export function billingoConfigured() {
  return Boolean(process.env.BILLINGO_API_KEY);
}

async function api(path: string, revalidate = 600) {
  const key = process.env.BILLINGO_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-KEY': key, Accept: 'application/json' },
      next: { revalidate },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInvoice(d: any): Invoice {
  const due: string | null = d.due_date ?? null;
  const ps = String(d.payment_status ?? '');
  const status: InvoiceStatus = ps === 'paid' ? 'paid' : ps === 'expired' || (due && due < today()) ? 'overdue' : 'open';
  return {
    id: d.id,
    number: d.invoice_number ?? '',
    date: d.invoice_date ?? '',
    due,
    total: Math.round(Number(d.gross_total ?? 0)),
    currency: d.currency ?? 'HUF',
    status,
    partnerId: d.partner?.id ?? null,
  };
}

// Az ügyfél utolsó számlái (sztornózott és sztornó számlák nélkül), legfrissebb elöl.
export async function partnerInvoices(partnerId: number, limit = 12): Promise<Invoice[] | null> {
  const j = await api(`/documents?partner_id=${partnerId}&type=invoice&per_page=${limit}&page=1`);
  if (!j) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = Array.isArray(j.data) ? j.data : [];
  return list
    .filter((d) => !d.cancelled && d.type !== 'cancellation' && (!d.partner?.id || d.partner.id === partnerId))
    .map(toInvoice)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Az "aktuális" számla: a lejárt, ha van; különben a nyitott; különben a legutóbbi.
export function currentInvoice(list: Invoice[]): Invoice | null {
  const open = list.filter((i) => i.status !== 'paid');
  return open.find((i) => i.status === 'overdue') ?? open[0] ?? list[0] ?? null;
}

export async function getDocument(id: number) {
  const j = await api(`/documents/${id}`, 0);
  return j ? toInvoice(j) : null;
}

export async function downloadPdf(id: number): Promise<ArrayBuffer | null> {
  const key = process.env.BILLINGO_API_KEY;
  if (!key) return null;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${BASE}/documents/${id}/download`, { headers: { 'X-API-KEY': key }, cache: 'no-store' });
    if (r.status === 202) { await new Promise((res) => setTimeout(res, 1500)); continue; }
    if (!r.ok) return null;
    return await r.arrayBuffer();
  }
  return null;
}

// Admin: partner keresése név alapján (a hozzárendeléshez)
export async function searchPartners(q: string): Promise<{ id: number; name: string; taxcode: string | null }[]> {
  const j = await api(`/partners?query=${encodeURIComponent(q)}&per_page=10`, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((j?.data ?? []) as any[]).map((p) => ({ id: p.id, name: p.name, taxcode: p.taxcode ?? null }));
}
