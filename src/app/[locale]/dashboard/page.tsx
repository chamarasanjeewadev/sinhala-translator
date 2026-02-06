import { Suspense } from "react";
import { DashboardServer } from "./dashboard-server";
import { Loader2 } from "lucide-react";

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f1e] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading dashboard...</p>
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
