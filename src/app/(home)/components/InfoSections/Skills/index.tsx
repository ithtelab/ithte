import { SiDocker, SiElectron, SiFlask, SiGit, SiGithub, SiHtml5, SiMysql, SiNestjs, SiNextdotjs, SiNginx, SiPrisma, SiPython, SiReact, SiRedis, SiSass, SiSpringboot, SiTailwindcss, SiTypescript, SiVercel, SiVite, SiVuedotjs, SiWebpack } from 'react-icons/si';

import { SectionTitle } from '../../SectionTitle';

const techIcons = [
  { icon: SiTypescript, label: 'TypeScript' },
  { icon: SiReact, label: 'React' },
  { icon: SiNextdotjs, label: 'Next.js' },
  { icon: SiVuedotjs, label: 'Vue' },
  { icon: SiTailwindcss, label: 'TailwindCSS' },
  { icon: SiHtml5, label: 'HTML5' },
  { icon: SiSass, label: 'Sass' },
  { icon: SiNestjs, label: 'NestJS' },
  { icon: SiSpringboot, label: 'Spring Boot' },
  { icon: SiMysql, label: 'MySQL' },
  { icon: SiRedis, label: 'Redis' },
  { icon: SiDocker, label: 'Docker' },
  { icon: SiNginx, label: 'Nginx' },
  { icon: SiGit, label: 'Git' },
  { icon: SiGithub, label: 'GitHub' },
  { icon: SiVite, label: 'Vite' },
  { icon: SiWebpack, label: 'Webpack' },
  { icon: SiPrisma, label: 'Prisma' },
  { icon: SiPython, label: 'Python' },
  { icon: SiFlask, label: 'Flask' },
  { icon: SiVercel, label: 'Vercel' },
  { icon: SiElectron, label: 'Electron' },
] as const;

export function Skills() {
  return (
    <section id="skills" data-section className="px-4 py-20 md:px-8 md:py-28">
      <SectionTitle
        title={
          <>
            我的 <em className="font-normal text-[#d7a35b]">技术栈</em>
          </>
        }
        description={
          <>
            其中我最喜欢的一套组合是： <span className="font-bold text-[#8dd5f8]">NextJS</span> + <span className="font-bold text-[#9fe8d0]">TailwindCSS</span>
          </>
        }
      />
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3">
        {techIcons.map(({ icon: Icon, label }) => (
          <span key={label} data-reveal className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/64 hover:text-white">
            <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#f5efe6]" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
