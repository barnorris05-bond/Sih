"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The charts pull in all of recharts (the largest dependency of the executive page). They render
 * nothing on the server anyway (ResponsiveContainer measures in the browser), so they are loaded as a
 * separate chunk after the page is interactive. Each placeholder reserves the chart's exact height, so
 * nothing shifts when the chart arrives.
 */
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <Skeleton style={{ height }} className="w-full" />;
  };

export const RegionalChart = dynamic(() => import("./charts").then((m) => m.RegionalChart), {
  ssr: false,
  loading: placeholder(248),
});
export const ComplianceHistogram = dynamic(() => import("./charts").then((m) => m.ComplianceHistogram), {
  ssr: false,
  loading: placeholder(230),
});
export const SlaStackedChart = dynamic(() => import("./charts").then((m) => m.SlaStackedChart), {
  ssr: false,
  loading: placeholder(230),
});
export const StateDistributionDonut = dynamic(() => import("./charts").then((m) => m.StateDistributionDonut), {
  ssr: false,
  loading: placeholder(230),
});
export const DeficiencyPareto = dynamic(() => import("./charts").then((m) => m.DeficiencyPareto), {
  ssr: false,
  loading: placeholder(230),
});
