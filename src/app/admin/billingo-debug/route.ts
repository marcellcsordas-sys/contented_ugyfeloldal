import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { relatedPartnerIds } from '@/lib/billingo';

// Ideiglenes admin diagnosztika: mely Billingo partnereket kapcsolja össze
export async function GET(request: NextRequest) {
  await requireAdmin();
  const id = Number(request.nextUrl.searchParams.get('id'));
  const key = process.env.BILLINGO_API_KEY!;
  const p = await fetch(`https://api.billingo.hu/v3/partners/${id}`, { headers: { 'X-API-KEY': key }, cache: 'no-store' }).then((r) => r.json());
  return NextResponse.json({ name: p?.name, taxcode: p?.taxcode, related: await relatedPartnerIds(id) });
}
