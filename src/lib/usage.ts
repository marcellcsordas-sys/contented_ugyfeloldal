import type { Package, Post } from './types';

// Havi módosítási kör: egy körben az összes posztra jelezhet az ügyfél.
// Az n-edik kör az, amikor bármelyik poszt n-edszer kap módosítási kérést.
export function revisionRounds(posts: Pick<Post, 'revision_count'>[]) {
  return posts.reduce((m, p) => Math.max(m, p.revision_count), 0);
}

export function usageRows(pkg: Package | null, posts: Pick<Post, 'is_video' | 'revision_count'>[]) {
  if (!pkg) return [];
  return [
    { label: 'Poszt', used: posts.length, total: pkg.posts_quota },
    { label: 'Videó', used: posts.filter((p) => p.is_video).length, total: pkg.videos_quota },
    { label: 'Módosítási kör', used: revisionRounds(posts), total: pkg.revisions_quota },
  ].filter((u) => u.total > 0);
}
