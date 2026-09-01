import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime image only needs
  // Node plus the traced dependencies — no npm install at deploy time.
  output: 'standalone',
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: {
      // Personnel documents (scanned contracts and the like) are uploaded
      // through a server action; the 1MB default is far too small.
      bodySizeLimit: '12mb',
    },
  },
};

export default withNextIntl(nextConfig);
