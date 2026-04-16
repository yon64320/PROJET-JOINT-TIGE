import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import JtPageClient from "@/components/spreadsheet/JtPageClient";
/** Row shape returned by Supabase (untyped client) — matches JtSheet's DbFlange */
type FlangeRow = Record<string, unknown> & { id: string };

/** Fetch paginé pour dépasser la limite PostgREST de 1000 lignes */
async function fetchAllFlanges(projectId: string) {
  const PAGE_SIZE = 1000;
  const allRows: FlangeRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite)")
      .eq("project_id", projectId)
      .order("nom", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

export default async function JtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: project }, flanges, { data: operationsRef }] = await Promise.all([
    supabase.from("projects").select("name, header_colors").eq("id", id).single(),
    fetchAllFlanges(id),
    supabase.from("operations_ref").select("operation_type").order("operation_type"),
  ]);

  const operationTypes = operationsRef?.map((op) => op.operation_type) ?? [];

  // Dériver les en-têtes extra depuis les clés de extra_columns des rows
  const extraColumnSet = new Set<string>();
  flanges?.forEach((row) => {
    const extras = row.extra_columns as Record<string, unknown> | null;
    if (extras) {
      Object.keys(extras).forEach((k) => extraColumnSet.add(k));
    }
  });
  const extraColumnHeaders = Array.from(extraColumnSet).sort();
  const headerColors = (project?.header_colors as Record<string, string>) ?? {};

  const headerLeft = (
    <>
      <a href="/projets" className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 bg-mcm-mustard rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">E</span>
        </div>
        <span className="text-xs font-semibold text-mcm-charcoal hidden sm:inline">EMIS</span>
      </a>
      <div className="w-px h-4 bg-slate-200" />
      <Link
        href={`/projets/${id}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {project?.name ?? "Projet"}
      </Link>
      <div className="w-px h-4 bg-slate-200" />
      <h1 className="text-sm font-semibold text-slate-900">J&amp;T</h1>
      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">
        {flanges.length} brides
      </span>
    </>
  );

  return (
    <main className="flex flex-col h-screen">
      <JtPageClient
        rows={flanges}
        operationTypes={operationTypes}
        extraColumnHeaders={extraColumnHeaders}
        headerColors={headerColors}
        headerLeft={headerLeft}
      />
    </main>
  );
}
