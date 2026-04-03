import { offlineDb, type OfflineBoltSpec } from "./db";

/**
 * Look up bolt spec prediction from local IndexedDB.
 * Returns the matching spec for RF or RTJ face at given DN+PN.
 */
export async function predictBoltSpec(
  dn: number,
  pn: string,
  faceType: "RF" | "RTJ",
): Promise<OfflineBoltSpec | undefined> {
  return offlineDb.boltSpecs.where({ face_type: faceType, dn: dn, pn: pn }).first();
}
