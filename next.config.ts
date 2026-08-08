import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    // NeteaseCloudMusicApi 含动态 require，交给 Node 运行时直接加载，避免 Turbopack 打包报错
    serverExternalPackages: ['NeteaseCloudMusicApi'],
    turbopack: {
        root: __dirname,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
        qualities: [75, 90],
    },
};

export default nextConfig;
