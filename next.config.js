/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress React warnings in development
  reactStrictMode: false,
  
  // Allow external images if needed
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
