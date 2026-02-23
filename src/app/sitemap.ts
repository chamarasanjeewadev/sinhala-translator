import { MetadataRoute } from 'next';
import { getPostSlugs } from '@/lib/blog';

export const dynamic = 'force-static';

const BASE_URL = 'https://helavoice.lk';

// Each entry maps to a separate sitemap file in the sitemap index.
// id=0 → English  (/sitemap/0.xml)
// id=1 → Sinhala  (/sitemap/1.xml)
export function generateSitemaps() {
  return [
    { id: 0 }, // English
    { id: 1 }, // Sinhala (si)
  ];
}

type SitemapEntry = MetadataRoute.Sitemap[number];

function buildRoutes(locale: 'en' | 'si'): SitemapEntry[] {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: SitemapEntry['changeFrequency'];
  }> = [
    { path: '',         priority: 1.0, changeFrequency: 'daily'   },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly'  },
    { path: '/blog',    priority: 0.8, changeFrequency: 'daily'   },
  ];

  const postSlugs = getPostSlugs();
  const blogPostRoutes = postSlugs.map((slug) => ({
    path: `/blog/${slug.replace(/\.mdx$/, '')}`,
    priority: 0.7,
    changeFrequency: 'monthly' as SitemapEntry['changeFrequency'],
  }));

  return [...staticRoutes, ...blogPostRoutes].map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${prefix}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

// Next.js calls this once per `id` returned by generateSitemaps().
// Each call produces its own /sitemap/<id>.xml file.
export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const locale = id === 0 ? 'en' : 'si';
  return buildRoutes(locale);
}
