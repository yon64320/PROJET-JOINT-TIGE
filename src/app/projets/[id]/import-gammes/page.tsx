import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { GammesImportWizard } from "@/components/import/GammesImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportGammesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [{ data: project }, { data: otSample }] = await Promise.all([
    supabase.from("projects").select("id, name, client").eq("id", id).single(),
    supabase.from("ot_items").select("id").eq("project_id", id).limit(1),
  ]);

  if (!project) redirect("/projets");

  const hasExistingLut = (otSample?.length ?? 0) > 0;

  return (
    <main className="container max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/projets/${id}`}
          className="text-sm text-mcm-warm-gray hover:text-mcm-charcoal inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-mcm-charcoal mt-2">
          {hasExistingLut
            ? "Générer un fichier LUT depuis les gammes"
            : "Construire la LUT à partir des gammes"}
        </h1>
        <p className="text-mcm-warm-gray mt-1">
          {hasExistingLut
            ? "La LUT du projet ne sera pas modifiée. Le wizard produit uniquement un fichier .xlsx exportable."
            : "Upload du fichier « Gammes Compilées » client, sélection des corps de métier EMIS, importation directe dans le projet et téléchargement du fichier .xlsx."}
        </p>
      </div>

      <GammesImportWizard
        projectId={id}
        projectName={project.name as string}
        hasExistingLut={hasExistingLut}
      />
    </main>
  );
}
