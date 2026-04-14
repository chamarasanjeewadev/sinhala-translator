export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  readTime: string;
  author?: string;
  categories?: string[];
  keywords?: string[];
  language: string;
};

export const blogPosts: PostMeta[] = [
  {
    slug: "how-to-transcribe-sinhala-audio-to-text",
    title: "How to Transcribe Sinhala Audio to Text: A Practical Guide for Sri Lanka",
    excerpt:
      "Learn how to transcribe Sinhala audio to text with a practical, step-by-step workflow for Sri Lankan creators, students, journalists, and businesses.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["How To", "Sinhala Transcription", "Speech to Text"],
    keywords: [
      "how to transcribe sinhala audio to text",
      "transcribe sinhala audio to text",
      "sinhala transcribe",
      "sinhala speech to text",
      "sinhala audio transcription",
      "convert sinhala voice to text",
      "සිංහල හඬ පෙළට",
    ],
    image: "/images/blog/how-to-sinhala-audio-text.svg",
    language: "en",
    readTime: "8 min read",
  },
  {
    slug: "how-to-transcribe-sinhala-audio-from-youtube-for-free",
    title: "How to Transcribe Sinhala Audio From YouTube for Free (Step-by-Step)",
    excerpt:
      "Learn how to transcribe Sinhala audio from YouTube for free using a practical workflow, including audio extraction, cleanup, and how to use HelaVoice free credits.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["How To", "YouTube", "Free Transcription"],
    keywords: [
      "how to transcribe sinhala audio from youtube for free",
      "youtube sinhala audio to text free",
      "transcribe sinhala youtube video",
      "free sinhala youtube transcription",
      "සිංහල youtube හඬ පෙළට",
    ],
    image: "/images/blog/youtube-sinhala-audio-free.svg",
    language: "en",
    readTime: "7 min read",
  },
  {
    slug: "how-to-transcribe-whatsapp-sinhala-audio-to-text",
    title: "How to Transcribe WhatsApp Sinhala Audio to Text: Step-by-Step Guide",
    excerpt:
      "Learn how to transcribe WhatsApp Sinhala audio to text with a practical workflow for Sri Lankan users, including export tips, accuracy fixes, and common mistakes to avoid.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["How To", "WhatsApp", "Sinhala Transcription"],
    keywords: [
      "how to transcribe whatsapp sinhala audio to text",
      "transcribe whatsapp sinhala voice note",
      "whatsapp sinhala audio to text",
      "sinhala whatsapp voice to text",
      "සිංහල whatsapp හඬ පෙළට",
    ],
    image: "/images/blog/whatsapp-sinhala-audio-text.svg",
    language: "en",
    readTime: "7 min read",
  },
  {
    slug: "sinhala-audio-to-text-converter-2026",
    title: "Sinhala Audio to Text Converter: Complete Guide for 2026",
    excerpt:
      "Discover the best Sinhala audio to text converter workflows, learn how speech recognition works for Sinhala, and improve productivity with automated transcription.",
    author: "Content Team",
    date: "2026-02-07",
    categories: ["Speech Recognition", "Sinhala Language", "Technology"],
    keywords: [
      "sinhala audio to text converter",
      "sinhala speech to text",
      "sinhala transcription",
      "audio transcription sinhala",
      "sinhala voice typing",
    ],
    image: "/images/blog/sinhala-audio-converter-2026.svg",
    language: "en",
    readTime: "10 min read",
  },
  {
    slug: "sinhala-transcribe-guide",
    title: "Sinhala Transcribe: A Starter Guide for Sri Lankan Users",
    excerpt:
      "A clear beginner guide to Sinhala transcribe workflows, including recording tips, editing process, and practical use cases in Sri Lanka.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["Beginner Guide", "Sinhala Transcription"],
    keywords: [
      "sinhala transcribe",
      "transcribe sinhala audio",
      "sinhala speech to text guide",
      "sinhala transcription workflow",
    ],
    image: "/images/blog/sinhala-transcribe-guide.svg",
    language: "en",
    readTime: "6 min read",
  },
  {
    slug: "transcribe-meaning-in-sinhala",
    title: "Transcribe Meaning in Sinhala: Simple Definition With Real Examples",
    excerpt:
      "Understand the meaning of transcribe in Sinhala with practical examples for students, creators, and business users in Sri Lanka.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["Language Basics", "Sinhala Terms"],
    keywords: [
      "transcribe meaning in sinhala",
      "transcribe in sinhala",
      "what is transcribe",
      "සින්හල transcribe තේරුම",
    ],
    image: "/images/blog/transcribe-meaning-sinhala.svg",
    language: "en",
    readTime: "5 min read",
  },
  {
    slug: "sinhala-transcription-media-academic-research",
    title: "Sinhala Transcription Solutions for Media Content and Academic Research",
    excerpt:
      "An in-depth look at how Sinhala transcription serves media production and academic research — covering challenges, technology, manual vs automated approaches, and best practices.",
    author: "HelaVoice Editorial Team",
    date: "2026-04-15",
    categories: ["Media", "Academic Research", "Sinhala Transcription"],
    keywords: [
      "sinhala transcription media",
      "sinhala transcription academic research",
      "sinhala speech to text research",
      "sinhala audio transcription for film",
      "sinhala transcription services",
      "linguistic preservation sinhala",
      "ai sinhala transcription",
      "සිංහල පර්යේෂණ ශ්‍රව්‍ය ලිපිගත කිරීම",
    ],
    image: "/images/blog/sinhala-transcription-media-research.svg",
    language: "en",
    readTime: "10 min read",
  },
  {
    slug: "sinhala-dialect-variation-speech-to-text",
    title: "How Sinhala Dialect Variation Challenges Automated Transcription — and What to Do About It",
    excerpt:
      "Sinhala dialects vary significantly across Sri Lanka's regions, creating real challenges for speech recognition systems. This deep-dive explores why the dialect problem matters, how modern AI approaches tackle it, and what developers and researchers can do to build more inclusive Sinhala transcription tools.",
    author: "HelaVoice Editorial Team",
    date: "2026-04-15",
    categories: ["Speech Recognition", "Sinhala Dialects", "AI & Technology"],
    keywords: [
      "sinhala dialect speech recognition",
      "sinhala dialect transcription",
      "sinhala accent speech to text",
      "sinhala regional language variation",
      "sinhala speech recognition challenges",
      "dialect-robust sinhala asr",
      "sinhala language ai",
      "සිංහල උපභාෂා හඳුනාගැනීම",
    ],
    image: "/images/blog/sinhala-dialect-variation.svg",
    language: "en",
    readTime: "12 min read",
  },
  {
    slug: "sinhala-transcribe-free",
    title: "Sinhala Transcribe Free: නොමිලේ සිංහල හඬ පෙළට හරවන්නේ කොහොමද?",
    excerpt:
      "Sinhala transcribe free කියන සෙවුමට ප්‍රායෝගික පිළිතුරක්: නොමිලේ ක්‍රම, සීමාවන්, සහ හොඳ ප්‍රතිඵල ගන්නා වැඩපිළිවෙළ.",
    author: "HelaVoice Editorial Team",
    date: "2026-02-25",
    categories: ["Free Tools", "සිංහල මාර්ගෝපදේශ"],
    keywords: [
      "sinhala transcribe free",
      "free sinhala speech to text",
      "නොමිලේ සිංහල හඬ පෙළට",
      "transcribe sinhala audio free",
    ],
    image: "/images/blog/sinhala-transcribe-free.svg",
    language: "si",
    readTime: "6 min read",
  },
];

export function getPostMetaBySlug(slug: string): PostMeta | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllPostsMeta(): PostMeta[] {
  return [...blogPosts].sort((a, b) => (a.date > b.date ? -1 : 1));
}
