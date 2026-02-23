
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/blog');

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  content: string;
  readTime: string;
  author?: string;
  categories?: string[];
  keywords?: string[];
  language?: string;
};

export function getPostSlugs() {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string): Post {
  const realSlug = slug.replace(/\.mdx$/, '');
  const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // Calculate read time (rough estimate: 200 words per minute)
  const words = content.split(/\s+/).length;
  const readTime = Math.ceil(words / 200) + ' min read';

  return {
    slug: realSlug,
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    image: data.image,
    content,
    readTime,
    author: data.author,
    categories: data.categories,
    keywords: data.keywords,
    language: data.language || 'en',
  };
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    // Sort posts by date in descending order
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}
