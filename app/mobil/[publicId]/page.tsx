import { SessionLiveClient } from "@/components/SessionLiveClient";

export default async function MobilLivePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <SessionLiveClient publicId={publicId} variant="mobil" />
    </div>
  );
}
