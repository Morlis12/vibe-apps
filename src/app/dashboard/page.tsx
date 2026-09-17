import type { Metadata } from "next";
import PerformanceDashboard from "@/components/performance-dashboard";

export const metadata: Metadata = {
  title: "Tableau de bord · Performances",
  description:
    "Tableau de bord sombre de suivi des performances de l'application : trafic, latence, erreurs et disponibilité.",
};

export default function DashboardPage() {
  return <PerformanceDashboard />;
}
