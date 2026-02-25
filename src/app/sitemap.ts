import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { defaultLocale, locales } from '@/lib/i18n/config';

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

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    for (const { path, priority, changeFrequency } of staticRoutes) {
      entries.push({
        url: `${BASE_URL}${prefix}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      });
    }
  }

  const blogEntries = getAllPosts().map((post) => {
    const postLocale = post.language === 'si' ? 'si' : defaultLocale;
    const prefix = postLocale === defaultLocale ? '' : `/${postLocale}`;
    const postDate = new Date(post.date);

    return {
      url: `${BASE_URL}${prefix}/blog/${post.slug}`,
      lastModified: Number.isNaN(postDate.getTime()) ? now : postDate,
      changeFrequency: 'monthly' as SitemapEntry['changeFrequency'],
      priority: 0.7,
    };
  });

  entries.push(...blogEntries);

  return entries;
}
