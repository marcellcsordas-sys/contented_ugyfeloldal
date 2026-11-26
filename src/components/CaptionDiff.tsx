import { wordDiff } from '@/lib/textdiff';

// Az ügyfél javaslata: amit beírt, pirossal; amit kivett, áthúzva.
export default function CaptionDiff({ caption, suggestion }: { caption: string; suggestion: string }) {
  const parts = wordDiff(caption, suggestion);
  return (
    <p className="caption">
      {parts.map((p, i) =>
        p.type === 'add' ? <span key={i} className="sugg-add">{p.text}</span>
        : p.type === 'del' ? (p.text.trim() ? <del key={i} className="sugg-del">{p.text}</del> : null)
        : <span key={i}>{p.text}</span>
      )}
    </p>
  );
}
