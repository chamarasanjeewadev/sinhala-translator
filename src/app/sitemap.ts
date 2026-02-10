
import { MetadataRoute } from 'next';
import { getPostSlugs } from '@/lib/blog';
import { locales } from '@/lib/i18n/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://helavoice.lk';
  
  // Static routes
  const routes = ['', '/pricing'];
  
  // Blog posts
  const postSlugs = getPostSlugs();
  const blogRoutes = postSlugs.map((slug) => `/blog/${slug.replace(/\.mdx$/, '')}`);

  const allRoutes = [...routes, '/blog', ...blogRoutes];

  const sitemap: MetadataRoute.Sitemap = [];

  for (const route of allRoutes) {
    for (const locale of locales) {
      const url = locale === 'en' 
        ? `${baseUrl}${route}` // Default locale (en) is at root
        : `${baseUrl}/${locale}${route}`;
        
      sitemap.push({
        url,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  return sitemap;
}
