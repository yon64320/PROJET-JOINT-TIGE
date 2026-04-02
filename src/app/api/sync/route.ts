import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Implémenter la synchronisation offline (V2)
  return NextResponse.json({ message: "Sync endpoint — à implémenter" }, { status: 501 });
}
