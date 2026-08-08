import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { InfoSections } from './components/InfoSections';
import { Motion } from './components/Motion';
import { SectionNav } from './components/SectionNav';

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
