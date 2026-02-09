
import { getAllPosts } from "@/lib/blog";
import { Link } from "next-view-transitions";
import { format } from "date-fns";
import { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateAlternates } from "@/lib/i18n/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Blog - Latest Updates & Translation Tips | HelaVoice.lk",
    description:
      "Read the latest news, updates, and translation tips from the HelaVoice.lk team.",
    alternates: locales.includes(locale as Locale)
      ? generateAlternates(locale as Locale, "/blog")
      : undefined,
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const posts = getAllPosts();

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Our Blog
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Insights, updates, and stories from the world of Sinhala translation and language learning.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="group relative flex flex-col bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            {post.image && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={post.image}
                  alt={post.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="flex flex-col flex-1 p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <time dateTime={post.date}>
                  {format(new Date(post.date), "MMMM d, yyyy")}
                </time>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                <Link prefetch={true} href={`/${locale}/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>
              <p className="text-muted-foreground line-clamp-3 mb-4 flex-1">
                {post.excerpt}
              </p>
              <div className="mt-auto pt-4 border-t border-border/50">
                <Link
                  prefetch={true}
                  href={`/${locale}/blog/${post.slug}`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Read more
                  <svg
                    className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
