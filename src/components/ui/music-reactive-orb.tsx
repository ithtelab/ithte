'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';

import { cn } from '@/lib/utils';

export interface MusicVisualMetrics {
  bass: number;
  mid: number;
  high: number;
  level: number;
  hit: number;
  mood: number;
  mode: number;
}

interface MusicReactiveOrbProps {
  metricsRef: RefObject<MusicVisualMetrics>;
  isPlaying: boolean;
  className?: string;
}

const vertex = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uLevel;
  uniform float uHit;
  uniform float uMood;
  uniform float uMode;
  varying vec2 vUv;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
      p3.x + p3.y,
      p3.x + p3.z,
      p3.y + p3.z
    ) * p3.zyx);
  }

  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(
      dot(d0, d0),
      dot(d1, d1),
      dot(d2, d2),
      dot(d3, d3)
    ), 0.0);
    vec4 n = h * h * h * h * vec4(
      dot(d0, hash33(i)),
      dot(d1, hash33(i + i1)),
      dot(d2, hash33(i + i2)),
      dot(d3, hash33(i + 1.0))
    );
    return dot(vec4(31.316), n);
  }

  void main() {
    vec2 fragCoord = vUv * uResolution.xy;
    vec2 uv = (fragCoord - uResolution.xy * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
    float len = length(uv);
    float angle = atan(uv.y, uv.x);

    float energeticGate = smoothstep(0.38, 0.82, uMode);
    float intenseGate = smoothstep(0.74, 0.98, uMode);
    float reactiveHigh = uHigh * (0.12 + energeticGate * 0.88);
    float slowNoise = snoise3(vec3(uv * (1.3 + uMid * 0.42), uTime * (0.2 + uMid * (0.16 + uMode * 0.3))));
    float edgeNoise = snoise3(vec3(cos(angle) * 2.2, sin(angle) * 2.2, uTime * (0.34 + reactiveHigh * 1.65)));
    float highTeeth = pow(max(0.0, 0.5 + 0.5 * sin(angle * 26.0 - uTime * (1.1 + reactiveHigh * 7.2) + edgeNoise * 3.5)), 9.0);
    float radius = 0.57
      + slowNoise * (0.018 + uMid * (0.022 + uMode * 0.052))
      + edgeNoise * reactiveHigh * 0.022
      + uBass * (0.014 + uMode * 0.041)
      + uHit * intenseGate * 0.075
      + highTeeth * reactiveHigh * (0.018 + intenseGate * 0.092);

    float distanceToEdge = abs(len - radius);
    float coreWidth = 0.01 + uBass * 0.008 + reactiveHigh * 0.009;
    float core = smoothstep(coreWidth, 0.0, distanceToEdge);
    float aura = exp(-distanceToEdge * (15.0 - uLevel * (2.0 + uMode * 2.0)));
    float broadAura = exp(-distanceToEdge * 6.6) * (0.07 + uLevel * (0.2 + uMode * 0.28));

    float ray = pow(max(0.0, cos(angle * 18.0 + uTime * (1.2 + uHigh * 5.0) + edgeNoise * 2.0)), 18.0);
    ray *= reactiveHigh * (0.06 + intenseGate * 0.94) * smoothstep(radius - 0.09, radius + 0.3, len) * exp(-abs(len - radius) * 5.5);
    float shockRadius = radius + 0.07 + uHit * 0.16;
    float shock = exp(-abs(len - shockRadius) * 42.0) * uHit * intenseGate;

    vec3 calmBass = vec3(0.62, 0.91, 0.82);
    vec3 calmMid = vec3(0.22, 0.69, 1.00);
    vec3 calmHigh = vec3(0.63, 0.55, 1.00);
    vec3 calmWarm = vec3(0.93, 0.72, 0.40);
    vec3 wildBass = vec3(1.00, 0.12, 0.27);
    vec3 wildMid = vec3(1.00, 0.08, 0.66);
    vec3 wildHigh = vec3(0.16, 0.88, 1.00);
    vec3 wildWarm = vec3(1.00, 0.68, 0.08);

    vec3 bassColor = mix(calmBass, wildBass, uMood);
    vec3 midColor = mix(calmMid, wildMid, uMood);
    vec3 highColor = mix(calmHigh, wildHigh, uMood);
    vec3 warmColor = mix(calmWarm, wildWarm, uMood);
    float midFlow = 0.5 + 0.5 * sin(angle * 2.0 - uTime * (0.65 + uMid * 2.4) + slowNoise * 2.5);
    float highFlow = 0.5 + 0.5 * sin(angle * 5.0 + uTime * (0.9 + uHigh * 3.8) - edgeNoise * 3.0);
    float warmIsland = smoothstep(0.38, 0.82, 0.5 + 0.5 * snoise3(vec3(
      uv * 2.7 + vec2(uTime * 0.08, -uTime * 0.06),
      uTime * 0.14
    )));
    vec3 color = mix(bassColor, midColor, midFlow);
    color = mix(color, highColor, clamp(highFlow * (0.1 + reactiveHigh * 0.52) + highTeeth * reactiveHigh, 0.0, 0.78));
    color = mix(color, warmColor, warmIsland * (0.18 + uBass * 0.12 + uMood * 0.12));

    float spectralPhase = fract(angle / 6.2831853 + uTime * (0.025 + uMid * 0.035) + slowNoise * 0.09);
    vec3 prism = 0.52 + 0.48 * cos(6.2831853 * (spectralPhase + vec3(0.00, 0.34, 0.67)));
    color = mix(color, prism, 0.08 + reactiveHigh * 0.18 + uMid * uMode * 0.05);
    vec3 accent = mix(highColor, warmColor, clamp(shock * 0.75 + highTeeth * reactiveHigh, 0.0, 1.0));

    float intensity = core * (0.62 + uLevel * (0.62 + uMode * 0.58))
      + aura * (0.13 + uLevel * (0.26 + uMode * 0.32))
      + broadAura
      + ray * (0.28 + intenseGate * 1.62)
      + shock * 1.25;
    float innerMask = smoothstep(0.39, 0.51, len);
    float outerMask = 1.0 - smoothstep(1.02, 1.38, len);
    float alpha = clamp(intensity * innerMask * outerMask, 0.0, 1.0);
    vec3 finalColor = color * intensity + accent * (ray + shock) * 0.9 + warmColor * shock * 0.45;

    gl_FragColor = vec4(finalColor * alpha, alpha);
  }
`;

export function MusicReactiveOrb({ metricsRef, isPlaying, className }: MusicReactiveOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(isPlaying);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    playingRef.current = isPlaying;
    if (isPlaying) wakeRef.current();
  }, [isPlaying]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      dpr: Math.min(window.devicePixelRatio || 1, 1.75),
    });
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    canvas.style.height = '100%';
    canvas.style.width = '100%';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec3(1, 1, 1) },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uLevel: { value: 0 },
        uHit: { value: 0 },
        uMood: { value: 0 },
        uMode: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    let frame = 0;
    let targetBass = 0;
    let targetMid = 0;
    let targetHigh = 0;
    let targetLevel = 0;
    let targetHit = 0;
    let targetMood = 0;
    let targetMode = 0;
    let bass = 0;
    let mid = 0;
    let high = 0;
    let level = 0;
    let hit = 0;
    let mood = 0;
    let mode = 0;
    let visible = true;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value.set(canvas.width, canvas.height, canvas.width / canvas.height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const follow = (current: number, target: number, attack: number, release: number) =>
      current + (target - current) * (target > current ? attack : release);

    const update = (timestamp: number) => {
      if (!visible) {
        frame = 0;
        return;
      }
      if (playingRef.current) {
        const metrics = metricsRef.current;
        targetBass = metrics.bass;
        targetMid = metrics.mid;
        targetHigh = metrics.high;
        targetLevel = metrics.level;
        targetHit = metrics.hit;
        targetMood = metrics.mood;
        targetMode = metrics.mode;
      } else {
        targetBass = 0;
        targetMid = 0;
        targetHigh = 0;
        targetLevel = 0;
        targetHit = 0;
        targetMood = 0;
        targetMode = 0;
      }

      bass = follow(bass, targetBass, 0.32, 0.09);
      mid = follow(mid, targetMid, 0.28, 0.08);
      high = follow(high, targetHigh, 0.48, 0.12);
      level = follow(level, targetLevel, 0.28, 0.08);
      hit = follow(hit, targetHit, 0.5, 0.1);
      mood = follow(mood, targetMood, 0.12, 0.035);
      mode = follow(mode, targetMode, 0.38, 0.035);

      program.uniforms.uTime.value = timestamp * 0.001;
      program.uniforms.uBass.value = bass;
      program.uniforms.uMid.value = mid;
      program.uniforms.uHigh.value = high;
      program.uniforms.uLevel.value = level;
      program.uniforms.uHit.value = hit;
      program.uniforms.uMood.value = mood;
      program.uniforms.uMode.value = mode;
      renderer.render({ scene: mesh });

      const settled = !playingRef.current && bass < 0.002 && mid < 0.002 && high < 0.002 && hit < 0.002 && mode < 0.002;
      if (settled) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(update);
    };

    const wake = () => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(update);
    };
    wakeRef.current = wake;

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) wake();
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: 0.01 });
    intersectionObserver.observe(container);
    wake();

    return () => {
      wakeRef.current = () => {};
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [metricsRef]);

  return <div ref={containerRef} aria-hidden="true" className={cn('music-reactive-orb', className)} />;
}
