/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5006' 
      : 'https://api.vault.example.com',
  },
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    return config
  },
}
