import { Suspense } from "react";
import { DashboardServer } from "./dashboard-server";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-leaf animate-spin mx-auto mb-4" />
        <p className="text-ink/55">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardServer />
    </Suspense>
  );
}
