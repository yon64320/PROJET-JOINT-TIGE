import Link from "next/link";
import { supabase } from "@/lib/db/supabase";
import { DEFAULT_TEMPLATE } from "@/lib/domain/fiche-rob-fields";
import RobinerieView from "@/components/fiche-rob/RobinerieView";

export const dynamic = "force-dynamic";

export default async function RobinetteriePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: project }, { data: robFlanges }] = await Promise.all([
    supabase.from("projects").select("name, fiche_rob_template").eq("id", id).single(),
    supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite, famille_item, type_travaux)")
      .eq("project_id", id)
      .eq("rob", true)
      .order("nom", { ascending: true })
      .limit(5000),
  ]);

  const rows = robFlanges ?? [];
  const template = project?.fiche_rob_template ?? DEFAULT_TEMPLATE;
  const projectName = project?.name ?? "Projet";

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
          {projectName}
        </Link>
        <div className="w-px h-4 bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-900">Robinetterie</h1>
        <span
          className="px-1.5 py-0.5 text-xs rounded font-medium"
          style={{ backgroundColor: "#F5E0D8", color: "#C2572A" }}
        >
          {rows.length} vannes
        </span>
        <div className="ml-auto">
          <Link
            href={`/projets/${id}/robinetterie/template`}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Template
          </Link>
        </div>
      </div>

      {rows.length > 0 ? (
        <RobinerieView rows={rows} projectId={id} projectName={projectName} template={template} />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
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
    </main>
  );
}
