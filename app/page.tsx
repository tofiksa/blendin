export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-primary-container text-accent-soft">
      {/* Decorative background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-secondary-container/20 blur-[80px]" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-accent-soft/10 blur-[100px]" />
      </div>

      {/* Main content */}
      <main className="z-10 flex max-w-md flex-1 flex-col items-center justify-center px-6 pb-32">
        {/* Hero icon */}
        <div className="mb-8 flex items-center justify-center">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-accent-soft/20 bg-accent-soft/5">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="h-16 w-16 text-accent-soft"
              aria-hidden="true"
            >
              {/* Steam */}
              <path
                d="M16 14c0-3 2-5 2-8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
              />
              <path
                d="M24 12c0-3 2-5 2-8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path
                d="M20 13c0-3 2-5 2-8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
              />
              {/* Cup body */}
              <path
                d="M8 20h24l-2 18c-.5 3-3 5-6 5H16c-3 0-5.5-2-6-5L8 20z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Handle */}
              <path
                d="M32 24c4 0 6 3 6 6s-2 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Liquid line */}
              <path d="M11 28h18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-4xl font-semibold tracking-tight text-accent-soft">
          Tid for en pause.
        </h1>
        <p className="mt-4 max-w-[280px] text-center text-lg text-accent-soft/70">
          Et stille rom for team og ny kollega.
        </p>
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-primary-container via-primary-container to-transparent px-6 pb-8 pt-12">
        <div className="mx-auto max-w-md">
          <a
            href="/admin"
            className="flex h-[72px] w-full items-center justify-center rounded-[24px] bg-secondary-container font-semibold text-primary-container text-lg uppercase tracking-wide shadow-[0_12px_32px_-4px_rgba(18,26,36,0.25)] transition-all hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_4px_-1px_rgba(18,26,36,0.1)]"
          >
            Start Kaffepausen
          </a>
        </div>
      </div>
    </div>
  );
}
