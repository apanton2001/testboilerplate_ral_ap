/** @type {import('next').NextConfig} */

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';  // 'unsafe-eval' and 'unsafe-inline' might be needed for dev, but try to remove for production
  style-src 'self' 'unsafe-inline'; // 'unsafe-inline' needed for many CSS-in-JS solutions and Tailwind
  img-src 'self' data: blob:; // Allow data URIs and blob URLs for images
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none'; // Prevent clickjacking
  connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}; // Allow connections to self and backend API
  upgrade-insecure-requests;
`;

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*', // Apply headers to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            // Replace newline characters and multiple spaces for header value
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          },
          // Add other security headers recommended by Helmet (already handled by backend, but good for static exports/edge)
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Permissions Policy (example, adjust as needed)
          {
             key: 'Permissions-Policy',
             value: "camera=(), microphone=(), geolocation=(), payment=()"
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;