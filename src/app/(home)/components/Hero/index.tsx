import Image from 'next/image';
import type { CSSProperties } from 'react';
import { BookOpen } from 'lucide-react';
import { SiGithub } from 'react-icons/si';

import { ShinyButton } from '@/components/ui/shiny-button';

import { Earth } from '../Earth';
import { AvatarMusicGlow } from './avatar-music-glow';

const socialPlatforms = [
  { src: '/social/qq.png', label: 'QQ 26677960', href: 'https://wpa.qq.com/msgrd?v=3&uin=26677960&site=qq&menu=yes', band: 'bass', glow: 'rgba(18, 183, 245, 0.58)', invert: false, angle: -90, mobileRadius: 9.4, desktopRadius: 13, size: 'large' },
  { src: '/social/douyin.svg', label: '抖音 ithte', href: 'https://www.douyin.com/user/MS4wLjABAAAAOcT6giaRT5996nn3HCGW-MpwnTo66LrKwCmXVVXMzik', band: 'mid', glow: 'rgba(37, 244, 238, 0.52)', invert: false, angle: -18, mobileRadius: 7.7, desktopRadius: 10.3, size: 'small' },
  { src: '/social/bilibili.svg', label: '哔哩哔哩', href: '#', band: 'mid', glow: 'rgba(0, 174, 236, 0.58)', invert: false, angle: 39, mobileRadius: 9, desktopRadius: 12, size: 'medium' },
  { src: '/social/github.svg', label: 'GitHub', href: 'https://github.com/ithtelab/ithte', band: 'high', glow: 'rgba(240, 246, 252, 0.46)', invert: true, angle: 108, mobileRadius: 8, desktopRadius: 10.8, size: 'small' },
  { src: '/social/netease-cloud-music.svg', label: '网易云音乐', href: '#', band: 'bass', glow: 'rgba(230, 0, 38, 0.54)', invert: false, angle: 164, mobileRadius: 9.3, desktopRadius: 12.7, size: 'medium' },
  { src: '/social/weibo.svg', label: '微博', href: '#', band: 'high', glow: 'rgba(255, 130, 0, 0.56)', invert: false, angle: 216, mobileRadius: 7.8, desktopRadius: 10.5, size: 'small' },
] as const;

export function Hero() {
  return (
    <section id="top" data-section className="relative min-h-screen overflow-hidden px-4 pb-10 pt-20 md:px-8 md:pb-16 md:pt-28">
      <Earth />
      <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-16 lg:gap-y-8">
        <div>
          <p data-hero-meta className="mb-5 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#539dfd]">
            一个平凡却快乐的人
          </p>
          <div className="overflow-hidden">
            <h1 className="text-balance font-black tracking-[-0.06em] text-white">
              <span data-hero-word className="mb-4 flex items-center gap-3 text-[2rem] leading-none md:mb-5 md:text-5xl lg:text-[3.5rem]">
                <span aria-hidden className="inline-block origin-bottom translate-y-0.5 text-[0.92em]">
                  👋
                </span>
                <span>Hello,</span>
              </span>
              <span data-hero-word className="block text-5xl leading-[1.12] text-[#f5efe6] md:text-7xl lg:text-[6.75rem]">
                我叫
              </span>
              <span data-hero-word className="mt-1 block text-5xl leading-[1.08] text-[#539dfd] md:text-7xl lg:text-[7.25rem]">
                黑天鹅
              </span>
            </h1>
          </div>
          <div data-hero-meta className="mt-7 max-w-2xl space-y-5 text-sm leading-7 text-white/62 md:text-base md:leading-8">
            <p>
              我是一个热爱折腾的 <strong className="text-white">个人站长</strong>。
            </p>
            <p>
            一直对网站开发领域很感兴趣，<strong className="text-white">从小就希望有一个属于自己的网站</strong>，通过自学和各种折腾，才有了你现在看到的这个小站
            </p>
          </div>
          <div data-hero-meta className="mt-9 flex flex-wrap gap-3">
            <ShinyButton
              asChild
              className="group inline-flex cursor-pointer items-center gap-2 !px-5 !py-3.5 !text-[11px] !font-bold uppercase tracking-[0.22em]"
            >
              <a href="#" target="_blank" rel="noreferrer">
                个人博客
                <BookOpen className="h-3.5 w-3.5 text-white transition-transform duration-300 ease-out group-hover:scale-110" />
              </a>
            </ShinyButton>
            <ShinyButton
              asChild
              className="group inline-flex cursor-pointer items-center gap-2 !px-5 !py-3.5 !text-[11px] !font-bold uppercase tracking-[0.22em] [--duration:3.6s] [animation-delay:-1.2s] [--gradient-dir:reverse]"
            >
              <a href="https://github.com/ithtelab/ithte" target="_blank" rel="noreferrer">
                GitHub
                <SiGithub className="h-3.5 w-3.5 text-white transition-transform duration-300 ease-out group-hover:rotate-12" />
              </a>
            </ShinyButton>
          </div>
        </div>

        <div data-hero-visual data-parallax className="relative mx-auto flex w-full max-w-[560px] items-center justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_62%)]" />
          <div data-audio-visual className="relative flex h-[370px] w-full items-center justify-center md:h-[520px] lg:h-[560px]">
            <AvatarMusicGlow />
            <div data-orbit-avatar className="absolute z-10 h-[180px] w-[180px] cursor-pointer overflow-hidden rounded-full border border-white/12 bg-[#0b0f14] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out hover:scale-[1.04] md:h-[230px] md:w-[230px] lg:h-[250px] lg:w-[250px]">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-white/5">
                <Image src="/avatar-douyin.jpg" alt="黑天鹅的抖音头像" fill priority sizes="(min-width:1024px)250px,250px" className="object-cover object-center" />
              </div>
              <span className="absolute bottom-5 right-5 h-4 w-4 rounded-full border-4 border-[#0b0f14] bg-[#63d47f]" />
            </div>

            <div data-orbit-tag className="absolute z-20 h-[300px] w-[300px] md:h-[410px] md:w-[410px] lg:h-[440px] lg:w-[440px]">
              <div className="social-orbit-track pointer-events-none relative h-full w-full">
                {socialPlatforms.map((platform, index) => {
                  const orbitStyle = {
                    '--orbit-angle': `${platform.angle}deg`,
                    '--orbit-counter-angle': `${-platform.angle}deg`,
                    '--orbit-radius-mobile': `${platform.mobileRadius}rem`,
                    '--orbit-radius-desktop': `${platform.desktopRadius}rem`,
                    '--orbit-float-delay': `${index * -0.62}s`,
                  } as CSSProperties;

                  return (
                    <div
                      key={platform.label}
                      data-audio-band={platform.band}
                      data-orbit-index={index}
                      className="social-orbit-item absolute left-1/2 top-1/2"
                      style={orbitStyle}
                    >
                      <a
                        href={platform.href}
                        target={platform.href === '#' ? undefined : '_blank'}
                        rel={platform.href === '#' ? undefined : 'noreferrer'}
                        aria-label={platform.label}
                        data-size={platform.size}
                        data-invert={platform.invert || undefined}
                        className="social-orbit-badge group pointer-events-auto relative flex h-11 w-11 items-center justify-center md:h-[52px] md:w-[52px]"
                        style={{ '--platform-glow': platform.glow } as CSSProperties}
                      >
                        <span className="social-orbit-reactor relative flex h-full w-full items-center justify-center">
                          <img
                            src={platform.src}
                            alt=""
                            draggable={false}
                            className="social-orbit-logo h-[72%] w-[72%] object-contain"
                          />
                          <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#10141b]/95 px-2 py-1 text-[10px] font-medium text-white/75 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                            {platform.label}
                          </span>
                        </span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div data-hero-meta className="grid grid-cols-2 gap-3 text-[11px] uppercase tracking-[0.18em] text-white/42 lg:col-start-1 lg:row-start-2 lg:tracking-[0.22em]">
          <div className="hero-info-card rounded-lg border bg-white/4 p-3.5 md:p-4">
            <span className="block text-white/68">角色</span>
            <strong className="mt-2 block text-sm tracking-normal text-white">赛博修电脑的</strong>
          </div>
          <div className="hero-info-card rounded-lg border bg-white/4 p-3.5 md:p-4">
            <span className="block text-white/68">坐标</span>
            <strong className="mt-2 block text-sm tracking-normal text-white">山东 · 济宁</strong>
          </div>
          <div className="hero-info-card rounded-lg border bg-white/4 p-3.5 md:p-4">
            <span className="block text-white/68">常玩</span>
            <strong className="mt-2 block text-sm tracking-normal text-white">守望先锋</strong>
          </div>
          <div className="hero-info-card rounded-lg border bg-white/4 p-3.5 md:p-4">
            <span className="block text-white/68">态度</span>
            <strong className="mt-2 block text-sm tracking-normal text-white">先重启，再讲道理</strong>
          </div>
        </div>
      </div>

    </section>
  );
}
