'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Oldalmegtekintés naplózása (csak ügyfél-felhasználónál ír, az adatbázis-függvény szűr)
export function logActivity(kind: 'view' | 'action', section: string, detail?: string) {
  createClient().rpc('log_activity', { p_kind: kind, p_section: section, p_detail: detail ?? null }).then(() => {}, () => {});
}

export default function TrackView({ section, detail }: { section: string; detail?: string }) {
  useEffect(() => { logActivity('view', section, detail); }, [section, detail]);
  return null;
}
