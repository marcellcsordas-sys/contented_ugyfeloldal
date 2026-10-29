import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, signPaths } from '@/lib/session';
import { formatShortDate } from '@/lib/format';
import type { Comment, Post } from '@/lib/types';
import TopBar from '@/components/TopBar';
import PostForm from '@/components/admin/PostForm';
import PostVisual from '@/components/PostVisual';
import AdminComment from '@/components/admin/AdminComment';

export default async function EditPostPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params;
  const { supabase, profile } = await requireAdmin();

  const [{ data: client }, { data: post }, { data: comments }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', id).maybeSingle(),
    supabase.from('posts').select('*').eq('id', postId).eq('client_id', id).maybeSingle<Post>(),
    supabase.from('comments').select('id, post_id, author_name, author_role, body, created_at')
      .eq('post_id', postId).order('created_at').returns<Comment[]>(),
  ]);
  if (!client || !post) notFound();

  const urls = await signPaths(supabase, post.visual_path ? [post.visual_path] : []);
  const withMedia = { ...post, visual_url: post.visual_path ? urls.get(post.visual_path) ?? null : null, comments: comments ?? [] };
  const month = post.publish_date.slice(0, 7);

  return (
    <>
      <TopBar name={profile?.full_name ?? 'Admin'} sub="Contented" admin />
      <div className="wrap">
        <div className="stack" style={{ gap: 24 }}>
          <Link className="chip" href={`/admin/clients/${id}?m=${month}`} style={{ alignSelf: 'flex-start' }}>‹ {client.name}</Link>
          <h1 className="h1">{post.platform} · {post.content_type}.<span className="second">{client.name}</span></h1>
          <div className="split">
            <div className="split-main">
              <PostForm clientId={id} post={post} month={month} />
            </div>
            <aside className="split-side">
              <div className="card" style={{ padding: 6 }}>
                <PostVisual post={withMedia} large />
              </div>
              <div className="card stack">
                <span className="eyebrow">Kommentek</span>
                {(comments ?? []).length === 0 && <span className="small muted">Még nincs komment.</span>}
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="comment">
                    <div className={`avatar ${c.author_role === 'admin' ? 'agency' : ''}`}>{(c.author_name ?? '?').charAt(0).toUpperCase()}</div>
                    <div className="stack" style={{ gap: 2 }}>
                      <span className="tiny secondary">
                        <strong style={{ color: '#fff' }}>{c.author_name}</strong> · {c.author_role === 'admin' ? 'Contented' : 'Ügyfél'} · {formatShortDate(c.created_at)}
                      </span>
                      <span className="small" style={{ whiteSpace: 'pre-line' }}>{c.body}</span>
                    </div>
                  </div>
                ))}
                <AdminComment postId={post.id} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
