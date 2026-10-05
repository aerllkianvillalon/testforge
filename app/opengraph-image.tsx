import { ImageResponse } from 'next/og';
import { SITE_TAGLINE } from '@/lib/site';

export const runtime = 'edge';
export const alt = 'TestForge — forge your notes into practice tests';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0a0a0c',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 14,
              background: '#fafafa',
              color: '#0a0a0c',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>TestForge</div>
        </div>
        <div style={{ display: 'flex', marginTop: 56, fontSize: 60, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Turn your notes into
        </div>
        <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          flashcards and quizzes
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 28, color: '#a1a1aa' }}>{SITE_TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
