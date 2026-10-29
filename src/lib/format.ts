import type { PostStatus } from './types';

export const STATUS: Record<PostStatus, { label: string; cls: string }> = {
  keszul: { label: 'Készülőben', cls: 'pill-keszul' },
  var: { label: 'Jóváhagyásra vár', cls: 'pill-var' },
  mod: { label: 'Módosítás alatt', cls: 'pill-mod' },
  ok: { label: 'Elfogadva', cls: 'pill-ok' },
  pub: { label: 'Publikálva', cls: 'pill-pub' },
};

export const STATUS_ORDER: PostStatus[] = ['var', 'mod', 'keszul', 'ok', 'pub'];

const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const MONTHS_SHORT = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];

function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatPostDate(iso: string) {
  const d = parseDate(iso);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}. (${DAYS[d.getUTCDay()]})`;
}

export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}.`;
}

export function formatFt(n: number) {
  return n.toLocaleString('hu-HU').replace(/ /g, ' ') + ' Ft';
}

// Hónap kulcs: "2026-11"
export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeMonth(m?: string | null) {
  return m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonthKey();
}

export function monthRange(key: string) {
  const [y, m] = key.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const end = `${ny}-${String(nm).padStart(2, '0')}-01`;
  return { start, end };
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, name: MONTHS[m - 1], full: `${y}. ${MONTHS[m - 1]}` };
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
