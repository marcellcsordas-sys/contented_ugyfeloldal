import CalendarPage from '@/components/pages/CalendarPage';

// Így látja az ügyfél. Adminként itt is lehet kommentelni és státuszt váltani.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  return <CalendarPage previewId={id} m={m} />;
}
