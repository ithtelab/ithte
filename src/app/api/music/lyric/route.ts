import { NextRequest, NextResponse } from 'next/server';
import { lyric_new } from 'NeteaseCloudMusicApi';

import type { LyricLine, LyricWord } from '@/components/music-player/netease';
import { getNeteaseCookie } from '@/lib/music-session';

export const runtime = 'nodejs';

const CREDIT_LINE_PATTERN = /^(?:作词|作曲|编曲|制作人|监制|混音|母带|录音|吉他|贝斯|鼓|和声|弦乐|人声编辑|制作|出品|发行|统筹|艺术总监|特别鸣谢|OP|SP|lyrics?\s+by|composed\s+by|arranged\s+by|produc(?:er|ed\s+by)|mixed\s+by|mastered\s+by)\s*[:：]/i;

const isCreditLine = (text: string) => CREDIT_LINE_PATTERN.test(text.trim());

/** 解析 LRC 歌词文本成带时间戳的行 */
const parseLrc = (raw: string): LyricLine[] => {
  const lines: LyricLine[] = [];
  for (const line of raw.split('\n')) {
    const match = line.match(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const millis = Number((match[3] ?? '0').padEnd(3, '0'));
    const text = (match[4] ?? '').trim();
    if (!text) continue;
    lines.push({ time: minutes * 60 + seconds + millis / 1000, text });
  }
  return lines;
};

/** 解析网易云逐字歌词：[行开始,行时长](字开始,字时长,0)内容 */
const parseYrc = (raw: string): LyricLine[] => {
  const lines: LyricLine[] = [];
  for (const sourceLine of raw.split('\n')) {
    const lineMatch = sourceLine.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!lineMatch) continue;

    const words: LyricWord[] = [];
    const wordSource = lineMatch[3] ?? '';
    const wordPattern = /\((\d+),(\d+),\d+\)(.*?)(?=\(\d+,\d+,\d+\)|$)/g;
    let wordMatch: RegExpExecArray | null;
    while ((wordMatch = wordPattern.exec(wordSource))) {
      const text = wordMatch[3] ?? '';
      if (!text) continue;
      words.push({
        time: Number(wordMatch[1]) / 1000,
        duration: Number(wordMatch[2]) / 1000,
        text,
      });
    }

    const text = words.map((word) => word.text).join('').trim();
    if (!text || !words.length) continue;
    lines.push({ time: Number(lineMatch[1]) / 1000, text, words });
  }
  return lines;
};

/** 把翻译行按时间匹配到主歌词行 */
const mergeTranslation = (main: LyricLine[], trans: LyricLine[]): LyricLine[] => {
  if (!trans.length) return main;
  return main.map((line) => {
    let best: LyricLine | null = null;
    let bestDiff = Infinity;
    for (const t of trans) {
      const diff = Math.abs(t.time - line.time);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = t;
      }
    }
    // 时间差 > 0.8s 视为对不上，不合并
    return best && bestDiff < 0.8 ? { ...line, translation: best.text } : line;
  });
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少歌曲 id' }, { status: 400 });
  }

  try {
    const cookie = getNeteaseCookie(req);
    const r = await lyric_new({ id: Number(id), cookie: cookie || undefined });
    const body = r.body as unknown as {
      lrc?: { lyric?: string };
      yrc?: { lyric?: string };
      tlyric?: { lyric?: string };
    };
    const raw = body.lrc?.lyric ?? '';
    const wordRaw = body.yrc?.lyric ?? '';
    if (!raw && !wordRaw) {
      return NextResponse.json({ ok: false, error: '该歌曲暂无歌词' }, { status: 404 });
    }

    const wordLyrics = wordRaw ? parseYrc(wordRaw) : [];
    const main = (wordLyrics.length ? wordLyrics : parseLrc(raw)).filter(
      (line) => !isCreditLine(line.text),
    );
    const transRaw = body.tlyric?.lyric ?? '';
    const trans = transRaw ? parseLrc(transRaw) : [];
    const lines = mergeTranslation(main, trans);

    return NextResponse.json({ ok: true, lines });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
