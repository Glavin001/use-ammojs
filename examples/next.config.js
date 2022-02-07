const path = require('path');
const withTM = require('next-transpile-modules')([
// pass the modules you would like to see transpiled
  '@react-three/xr',
  '@webxr-input-profiles/motion-controllers',
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // experimental: { esmExternals: 'loose' }, // Workaround for https://github.com/pmndrs/react-xr/issues/101
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          }
        ]
      }
    ]
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      '@react-three/fiber': path.resolve('./node_modules/@react-three/fiber'),
      'three': path.resolve('./node_modules/three'),
    }
    return config;
  },
}

module.exports = withTM(nextConfig);
