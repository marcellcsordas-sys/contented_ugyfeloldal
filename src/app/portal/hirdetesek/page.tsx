import AdsPage from '@/components/pages/AdsPage';

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <AdsPage m={m} />;
}
