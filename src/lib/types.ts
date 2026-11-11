export type PostStatus = 'keszul' | 'var' | 'mod' | 'ok' | 'pub';

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  created_at: string;
  billingo_partner_id?: number | null;
  ad_invoices_url?: string | null;
};

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
  video_url: string | null;
  video_path: string | null;
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

export type PostWithMedia = Post & { visual_url: string | null; video_src: string | null; comments: Comment[] };

export type AdReport = {
  id: string;
  client_id: string;
  month: string;
  platform: 'meta' | 'google';
  spend: number;
  budget: number | null;
  impressions: number;
  reach: number | null;
  clicks: number;
  results: number;
  result_label: string;
  active_ads: number;
  summary: string | null;
  top_ads: AdRow[];
  source: string;
  period_label: string | null;
  leads: number;
  leads_spend: number;
  engagements: number;
  new_followers: number;
  highlight: AdHighlight | null;
  breakdown: { label: string; spend: number; result: string }[];
  intro: string | null;
  items: AdItem[];
  updated_at: string;
};

// Egy hirdetés a riport táblázatában
export type AdRow = {
  name: string;
  status?: 'aktív' | 'lezárult';
  spend?: number;
  result?: string; // pl. "23 új követő"
  impressions?: number;
  reach?: number;
  value?: string; // régi formátum
};

// Egy hirdetés (Meta) vagy kampány (Google) a részletes listában
export type AdItem = {
  name: string; // ügyfélbarát név
  goal: string; // pl. "Állásjelentkezés", "Keresési hirdetés"
  spend: number;
  result: string; // pl. "78 állásjelentkező"
  cost?: string; // pl. "178 Ft / jelentkező"
  extra?: string; // pl. "13 479 megjelenés · 9,2% átkattintás"
  star?: boolean;
};

export type AdHighlight = {
  title: string;
  subtitle?: string;
  image_path?: string;
  stats: { label: string; value: string }[];
  note?: string;
};

export type ShopReport = {
  id: string;
  client_id: string;
  month: string;
  source: string;
  period_label: string | null;
  orders: number;
  revenue: number;
  net_sales: number;
  avg_order: number;
  channels: { label: string; orders: number; revenue: number }[];
  products: { name: string; orders: number; revenue: number; unit?: string }[];
  note: string | null;
  updated_at: string;
};
