import type { Metadata } from "next";
import { NewHireFlow } from "@/components/newHire/NewHireFlow";

export const metadata: Metadata = {
  title: "Ny kollega",
  description: "Besvar Blend-In-quizen som nyansatt.",
  robots: { index: false, follow: false },
};

export default async function NyansattPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ nh?: string | string[] }>;
}) {
  const { publicId } = await params;
  const sp = await searchParams;
  const nhRaw = sp.nh;
  const nh = Array.isArray(nhRaw) ? (nhRaw[0] ?? "") : (nhRaw ?? "");
  return <NewHireFlow publicId={publicId} nhToken={nh} />;
}
