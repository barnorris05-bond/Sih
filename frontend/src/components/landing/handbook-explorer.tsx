"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ruleBook } from "@aicte/shared";
import { Badge } from "@/components/ui/badge";

export function HandbookExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const categories = ["ALL", ...new Set(ruleBook.rules.map((rule) => rule.category))];
  const rules = useMemo(() => ruleBook.rules.filter((rule) => {
    const haystack = `${rule.title} ${rule.description} ${rule.code}`.toLowerCase();
    return (category === "ALL" || rule.category === category) && haystack.includes(query.toLowerCase());
  }), [category, query]);

  return <div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search handbook rules</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rules or reference codes" className="h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/20" /></label><div className="flex items-center gap-2 overflow-x-auto"><SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg border px-2.5 py-2 text-[10px] font-medium transition-colors ${category === item ? "border-indigo-400/35 bg-indigo-500/10 text-indigo-200" : "border-white/[0.08] text-muted-foreground hover:text-foreground"}`}>{item === "ALL" ? "All rules" : item}</button>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-2">{rules.map((rule) => <article key={rule.code} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-indigo-400/30"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-foreground">{rule.title}</p><Badge variant={rule.severity === "CRITICAL" ? "danger" : "warning"}>{rule.severity}</Badge></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{rule.description}</p><div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2"><span className="font-mono text-[9px] text-indigo-200/80">{rule.code}</span><span className="text-[9px] text-muted-foreground">{Math.round(rule.weight * 100)}% weight</span></div></article>)}</div>
    {rules.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-muted-foreground">No handbook rules match that search.</p> : null}
  </div>;
}
