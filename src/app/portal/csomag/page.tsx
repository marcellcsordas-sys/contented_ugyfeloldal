import PackagePage from '@/components/pages/PackagePage';

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <PackagePage m={m} />;
}
