export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Teamharmoni · uke én
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Blend-In
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          En rolig quiz for nyansatte og teamet — uten poengtavle og uten stress. Bygget for delt
          skjerm, magiske lenker og en kaffekopp som fylles jo bedre dere kjenner hverandre.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/admin"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Admin · opprett økt
          </a>
          <span className="rounded-full bg-accent-soft px-4 py-2 text-sm text-foreground">
            Alle roller MVP · presenter og mobil på plass
          </span>
        </div>
      </div>
    </div>
  );
}
