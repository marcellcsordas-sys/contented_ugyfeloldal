import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session';

export default async function Home() {
  const { profile } = await getSessionProfile();
  if (profile?.role === 'admin') redirect('/admin');
  redirect('/portal');
}
