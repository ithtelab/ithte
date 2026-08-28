import CarouselStacked from '@/components/ui/carousel-07';
import { getPhotos } from '@/utils/photo-manifest';

const milestoneCopy = [
  {
    title: '从一个小站开始',
    description: '小时候就想拥有自己的网站，后来终于把这个念头变成了现实。',
    badge: '01 · 起点',
  },
  {
    title: '开始独立折腾',
    description: '从页面到服务端，一点点理解一个完整项目是怎样运转的。',
    badge: '02 · 成长',
  },
  {
    title: '把想法做成作品',
    description: '把一次次灵感写进代码，也逐渐做出真正属于自己的作品。',
    badge: '03 · 作品',
  },
  {
    title: '记录生活与远方',
    description: '代码之外，也开始认真保存那些值得记住的人、风景和时刻。',
    badge: '04 · 生活',
  },
  {
    title: '在守望里学会配合',
    description: '白天和 bug 对线，晚上和队友开黑，并稳定贡献一句“我的”。',
    badge: '05 · 守望',
  },
  {
    title: '故事仍在继续',
    description: '继续做有意思的项目，认真记录平凡生活，顺便等下一个 bug 主动投案。',
    badge: '06 · 现在',
  },
];

export async function Milestone() {
  const photos = await getPhotos('milestones');
  if (!photos.length) return null;

  // 清单里带 caption 的照片会覆盖对应节点的文案,让「哪张图配哪段文字」由清单驱动
  const milestones = milestoneCopy.map((item, index) => {
    const photo = photos[index % photos.length];
    return {
      ...item,
      description: photo.caption || item.description,
      image: photo.url,
    };
  });

  return (
    <section id="milestone" data-section className="relative overflow-hidden px-4 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[65%] bg-[radial-gradient(ellipse_at_center,rgba(215,163,91,0.1),transparent_66%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <p data-section-title className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#d7a35b]">
          Timeline
        </p>
        <h2 data-section-title className="mt-4 max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
          一路走来的
          <em className="font-normal not-italic text-[#d7a35b]">几个节点</em>
        </h2>
        <p data-reveal className="mt-5 max-w-xl text-sm leading-7 text-white/55 md:text-base md:leading-8">
          从想拥有一个网站开始，到真正把想法做成完整项目。
        </p>
      </div>

      <div data-reveal className="relative z-10 mt-8 md:mt-12">
        <CarouselStacked slides={milestones} />
      </div>
    </section>
  );
}
