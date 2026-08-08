'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import { useMusic } from '@/components/music-player/music-context';
import { MusicReactiveOrb, type MusicVisualMetrics } from '@/components/ui/music-reactive-orb';

const INITIAL_METRICS: MusicVisualMetrics = {
  bass: 0,
  mid: 0,
  high: 0,
  level: 0,
  hit: 0,
  mood: 0,
  mode: 0,
};

export function AvatarMusicGlow() {
  const { isPlaying, audioAnalyser, currentTrack } = useMusic();
  const glowRef = useRef<HTMLDivElement>(null);
  const visualMetricsRef = useRef<MusicVisualMetrics>({ ...INITIAL_METRICS });

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || !isPlaying || !audioAnalyser) return;

    const visualRoot = glow.closest<HTMLElement>('[data-audio-visual]');
    if (!visualRoot) return;

    const frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
    const previousFrequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
    const timeDomainData = new Float32Array(audioAnalyser.fftSize);
    const spectrumBars = Array.from(glow.querySelectorAll<HTMLElement>('.avatar-music-spectrum-bar'));
    const socialItems = Array.from(visualRoot.querySelectorAll<HTMLElement>('.social-orbit-item'));
    const socialTrack = visualRoot.querySelector<HTMLElement>('.social-orbit-track');
    let animationFrame = 0;
    let previousFrame = 0;
    let previousLoudness = 0;
    let spectrumReady = false;
    let transientHit = 0;
    let hitWasActive = false;
    let loudnessFloorDb = -36;
    let loudnessPeakDb = -24;
    let loudnessReady = false;
    let fastLoudnessDb = -36;
    let slowLoudnessDb = -36;
    let bassFloor = 0;
    let bassPeak = 0;
    let bassReady = false;
    let brightnessFloor = 0;
    let brightnessPeak = 0;
    let brightnessReady = false;
    let rhythmFloor = 0;
    let rhythmPeak = 0;
    let rhythmReady = false;
    let moodEnvelope = 0;
    let modeEnvelope = 0;
    let visualMode: 'calm' | 'normal' | 'intense' = 'calm';
    let calmCandidateAt = 0;
    let normalCandidateAt = 0;
    let intenseCandidateAt = 0;
    let intenseReleaseAt = 0;
    let burstCooldownUntil = 0;
    let explosionEnvelope = 0;
    let exploded = false;
    let calmStartedAt = 0;
    let burstCycle = 0;
    let orbitPlaybackRate = 1;
    let orbitAnimation: Animation | undefined;
    let isVisible = true;
    const hitTimestamps: number[] = [];
    const hitHistory = Array.from({ length: socialItems.length + 1 }, () => 0);

    const setBurstPattern = () => {
      burstCycle += 1;
      socialItems.forEach((item, index) => {
        const seed = Math.sin((index + 1) * 17.17 + burstCycle * 9.31);
        const secondarySeed = Math.cos((index + 1) * 11.73 + burstCycle * 5.19);
        const direction = index % 2 === 0 ? 1 : -1;
        item.style.setProperty('--social-burst-distance-mobile', `${(3.1 + Math.abs(seed) * 1.8).toFixed(2)}rem`);
        item.style.setProperty('--social-burst-distance-desktop', `${(5.2 + Math.abs(seed) * 3.2).toFixed(2)}rem`);
        item.style.setProperty('--social-burst-tangent-mobile', `${(direction * (0.8 + Math.abs(secondarySeed) * 1.35)).toFixed(2)}rem`);
        item.style.setProperty('--social-burst-tangent-desktop', `${(direction * (1.4 + Math.abs(secondarySeed) * 2.5)).toFixed(2)}rem`);
        item.style.setProperty('--social-burst-rotation', `${Math.round(direction * (42 + Math.abs(seed) * 105))}deg`);
      });
    };

    setBurstPattern();

    const averageRange = (start: number, end: number) => {
      let sum = 0;
      const safeEnd = Math.min(end, frequencyData.length);
      for (let index = start; index < safeEnd; index++) sum += frequencyData[index];
      return safeEnd > start ? sum / (safeEnd - start) / 255 : 0;
    };

    const updateSpectrum = (timestamp: number) => {
      if (timestamp - previousFrame >= 33) {
        previousFrame = timestamp;
        audioAnalyser.getByteFrequencyData(frequencyData);
        audioAnalyser.getFloatTimeDomainData(timeDomainData);

        let squareSum = 0;
        for (let index = 0; index < timeDomainData.length; index++) {
          squareSum += timeDomainData[index] * timeDomainData[index];
        }
        const rms = Math.sqrt(squareSum / timeDomainData.length);
        const loudnessDb = 20 * Math.log10(Math.max(0.00001, rms));
        if (!loudnessReady && loudnessDb > -70) {
          // Leave headroom on both sides so a loud intro does not become its own floor.
          loudnessFloorDb = loudnessDb - 10;
          loudnessPeakDb = loudnessDb + 2;
          fastLoudnessDb = loudnessDb;
          slowLoudnessDb = loudnessDb;
          loudnessReady = true;
        } else if (loudnessReady) {
          loudnessFloorDb += (loudnessDb - loudnessFloorDb) * (loudnessDb < loudnessFloorDb ? 0.08 : 0.00012);
          loudnessPeakDb += (loudnessDb - loudnessPeakDb) * (loudnessDb > loudnessPeakDb ? 0.16 : 0.0008);
          fastLoudnessDb += (loudnessDb - fastLoudnessDb) * 0.28;
          slowLoudnessDb += (loudnessDb - slowLoudnessDb) * 0.012;
        }
        const loudnessRange = Math.max(8, loudnessPeakDb - loudnessFloorDb);
        const adaptiveLoudness = loudnessReady
          ? Math.min(1, Math.max(0, (loudnessDb - loudnessFloorDb - 1) / Math.max(6, loudnessRange - 1)))
          : 0;
        const energyRise = loudnessReady
          ? Math.min(1, Math.max(0, (fastLoudnessDb - slowLoudnessDb - 0.4) / 5))
          : 0;

        const rawBass = averageRange(1, 10);
        const rawMid = averageRange(10, 68);
        const rawHigh = averageRange(68, 300);
        const bass = Math.min(1, Math.pow(Math.max(0, (rawBass - 0.05) / 0.7), 0.86));
        const mid = Math.min(1, Math.pow(Math.max(0, (rawMid - 0.04) / 0.62), 0.9));
        const high = Math.min(1, Math.pow(Math.max(0, (rawHigh - 0.025) / 0.55), 0.92));
        const level = Math.min(1, bass * 0.44 + mid * 0.34 + high * 0.22);

        const binWidth = audioAnalyser.context.sampleRate / audioAnalyser.fftSize;
        const bassEnd = Math.min(frequencyData.length, Math.ceil(250 / binWidth));
        const highStart = Math.min(frequencyData.length, Math.floor(2500 / binWidth));
        const spectrumEnd = Math.min(frequencyData.length, Math.ceil(10000 / binWidth));
        const decibelRange = audioAnalyser.maxDecibels - audioAnalyser.minDecibels;
        let bassPower = 0;
        let highPower = 0;
        let spectrumPower = 0;
        for (let index = 1; index < spectrumEnd; index++) {
          const decibels = audioAnalyser.minDecibels + (frequencyData[index] / 255) * decibelRange;
          const power = 10 ** (decibels / 10);
          spectrumPower += power;
          if (index < bassEnd) bassPower += power;
          if (index >= highStart) highPower += power;
        }
        const bassShare = spectrumPower > 0 ? bassPower / spectrumPower : 0;
        const highShare = spectrumPower > 0 ? highPower / spectrumPower : 0;
        if (!bassReady) {
          bassFloor = Math.max(0, bassShare - 0.08);
          bassPeak = Math.min(1, bassShare + 0.08);
          bassReady = true;
        } else {
          bassFloor += (bassShare - bassFloor) * (bassShare < bassFloor ? 0.08 : 0.0002);
          bassPeak += (bassShare - bassPeak) * (bassShare > bassPeak ? 0.12 : 0.0012);
        }
        const bassDrive = Math.min(1, Math.max(0, (bassShare - bassFloor) / Math.max(0.12, bassPeak - bassFloor)));
        if (!brightnessReady) {
          brightnessFloor = Math.max(0, highShare - 0.04);
          brightnessPeak = Math.min(1, highShare + 0.04);
          brightnessReady = true;
        } else {
          brightnessFloor += (highShare - brightnessFloor) * (highShare < brightnessFloor ? 0.08 : 0.0002);
          brightnessPeak += (highShare - brightnessPeak) * (highShare > brightnessPeak ? 0.12 : 0.0012);
        }
        const brightnessDrive = Math.min(1, Math.max(0, (highShare - brightnessFloor) / Math.max(0.06, brightnessPeak - brightnessFloor)));
        const textureDrive = Math.max(bassDrive, brightnessDrive * 0.9);

        let fluxSum = 0;
        const fluxEnd = Math.min(300, frequencyData.length);
        for (let index = 1; index < fluxEnd; index++) {
          if (spectrumReady) {
            fluxSum += Math.max(0, frequencyData[index] - previousFrequencyData[index]) / 255;
          }
          previousFrequencyData[index] = frequencyData[index];
        }
        spectrumReady = true;
        const rawFlux = fluxEnd > 1 ? fluxSum / (fluxEnd - 1) : 0;
        const spectralFlux = Math.min(1, Math.max(0, (rawFlux - 0.006) / 0.075));
        if (!rhythmReady && spectrumReady) {
          rhythmFloor = Math.max(0, spectralFlux - 0.04);
          rhythmPeak = Math.min(1, spectralFlux + 0.08);
          rhythmReady = true;
        } else if (rhythmReady) {
          rhythmFloor += (spectralFlux - rhythmFloor) * (spectralFlux < rhythmFloor ? 0.1 : 0.0003);
          rhythmPeak += (spectralFlux - rhythmPeak) * (spectralFlux > rhythmPeak ? 0.16 : 0.002);
        }
        const rhythmDrive = rhythmReady
          ? Math.min(1, Math.max(0, (spectralFlux - rhythmFloor) / Math.max(0.08, rhythmPeak - rhythmFloor)))
          : 0;
        const attack = Math.max(0, adaptiveLoudness - previousLoudness);
        previousLoudness = adaptiveLoudness;
        transientHit = Math.max(
          transientHit * 0.7,
          Math.min(1, attack * 3.8 + rhythmDrive * 0.65 + Math.max(0, textureDrive - 0.72) * 0.22),
        );

        const hitActive = transientHit > 0.68;
        if (hitActive && !hitWasActive && (!hitTimestamps.length || timestamp - hitTimestamps[hitTimestamps.length - 1] > 140)) {
          hitTimestamps.push(timestamp);
        }
        hitWasActive = hitActive;
        while (hitTimestamps.length && timestamp - hitTimestamps[0] > 1000) hitTimestamps.shift();
        const hitDensity = Math.min(1, hitTimestamps.length / 5);
        const intensity = Math.min(1,
          adaptiveLoudness * 0.32
          + energyRise * 0.14
          + rhythmDrive * 0.24
          + hitDensity * 0.14
          + transientHit * 0.1
          + textureDrive * 0.14,
        );

        const energyEvidence = adaptiveLoudness > 0.54 || energyRise > 0.58;
        const rhythmEvidence = rhythmDrive > 0.58
          || hitDensity >= 0.4
          || transientHit > 0.6;
        const textureEvidence = textureDrive > 0.62;
        const calmSignal = intensity < 0.44 && rhythmDrive < 0.44 && hitDensity < 0.4 && transientHit < 0.46;
        const normalSignal = intensity > 0.4 || rhythmDrive > 0.48 || hitTimestamps.length >= 2;
        const intenseSignal = intensity > 0.6
          && energyEvidence
          && (rhythmEvidence || (textureEvidence && hitDensity >= 0.2));
        const obviousPeak = intensity > 0.8 && energyEvidence && rhythmEvidence;

        if (calmSignal) calmCandidateAt ||= timestamp;
        else calmCandidateAt = 0;
        if (normalSignal && !intenseSignal) normalCandidateAt ||= timestamp;
        else normalCandidateAt = 0;
        if (intenseSignal) intenseCandidateAt ||= timestamp;
        else intenseCandidateAt = 0;

        if (visualMode !== 'intense' && obviousPeak) {
          visualMode = 'intense';
          modeEnvelope = Math.max(modeEnvelope, 0.7);
          intenseReleaseAt = 0;
        } else if (visualMode !== 'intense' && intenseCandidateAt && timestamp - intenseCandidateAt >= 90) {
          visualMode = 'intense';
          intenseReleaseAt = 0;
        } else if (visualMode === 'intense') {
          if (intensity < 0.5) intenseReleaseAt ||= timestamp;
          else intenseReleaseAt = 0;
          if (intenseReleaseAt && timestamp - intenseReleaseAt >= 900) {
            visualMode = calmCandidateAt && timestamp - calmCandidateAt >= 1500 ? 'calm' : 'normal';
            intenseReleaseAt = 0;
          }
        } else if (calmCandidateAt && timestamp - calmCandidateAt >= 1500) {
          visualMode = 'calm';
        } else if (visualMode === 'calm' && normalCandidateAt && timestamp - normalCandidateAt >= 90) {
          visualMode = 'normal';
        }

        const modeTarget = visualMode === 'calm' ? 0 : visualMode === 'normal' ? 0.52 : 1;
        modeEnvelope += (modeTarget - modeEnvelope) * (modeTarget > modeEnvelope ? 0.34 : 0.025);
        const visualBass = bass * (0.28 + modeEnvelope * 0.72);
        const visualMid = mid * (0.24 + modeEnvelope * 0.76);
        const visualHigh = high * (0.1 + modeEnvelope * modeEnvelope * 0.9);
        const visualLevel = level * (0.3 + modeEnvelope * 0.7);
        const visualHit = transientHit * (0.06 + modeEnvelope * modeEnvelope * 0.94);
        const moodTarget = Math.min(1, Math.max(0, (intensity - 0.24) / 0.62) * (0.25 + modeEnvelope * 0.75));
        moodEnvelope += (moodTarget - moodEnvelope) * (moodTarget > moodEnvelope ? 0.12 : 0.035);

        const explosivePeak = visualMode === 'intense'
          && timestamp >= burstCooldownUntil
          && transientHit > 0.68
          && spectralFlux > 0.36;
        if (explosivePeak) {
          if (!exploded || explosionEnvelope < 0.58) setBurstPattern();
          exploded = true;
          burstCooldownUntil = timestamp + 4000;
          calmStartedAt = 0;
          explosionEnvelope += (1 - explosionEnvelope) * 0.68;
        } else if (exploded && visualMode === 'intense') {
          calmStartedAt = 0;
          explosionEnvelope += (1 - explosionEnvelope) * 0.14;
        } else if (exploded && visualMode === 'calm') {
          if (!calmStartedAt) calmStartedAt = timestamp;
          if (timestamp - calmStartedAt > 180) {
            explosionEnvelope += (0 - explosionEnvelope) * 0.025;
            if (explosionEnvelope < 0.018) {
              explosionEnvelope = 0;
              exploded = false;
              calmStartedAt = 0;
            }
          }
        } else if (exploded) {
          calmStartedAt = 0;
        }

        hitHistory.unshift(transientHit);
        hitHistory.pop();

        spectrumBars.forEach((bar, index) => {
          const phase = index / spectrumBars.length;
          const progress = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
          const bin = Math.min(frequencyData.length - 1, Math.max(1, Math.floor(Math.pow(progress, 1.6) * 300)));
          const local = frequencyData[bin] / 255;
          const highness = Math.pow(progress, 1.8);
          const bandMode = 0.2 + modeEnvelope * 0.8;
          const highGate = 0.18 + modeEnvelope * modeEnvelope * 0.82;
          const shaped = Math.min(1, Math.pow(local * (1.45 + highness * 0.65), 0.76) * (0.48 + visualBass * 0.28 + visualHigh * highness * 0.55) * bandMode * (1 - highness + highness * highGate));
          bar.style.setProperty('--bar-level', shaped.toFixed(3));
        });

        const mixChannel = (calm: number, wild: number) => Math.round(calm + (wild - calm) * moodEnvelope);
        const color = (calm: [number, number, number], wild: [number, number, number]) =>
          calm.map((channel, index) => mixChannel(channel, wild[index])).join(', ');

        visualMetricsRef.current.bass = visualBass;
        visualMetricsRef.current.mid = visualMid;
        visualMetricsRef.current.high = visualHigh;
        visualMetricsRef.current.level = visualLevel;
        visualMetricsRef.current.hit = visualHit;
        visualMetricsRef.current.mood = moodEnvelope;
        visualMetricsRef.current.mode = modeEnvelope;

        visualRoot.style.setProperty('--audio-bass', visualBass.toFixed(3));
        visualRoot.style.setProperty('--audio-mid', visualMid.toFixed(3));
        visualRoot.style.setProperty('--audio-high', visualHigh.toFixed(3));
        visualRoot.style.setProperty('--audio-level', visualLevel.toFixed(3));
        visualRoot.style.setProperty('--audio-hit', visualHit.toFixed(3));
        visualRoot.style.setProperty('--audio-mood', moodEnvelope.toFixed(3));
        visualRoot.style.setProperty('--audio-mode', modeEnvelope.toFixed(3));
        visualRoot.style.setProperty('--audio-primary-rgb', color([159, 232, 208], [255, 42, 78]));
        visualRoot.style.setProperty('--audio-secondary-rgb', color([83, 166, 253], [255, 35, 166]));
        visualRoot.style.setProperty('--audio-accent-rgb', color([161, 140, 255], [42, 224, 255]));
        visualRoot.style.setProperty('--audio-warm-rgb', color([237, 184, 102], [255, 224, 72]));

        socialItems.forEach((item, index) => {
          const band = item.dataset.audioBand;
          const bandEnergy = band === 'bass' ? visualBass : band === 'mid' ? visualMid : visualHigh;
          const delayedHit = (hitHistory[Math.min(index + 1, hitHistory.length - 1)] ?? 0) * (0.06 + modeEnvelope * modeEnvelope * 0.94);
          item.style.setProperty('--social-energy', bandEnergy.toFixed(3));
          item.style.setProperty('--social-hit', delayedHit.toFixed(3));
          item.style.setProperty('--social-high', visualHigh.toFixed(3));
          item.style.setProperty('--social-explosion', explosionEnvelope.toFixed(3));
        });

        const targetPlaybackRate = Math.min(2.35, 1 + visualLevel * 0.42 + visualHit * 0.28 + explosionEnvelope * 0.46);
        orbitPlaybackRate += (targetPlaybackRate - orbitPlaybackRate) * 0.075;
        orbitAnimation ??= socialTrack?.getAnimations()[0];
        if (orbitAnimation) orbitAnimation.playbackRate = orbitPlaybackRate;
      }

      animationFrame = requestAnimationFrame(updateSpectrum);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = !!entry?.isIntersecting;
        if (isVisible && !animationFrame) animationFrame = requestAnimationFrame(updateSpectrum);
        if (!isVisible && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      },
      { threshold: 0.02 },
    );
    observer.observe(visualRoot);
    if (isVisible) animationFrame = requestAnimationFrame(updateSpectrum);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      if (orbitAnimation) orbitAnimation.playbackRate = 1;
      visualMetricsRef.current = { ...INITIAL_METRICS };
      ['--audio-bass', '--audio-mid', '--audio-high', '--audio-level', '--audio-hit', '--audio-mood', '--audio-mode'].forEach((property) => {
        visualRoot.style.setProperty(property, '0');
      });
      socialItems.forEach((item) => {
        item.style.setProperty('--social-energy', '0');
        item.style.setProperty('--social-hit', '0');
        item.style.setProperty('--social-high', '0');
        item.style.setProperty('--social-explosion', '0');
      });
    };
  }, [audioAnalyser, currentTrack?.id, isPlaying]);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className={`avatar-music-glow pointer-events-none absolute z-[9] h-[310px] w-[310px] rounded-full md:h-[390px] md:w-[390px] lg:h-[430px] lg:w-[430px] ${
        isPlaying ? 'avatar-music-glow--active' : ''
      }`}
    >
      <MusicReactiveOrb metricsRef={visualMetricsRef} isPlaying={isPlaying} className="absolute inset-0" />
      <span className="avatar-music-ring avatar-music-ring--edge" />
      <span className="avatar-music-ring avatar-music-ring--shock-one" />
      <span className="avatar-music-ring avatar-music-ring--shock-two" />
      <span className="avatar-music-high-flare avatar-music-high-flare--one" />
      <span className="avatar-music-high-flare avatar-music-high-flare--two" />
      <span className="avatar-music-spectrum">
        {Array.from({ length: 48 }, (_, index) => {
          const phase = index / 48;
          const frequency = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
          const band = frequency < 0.24 ? 'bass' : frequency < 0.66 ? 'mid' : 'high';
          return (
            <i
              key={index}
              data-band={band}
              className="avatar-music-spectrum-bar"
              style={{ '--bar-angle': `${index * 7.5}deg`, '--bar-highness': frequency.toFixed(3) } as CSSProperties}
            />
          );
        })}
      </span>
    </div>
  );
}
