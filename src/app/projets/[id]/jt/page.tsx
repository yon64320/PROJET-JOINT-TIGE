import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import { getProjectHeader } from "@/lib/db/queries";
import JtPageClient from "@/components/spreadsheet/JtPageClient";
import type { FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";

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
      .select("*, ot_items!inner(item, unite, famille_item, type_travaux)")
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

function HeaderLeft({ id, name }: { id: string; name: string }) {
  return (
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
        {name}
      </Link>
      <div className="w-px h-4 bg-slate-200" />
      <h1 className="text-sm font-semibold text-slate-900">J&amp;T</h1>
    </>
  );
}

function JtSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      <div className="h-9 border-b border-slate-200 bg-slate-50" />
      <div className="flex-1 bg-slate-100" />
    </div>
  );
}

async function JtContent({ id }: { id: string }) {
  const [project, flanges, { data: operationsRef }] = await Promise.all([
    getProjectHeader(id),
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
  const headerColors = project?.header_colors ?? {};
  const robTemplate = (project?.fiche_rob_template as unknown as FicheRobTemplate) ?? {
    caracteristiques: [],
    travaux: [],
  };

  const headerLeft = (
    <>
      <HeaderLeft id={id} name={project?.name ?? "Projet"} />
      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">
        {flanges.length} brides
      </span>
    </>
  );

  return (
    <JtPageClient
      rows={flanges}
      operationTypes={operationTypes}
      extraColumnHeaders={extraColumnHeaders}
      headerColors={headerColors}
      headerLeft={headerLeft}
      projectId={id}
      projectName={project?.name ?? "Projet"}
      robTemplate={robTemplate}
    />
  );
}

export default async function JtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex flex-col h-screen">
      <Suspense fallback={<JtSkeleton />}>
        <JtContent id={id} />
      </Suspense>
    </main>
  );
}
