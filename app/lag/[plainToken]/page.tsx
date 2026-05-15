import type { Metadata } from "next";
import { TeamLagFlow } from "@/components/team/TeamLagFlow";

export const metadata: Metadata = {
  title: "Lag · gjett",
  description: "Send dine gjett som lagdel på Blend-In.",
  robots: { index: false, follow: false },
};

export default async function LagPage({ params }: { params: Promise<{ plainToken: string }> }) {
  const { plainToken } = await params;
  return <TeamLagFlow plainToken={plainToken} />;
}
