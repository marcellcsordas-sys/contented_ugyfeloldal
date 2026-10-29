import type { createClient } from './supabase/server';
import { signPaths } from './session';
import { monthRange } from './format';
import type { Comment, Post, PostWithMedia } from './types';

type Supa = Awaited<ReturnType<typeof createClient>>;

// Egy ügyfél egy hónapjának posztjai, kommentekkel és aláírt média-linkekkel.
export async function loadMonthPosts(supabase: Supa, clientId: string, month: string): Promise<PostWithMedia[]> {
  const { start, end } = monthRange(month);
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('client_id', clientId)
    .gte('publish_date', start)
    .lt('publish_date', end)
    .order('publish_date', { ascending: true })
    .order('number', { ascending: true })
    .returns<Post[]>();

  const list = posts ?? [];
  const ids = list.map((p) => p.id);
  const { data: comments } = ids.length
    ? await supabase
        .from('comments')
        .select('id, post_id, author_name, author_role, body, created_at')
        .in('post_id', ids)
        .order('created_at', { ascending: true })
        .returns<Comment[]>()
    : { data: [] as Comment[] };

  const urls = await signPaths(supabase, list.map((p) => p.visual_path).filter((x): x is string => !!x));

  return list.map((p) => ({
    ...p,
    visual_url: p.visual_path ? urls.get(p.visual_path) ?? null : null,
    comments: (comments ?? []).filter((c) => c.post_id === p.id),
  }));
}
