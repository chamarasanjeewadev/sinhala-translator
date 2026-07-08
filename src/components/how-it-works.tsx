import { Mic, Sparkles, FileText, ArrowRight, ArrowDown } from "lucide-react";

type Step = { title: string; desc: string };

type HowItWorksCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: Step[];
};

const STEP_ICONS = [Mic, Sparkles, FileText] as const;

// Static waveform heights (in px) — echoes the hero's live-transcription bars
// without any client JS. Reads as "sound travelling between steps."
const CONNECTOR_BARS = [7, 13, 20, 11, 24, 9, 16];

function WaveConnector({ vertical = false }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-3 lg:hidden"
        aria-hidden
      >
        <span className="flow-line h-10 w-px rounded-full" />
        <ArrowDown className="h-4 w-4 text-fuchsia-300/70" />
      </div>
    );
  }

  return (
    <div
      className="hidden shrink-0 items-center gap-2 self-center px-1 lg:flex"
      aria-hidden
    >
      <div className="flex h-6 items-center gap-[3px]">
        {CONNECTOR_BARS.map((h, i) => (
          <span
            key={i}
            className="wave-tick w-[2px] opacity-70"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="flow-line h-px w-6 rounded-full" />
      <ArrowRight className="h-4 w-4 text-fuchsia-300/70" />
    </div>
  );
}

export function HowItWorks({ copy }: { copy: HowItWorksCopy }) {
  const steps = copy.steps.slice(0, 3);

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#07000f] px-6 py-24 sm:py-28 lg:px-8"
    >
      {/* Ambient glow, carried from the hero */}
      <div className="pointer-events-none absolute -top-24 right-[12%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.16)_0%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(124,58,237,.4)_30%,rgba(232,121,249,.35)_70%,transparent)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header — left-aligned editorial, mono eyebrow with a flow tick */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flow-line h-px w-8 rounded-full" />
            <span className="section-eyebrow text-violet-300">
              {copy.eyebrow}
            </span>
          </div>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-black leading-[1.05] tracking-tight text-white">
            {copy.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#a99fc4]">
            {copy.subtitle}
          </p>
        </div>

        {/* Pipeline */}
        <ol className="mt-14 flex flex-col lg:mt-16 lg:flex-row lg:items-stretch">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? FileText;
            const numeral = String(i + 1).padStart(2, "0");

            return (
              <li
                key={step.title}
                className="flex flex-1 flex-col lg:flex-row lg:items-stretch"
              >
                <div className="dark-card relative flex-1 overflow-hidden rounded-2xl p-7">
                  {/* Oversized watermark numeral */}
                  <span
                    className="step-numeral pointer-events-none absolute -right-1 -top-3 select-none font-black leading-none opacity-[0.14]"
                    style={{ fontSize: "5.5rem" }}
                    aria-hidden
                  >
                    {numeral}
                  </span>

                  <div className="relative z-10 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/12">
                      <Icon className="h-5 w-5 text-violet-200" />
                    </span>
                    <span className="section-eyebrow text-fuchsia-300/80">
                      {numeral}
                    </span>
                  </div>

                  <h3 className="relative z-10 mt-6 font-display text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="relative z-10 mt-2.5 text-sm leading-relaxed text-[#a99fc4]">
                    {step.desc}
                  </p>
                </div>

                {/* Connector to the next step (not after the last) */}
                {i < steps.length - 1 ? (
                  <>
                    <WaveConnector />
                    <WaveConnector vertical />
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
