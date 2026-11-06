'use client';

import { useState } from 'react';
import { PlayIcon } from './PostVisual';

// Google Drive ID egy megosztási linkből
export function driveId(url: string) {
  const m = url.match(/\/d\/([\w-]{10,})/) ?? url.match(/[?&]id=([\w-]{10,})/);
  return m?.[1] ?? null;
}

// Borítókép play gombbal. A Drive lejátszó csak kattintásra töltődik be, így nem lassítja az oldalt.
export default function DriveVideo({ url, cover, ratio }: { url: string; cover: string | null; ratio: string }) {
  const [play, setPlay] = useState(false);
  const id = driveId(url);
  if (!id) return null;
  return (
    <div className="drive-video" style={{ aspectRatio: ratio }}>
      {play ? (
        <iframe
          src={`https://drive.google.com/file/d/${id}/preview`}
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Videó lejátszása"
        />
      ) : (
        <button type="button" className="drive-cover" onClick={() => setPlay(true)} aria-label="Videó lejátszása">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img src={cover} alt="" />}
          <span className="drive-play"><PlayIcon size={26} /></span>
          <span className="tag drive-tag">Videó · kattints a lejátszáshoz</span>
        </button>
      )}
    </div>
  );
}
