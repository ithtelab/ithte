import { ImageResponse } from 'next/og';

export const alt = '黑天鹅个人主页';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#050608',
        color: '#f4f0e8',
        display: 'flex',
        height: '100%',
        justifyContent: 'space-between',
        padding: '76px 86px',
        position: 'relative',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
        <span style={{ color: '#539dfd', fontSize: 24, letterSpacing: 8 }}>一个平凡却快乐的人</span>
        <strong style={{ fontSize: 112, lineHeight: 1.05, marginTop: 30 }}>你好，我叫</strong>
        <strong style={{ color: '#539dfd', fontSize: 148, lineHeight: 1 }}>黑天鹅</strong>
        <span style={{ color: 'rgba(244,240,232,0.58)', fontSize: 28, marginTop: 34 }}>认真折腾，也认真生活。</span>
      </div>
      <div style={{ alignItems: 'center', border: '3px solid rgba(159,232,208,0.5)', borderRadius: 999, boxShadow: '0 0 70px rgba(83,157,253,0.32)', display: 'flex', height: 260, justifyContent: 'center', width: 260 }}>
        <span style={{ color: '#9fe8d0', fontSize: 80, fontWeight: 800 }}>黑</span>
      </div>
    </div>,
    size,
  );
}
