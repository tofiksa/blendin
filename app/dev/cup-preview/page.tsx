import { notFound } from "next/navigation";
import { CupPreviewClient } from "./CupPreviewClient";

/** Lokal forhåndsvisning av CoffeeCup — kun i development. */
export default function CupPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CupPreviewClient />;
}
