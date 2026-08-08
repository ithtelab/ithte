import { ArrowDown } from 'lucide-react';

import FanCarousel from '@/components/ui/card-fan-carousel';
import { getLocalPhotos } from '@/utils/local-photos';

export function OpenSource() {
  const photos = getLocalPhotos('photo-wall');
  const cards = photos.map((url, index) => ({ imgUrl: url, alt: `黑天鹅的风景收藏 ${index + 1}` }));
  return (
    <section id="open-source" data-section className="relative min-h-[100svh] overflow-hidden">
      {/* 背景：深色底 + 主题光斑 */}
      <div className="absolute inset-0 bg-[#050608]" />
      <div className="pointer-events-none absolute -left-1/4 top-[12%] h-[55%] w-[70%] bg-[radial-gradient(ellipse_at_center,rgba(159,232,208,0.14),transparent_65%)]" />
      <div className="pointer-events-none absolute -right-1/5 bottom-[18%] h-[48%] w-[55%] bg-[radial-gradient(ellipse_at_center,rgba(215,163,91,0.12),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,6,8,0.6)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 pb-16 pt-24 md:px-8 md:pt-32">
        {/* 照片墙标题 */}
        <h2
          data-section-title
          className="max-w-5xl text-balance text-5xl font-black leading-[1.05] tracking-[-0.06em] text-white md:text-7xl lg:text-[6.5rem]"
        >
          对了，这里是我的{' '}
          <em className="font-normal not-italic text-[#9fe8d0]">照片墙</em>
        </h2>

        <p data-reveal className="mt-6 max-w-xl text-sm leading-7 text-white/70 md:text-base md:leading-8">
          这里收藏着一些认真生活过的瞬间，也记录着一路走来的
          <strong className="font-semibold text-[#9fe8d0]">人与故事</strong>
        </p>
        <p data-reveal className="mt-3 max-w-xl text-sm leading-7 text-white/55 md:text-base md:leading-8">
          按下快门的每一帧，都是认真生活过的证据
        </p>

        {/* 下滑指引 */}
        <div data-reveal className="mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">
          <ArrowDown className="h-4 w-4 animate-bounce text-[#9fe8d0]/70" />
          下滑查看照片
        </div>

        <p data-reveal className="mt-3 text-sm text-white/40">
          热爱，是所有的理由与解释
        </p>

        {/* 本地照片墙：扇形卡片轮播 */}
        <div data-reveal className="mt-10">
          <div className="relative left-1/2 w-screen -translate-x-1/2">
            <FanCarousel cards={cards} />
          </div>
        </div>
      </div>
    </section>
  );
}
