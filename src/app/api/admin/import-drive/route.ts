import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 120;

// Admin: linkkel megosztott Google Drive videó áthúzása a portál tárhelyére.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { clientId?: string; fileId?: string; thumb?: boolean } | null;
  const clientId = body?.clientId ?? '';
  const fileId = body?.fileId ?? '';
  if (!/^[0-9a-f-]{36}$/.test(clientId) || !/^[A-Za-z0-9_-]{10,80}$/.test(fileId)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // thumb: a Drive által generált nézőkép (linkkel megosztott fájlnál elérhető)
  if (body?.thumb) {
    const t = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w720`, { redirect: 'follow' });
    const tt = t.headers.get('content-type') ?? '';
    if (!t.ok || !tt.startsWith('image/')) return NextResponse.json({ error: `Nincs nézőkép (${t.status} ${tt})` }, { status: 502 });
    const tb = Buffer.from(await t.arrayBuffer());
    const tp = `${clientId}/${crypto.randomUUID()}.jpg`;
    const { error: te } = await createAdminClient().storage.from('media').upload(tp, tb, { contentType: tt, upsert: false });
    if (te) return NextResponse.json({ error: te.message }, { status: 500 });
    return NextResponse.json({ path: tp, bytes: tb.length });
  }
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`, { redirect: 'follow' });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('video/')) {
    return NextResponse.json({ error: `A Drive fájl nem tölthető le (${res.status} ${type}). Linkkel megosztott?` }, { status: 502 });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = type.includes('quicktime') ? 'mov' : 'mp4';
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createAdminClient().storage.from('media').upload(path, buf, { contentType: type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, bytes: buf.length });
}
