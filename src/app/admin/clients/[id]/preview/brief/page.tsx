import BriefPage from '@/components/pages/BriefPage';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  return <BriefPage previewId={id} m={m} />;
}
