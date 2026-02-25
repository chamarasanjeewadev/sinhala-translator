
import { getAllPosts } from "@/lib/blog";
import { Link } from "next-view-transitions";
import { format } from "date-fns";
import { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
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
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamic = 'force-static';

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const posts = getAllPosts().filter((post) => (post.language || "en") === locale);
  const [featuredPost, ...secondaryPosts] = posts;
  const makePostPath = (postLocale: string, slug: string) =>
    postLocale === defaultLocale ? `/blog/${slug}` : `/${postLocale}/blog/${slug}`;

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/45 blur-3xl" />
        <div className="absolute top-32 -left-20 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute top-48 -right-16 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
      </div>

      <div className="container relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <header className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
          <span className="inline-flex items-center rounded-full border border-slate-300/70 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            HelaVoice Journal
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
            Sinhala Speech-to-Text Insights
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Field-tested guides for Sri Lankan creators, students, and teams using Sinhala transcription in real workflows.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-10 text-center text-slate-600 shadow-sm">
            No posts are available in this language yet.
          </div>
        ) : (
          <>
            {featuredPost && (
              <article className="group mb-12 overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur-sm md:mb-14">
                <div className="grid md:grid-cols-2">
                  {featuredPost.image && (
                    <Link
                      prefetch={true}
                      href={makePostPath(featuredPost.language || "en", featuredPost.slug)}
                      className="relative block aspect-[16/10] overflow-hidden md:aspect-auto"
                    >
                      <img
                        src={featuredPost.image}
                        alt={featuredPost.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-900/60 to-transparent md:hidden" />
                    </Link>
                  )}

                  <div className="flex flex-col justify-between p-6 md:p-10">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                          Featured
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {(featuredPost.language || "en").toUpperCase()}
                        </span>
                      </div>

                      <h2 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
                        <Link
                          prefetch={true}
                          href={makePostPath(featuredPost.language || "en", featuredPost.slug)}
                          className="transition-colors hover:text-blue-700"
                        >
                          {featuredPost.title}
                        </Link>
                      </h2>

                      <p className="mt-4 line-clamp-3 text-base leading-relaxed text-slate-600">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 pt-5">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <time dateTime={featuredPost.date}>
                          {format(new Date(featuredPost.date), "MMMM d, yyyy")}
                        </time>
                        <span>•</span>
                        <span>{featuredPost.readTime}</span>
                      </div>
                      <Link
                        prefetch={true}
                        href={makePostPath(featuredPost.language || "en", featuredPost.slug)}
                        className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Read article
                        <span className="ml-2 transition group-hover:translate-x-0.5">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {secondaryPosts.length > 0 && (
              <section>
                <h2 className="mb-6 text-xl font-bold text-slate-800 md:text-2xl">
                  Latest Guides
                </h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {secondaryPosts.map((post) => (
                    <article
                      key={post.slug}
                      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.85)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-32px_rgba(30,64,175,0.35)]"
                    >
                      {post.image && (
                        <Link
                          prefetch={true}
                          href={makePostPath(post.language || "en", post.slug)}
                          className="relative block aspect-video overflow-hidden bg-slate-100"
                        >
                          <img
                            src={post.image}
                            alt={post.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                          />
                        </Link>
                      )}

                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                          <time dateTime={post.date}>{format(new Date(post.date), "MMMM d, yyyy")}</time>
                          <span>•</span>
                          <span>{post.readTime}</span>
                        </div>

                        <h3 className="text-2xl font-extrabold leading-tight text-slate-900">
                          <Link
                            prefetch={true}
                            href={makePostPath(post.language || "en", post.slug)}
                            className="transition-colors hover:text-blue-700"
                          >
                            {post.title}
                          </Link>
                        </h3>

                        <p className="mt-4 flex-1 text-base leading-relaxed text-slate-600">
                          {post.excerpt}
                        </p>

                        <div className="mt-6 border-t border-slate-200/70 pt-4">
                          <Link
                            prefetch={true}
                            href={makePostPath(post.language || "en", post.slug)}
                            className="inline-flex items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                          >
                            Read more
                            <span className="ml-2 transition group-hover:translate-x-0.5">→</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
