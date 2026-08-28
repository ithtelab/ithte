import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    // NeteaseCloudMusicApi 含动态 require，交给 Node 运行时直接加载，避免 Turbopack 打包报错
    serverExternalPackages: ['NeteaseCloudMusicApi'],
    turbopack: {
        root: __dirname,
    },
    images: {
        // 图片可能来自云存储清单(PHOTO_MANIFEST_URL)指定的任意 https CDN,
        // 故放行所有 https 域名(仅 https,不放行 http),供 next/image 优化。
        // 若希望进一步收敛,可改为明确的图床域名白名单。
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
        qualities: [75, 90],
    },
};

export default nextConfig;
