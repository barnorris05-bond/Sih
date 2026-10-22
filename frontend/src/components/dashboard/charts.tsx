"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  RegionDistribution,
  SlaBucket,
  StateDistribution,
} from "@aicte/shared";
import { CHART_PALETTE } from "@/lib/format";

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(13,20,34,0.96)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  fontSize: 11,
  color: "#e2e8f0",
  padding: "8px 10px",
  boxShadow: "0 18px 40px -20px rgba(0,0,0,0.9)",
} as const;

const AXIS = { fontSize: 10, fill: "#94a3b8" } as const;

export function RegionalChart({ data }: { data: RegionDistribution[] }) {
  return (
    <ResponsiveContainer width="100%" height={248}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="regional-approved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="region" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(129,140,248,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} iconType="circle" iconSize={7} />
        <Bar dataKey="approved" name="Approved" fill="url(#regional-approved)" radius={[4, 4, 0, 0]} maxBarSize={34} />
        <Bar dataKey="pending" name="In pipeline" fill="#38bdf8" fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={34} />
        <Bar dataKey="rejected" name="Rejected" fill="#fb7185" fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplianceHistogram({
  data,
}: {
  data: Array<{ bucket: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(129,140,248,0.06)" }}
          formatter={(value: number) => [`${value} applications`, "Count"]}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={44}>
          {data.map((entry, index) => (
            <Cell
              key={entry.bucket}
              fill={
                index >= 4 ? "#34d399" : index === 3 ? "#fbbf24" : index === 2 ? "#fb923c" : "#fb7185"
              }
              fillOpacity={index >= 4 ? 0.85 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SlaStackedChart({ data }: { data: SlaBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="stage" tick={{ ...AXIS, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(129,140,248,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} iconType="circle" iconSize={7} />
        <Bar dataKey="healthy" name="Healthy" stackId="sla" fill="#34d399" fillOpacity={0.75} radius={[0, 0, 0, 0]} maxBarSize={38} />
        <Bar dataKey="atRisk" name="At risk" stackId="sla" fill="#fbbf24" fillOpacity={0.85} maxBarSize={38} />
        <Bar dataKey="breached" name="Breached" stackId="sla" fill="#fb7185" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StateDistributionDonut({ data }: { data: StateDistribution[] }) {
  const top = data.slice(0, 7).map((entry) => ({
    name: entry.state,
    value: entry.total,
  }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={top}
          dataKey="value"
          nameKey="name"
          innerRadius={54}
          outerRadius={82}
          paddingAngle={3}
          stroke="rgba(2,6,23,0.4)"
          strokeWidth={2}
        >
          {top.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => [`${value} applications`, "Total"]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 10, color: "#94a3b8", lineHeight: "18px" }}
          iconType="circle"
          iconSize={6}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DeficiencyPareto({
  data,
}: {
  data: Array<{ label: string; count: number; severity: string }>;
}) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0) || 1;
  let running = 0;
  const series = data.slice(0, 6).map((entry) => {
    running += entry.count;
    return {
      ...entry,
      short: entry.label.length > 22 ? `${entry.label.slice(0, 20)}…` : entry.label,
      cumulative: Math.round((running / total) * 100),
    };
  });

  if (series.length === 0) {
    return (
      <div className="grid h-[230px] place-items-center text-xs text-muted-foreground">
        No open deficiencies in the pipeline.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={series} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="short" tick={{ ...AXIS, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis yAxisId="left" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(129,140,248,0.06)" }} />
        <Bar yAxisId="left" dataKey="count" name="Open notices" fill="#38bdf8" fillOpacity={0.65} radius={[4, 4, 0, 0]} maxBarSize={38} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulative"
          name="Cumulative %"
          stroke="#f472b6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#f472b6" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
