export default async function RobinetteriePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Fiches robinetterie — Projet {id}
      </h1>
      <p className="text-gray-600">Génération fiches PDF — à venir</p>
    </main>
  );
}
