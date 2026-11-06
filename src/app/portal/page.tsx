import CalendarPage from '@/components/pages/CalendarPage';

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <CalendarPage m={m} />;
}
