'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type QrState = {
  key: string;
  qrimg: string;
};

type CheckState = {
  code: number;
  message: string;
};

/**
 * 站长专用:配置 ADMIN_TOKEN 后在这里扫码,登录成功会把网易云账号写入服务端,
 * 全站访客即可共享这个「内置账号」播放(含 VIP 歌)。
 */
export function AdminNeteaseCard() {
  const [adminToken, setAdminToken] = useState('');
  const [qr, setQr] = useState<QrState | null>(null);
  const [check, setCheck] = useState<CheckState | null>(null);
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);
  // 桥接 ref:轮询回调里的「递归下一轮」和「二维码过期自动重建」
  // 都走最新一轮的函数引用,避免陈旧闭包,也满足 hooks 静态检查
  const pollFnRef = useRef<(key: string, token: string) => void>(() => {});
  const createQrRef = useRef<() => void>(() => {});

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    (key: string, token: string) => {
      stopPolling();
      pollRef.current = window.setTimeout(async () => {
        try {
          const res = await fetch('/api/music/auth/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check', key, adminToken: token }),
          });
          const data = (await res.json()) as {
            ok: boolean;
            code?: number;
            message?: string;
            error?: string;
            profile?: { nickname?: string } | null;
            serverAccountSaved?: boolean;
          };

          if (!data.ok) {
            setResult(`登录失败:${data.error || '未知错误'}`);
            setQr(null);
            return;
          }

          const code = Number(data.code || 0);
          setCheck({ code, message: data.message || '' });

          if (code === 800) {
            setResult('二维码已过期,正在重新生成…');
            createQrRef.current();
            return;
          }
          if (code === 803) {
            const who = data.profile?.nickname || '未知账号';
            setResult(
              data.serverAccountSaved
                ? `✅ 已登录:${who};服务端内置账号已更新,全站访客可共享播放`
                : `✅ 已登录:${who}(仅本浏览器会话生效;写入服务端需要正确的 ADMIN_TOKEN)`,
            );
            setQr(null);
            return;
          }
          pollFnRef.current(key, token);
        } catch {
          setResult('网络异常,已停止轮询,请重试');
          setQr(null);
        }
      }, 1300);
    },
    [stopPolling],
  );

  const createQr = useCallback(async () => {
    stopPolling();
    setCheck(null);
    setResult('');
    setBusy(true);
    try {
      const res = await fetch('/api/music/auth/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const data = (await res.json()) as { ok: boolean; key?: string; qrimg?: string; error?: string };
      if (!data.ok || !data.key || !data.qrimg) {
        setResult(`二维码生成失败:${data.error || '未知错误'}`);
        return;
      }
      setQr({ key: data.key, qrimg: data.qrimg });
      poll(data.key, adminToken.trim());
    } catch {
      setResult('网络异常,请重试');
    } finally {
      setBusy(false);
    }
  }, [adminToken, poll, stopPolling]);

  useEffect(() => {
    createQrRef.current = () => void createQr();
    pollFnRef.current = poll;
  }, [createQr, poll]);

  useEffect(() => stopPolling, [stopPolling]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-lg font-bold text-white">网易云 · 内置账号</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">
        输入 <code className="rounded bg-white/10 px-1">ADMIN_TOKEN</code> 后扫码。登录成功且令牌正确时,
        该账号会写入服务端,全站访客共享播放(含 VIP 歌)。建议使用小号。
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-white/45">
        ADMIN_TOKEN
      </label>
      <input
        type="password"
        value={adminToken}
        onChange={(event) => setAdminToken(event.target.value)}
        placeholder="未配置则留空(仅本浏览器会话登录)"
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#9fe8d0]/60"
      />

      <button
        type="button"
        onClick={() => void createQr()}
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[#9fe8d0] px-4 py-2 text-sm font-semibold text-[#050608] transition hover:bg-[#b7ffe8] disabled:opacity-50"
      >
        {busy ? '生成中…' : qr ? '重新生成二维码' : '生成登录二维码'}
      </button>

      {qr ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <img src={qr.qrimg} alt="网易云登录二维码" className="h-44 w-44 rounded-lg bg-white p-2" />
          <p className="text-xs text-white/45">{check ? check.message || '等待扫码…' : '等待扫码…'}</p>
        </div>
      ) : null}

      {result ? <p className="mt-4 text-sm leading-6 text-[#9fe8d0]">{result}</p> : null}
    </div>
  );
}
