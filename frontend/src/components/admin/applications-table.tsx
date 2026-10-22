"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ExternalLink, Eye } from "lucide-react";
import { APPLICATION_STATES, type Application, type ApplicationState } from "@aicte/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StateBadge } from "@/components/dashboard/state-badge";
import { SlaCountdown } from "@/components/dashboard/sla-countdown";
import { cn } from "@/lib/utils";

interface ApplicationsTableProps {
  applications: Application[];
  canDecide: boolean;
  onApprove: (application: Application) => void;
  pendingId: string | null;
}

export function ApplicationsTable({
  applications,
  canDecide,
  onApprove,
  pendingId,
}: ApplicationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"ALL" | ApplicationState>("ALL");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesTerm =
        term.length === 0 ||
        application.institution.name.toLowerCase().includes(term) ||
        application.institution.state.toLowerCase().includes(term) ||
        application.id.toLowerCase().includes(term);
      const matchesState = stateFilter === "ALL" || application.currentState === stateFilter;
      return matchesTerm && matchesState;
    });
  }, [applications, search, stateFilter]);

  const columns = useMemo<Array<ColumnDef<Application>>>(
    () => [
      {
        id: "institution",
        header: "Institution",
        accessorFn: (row) => row.institution.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-foreground">
              {row.original.institution.name}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {row.original.institution.aicteCode} · {row.original.institution.state}
            </p>
          </div>
        ),
      },
      {
        id: "complianceScore",
        header: "Index",
        accessorFn: (row) => row.complianceScore,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-10 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.original.complianceScore >= 90
                    ? "bg-emerald-400"
                    : row.original.complianceScore >= 65
                      ? "bg-amber-400"
                      : "bg-rose-400",
                )}
                style={{ width: `${row.original.complianceScore}%` }}
              />
            </div>
            <span className="tabular-nums text-[10px] text-muted-foreground">
              {row.original.complianceScore}%
            </span>
          </div>
        ),
      },
      {
        id: "currentState",
        header: "Stage",
        accessorFn: (row) => row.currentState,
        cell: ({ row }) => <StateBadge state={row.original.currentState} dot={false} />,
      },
      {
        id: "slaDeadline",
        header: "SLA",
        accessorFn: (row) => row.slaDeadline ?? "",
        cell: ({ row }) => <SlaCountdown deadline={row.original.slaDeadline} compact />,
      },
      {
        id: "deficiencies",
        header: "Gaps",
        accessorFn: (row) =>
          row.deficiencies.filter((deficiency) => !deficiency.isResolved).length,
        cell: ({ row }) => {
          const open = row.original.deficiencies.filter(
            (deficiency) => !deficiency.isResolved,
          ).length;
          return open > 0 ? (
            <Badge variant="danger">{open}</Badge>
          ) : (
            <span className="text-[10px] text-emerald-300/70">Clear</span>
          );
        },
      },
      {
        id: "updatedAt",
        header: "Updated",
        accessorFn: (row) => row.updatedAt,
        cell: ({ row }) => (
          <span className="text-[10px] text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const application = row.original;
          if (application.currentState === "EVC_INSPECTION" && canDecide) {
            return (
              <Button
                size="sm"
                variant="success"
                loading={pendingId === application.id}
                onClick={() => onApprove(application)}
                className="h-7 px-2 text-[9px]"
              >
                <CheckCircle2 className="h-3 w-3" /> Approve
              </Button>
            );
          }
          if (
            ["SUBMITTED", "UNDER_SCRUTINY", "EVC_INSPECTION", "DEFICIENCY_NOTIFIED"].includes(
              application.currentState,
            )
          ) {
            return (
              <Link href="/reviewer">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px]">
                  <Eye className="h-3 w-3" /> Audit
                </Button>
              </Link>
            );
          }
          return (
            <Link href="/reviewer">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px]">
                <ExternalLink className="h-3 w-3" /> View
              </Button>
            </Link>
          );
        },
      },
    ],
    [canDecide, onApprove, pendingId],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search institution, state or file id…"
          className="h-9 max-w-xs text-xs"
        />
        <Select
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value as "ALL" | ApplicationState)}
          className="h-9 max-w-[180px] text-xs"
        >
          <option value="ALL">All stages</option>
          {APPLICATION_STATES.map((state) => (
            <option key={state} value={state}>
              {state.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filtered.length} of {applications.length} files
        </span>
      </div>

      <div className="scrollbar-none overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-white/[0.03]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1",
                          header.column.getCanSort() ? "cursor-pointer hover:text-foreground" : "",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-2.5 w-2.5" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-2.5 w-2.5" />
                          ) : (
                            <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                          )
                        ) : null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.025]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-[11px] text-muted-foreground"
                >
                  No applications match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
