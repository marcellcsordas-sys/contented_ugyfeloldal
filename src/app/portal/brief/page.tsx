import BriefPage from '@/components/pages/BriefPage';

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <BriefPage m={m} />;
}
