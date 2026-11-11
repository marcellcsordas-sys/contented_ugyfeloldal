import InvoicePage from '@/components/pages/InvoicePage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePage previewId={id} />;
}
