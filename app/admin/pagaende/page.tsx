import { Suspense } from "react";
import { OngoingSessionsPage } from "@/components/admin/OngoingSessionsPage";

export default function AdminOngoingSessionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Laster pågående økter …</p>}>
      <OngoingSessionsPage />
    </Suspense>
  );
}
