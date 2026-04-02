import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import LutSheet from "@/components/spreadsheet/LutSheet";
/** Row shape returned by Supabase (untyped client) — matches LutSheet's DbRow */
type OtItemRow = Record<string, unknown> & { id: string };

/** Fetch paginé pour dépasser la limite PostgREST de 1000 lignes */
async function fetchAllOtItems(projectId: string) {
  const PAGE_SIZE = 1000;
  const allRows: OtItemRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("ot_items")
      .select("*")
      .eq("project_id", projectId)
      .order("numero_ligne", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

export default async function LutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: project }, otItems, { data: dropdownRows }] = await Promise.all([
    supabase.from("projects").select("name, header_colors").eq("id", id).single(),
    fetchAllOtItems(id),
    supabase.from("dropdown_lists").select("category, value").order("sort_order"),
  ]);

  const dropdowns = {
    famille_item: [] as string[],
    type_item: [] as string[],
    type_travaux: [] as string[],
  };
  dropdownRows?.forEach((row) => {
    const cat = row.category as keyof typeof dropdowns;
    if (cat in dropdowns) {
      dropdowns[cat].push(row.value);
    }
  });

  // Dériver les en-têtes extra depuis les clés de extra_columns des rows
  const extraColumnSet = new Set<string>();
  otItems.forEach((row) => {
    const extras = row.extra_columns as Record<string, unknown> | null;
    if (extras) {
      Object.keys(extras).forEach((k) => extraColumnSet.add(k));
    }
  });
  const extraColumnHeaders = Array.from(extraColumnSet).sort();
  const headerColors = (project?.header_colors as Record<string, string>) ?? {};

  return (
    <main className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-200 bg-white">
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {project?.name ?? "Projet"}
        </Link>
        <div className="w-px h-4 bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-900">LUT</h1>
        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
          {otItems.length} OTs
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <LutSheet
          rows={otItems}
          dropdowns={dropdowns}
          extraColumnHeaders={extraColumnHeaders}
          headerColors={headerColors}
        />
      </div>
    </main>
  );
}
