import Link from "next/link";
import { createServerSupabase } from "@/lib/db/supabase-ssr";

export const dynamic = "force-dynamic";

export default async function ProjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [{ data: project }, { count: otCount }, { count: flangeCount }, { count: sessionCount }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("ot_items").select("*", { count: "exact", head: true }).eq("project_id", id),
      supabase.from("flanges").select("*", { count: "exact", head: true }).eq("project_id", id),
      supabase
        .from("field_sessions")
        .select("*", { count: "exact", head: true })
        .eq("project_id", id),
    ]);

  if (!project) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-mcm-terracotta text-lg">Projet non trouvé.</p>
          <Link href="/projets" className="text-mcm-mustard hover:underline mt-4 inline-block">
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
      color: "mustard",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      ),
    },
    {
      label: "Brides (J&T)",
      value: flangeCount ?? 0,
      href: `/projets/${id}/jt`,
      color: "teal",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
      ),
    },
    {
      label: "Fiches robinetterie",
      value: "PDF",
      href: `/projets/${id}/robinetterie`,
      color: "burnt-orange",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "Session terrain",
      value: sessionCount ?? 0,
      href: `/terrain?projectId=${id}`,
      color: "terrain",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    mustard: {
      bg: "bg-mcm-mustard-50",
      text: "text-mcm-mustard",
      icon: "bg-mcm-mustard-light text-mcm-mustard",
      border: "hover:border-mcm-mustard",
    },
    teal: {
      bg: "bg-mcm-teal-light",
      text: "text-mcm-teal",
      icon: "bg-mcm-teal-light text-mcm-teal",
      border: "hover:border-mcm-teal",
    },
    "burnt-orange": {
      bg: "bg-mcm-burnt-orange-light",
      text: "text-mcm-burnt-orange",
      icon: "bg-mcm-burnt-orange-light text-mcm-burnt-orange",
      border: "hover:border-mcm-burnt-orange",
    },
    terrain: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: "bg-amber-100 text-amber-700",
      border: "hover:border-amber-500",
    },
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center gap-3 animate-slide-in">
        <a href="/projets" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-mcm-mustard rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </div>
        </a>
        <Link
          href="/projets"
          className="inline-flex items-center gap-1 text-sm text-mcm-mustard hover:text-mcm-mustard-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Projets
        </Link>
      </div>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-mcm-charcoal">{project.name}</h1>
          <p className="text-mcm-warm-gray mt-1">
            Client : {project.client}
            {project.revision && ` — Rév. ${project.revision}`}
          </p>
          {project.units && project.units.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.units.map((unit: string) => (
                <span
                  key={unit}
                  className="px-2.5 py-1 bg-mcm-warm-gray-bg text-mcm-warm-gray text-xs rounded-md font-medium"
                >
                  {unit}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/projets/import?projectId=${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Ré-importer
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in-up">
        {cards.map((card) => {
          const colors = colorMap[card.color];
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group block bg-mcm-warm-white border border-mcm-warm-gray-border rounded-xl p-6 ${colors.border} hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              <div
                className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center mb-4`}
              >
                {card.icon}
              </div>
              <p className={`text-3xl font-bold ${colors.text}`}>{card.value}</p>
              <p className="text-mcm-warm-gray mt-1 font-medium">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
