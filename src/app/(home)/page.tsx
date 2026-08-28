import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { InfoSections } from './components/InfoSections';
import { Motion } from './components/Motion';
import { SectionNav } from './components/SectionNav';

// ISR:首页默认会被静态预渲染(留言、云相册清单在构建期冻结);
// 每 60 秒重新渲染一次,新留言和云端换图 ≤60s 生效,无需重新构建部署
export const revalidate = 60;

function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050608] text-[#f4f0e8] selection:bg-[#b7ffe8] selection:text-[#050608]">
      <Motion>
        <SectionNav />
        <Hero />
        <InfoSections />
        <Footer />
      </Motion>
    </main>
  );
}

export default Page;
