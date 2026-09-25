import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Cloudinary is the only external image host. Listing it explicitly means
       next/image will optimise those URLs instead of refusing them — anything
       else stays blocked, which is the point of the allow-list. */
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  /* The API and the web app are one deployment, so /api/* is proxied to the
     Node server rather than being called cross-origin. Keeps cookies
     same-origin in production and removes the CORS round trip. */
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5001";
    return [{ source: "/api/backend/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
