import Link from "next/link";
import { supabase } from "@/lib/db/supabase";

export default async function ProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    { data: project },
    { count: otCount },
    { count: flangeCount },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("ot_items").select("*", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("flanges").select("*", { count: "exact", head: true }).eq("project_id", id),
  ]);

  if (!project) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-red-600 text-lg">Projet non trouvé.</p>
          <Link href="/projets" className="text-blue-600 hover:underline mt-4 inline-block">
            Retour aux projets
          </Link>
        </div>
      </main>
    );
  }

  const cards = [
    {
      label: "OTs (LUT)",
      value: otCount ?? 0,
      href: `/projets/${id}/lut`,
      color: "blue",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      label: "Brides (J&T)",
      value: flangeCount ?? 0,
      href: `/projets/${id}/jt`,
      color: "emerald",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
    },
    {
      label: "Fiches robinetterie",
      value: "PDF",
      href: `/projets/${id}/robinetterie`,
      color: "amber",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100 text-blue-600", border: "hover:border-blue-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-100 text-emerald-600", border: "hover:border-emerald-300" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "bg-amber-100 text-amber-600", border: "hover:border-amber-300" },
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <Link
        href="/projets"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Projets
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500 mt-1">
            Client : {project.client}
            {project.revision && ` — Rév. ${project.revision}`}
          </p>
          {project.units && project.units.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.units.map((unit: string) => (
                <span
                  key={unit}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium"
                >
                  {unit}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/projets/import"
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Ré-importer
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => {
          const colors = colorMap[card.color];
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group block bg-white border border-slate-200 rounded-xl p-6 ${colors.border} hover:shadow-md transition-all`}
            >
              <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center mb-4`}>
                {card.icon}
              </div>
              <p className={`text-3xl font-bold ${colors.text}`}>{card.value}</p>
              <p className="text-slate-600 mt-1 font-medium">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
