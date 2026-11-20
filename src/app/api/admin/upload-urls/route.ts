import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Admin: egyszer használható feltöltési linkek a 'media' tárhelyre (nagy videók importjához).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { clientId?: string; names?: string[] } | null;
  const clientId = body?.clientId ?? '';
  const names = (body?.names ?? []).slice(0, 40);
  if (!/^[0-9a-f-]{36}$/.test(clientId) || names.length === 0) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const admin = createAdminClient();
  const out: { name: string; path: string; token: string }[] = [];
  for (const name of names) {
    const ext = (name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from('media').createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'sign failed' }, { status: 500 });
    out.push({ name, path, token: data.token });
  }
  return NextResponse.json({ files: out });
}
