import { currentMonthKey, normalizeMonth, shiftMonth } from '@/lib/format';
import { getPortalCtx } from '@/lib/portal';
import { signPaths } from '@/lib/session';
import { monthRange } from '@/lib/format';
import type { MonthlyInput } from '@/lib/brief';
import type { Post } from '@/lib/types';
import PortalShell, { NoClient } from '@/components/PortalShell';
import BriefWizard, { type PrevPost } from '@/components/BriefWizard';

export default async function BriefPage({ previewId, m }: { previewId?: string; m?: string }) {
  const ctx = await getPortalCtx(previewId);
  if (!ctx) return <NoClient userName="" />;
  const { supabase, clientId, client } = ctx;
  // Alapból a következő hónapot tervezzük
  const month = m ? normalizeMonth(m) : shiftMonth(currentMonthKey(), 1);
  const prev = shiftMonth(month, -1);
  const { start, end } = monthRange(prev);

  const [{ data: input }, { data: history }, { data: prevPosts }] = await Promise.all([
    supabase.from('monthly_inputs').select('*').eq('client_id', clientId).eq('month', `${month}-01`)
      .maybeSingle<MonthlyInput>(),
    supabase.from('monthly_inputs').select('month, submitted, submitted_at').eq('client_id', clientId)
      .order('month', { ascending: false }).limit(12)
      .returns<{ month: string; submitted: boolean; submitted_at: string | null }[]>(),
    supabase.from('posts').select('id, number, publish_date, content_type, visual_path, caption').eq('client_id', clientId)
      .gte('publish_date', start).lt('publish_date', end).order('publish_date')
      .returns<Pick<Post, 'id' | 'number' | 'publish_date' | 'content_type' | 'visual_path' | 'caption'>[]>(),
  ]);

  const urls = await signPaths(supabase, (prevPosts ?? []).map((p) => p.visual_path).filter((x): x is string => !!x));
  const posts: PrevPost[] = (prevPosts ?? []).map((p) => ({
    id: p.id,
    date: p.publish_date,
    title: p.caption.split('\n')[0].slice(0, 80),
    type: p.content_type,
    url: p.visual_path ? urls.get(p.visual_path) ?? null : null,
  }));

  return (
    <PortalShell
      active="brief"
      base={ctx.base}
      userName={ctx.userName}
      clientName={client.name}
      clientRow={client}
      preview={ctx.mode === 'preview' ? { backHref: `/admin/clients/${clientId}` } : undefined}
    >
      <BriefWizard
        key={month}
        clientId={clientId}
        clientName={client.name}
        month={month}
        base={ctx.base}
        input={input ?? null}
        prevPosts={posts}
        history={(history ?? []).map((h) => ({ month: h.month.slice(0, 7), submitted: h.submitted }))}
        mode={ctx.mode}
      />
    </PortalShell>
  );
}
