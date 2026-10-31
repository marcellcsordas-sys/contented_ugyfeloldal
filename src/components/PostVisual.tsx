import type { PostWithMedia } from '@/lib/types';

function ratioOf(format: string) {
  const [a, b] = format.split(':').map(Number);
  return a && b ? `${a} / ${b}` : '4 / 5';
}

export function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

// Kártyán fix magasság (mobilon kis bélyegkép), részletes nézetben valódi képarány.
export default function PostVisual({ post, large = false }: { post: PostWithMedia; large?: boolean }) {
  const label = `${post.is_video ? 'Videó' : 'Kreatív'} ${post.format}`;
  const style: React.CSSProperties | undefined = large ? { aspectRatio: ratioOf(post.format) } : undefined;

  return (
    <div className={`visual ${large ? 'visual-large' : 'visual-card'} ${post.visual_url ? '' : 'placeholder'}`} style={style}>
      {post.visual_url && post.is_video && (
        large ? (
          <video src={post.visual_url} controls playsInline preload="metadata" />
        ) : (
          <video src={post.visual_url} muted playsInline preload="metadata" />
        )
      )}
      {post.visual_url && !post.is_video && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.visual_url} alt={post.visual_headline ?? `${post.platform} kreatív`} loading={large ? 'eager' : 'lazy'} />
      )}
      <span className="tag">{label}</span>
      {post.is_video && !(large && post.visual_url) && (
        <span className="play"><PlayIcon /></span>
      )}
      {!post.visual_url && (
        <>
          <span className="headline">{post.visual_headline || 'A vizuál készül'}</span>
          <span className="tiny muted visual-note">
            {post.visual_headline ? 'Vizuál feltöltés alatt' : 'Még nincs feltöltve'}
          </span>
        </>
      )}
    </div>
  );
}
