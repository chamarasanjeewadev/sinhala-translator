import { MetadataRoute } from 'next';
import { getPostSlugs } from '@/lib/blog';
import { locales } from '@/lib/i18n/config';

export const dynamic = 'force-static';

const BASE_URL = 'https://helavoice.lk';

type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: SitemapEntry['changeFrequency'];
  }> = [
    { path: '',         priority: 1.0, changeFrequency: 'daily'  },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/blog',    priority: 0.8, changeFrequency: 'daily'  },
  ];

  const postSlugs = getPostSlugs();
  const blogPostRoutes = postSlugs.map((slug) => ({
    path: `/blog/${slug.replace(/\.mdx$/, '')}`,
    priority: 0.7,
    changeFrequency: 'monthly' as SitemapEntry['changeFrequency'],
  }));

  const allRoutes = [...staticRoutes, ...blogPostRoutes];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    for (const { path, priority, changeFrequency } of allRoutes) {
      entries.push({
        url: `${BASE_URL}${prefix}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      });
    }
  }

  return entries;
}
