import type { Metadata } from 'next';

import { AdminNeteaseCard } from './admin-netease-card';

export const metadata: Metadata = {
  title: '站点管理',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] px-4 py-16">
      <AdminNeteaseCard />
    </main>
  );
}
