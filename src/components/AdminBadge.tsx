import { getCurrentUserCached } from "@/lib/db/queries";

/**
 * Petit badge discret fixed en bas à droite, visible uniquement quand le
 * compte connecté a is_admin = true. Rappel permanent qu'on opère en mode
 * super-user, sans encombrer la page.
 *
 * Server Component — utilise React.cache via getCurrentUserCached.
 */
export default async function AdminBadge() {
  const me = await getCurrentUserCached();
  if (!me?.isAdmin) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 px-2 py-0.5 bg-orange-500/80 text-white text-[10px] font-semibold uppercase tracking-wider rounded shadow-sm pointer-events-none select-none"
      title="Mode admin actif"
    >
      admin
    </div>
  );
}
