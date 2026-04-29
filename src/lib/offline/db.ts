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
  selected_fields: string[] | null; // null = all fields
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
  face_bride_emis: string | null;
  face_bride_buta: string | null;
  nb_tiges_emis: string | null;
  nb_tiges_buta: string | null;
  dimension_tige_emis: string | null;
  dimension_tige_buta: string | null;
  cle: string | null;
  matiere_tiges_emis: string | null;
  matiere_joint_emis: string | null;
  rondelle_emis: string | null;
  rondelle_buta: string | null;
  nb_joints_prov_emis: string | null;
  nb_joints_prov_buta: string | null;
  nb_joints_def_emis: string | null;
  nb_joints_def_buta: string | null;
  commentaires: string | null;
  // Terrain fields
  calorifuge: boolean;
  echafaudage: boolean;
  echaf_longueur: string | null;
  echaf_largeur: string | null;
  echaf_hauteur: string | null;
  field_status: "pending" | "in_progress" | "completed";
  // Tracking
  dirty: boolean;
  last_modified_local: string | null;
  /** True si la bride a été supprimée localement et attend la sync DELETE. */
  _deleted?: boolean;
  /** True si la bride a été créée localement (id `temp_<uuid>`). */
  _local?: boolean;
}

/**
 * Mutations queue — discriminated union par type d'opération.
 * - update : modification d'un champ d'une bride existante (legacy).
 * - create : insertion d'une nouvelle bride pendant la session
 *   (`flange_id` = `temp_<uuid>` côté local, remplacé par UUID serveur au sync).
 * - delete : suppression d'une bride existante.
 *
 * Rétro-compat : les entrées sans `type` sont traitées comme `update` au sync
 * (anciennes sessions persistées en IndexedDB).
 */
export type OfflineMutation =
  | {
      id?: number;
      type: "update";
      session_id: string;
      flange_id: string;
      field: string;
      value: string | number | boolean | null;
      timestamp: string;
      synced: boolean;
    }
  | {
      id?: number;
      type: "create";
      session_id: string;
      flange_id: string; // temp_<uuid>
      ot_item_id: string;
      initial_fields: Record<string, string | number | boolean | null>;
      timestamp: string;
      synced: boolean;
    }
  | {
      id?: number;
      type: "delete";
      session_id: string;
      flange_id: string;
      timestamp: string;
      synced: boolean;
    };

/** Helper : test si une bride a un id local (créée hors-ligne, pas encore synchronisée). */
export function isTempFlangeId(id: string): boolean {
  return id.startsWith("temp_");
}

export interface OfflinePlan {
  id: string;
  session_id: string;
  ot_item_id: string;
  filename: string;
  blob: Blob;
}

/**
 * Photo terrain en attente d'upload Storage.
 * `id` = UUID v4 généré au moment de la prise — devient aussi le basename
 * du storage_path côté serveur.
 * `flange_id` peut être un `temp_<uuid>` si la bride a été créée hors-ligne.
 * Au sync, `pushMutations` remap les temp_ vers les serverIds avant que
 * `pushPendingPhotos` ne tente l'upload.
 */
export interface PendingPhoto {
  id: string;
  session_id: string;
  flange_id: string;
  type: "bride" | "echafaudage" | "calorifuge";
  blob: Blob;
  display_name: string;
  natural_item: string;
  natural_repere: string | null;
  natural_cote: string | null;
  size_bytes: number;
  taken_at: string;
  uploaded: boolean;
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
  pendingPhotos!: EntityTable<PendingPhoto, "id">;

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
    // v2 — refonte mapping J&T : tige fusionnée + face_bride/rondelle/joints dédoublés BUTA/EMIS
    this.version(2).stores({
      sessions: "id, project_id",
      otItems: "id, session_id",
      flanges: "id, session_id, ot_item_id, field_status",
      mutations: "++id, session_id, flange_id, synced",
      plans: "id, session_id, ot_item_id",
      boltSpecs: "id, [face_type+dn+pn]",
      dropdownLists: "id, category",
    });
    // v3 — mutations discriminated union (update | create | delete) +
    // flags _deleted / _local sur les brides. Pas de breaking change de
    // schéma (les nouvelles colonnes sont des champs JS, pas des index).
    this.version(3).stores({
      sessions: "id, project_id",
      otItems: "id, session_id",
      flanges: "id, session_id, ot_item_id, field_status",
      mutations: "++id, session_id, flange_id, synced",
      plans: "id, session_id, ot_item_id",
      boltSpecs: "id, [face_type+dn+pn]",
      dropdownLists: "id, category",
    });
    // v4 — table pendingPhotos (photos terrain en attente d'upload).
    // Index composite [flange_id+type] requis pour la galerie thumbnail.
    this.version(4).stores({
      sessions: "id, project_id",
      otItems: "id, session_id",
      flanges: "id, session_id, ot_item_id, field_status",
      mutations: "++id, session_id, flange_id, synced",
      plans: "id, session_id, ot_item_id",
      boltSpecs: "id, [face_type+dn+pn]",
      dropdownLists: "id, category",
      pendingPhotos: "id, session_id, flange_id, type, uploaded, [flange_id+type]",
    });
  }
}

export const offlineDb = new TerrainDB();
