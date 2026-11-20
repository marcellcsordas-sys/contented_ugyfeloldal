import { requireAdmin, signPaths } from '@/lib/session';
import PosterMaker from '@/components/admin/PosterMaker';

// Nézőkép generálása azokhoz a videókhoz, amelyekhez még nincs kép.
export default async function PostersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: posts } = await supabase
    .from('posts')
    .select('id, number, video_path')
    .eq('client_id', id)
    .not('video_path', 'is', null)
    .is('visual_path', null)
    .order('number');
  const list = posts ?? [];
  const urls = await signPaths(supabase, list.map((p) => p.video_path as string));
  const items = list.map((p) => ({ id: p.id as string, number: p.number as number | null, src: urls.get(p.video_path as string) ?? '' }));
  return (
    <div className="wrap stack" style={{ gap: 18, paddingTop: 32 }}>
      <h1 className="h1">Nézőképek</h1>
      <PosterMaker clientId={id} items={items} />
    </div>
  );
}
