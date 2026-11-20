import type { createClient } from './supabase/server';
import { signPaths } from './session';
import { monthRange } from './format';
import type { Comment, Post, PostWithMedia } from './types';

type Supa = Awaited<ReturnType<typeof createClient>>;

// Egy ügyfél egy hónapjának posztjai, kommentekkel és aláírt média-linkekkel.
// month = null: minden poszt (videós mód, ahol egy forgatás anyaga több hónapra szól).
export async function loadMonthPosts(supabase: Supa, clientId: string, month: string | null): Promise<PostWithMedia[]> {
  let q = supabase
    .from('posts')
    .select('*')
    .eq('client_id', clientId);
  if (month) {
    const { start, end } = monthRange(month);
    q = q.gte('publish_date', start).lt('publish_date', end);
  }
  const { data: posts } = await q
    .order('publish_date', { ascending: true })
    .order('number', { ascending: true })
    .returns<Post[]>();

  const list = posts ?? [];
  const ids = list.map((p) => p.id);
  const { data: comments } = ids.length
    ? await supabase
        .from('comments')
        .select('id, post_id, author_name, author_role, body, created_at, timecode')
        .in('post_id', ids)
        .order('created_at', { ascending: true })
        .returns<Comment[]>()
    : { data: [] as Comment[] };

  const urls = await signPaths(supabase, list.flatMap((p) => [p.visual_path, p.video_path]).filter((x): x is string => !!x));

  return list.map((p) => ({
    ...p,
    visual_url: p.visual_path ? urls.get(p.visual_path) ?? null : null,
    video_src: p.video_path ? urls.get(p.video_path) ?? null : null,
    comments: (comments ?? []).filter((c) => c.post_id === p.id),
  }));
}
