import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadPdf, getDocument } from '@/lib/billingo';

// Számla PDF: csak a saját ügyfél számlája (vagy admin előnézetben a megadott ügyfélé).
export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const id = Number(docId);
  if (!Number.isFinite(id)) return new NextResponse('Hibás számla.', { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
  const clientId = profile?.role === 'admin' ? request.nextUrl.searchParams.get('client') : profile?.client_id;
  if (!clientId) return new NextResponse('Nincs hozzáférés.', { status: 403 });
  const { data: client } = await supabase.from('clients').select('billingo_partner_id').eq('id', clientId).maybeSingle();
  const partnerId = client?.billingo_partner_id;
  if (!partnerId) return new NextResponse('Nincs hozzáférés.', { status: 403 });

  const doc = await getDocument(id);
  if (!doc || doc.partnerId !== Number(partnerId)) return new NextResponse('Nincs hozzáférés.', { status: 403 });
  const pdf = await downloadPdf(id);
  if (!pdf) return new NextResponse('A számla PDF most nem érhető el, próbáld újra pár perc múlva.', { status: 503 });
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="szamla-${doc.number.replace(/[^\w-]/g, '_')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
