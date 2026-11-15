// Customer reviews for /reviews. Source: the in-app feedback form (table
// transcription_feedback), read 2026-11-13. Text is quoted verbatim, typos
// included; never edit or merge one. Customers gave no consent to publish their
// names, so first name or initials only.
export type Review = {
  name: string | null; // null shows as an anonymous HelaVoice user
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  date: string; // YYYY-MM-DD the feedback was sent
  lang?: "si";
};

// Newest first. Mostly good, one critical: that mix is what makes the page believable.
export const REVIEWS: Review[] = [
  { name: "Bimsara", rating: 5, text: "great", date: "2026-10-11" },
  { name: "Theekshani", rating: 5, text: "Well done good job", date: "2026-09-22" },
  { name: "Manisha", rating: 5, text: "Wounded full . No words to express", date: "2026-09-14" },
  { name: "Jayamini", rating: 5, text: "very good", date: "2026-08-03" },
  { name: "Supun", rating: 5, text: "Thanak You , very usefull tool", date: "2026-07-31" },
  {
    name: "S. M.",
    rating: 2,
    text: "When I talk something but you didn't write it I want word by word write",
    date: "2026-07-24",
  },
  { name: null, rating: 5, text: "නියමයි", date: "2026-07-16", lang: "si" },
  { name: "Shaheed", rating: 5, text: "Great", date: "2026-07-08" },
];

// Every in-app rating from customers (staff accounts excluded), counted 2026-11-13.
export const RATINGS = {
  asOf: "2026-11-13",
  distribution: [5, 3, 0, 3, 72], // index 0 = 1 star … index 4 = 5 stars
  wouldRecommend: 79,
};

export const ratingCount = RATINGS.distribution.reduce((a, b) => a + b, 0);
// Rounded down, never up: 4.61 shows as 4.6, 95.2% as 95%.
export const ratingAverage =
  Math.floor((RATINGS.distribution.reduce((sum, n, i) => sum + n * (i + 1), 0) / ratingCount) * 10) / 10;
export const recommendPercent = Math.floor((RATINGS.wouldRecommend / ratingCount) * 100);

// Counted 2026-11-13, rounded down (958 accounts, 13 paying). Off: too small to
// work as social proof yet. Set show: true to put the line on the page.
export const USAGE = { show: false, asOf: "2026-11-13", signups: "950+", payingCustomers: "10+" };
