// Havi social media tervező (brief) kérdései. A kulcsok a monthly_inputs.answers mezői.

export const GOALS = [
  'Eladás, akció ösztönzése',
  'Új termék vagy szolgáltatás bevezetése',
  'Ismertség, új követők',
  'Érdeklődők, foglalások, ajánlatkérések',
  'Közösségépítés, bizalom',
] as const;

export const PARTICIPATION = [
  'Szerepelek videóban (reels, story, bemutató)',
  'Fogadunk helyszíni fotózást vagy forgatást',
  'Küldök saját fotót, videót',
] as const;
export const PARTICIPATION_NONE = 'Ebben a hónapban egyiket sem';

export type BriefDate = { date: string; label: string };
export type PostFeedback = Record<string, 'up' | 'down'>;

export type BriefAnswers = {
  goal?: string;
  goal_other?: string;
  highlight?: string;
  dates?: BriefDate[];
  no_dates?: boolean;
  participation?: string[];
  news?: string;
  feedback_posts?: PostFeedback;
  feedback?: string;
  assets?: string;
};

export type MonthlyInput = {
  id: string;
  client_id: string;
  month: string; // YYYY-MM-01
  answers: BriefAnswers;
  submitted: boolean;
  submitted_by_name: string | null;
  submitted_at: string | null;
  updated_at: string;
};

// Kitöltöttség: a kötelező kérdések
export function missingRequired(a: BriefAnswers): string[] {
  const miss: string[] = [];
  if (!a.goal || (a.goal === 'Egyéb' && !a.goal_other?.trim())) miss.push('A hónap célja');
  if (!a.highlight?.trim()) miss.push('Mit emeljünk ki');
  if (!a.no_dates && !(a.dates ?? []).some((d) => d.label.trim())) miss.push('Dátumok');
  if (!(a.participation ?? []).length) miss.push('Miben tudsz részt venni');
  return miss;
}

// A brief határideje: a tárgyhónapot megelőző hónap 20-a
export function briefDeadline(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 2, 20);
  return d;
}

export function goalText(a: BriefAnswers) {
  return a.goal === 'Egyéb' ? `Egyéb: ${a.goal_other ?? ''}` : a.goal ?? '';
}
