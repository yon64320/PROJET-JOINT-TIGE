import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import JtSheet from "@/components/spreadsheet/JtSheet";

export default async function JtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    { data: project },
    { data: flanges },
    { data: operationsRef },
  ] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite)")
      .eq("project_id", id)
      .order("nom", { ascending: true })
      .limit(5000),
    supabase.from("operations_ref").select("operation_type").order("operation_type"),
  ]);

  const operationTypes = operationsRef?.map((op) => op.operation_type) ?? [];

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
            {flanges?.length ?? 0} brides
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <JtSheet rows={flanges ?? []} operationTypes={operationTypes} />
      </div>
    </main>
  );
}
