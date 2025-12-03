/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    domains: [
      'localhost',
      'images.unsplash.com',
      'res.cloudinary.com',
      'cdn.shopify.com',
      'via.placeholder.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'files.stripe.com',
    ],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  env: {
    NEXT_PUBLIC_MARKETPLACE_NAME:
      process.env.NEXT_PUBLIC_MARKETPLACE_NAME || 'My Marketplace',
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    NEXT_PUBLIC_GA_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
    NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES:
      process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES || 'false',
  },

  poweredByHeader: false,

  compress: true,

  productionBrowserSourceMaps: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/seller',
        destination: '/seller/dashboard',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const isExternalApi =
      apiBase && !apiBase.startsWith('/') && !apiBase.includes('localhost');

    if (!apiBase || !isExternalApi) {
      return [];
    }

    return [
      {
        source: '/api/marketplace/:path*',
        destination: `undefined/:path*`,
      },
    ];
  },

  webpack(config, { isServer }) {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };

    if (!isServer) {
      config.optimization.splitChunks = {
        ...(config.optimization.splitChunks || {}),
        cacheGroups: {
          ...(config.optimization.splitChunks
            ? config.optimization.splitChunks.cacheGroups
            : {}),
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|next|swr|zustand)[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;