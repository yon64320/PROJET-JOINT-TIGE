import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import RobSheet from "@/components/spreadsheet/RobSheet";

export default async function RobinetteriePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: project }, { data: robFlanges }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite, famille_item)")
      .eq("project_id", id)
      .eq("rob", true)
      .order("nom", { ascending: true })
      .limit(5000),
  ]);

  const rows = robFlanges ?? [];

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
            Robinetterie
          </h1>
          <span className="px-2 py-0.5 text-xs rounded-md font-medium" style={{ backgroundColor: "#F5E0D8", color: "#C2572A" }}>
            {rows.length} vannes
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {rows.length > 0 ? (
          <RobSheet rows={rows} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-lg font-medium">Aucune bride robinetterie</p>
            <p className="mt-1 text-sm">
              Marquez des brides avec ROB = OUI dans le{" "}
              <Link href={`/projets/${id}/jt`} className="text-blue-600 hover:underline">
                tableur J&amp;T
              </Link>{" "}
              pour les voir ici.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
