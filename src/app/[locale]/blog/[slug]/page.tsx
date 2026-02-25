
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { MDXRemote } from "next-mdx-remote/rsc";
import { format } from "date-fns";
import { Link } from "next-view-transitions";
import { Metadata } from "next";
// @ts-ignore
import { MDXComponents } from "@/components/mdx-components";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

const HOW_TO_SLUG = "how-to-transcribe-sinhala-audio-to-text";

function getPostLocale(language?: string): Locale {
  return language === "si" ? "si" : defaultLocale;
}

function getLocalizedBlogPath(locale: Locale, slug: string): string {
  return locale === defaultLocale ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  try {
    const post = getPostBySlug(slug);
    const postLocale = getPostLocale(post.language);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
    const canonicalPath = getLocalizedBlogPath(postLocale, post.slug);
    const canonicalUrl = `${siteUrl}${canonicalPath}`;

    if (locale !== postLocale) {
      return {
        title: post.title,
        description: post.excerpt,
        alternates: { canonical: canonicalUrl },
        robots: {
          index: false,
          follow: true,
        },
      };
    }

    return {
      title: `${post.title} | HelaVoice.lk Blog`,
      description: post.excerpt,
      keywords: post.keywords,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        publishedTime: post.date,
        url: canonicalUrl,
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
  return getAllPosts().map((post) => ({
    slug: post.slug,
    locale: getPostLocale(post.language),
  }));
}

export default async function BlogPost({ params }: Props) {
  const { slug, locale } = await params;
  let post: ReturnType<typeof getPostBySlug>;
  try {
    post = getPostBySlug(slug);
  } catch (e) {
    notFound();
  }

  const postLocale = getPostLocale(post.language);
  if (!locales.includes(locale as Locale) || locale !== postLocale) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://helavoice.lk";
  const postPath = getLocalizedBlogPath(postLocale, post.slug);
  const postUrl = `${siteUrl}${postPath}`;
  const blogPath = postLocale === defaultLocale ? "/blog" : `/${postLocale}/blog`;
  const blogUrl = `${siteUrl}${blogPath}`;
  const homePath = postLocale === defaultLocale ? "/" : `/${postLocale}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.image ? `${siteUrl}${post.image}` : undefined,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author || "HelaVoice Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      name: "HelaVoice.lk",
      url: siteUrl,
    },
    inLanguage: postLocale,
    mainEntityOfPage: postUrl,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}${homePath}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: blogUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };
  const howToJsonLd =
    post.slug === HOW_TO_SLUG
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Transcribe Sinhala Audio to Text",
          description:
            "A practical Sri Lankan workflow to convert Sinhala audio into accurate editable text.",
          totalTime: "PT20M",
          inLanguage: "en-LK",
          step: [
            { "@type": "HowToStep", name: "Prepare clear audio" },
            { "@type": "HowToStep", name: "Select a Sinhala speech-to-text workflow" },
            { "@type": "HowToStep", name: "Upload and transcribe the file" },
            { "@type": "HowToStep", name: "Review names, numbers, and punctuation" },
            { "@type": "HowToStep", name: "Export and reuse the final transcript" },
          ],
        }
      : null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/45 blur-3xl" />
        <div className="absolute top-28 -left-20 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />
        <div className="absolute top-44 -right-16 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <article className="container relative mx-auto max-w-4xl px-4 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        {howToJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
          />
        )}
        <Link
          href={blogPath}
          className="group mb-8 inline-flex items-center rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          <svg
            className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
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

        <div className="mb-10 rounded-3xl border border-slate-200/70 bg-white/85 p-7 text-center shadow-[0_18px_42px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm md:p-10">
          {post.categories && post.categories.length > 0 && (
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {post.categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
          <h1 className="mb-6 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500 md:text-base">
            {post.author && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {post.author}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1">
              <time dateTime={post.date}>{format(new Date(post.date), "MMMM d, yyyy")}</time>
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{post.readTime}</span>
          </div>
        </div>

        {post.image && (
          <div className="relative mb-12 aspect-video w-full overflow-hidden rounded-[2rem] border border-slate-200/70 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.6)]">
            <img
              src={post.image}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="prose prose-lg max-w-none rounded-3xl border border-slate-200/70 bg-white/75 p-7 text-slate-700 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.75)] prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-700 hover:prose-a:text-blue-800 prose-img:rounded-xl md:p-10">
          <MDXRemote source={post.content} components={MDXComponents} />
        </div>
      </article>
    </div>
  );
}
