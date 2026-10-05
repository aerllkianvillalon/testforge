import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Only routes that are public and meant to be indexed — auth and account pages are excluded via robots.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/login', '/register', '/privacy'];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.5,
  }));
}
