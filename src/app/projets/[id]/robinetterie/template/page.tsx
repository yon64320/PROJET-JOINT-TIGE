import Link from "next/link";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { DEFAULT_TEMPLATE } from "@/lib/domain/fiche-rob-fields";
import TemplateBuilder from "@/components/fiche-rob/TemplateBuilder";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("name, fiche_rob_template")
    .eq("id", id)
    .single();

  const template = project?.fiche_rob_template ?? DEFAULT_TEMPLATE;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-200 bg-white text-sm">
        <a href="/projets" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 bg-mcm-mustard rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <span className="text-xs font-semibold text-mcm-charcoal hidden sm:inline">EMIS</span>
        </a>
        <div className="w-px h-4 bg-slate-200" />
        <Link
          href={`/projets/${id}`}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          {project?.name ?? "Projet"}
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          href={`/projets/${id}/robinetterie`}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          Robinetterie
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">Template fiche</span>
      </div>

      {/* Builder */}
      <div className="flex-1 min-h-0">
        <TemplateBuilder projectId={id} initial={template} />
      </div>
    </main>
  );
}
