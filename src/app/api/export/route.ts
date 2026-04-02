import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Implémenter l'export Excel/PDF
  return NextResponse.json({ message: "Export endpoint — à implémenter" }, { status: 501 });
}
