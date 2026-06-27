export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen bg-[#faf8ff]">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-[#111c2d] mb-3">
          {doc.title}
        </h1>
        <p className="font-sans text-sm text-[#4a4452]/70 mb-10">{doc.updated}</p>

        {doc.intro.map((paragraph, i) => (
          <p key={i} className="font-sans text-base text-[#4a4452] leading-relaxed mb-4">
            {paragraph}
          </p>
        ))}

        {doc.sections.map((section, i) => (
          <section key={i} className="mt-10">
            <h2 className="font-sans text-xl font-bold text-[#111c2d] mb-4">
              {section.heading}
            </h2>
            {section.body.map((paragraph, j) => (
              <p
                key={j}
                className="font-sans text-base text-[#4a4452] leading-relaxed mb-4"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
