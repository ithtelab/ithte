export interface NeteaseTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

export interface LyricLine {
  /** 秒 */
  time: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
}

export interface LyricWord {
  /** 该字或词开始播放的绝对秒数 */
  time: number;
  /** 持续秒数 */
  duration: number;
  text: string;
}

// 你的网易云歌单：打开歌单链接，取 id= 后面那串数字，例如
// https://music.163.com/playlist?id=2493476540  →  2493476540
export const PLAYLIST_ID = '2493476540';

export const NETESE_OPEN_URL = `https://music.163.com/#/playlist?id=${PLAYLIST_ID}`;
