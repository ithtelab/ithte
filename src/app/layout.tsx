import type { Metadata, Viewport } from 'next';
import './globals.scss';

import { MusicProvider } from '@/components/music-player/music-context';
import { FloatingLyrics } from '@/components/music-player/floating-lyrics';
import { MusicPlayer } from '@/components/music-player/music-player';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : new URL('https://ithte.leo.com'); // fallback,避免 SEO 信号丢失;生产应配置真实域名

export const metadata: Metadata = {
  title: '黑天鹅 · 个人主页',
  description: '黑天鹅 — 网站开发者 / 守望先锋玩家 | 先重启，再讲道理',
  applicationName: '黑天鹅 · 个人主页',
  metadataBase: siteUrl,
  alternates: { canonical: '/' },
  authors: [{ name: '黑天鹅' }],
  creator: '黑天鹅',
  keywords: ['黑天鹅', '个人主页', '网站开发', '守望先锋', '照片墙', '音乐'],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/bird.svg', type: 'image/svg+xml' }],
    shortcut: '/bird.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '黑天鹅 · 个人主页',
    title: '黑天鹅 · 个人主页',
    description: '认真折腾，也认真生活。一个属于黑天鹅的个人网站。',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: '黑天鹅 · 个人主页',
    description: '认真折腾，也认真生活。一个属于黑天鹅的个人网站。',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050608',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '黑天鹅',
    url: siteUrl.toString(),
    description: '网站开发者与守望先锋玩家',
    jobTitle: '全栈开发者',
    homeLocation: { '@type': 'Place', name: '山东济宁' },
    knowsAbout: ['网站开发', '全栈开发', '个人网站'],
    sameAs: [
      'https://github.com/ithtelab/ithte',
      'https://www.douyin.com/user/MS4wLjABAAAAOcT6giaRT5996nn3HCGW-MpwnTo66LrKwCmXVVXMzik',
    ],
  };

  return (
    <html lang="zh-CN">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
        <MusicProvider>
          {children}
          <FloatingLyrics />
          <MusicPlayer />
        </MusicProvider>
      </body>
    </html>
  );
}
