import { Suspense } from "react";
import Link from "next/link";
import { getProjectHeader } from "@/lib/db/queries";
import { PlansClient } from "@/components/plans/PlansClient";

function PlansSkeleton() {
  return (
    <div className="flex-1 px-6 py-8 animate-pulse">
      <div className="h-10 w-48 bg-slate-100 rounded mb-6" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

async function PlansHeader({ id }: { id: string }) {
  const project = await getProjectHeader(id);
  return (
    <div className="flex items-center gap-3 px-2 sm:px-4 py-1.5 border-b border-slate-200 bg-white">
      <Link href="/projets" className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 bg-mcm-mustard rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">E</span>
        </div>
        <span className="text-xs font-semibold text-mcm-charcoal hidden sm:inline">EMIS</span>
      </Link>
      <div className="w-px h-4 bg-slate-200" />
      <Link
        href={`/projets/${id}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {project?.name ?? "Projet"}
      </Link>
      <div className="w-px h-4 bg-slate-200" />
      <h1 className="text-sm font-semibold text-slate-900">Plans d&apos;équipement</h1>
    </div>
  );
}

export default async function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex flex-col h-screen">
      <Suspense fallback={<div className="h-9 border-b border-slate-200 bg-slate-50" />}>
        <PlansHeader id={id} />
      </Suspense>
      <Suspense fallback={<PlansSkeleton />}>
        <div className="flex-1 min-h-0 overflow-auto">
          <PlansClient projectId={id} />
        </div>
      </Suspense>
    </main>
  );
}
