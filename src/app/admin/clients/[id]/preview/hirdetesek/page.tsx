import AdsPage from '@/components/pages/AdsPage';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  return <AdsPage previewId={id} m={m} />;
}
