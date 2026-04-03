/**
 * Dexie.js IndexedDB database for offline terrain sessions.
 * Mirrors server data for offline access + stores mutations queue.
 */
import Dexie, { type EntityTable } from "dexie";

// ---- Offline entity types ----

export interface OfflineSession {
  id: string;
  project_id: string;
  name: string;
  status: "preparing" | "active" | "syncing" | "synced";
  downloaded_at: string | null;
}

export interface OfflineOtItem {
  id: string;
  session_id: string;
  item: string;
  unite: string | null;
  titre_gamme: string | null;
  flange_count: number;
}

export interface OfflineFlange {
  id: string;
  session_id: string;
  ot_item_id: string;
  // Identification
  nom: string | null;
  repere_buta: string | null;
  repere_emis: string | null;
  // DN / PN
  dn_emis: string | null;
  dn_buta: string | null;
  pn_emis: string | null;
  pn_buta: string | null;
  // Bolt data
  operation: string | null;
  face_bride: string | null;
  nb_tiges_emis: string | null;
  nb_tiges_buta: string | null;
  diametre_tige: string | null;
  longueur_tige: string | null;
  cle: string | null;
  matiere_tiges_emis: string | null;
  matiere_joint_emis: string | null;
  rondelle: string | null;
  commentaires: string | null;
  // Terrain fields
  calorifuge: boolean;
  echafaudage: boolean;
  field_status: "pending" | "in_progress" | "completed";
  // Tracking
  dirty: boolean;
  last_modified_local: string | null;
}

export interface OfflineMutation {
  id?: number; // auto-increment
  session_id: string;
  flange_id: string;
  field: string;
  value: string | number | boolean | null;
  timestamp: string;
  synced: boolean;
}

export interface OfflinePlan {
  id: string;
  session_id: string;
  ot_item_id: string;
  filename: string;
  blob: Blob;
}

export interface OfflineBoltSpec {
  id: string;
  face_type: "RF" | "RTJ";
  dn: number;
  pn: string;
  nb_tiges: number;
  designation_tige: string | null;
  diametre_tige: number;
  longueur_tige: number | null;
  cle: number | null;
}

export interface OfflineDropdownItem {
  id: string;
  category: string;
  value: string;
  sort_order: number;
}

// ---- Database ----

class TerrainDB extends Dexie {
  sessions!: EntityTable<OfflineSession, "id">;
  otItems!: EntityTable<OfflineOtItem, "id">;
  flanges!: EntityTable<OfflineFlange, "id">;
  mutations!: EntityTable<OfflineMutation, "id">;
  plans!: EntityTable<OfflinePlan, "id">;
  boltSpecs!: EntityTable<OfflineBoltSpec, "id">;
  dropdownLists!: EntityTable<OfflineDropdownItem, "id">;

  constructor() {
    super("terrain-db");

    this.version(1).stores({
      sessions: "id, project_id",
      otItems: "id, session_id",
      flanges: "id, session_id, ot_item_id, field_status",
      mutations: "++id, session_id, flange_id, synced",
      plans: "id, session_id, ot_item_id",
      boltSpecs: "id, [face_type+dn+pn]",
      dropdownLists: "id, category",
    });
  }
}

export const offlineDb = new TerrainDB();
