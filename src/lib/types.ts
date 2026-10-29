export type PostStatus = 'keszul' | 'var' | 'mod' | 'ok' | 'pub';

export type Client = { id: string; name: string; contact_name: string | null; created_at: string };

export type Profile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'client';
  client_id: string | null;
};

export type Package = {
  client_id: string;
  name: string;
  monthly_fee: number;
  fee_note: string;
  since_label: string | null;
  contract_note: string | null;
  includes: string[];
  terms: string[];
  posts_quota: number;
  videos_quota: number;
  revisions_quota: number;
};

export type Offer = {
  id: string;
  client_id: string;
  title: string;
  subtitle: string | null;
  price_label: string | null;
  cta_label: string;
  active: boolean;
};

export type Post = {
  id: string;
  client_id: string;
  number: number | null;
  platform: string;
  content_type: string;
  publish_date: string;
  format: string;
  is_video: boolean;
  visual_path: string | null;
  visual_headline: string | null;
  caption: string;
  internal_note: string | null;
  status: PostStatus;
  revision_count: number;
};

export type Comment = {
  id: string;
  post_id: string;
  author_name: string | null;
  author_role: 'admin' | 'client' | null;
  body: string;
  created_at: string;
};

export type PostWithMedia = Post & { visual_url: string | null; comments: Comment[] };
