
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { MDXRemote } from "next-mdx-remote/rsc";
import { format } from "date-fns";
import { Link } from "next-view-transitions";
import { Metadata } from "next";
// @ts-ignore
import { MDXComponents } from "@/components/mdx-components";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  try {
    const post = getPostBySlug(slug);
    return {
      title: `${post.title} | HelaVoice.lk Blog`,
      description: post.excerpt,
      keywords: post.keywords,
      alternates: locales.includes(locale as Locale)
        ? generateAlternates(locale as Locale, `/blog/${slug}`)
        : undefined,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        publishedTime: post.date,
        images: post.image ? [post.image] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.excerpt,
        images: post.image ? [post.image] : [],
      },
    };
  } catch (e) {
    return {
      title: "Blog Post Not Found",
    };
  }
}

export async function generateStaticParams() {
  const posts = getPostSlugs();
  const params = [];

  for (const slug of posts) {
    for (const locale of locales) {
      params.push({
        slug: slug.replace(/\.mdx$/, ""),
        locale,
      });
    }
  }

  return params;
}

export default async function BlogPost({ params }: Props) {
  const { slug, locale } = await params;
  let post;
  try {
    post = getPostBySlug(slug);
  } catch (e) {
    notFound();
  }

  return (
    <article className="container mx-auto px-4 py-16 max-w-4xl">
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <svg
          className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Blog
      </Link>

      <div className="mb-12 text-center">
        {post.categories && post.categories.length > 0 && (
          <div className="flex gap-2 justify-center mb-6 flex-wrap">
            {post.categories.map((category) => (
              <span 
                key={category} 
                className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {category}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          {post.title}
        </h1>
        <div className="flex items-center justify-center gap-4 text-muted-foreground text-sm md:text-base flex-wrap">
          {post.author && (
            <>
              <span className="font-medium text-foreground">{post.author}</span>
              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            </>
          )}
          <time dateTime={post.date}>
            {format(new Date(post.date), "MMMM d, yyyy")}
          </time>
          <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
          <span>{post.readTime}</span>
        </div>
      </div>

      {post.image && (
        <div className="relative aspect-video w-full mb-12 rounded-2xl overflow-hidden shadow-2xl">
          <img
            src={post.image}
            alt={post.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl">
        <MDXRemote source={post.content} components={MDXComponents} />
      </div>
    </article>
  );
}
