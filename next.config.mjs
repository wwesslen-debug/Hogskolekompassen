/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Keep Turbopack anchored to this project even if a parent folder contains another package-lock.json.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
