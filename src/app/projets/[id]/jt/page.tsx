import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import JtSheet from "@/components/spreadsheet/JtSheet";

/** Fetch paginé pour dépasser la limite PostgREST de 1000 lignes */
async function fetchAllFlanges(projectId: string) {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: any[] = [];
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

export default async function JtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    { data: project },
    flanges,
    { data: operationsRef },
  ] = await Promise.all([
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

  return (
    <main className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <Link
            href={`/projets/${id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {project?.name ?? "Projet"}
          </Link>
          <div className="w-px h-5 bg-slate-200" />
          <h1 className="text-base font-semibold text-slate-900">
            J&amp;T
          </h1>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-md font-medium">
            {flanges.length} brides
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <JtSheet
          rows={flanges}
          operationTypes={operationTypes}
          extraColumnHeaders={extraColumnHeaders}
          headerColors={headerColors}
        />
      </div>
    </main>
  );
}
