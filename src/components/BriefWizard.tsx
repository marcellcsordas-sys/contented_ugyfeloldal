'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  GOALS, PARTICIPATION, PARTICIPATION_NONE, briefDeadline, goalText, missingRequired,
  type BriefAnswers, type BriefDate, type MonthlyInput,
} from '@/lib/brief';
import { capitalize, formatPostDate, monthIn, monthLabel, shiftMonth } from '@/lib/format';
import { saveBrief } from '@/app/portal/actions';
import { CheckIcon } from './PortalView';

export type PrevPost = { id: string; date: string; title: string; type: string; url: string | null };

type Props = {
  clientId: string;
  clientName: string;
  month: string;
  base: string;
  input: MonthlyInput | null;
  prevPosts: PrevPost[];
  history: { month: string; submitted: boolean }[];
  mode: 'client' | 'preview';
};

const STEPS = ['Cél', 'Kiemelés', 'Dátumok', 'Részvétel', 'Mi újság', 'Visszajelzés', 'Anyagok', 'Áttekintés'] as const;

// A hónaphoz illő ünnepek, alkalmak gyors hozzáadáshoz
function nthWeekday(y: number, m: number, weekday: number, n: number) {
  const d = new Date(y, m - 1, 1);
  const shift = (weekday - d.getDay() + 7) % 7;
  return new Date(y, m - 1, 1 + shift + (n - 1) * 7);
}
function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function occasions(month: string): BriefDate[] {
  const [y, m] = month.split('-').map(Number);
  const f = (d: number, label: string) => ({ date: iso(new Date(y, m - 1, d)), label });
  const list: Record<number, BriefDate[]> = {
    1: [f(1, 'Újév')],
    2: [f(14, 'Valentin-nap')],
    3: [f(8, 'Nőnap'), f(15, 'Nemzeti ünnep')],
    5: [f(1, 'A munka ünnepe'), { date: iso(nthWeekday(y, 5, 0, 1)), label: 'Anyák napja' }],
    6: [{ date: iso(nthWeekday(y, 6, 0, 3)), label: 'Apák napja' }],
    8: [f(20, 'Államalapítás ünnepe')],
    10: [f(23, 'Nemzeti ünnep')],
    11: [f(1, 'Mindenszentek'), { date: iso(nthWeekday(y, 11, 5, 4)), label: 'Black Friday' }],
    12: [f(6, 'Mikulás'), f(24, 'Szenteste, karácsony'), f(31, 'Szilveszter')],
  };
  return list[m] ?? [];
}

const NEWS_SPARKS = ['Új kolléga érkezett', 'Most futó projekt', 'Kulisszák mögött', 'Gyakori vevői kérdés', 'Jó vevői visszajelzés'];
const HIGHLIGHT_SPARKS = ['Termék vagy szolgáltatás:', 'Mi benne a lényeg:', 'Ár:', 'Meddig érvényes:'];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`choice ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="choice-check">{on && <CheckIcon size={14} />}</span>
      <span>{children}</span>
    </button>
  );
}

export default function BriefWizard(props: Props) {
  const { month, input } = props;
  const ml = monthLabel(month);
  const deadline = briefDeadline(month);
  const deadlineText = `${deadline.getFullYear()}. ${monthLabel(`${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}`).name} ${deadline.getDate()}.`;

  const [a, setA] = useState<BriefAnswers>(input?.answers ?? {});
  const [submitted, setSubmitted] = useState(!!input?.submitted);
  const [editing, setEditing] = useState(!input?.submitted);
  const [step, setStep] = useState(-1); // -1 = bevezető
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<BriefAnswers>) => {
    dirty.current = true;
    setA((prev) => ({ ...prev, ...patch }));
  };

  // Automatikus mentés 1,2 mp-cel az utolsó változás után
  useEffect(() => {
    if (!dirty.current) return;
    setSaveState('saving');
    const t = setTimeout(async () => {
      const r = await saveBrief(props.clientId, month, a, false);
      setSaveState(r.ok ? 'saved' : 'error');
      dirty.current = false;
    }, 1200);
    return () => clearTimeout(t);
  }, [a, month, props.clientId]);

  const missing = useMemo(() => missingRequired(a), [a]);
  const occ = useMemo(() => occasions(month), [month]);
  const dates = a.dates ?? [];

  function go(n: number) {
    setStep(n);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onSubmit() {
    setError(null);
    start(async () => {
      const r = await saveBrief(props.clientId, month, a, true);
      if (r.ok) {
        dirty.current = false;
        setSubmitted(true);
        setEditing(false);
        setStep(-1);
        top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else setError(r.error);
    });
  }

  const stepValid = (i: number) => {
    if (i === 0) return !!a.goal && (a.goal !== 'Egyéb' || !!a.goal_other?.trim());
    if (i === 1) return !!a.highlight?.trim();
    if (i === 2) return !!a.no_dates || dates.some((d) => d.label.trim());
    if (i === 3) return (a.participation ?? []).length > 0;
    return true;
  };

  const monthNav = (
    <div className="row month-row">
      <Link className="chip month-nav" href={`${props.base}/brief?m=${shiftMonth(month, -1)}`} aria-label="Előző hónap">‹</Link>
      <span className="eyebrow"><span className="hide-mobile">Havi social media tervező · </span>{ml.full}</span>
      <Link className="chip month-nav" href={`${props.base}/brief?m=${shiftMonth(month, 1)}`} aria-label="Következő hónap">›</Link>
    </div>
  );

  // ----- Beküldött nézet: összefoglaló -----
  if (submitted && !editing) {
    return (
      <div className="wrap" ref={top}>
        <div className="split">
          <section className="split-main">
            <div className="stack" style={{ gap: 10 }}>
              {monthNav}
              <h1 className="h1">
                A {ml.name}i terv megvan.
                <span className="second">Ebből készítjük a {ml.name}i tartalomnaptárt.</span>
              </h1>
            </div>
            <Summary a={a} prevPosts={props.prevPosts} />
            <div className="row">
              <button className="btn btn-ghost" onClick={() => { setEditing(true); setStep(0); }}>Módosítom a válaszaimat</button>
              <span className="tiny muted">Határidő: {deadlineText}</span>
            </div>
          </section>
          <History {...props} />
        </div>
      </div>
    );
  }

  // ----- Bevezető -----
  if (step === -1) {
    const started = Object.keys(a).length > 0;
    return (
      <div className="wrap" ref={top}>
        <div className="split">
          <section className="split-main">
            <div className="stack" style={{ gap: 10 }}>
              {monthNav}
              <h1 className="h1">
                Mi legyen {monthIn(ml.name)}?
                <span className="second">8 rövid kérdés, nagyjából 5 perc.</span>
              </h1>
            </div>
            <div className="card stack" style={{ gap: 18 }}>
              <p className="secondary" style={{ margin: 0, fontSize: 17, lineHeight: '28px' }}>
                Ebből a tervezőből készül a {ml.name}i tartalomnaptár. Minél konkrétabban válaszolsz, annál jobban fognak teljesíteni a posztok.
              </p>
              <div className="row" style={{ gap: 18 }}>
                <span className="small muted">Határidő: <b className="secondary">{deadlineText}</b></span>
                <span className="small muted">A válaszaidat menet közben automatikusan mentjük.</span>
              </div>
              <button className="btn btn-blue" style={{ alignSelf: 'flex-start' }} onClick={() => go(started ? firstOpen(a) : 0)}>
                {started ? 'Folytatom' : 'Kezdjük'}
              </button>
            </div>
          </section>
          <History {...props} />
        </div>
      </div>
    );
  }

  // ----- Lépések -----
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="wrap" ref={top}>
      <div className="wizard">
        <div className="stack" style={{ gap: 12 }}>
          <div className="row between">
            <span className="eyebrow">{capitalize(ml.name)} · {step + 1}. lépés / {STEPS.length}</span>
            <span className="tiny muted" role="status">
              {saveState === 'saving' ? 'Mentés...' : saveState === 'saved' ? 'Elmentve' : saveState === 'error' ? 'A mentés nem sikerült' : ''}
            </span>
          </div>
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="step-dots" aria-hidden="true">
            {STEPS.map((s, i) => (
              <button key={s} type="button" className={`step-dot ${i === step ? 'cur' : ''} ${i < step || stepValid(i) && i !== step ? 'done' : ''}`} onClick={() => go(i)} tabIndex={-1}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="card stack wizard-card">
          {step === 0 && (
            <>
              <Q title={`Mi ${monthIn(ml.name)} a legfontosabb cél?`} hint="Válassz egyet. Ehhez igazítjuk a posztok hangsúlyát." required />
              <div className="choices">
                {[...GOALS, 'Egyéb'].map((g) => (
                  <Chip key={g} on={a.goal === g} onClick={() => set({ goal: g })}>{g}</Chip>
                ))}
              </div>
              {a.goal === 'Egyéb' && (
                <input className="input" autoFocus placeholder="Írd le röviden, mi a cél" value={a.goal_other ?? ''} onChange={(e) => set({ goal_other: e.target.value })} />
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Q title="Mit emeljünk ki ebben a hónapban?" hint="Melyik termék, szolgáltatás vagy ajánlat, mi benne a lényeg, mennyibe kerül, meddig érvényes. Minél pontosabb, annál erősebb poszt lesz belőle." required />
              <div className="row" style={{ gap: 6 }}>
                {HIGHLIGHT_SPARKS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => set({ highlight: `${a.highlight ? a.highlight.trimEnd() + '\n' : ''}${s} ` })}>+ {s.replace(':', '')}</button>
                ))}
              </div>
              <textarea className="textarea" style={{ minHeight: 180 }} value={a.highlight ?? ''} onChange={(e) => set({ highlight: e.target.value })}
                placeholder="Például: Téli akció a STAL2 ereszrendszerre, 10% kedvezmény december 31-ig, minden partnernél." />
            </>
          )}

          {step === 2 && (
            <>
              <Q title="Milyen dátumokhoz igazodjunk?" hint="Esemény, akció, nyitás, ünnep, zárva tartás, megjelenés. Add meg a pontos dátumot is." required />
              {occ.length > 0 && !a.no_dates && (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="tiny muted">Gyors hozzáadás</span>
                  <div className="row" style={{ gap: 6 }}>
                    {occ.map((o) => {
                      const has = dates.some((d) => d.date === o.date && d.label === o.label);
                      return (
                        <button key={o.label} type="button" className={`chip ${has ? 'active' : ''}`}
                          onClick={() => set({ dates: has ? dates.filter((d) => !(d.date === o.date && d.label === o.label)) : [...dates, o].sort((x, y) => x.date.localeCompare(y.date)) })}>
                          {has ? '✓ ' : '+ '}{o.label} · {Number(o.date.slice(8))}.
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {!a.no_dates && (
                <div className="stack" style={{ gap: 8 }}>
                  {dates.map((d, i) => (
                    <div key={i} className="date-row">
                      <input type="date" className="input" value={d.date} min={`${month}-01`}
                        onChange={(e) => set({ dates: dates.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} />
                      <input className="input" placeholder="Mi történik ekkor?" value={d.label}
                        onChange={(e) => set({ dates: dates.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <button type="button" className="btn btn-ghost icon-btn" aria-label="Törlés" onClick={() => set({ dates: dates.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                    onClick={() => set({ dates: [...dates, { date: `${month}-01`, label: '' }] })}>+ Saját dátum</button>
                </div>
              )}
              <Chip on={!!a.no_dates} onClick={() => set({ no_dates: !a.no_dates })}>Ebben a hónapban nincs ilyen dátum</Chip>
            </>
          )}

          {step === 3 && (
            <>
              <Q title="Miben tudsz részt venni ebben a hónapban?" hint="Többet is választhatsz." required />
              <div className="choices">
                {PARTICIPATION.map((p) => {
                  const cur = (a.participation ?? []).filter((x) => x !== PARTICIPATION_NONE);
                  const on = cur.includes(p);
                  return <Chip key={p} on={on} onClick={() => set({ participation: on ? cur.filter((x) => x !== p) : [...cur, p] })}>{p}</Chip>;
                })}
                <Chip on={(a.participation ?? []).includes(PARTICIPATION_NONE)}
                  onClick={() => set({ participation: (a.participation ?? []).includes(PARTICIPATION_NONE) ? [] : [PARTICIPATION_NONE] })}>
                  {PARTICIPATION_NONE}
                </Chip>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Q title="Mi történik most nálatok, és mit kérdeznek a vevőid?" hint="Új kolléga, projekt, kulisszák mögötti pillanat, gyakori vevői kérdés vagy visszajelzés. Ezekből lesznek a leghitelesebb posztok." />
              <div className="row" style={{ gap: 6 }}>
                {NEWS_SPARKS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => set({ news: `${a.news ? a.news.trimEnd() + '\n' : ''}${s}: ` })}>+ {s}</button>
                ))}
              </div>
              <textarea className="textarea" style={{ minHeight: 160 }} value={a.news ?? ''} onChange={(e) => set({ news: e.target.value })} placeholder="Nem kötelező, de ezekből lesznek a legjobb posztok." />
            </>
          )}

          {step === 5 && (
            <>
              <Q title="Mi tetszett vagy nem tetszett az előző hónapban?" hint="Jelöld a múlt havi posztoknál, mit kérsz többet és mit kevesebbet. Ha nincs ilyen, lépj tovább." />
              {props.prevPosts.length > 0 && (
                <div className="vote-grid">
                  {props.prevPosts.map((p) => {
                    const v = a.feedback_posts?.[p.id];
                    const vote = (val: 'up' | 'down') => {
                      const next = { ...(a.feedback_posts ?? {}) };
                      if (next[p.id] === val) delete next[p.id]; else next[p.id] = val;
                      set({ feedback_posts: next });
                    };
                    return (
                      <div key={p.id} className={`vote-card ${v ?? ''}`}>
                        <div className="vote-img">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.url ? <img src={p.url} alt="" loading="lazy" /> : <span className="tiny muted">{p.type}</span>}
                        </div>
                        <span className="tiny muted">{formatPostDate(p.date)}</span>
                        <div className="vote-btns">
                          <button type="button" className={v === 'up' ? 'on' : ''} aria-pressed={v === 'up'} aria-label="Ebből többet" onClick={() => vote('up')}>👍</button>
                          <button type="button" className={v === 'down' ? 'on' : ''} aria-pressed={v === 'down'} aria-label="Ebből kevesebbet" onClick={() => vote('down')}>👎</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <textarea className="textarea" value={a.feedback ?? ''} onChange={(e) => set({ feedback: e.target.value })}
                placeholder="Téma, stílus vagy vizuál, amiből többet vagy kevesebbet kérsz, és amit kerüljünk." />
            </>
          )}

          {step === 6 && (
            <>
              <Q title="Oszd meg velünk a nyersanyagokat" hint="Google Drive, Dropbox vagy WeTransfer link. Telefonos fotó, videó, termékfotó, irodai életkép is tökéletes." />
              <input className="input" type="url" inputMode="url" placeholder="https://drive.google.com/..." value={a.assets ?? ''} onChange={(e) => set({ assets: e.target.value })} />
              <span className="tiny muted">Ha most nincs anyag, hagyd üresen. Később is elküldheted.</span>
            </>
          )}

          {step === 7 && (
            <>
              <Q title="Minden rendben?" hint="Nézd át a válaszaidat. Bármelyik lépésre visszaléphetsz a fenti sávval." />
              <Summary a={a} prevPosts={props.prevPosts} onEdit={go} />
              {missing.length > 0 && <p className="error small" style={{ margin: 0 }}>Még hiányzik: {missing.join(', ')}.</p>}
              {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
            </>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>Vissza</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-light" disabled={!stepValid(step)} onClick={() => go(step + 1)}>
                Tovább
              </button>
            ) : (
              <button type="button" className="btn btn-blue" disabled={pending || missing.length > 0} onClick={onSubmit}>
                {pending ? 'Küldés...' : submitted ? 'Módosítások mentése' : 'Elküldöm a tervet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function firstOpen(a: BriefAnswers) {
  if (!a.goal) return 0;
  if (!a.highlight?.trim()) return 1;
  if (!a.no_dates && !(a.dates ?? []).some((d) => d.label.trim())) return 2;
  if (!(a.participation ?? []).length) return 3;
  return 7;
}

function Q({ title, hint, required }: { title: string; hint?: string; required?: boolean }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h2 className="h2">{title}{required && <span className="req" aria-label="kötelező"> *</span>}</h2>
      {hint && <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: '24px' }}>{hint}</p>}
    </div>
  );
}

function Summary({ a, prevPosts, onEdit }: { a: BriefAnswers; prevPosts: PrevPost[]; onEdit?: (i: number) => void }) {
  const up = prevPosts.filter((p) => a.feedback_posts?.[p.id] === 'up');
  const down = prevPosts.filter((p) => a.feedback_posts?.[p.id] === 'down');
  const rows: { i: number; label: string; value: React.ReactNode }[] = [
    { i: 0, label: 'A hónap célja', value: goalText(a) },
    { i: 1, label: 'Kiemelés', value: a.highlight },
    {
      i: 2, label: 'Dátumok',
      value: a.no_dates ? 'Nincs kiemelt dátum' : (a.dates ?? []).filter((d) => d.label.trim()).map((d) => `${d.date.slice(5).replace('-', '.')}. ${d.label}`).join('\n'),
    },
    { i: 3, label: 'Részvétel', value: (a.participation ?? []).join('\n') },
    { i: 4, label: 'Mi újság nálatok', value: a.news },
    {
      i: 5, label: 'Visszajelzés',
      value: [
        up.length ? `👍 ${up.length} poszt tetszett` : '',
        down.length ? `👎 ${down.length} posztból kevesebbet` : '',
        a.feedback ?? '',
      ].filter(Boolean).join('\n'),
    },
    { i: 6, label: 'Nyersanyagok', value: a.assets ? <a href={a.assets} target="_blank" rel="noreferrer">{a.assets}</a> : '' },
  ];
  return (
    <div className="summary">
      {rows.map((r) => (
        <div key={r.label} className="summary-row">
          <div className="row between" style={{ flexWrap: 'nowrap' }}>
            <span className="tiny muted">{r.label}</span>
            {onEdit && <button type="button" className="link-btn tiny" onClick={() => onEdit(r.i)}>Szerkesztés</button>}
          </div>
          <div className="small secondary" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{r.value || <span className="muted">Nincs megadva</span>}</div>
        </div>
      ))}
    </div>
  );
}

function History({ history, base, month }: Props) {
  const list = history.filter((h) => h.month !== month);
  return (
    <aside className="split-side">
      <div className="card stack">
        <span className="eyebrow">Korábbi tervezőid</span>
        {list.length === 0 ? (
          <span className="small muted">Itt látod majd a korábbi hónapok válaszait.</span>
        ) : (
          list.map((h) => {
            const l = monthLabel(h.month);
            return (
              <Link key={h.month} href={`${base}/brief?m=${h.month}`} className="panel row between" style={{ textDecoration: 'none' }}>
                <span className="small">{capitalize(l.name)} {l.year}</span>
                <span className={`pill ${h.submitted ? 'pill-ok' : 'pill-keszul'}`}>{h.submitted ? 'Elküldve' : 'Piszkozat'}</span>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
