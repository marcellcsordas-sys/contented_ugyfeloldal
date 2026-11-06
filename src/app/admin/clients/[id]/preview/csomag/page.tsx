import PackagePage from '@/components/pages/PackagePage';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  return <PackagePage previewId={id} m={m} />;
}
