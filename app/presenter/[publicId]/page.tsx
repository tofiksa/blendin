import { PresenterExperience } from "@/components/presenter/PresenterExperience";

export default async function PresenterLivePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return (
    <div className="min-h-dvh bg-background">
      <PresenterExperience publicId={publicId} />
    </div>
  );
}
