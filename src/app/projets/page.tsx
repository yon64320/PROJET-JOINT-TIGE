import Link from "next/link";
import { supabase } from "@/lib/db/supabase";

export default async function ProjetsPage() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-mcm-charcoal">Projets</h1>
          <p className="text-mcm-warm-gray mt-1">Arrêts de maintenance en cours de préparation</p>
        </div>
        <Link
          href="/projets/import"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Importer un arrêt
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-mcm-terracotta-light border border-mcm-terracotta/20 rounded-xl mb-6">
          <p className="text-mcm-terracotta text-sm">Erreur : {error.message}</p>
        </div>
      )}

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-mcm-warm-gray-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-mcm-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-mcm-warm-gray mb-4">Aucun projet pour l&apos;instant</p>
          <Link
            href="/projets/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover font-medium transition-colors"
          >
            Importer votre premier arrêt
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 animate-fade-in-up">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projets/${project.id}`}
              className="group block bg-mcm-warm-white border border-mcm-warm-gray-border rounded-xl p-6 hover:border-mcm-mustard hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-mcm-charcoal group-hover:text-mcm-mustard transition-colors">
                    {project.name}
                  </h2>
                  <p className="text-mcm-warm-gray mt-1 text-sm">
                    Client : {project.client}
                    {project.revision && ` — Rév. ${project.revision}`}
                  </p>
                </div>
                <svg className="w-5 h-5 text-mcm-warm-gray-light group-hover:text-mcm-mustard transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {project.units && project.units.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.units.map((unit: string) => (
                    <span
                      key={unit}
                      className="px-2 py-0.5 bg-mcm-warm-gray-bg text-mcm-warm-gray text-xs rounded-md font-medium"
                    >
                      {unit}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
