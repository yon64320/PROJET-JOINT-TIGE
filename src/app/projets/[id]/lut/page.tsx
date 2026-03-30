import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import LutSheet from "@/components/spreadsheet/LutSheet";

export default async function LutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    { data: project },
    { data: otItems },
    { data: dropdownRows },
  ] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase
      .from("ot_items")
      .select("*")
      .eq("project_id", id)
      .order("numero_ligne", { ascending: true })
      .limit(5000),
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
            LUT
          </h1>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
            {otItems?.length ?? 0} OTs
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <LutSheet rows={otItems ?? []} dropdowns={dropdowns} />
      </div>
    </main>
  );
}
