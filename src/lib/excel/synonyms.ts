/**
 * Dictionnaire de synonymes pour l'import adaptatif Excel.
 * Chaque champ DB connu est associé à une liste de noms d'en-têtes possibles.
 * Les synonymes sont normalisés (lowercase, sans accents) lors de la comparaison.
 */

export type FileType = "lut" | "jt";

/**
 * Synonymes builtin : Record<FileType, Record<db_field, excel_header_variants[]>>
 */
export const BUILTIN_SYNONYMS: Record<FileType, Record<string, string[]>> = {
  lut: {
    // Identification
    chrono_emis: ["CHRONO EMIS", "CHRONO", "N° CHRONO", "NUM CHRONO"],
    chrono_buta: ["CHRONO BUTA", "CHRONO CLIENT", "CHRONO DONNEES BUTA", "N° LIGNE"],
    unite: ["UNITE", "UNITÉ", "ZONE", "SECTEUR"],
    item: ["ITEM", "NOM", "REPERE", "TAG", "N° EQUIPEMENT", "EQUIPEMENT", "N°EQUIPEMENT"],
    ot: ["OT", "N° OT", "NUMERO OT", "N°OT"],
    lot: ["LOT", "N° LOT", "NUMERO LOT"],
    titre_gamme: [
      "TITRE GAMME",
      "TITRE",
      "DESCRIPTION",
      "LIBELLE",
      "DESIGNATION",
      "INTITULE GAMME",
    ],
    famille_item: ["FAMILLE ITEM", "FAMILLE", "FAM. ITEM", "FAMILLE EQUIPEMENT"],
    type_item: ["TYPE ITEM", "TYPE", "TYPE EQUIPEMENT", "TYPE EQUIP"],
    type_travaux: ["TYPE TRAVAUX", "TYPE DE TRAVAUX", "CORPS DE METIER", "CDM"],
    revision: ["REV", "REVISION", "RÉVISION", "IND REV"],
    statut: ["TB/TC/TA", "STATUT", "TB TC TA", "TB-TC-TA", "TYPE OT"],
    commentaires: ["COMMENTAIRES", "COMMENTAIRE", "REMARQUES", "OBSERVATIONS", "NOTES"],
    // Corps de métier
    corps_metier_echaf: ["ÉCHAF", "ECHAF", "ECHAFAUDAGE", "ÉCHAFAUDAGE"],
    corps_metier_calo: ["CALO", "CALORIFUGE", "CALORI"],
    corps_metier_montage: ["MONTAGE", "MONT", "MONT."],
    corps_metier_metal: ["MÉTAL", "METAL", "MET", "MÉT", "CHAUDRONNERIE"],
    corps_metier_fourniture: ["FOURN.", "FOURNITURE", "FOURN", "FOURNIT"],
    corps_metier_nettoyage: ["NETT.", "NETTOYAGE", "NETT", "NETTOY"],
    corps_metier_autres: ["AUTRES", "AUTRE", "DIVERS"],
  },
  jt: {
    // Identification
    id_ubleam: ["ID UBLEAM", "UBLEAM", "ID", "IDENTIFIANT UBLEAM"],
    nom: ["NOM", "ITEM", "TAG", "EQUIPEMENT", "N° EQUIPEMENT", "REPERE"],
    zone: ["ZONE", "UNITE", "UNITÉ", "SECTEUR"],
    famille_travaux: ["FAMILLE", "FAMILLE TRAVAUX", "FAM. TRAVAUX", "FAMILLE ITEM"],
    type: ["TYPE", "TYPE ITEM", "TYPE EQUIPEMENT"],
    // Repères
    repere_buta: ["REPERE BUTA", "REP. BUTA", "REP BUTA", "REPERE CLIENT", "REP. CLIENT"],
    repere_emis: ["REPERE EMIS", "REP. EMIS", "REP EMIS", "REPERE RELEVE"],
    repere_ubleam: ["REPERE UBLEAM", "REP. UBLEAM", "REP UBLEAM"],
    commentaire_repere: ["COMMENTAIRE REPERE", "COMMENTAIRE", "COM. REPERE", "COM REPERE"],
    // ROB
    rob: ["ROB", "ROBINETTERIE", "VANNE"],
    // DN
    dn_emis: ["DN", "DN RELEVE", "DN EMIS", "DIAMETRE NOMINAL", "DN RELEVÉ"],
    dn_buta: ["DN CLIENT", "DN BUTA", "DN DONNEES BUTA", "DN DONNEES CLIENT", "DN DONNÉES BUTA"],
    // PN
    pn_emis: ["PN", "PN RELEVE", "PN EMIS", "PRESSION NOMINALE", "PN RELEVÉ"],
    pn_buta: ["PN CLIENT", "PN BUTA", "PN DONNEES BUTA", "PN DONNEES CLIENT", "PN DONNÉES BUTA"],
    // Opération
    operation: ["OPERATION", "OPÉRATION", "TYPE OPERATION", "OP", "TYPE OP"],
    barrette: ["BARRETTE", "BAR", "BARRETTES"],
    // Matériel
    nb_jp_emis: ["NB JP EMIS", "NB JP", "JOINT PLEIN", "NB JOINT PLEIN", "NB JP RELEVE"],
    nb_jp_buta: ["NB JP BUTA", "NB JP CLIENT", "NB JP DONNEES BUTA", "JOINT PLEIN BUTA"],
    nb_bp_emis: ["NB BP EMIS", "NB BP", "BRIDE PLEINE", "NB BRIDE PLEINE", "NB BP RELEVE"],
    nb_bp_buta: ["NB BP BUTA", "NB BP CLIENT", "NB BP DONNEES BUTA", "BRIDE PLEINE BUTA"],
    materiel_emis: ["MATERIEL EMIS", "MAT EMIS", "MATERIEL", "MATÉRIEL EMIS"],
    materiel_buta: ["MATERIEL BUTA", "MAT BUTA", "MATERIEL CLIENT", "MATÉRIEL BUTA"],
    materiel_adf: ["MATERIEL ADF", "MAT ADF", "ADF", "MATÉRIEL ADF"],
    cle: ["CLE", "CLÉ", "CLEF"],
    // Tiges quantité
    nb_tiges_emis: ["NB TIGES", "NB TIGES EMIS", "NB TIGES RELEVE", "NB TIGE"],
    nb_tiges_buta: ["NB TIGES BUTA", "NB TIGES DONNEES BUTA", "NB TIGES CLIENT", "NB TIGE BUTA"],
    // Tiges matière
    matiere_tiges_emis: [
      "MAT TIGES",
      "MAT TIGES EMIS",
      "MATIERE TIGES",
      "MAT TIGE",
      "MATIERE BOULONNERIE",
    ],
    matiere_tiges_buta: [
      "MAT TIGE DONNES BUTA",
      "MAT TIGES BUTA",
      "MATIERE TIGES BUTA",
      "MAT TIGE BUTA",
    ],
    // Tiges dimensions (1 champ texte unique)
    dimension_tige_buta: [
      "DIM TIGE BUTA",
      "DIMENSION TIGE BUTA",
      "DESIGNATION TIGE BUTA",
      "DIM. TIGE BUTA",
    ],
    dimension_tige_emis: [
      "DIM TIGE",
      "DIMENSION TIGE",
      "DESIGNATION TIGE",
      "DESIG. TIGE",
      "DIM. TIGE",
      "DIM TIGE EMIS",
      "DIMENSION TIGE EMIS",
    ],
    // Joints quantité
    nb_joints_prov_buta: [
      "NB JT PROV BUTA",
      "NB JOINTS PROV BUTA",
      "NB JP PROV BUTA",
      "JOINT PROVISOIRE BUTA",
    ],
    nb_joints_prov_emis: ["NB JT PROV", "NB JOINT PROV", "NB JOINTS PROV", "JOINT PROVISOIRE"],
    nb_joints_def_buta: [
      "NB JT DEF BUTA",
      "NB JOINTS DEF BUTA",
      "JOINT DEFINITIF BUTA",
      "JOINT DÉFINITIF BUTA",
    ],
    nb_joints_def_emis: [
      "NB JT DEF",
      "NB JOINT DEF",
      "NB JOINTS DEF",
      "JOINT DEFINITIF",
      "JOINT DÉFINITIF",
    ],
    // Joints matière
    matiere_joint_emis: ["MAT JT", "MAT JT EMIS", "MATIERE JOINT", "MAT JOINT", "MATIERE JOINTS"],
    matiere_joint_buta: [
      "MATIERE JOINT BUTA",
      "MAT JT BUTA",
      "MAT JOINT BUTA",
      "MATIERE JOINTS BUTA",
    ],
    // Compléments
    rondelle_buta: ["RONDELLE BUTA", "RONDELLES BUTA", "ROND BUTA"],
    rondelle_emis: ["RONDELLES", "RONDELLE", "ROND"],
    face_bride_buta: ["FACE BRIDE BUTA", "FACE DE BRIDE BUTA", "TYPE FACE BUTA"],
    face_bride_emis: ["FACE DE BRIDE", "FACE BRIDE", "TYPE FACE"],
    commentaires: ["COMMENTAIRE", "COMMENTAIRES", "REMARQUES", "OBSERVATIONS", "NOTES"],
    // Terrain
    calorifuge: ["CALORIFUGE", "CALO", "CALORI", "CALORIFUGÉ"],
    echafaudage: ["ECHAFAUDAGE", "ÉCHAFAUDAGE", "ÉCHAF", "ECHAF"],
  },
};

/**
 * Labels lisibles pour les champs DB J&T (affichage UI uniquement).
 * Les noms internes DB ne changent pas.
 */
export const JT_FIELD_LABELS: Record<string, string> = {
  // Identification
  id_ubleam: "ID Ubleam",
  nom: "Item",
  zone: "Zone",
  famille_travaux: "Famille travaux",
  type: "Type",
  // Repères
  repere_buta: "Repère client",
  repere_emis: "Repère EMIS",
  repere_ubleam: "Repère Ubleam",
  commentaire_repere: "Commentaire repère",
  // Opération
  rob: "Robinetterie",
  operation: "Opération bride",
  barrette: "Barrette",
  // DN / PN
  dn_emis: "DN EMIS",
  dn_buta: "DN client",
  pn_emis: "PN EMIS",
  pn_buta: "PN client",
  // Données client
  nb_jp_buta: "NB JP client",
  nb_bp_buta: "NB BP client",
  materiel_buta: "Matériel client",
  matiere_joint_buta: "Matière joint client",
  nb_tiges_buta: "NB tiges client",
  matiere_tiges_buta: "Matière tiges client",
  dimension_tige_buta: "Dimension tige client",
  nb_joints_prov_buta: "NB joints prov. client",
  nb_joints_def_buta: "NB joints déf. client",
  rondelle_buta: "Rondelle client",
  face_bride_buta: "Face de bride client",
  // Données EMIS
  nb_jp_emis: "NB JP EMIS",
  nb_bp_emis: "NB BP EMIS",
  materiel_emis: "Matériel EMIS",
  matiere_joint_emis: "Matière joint EMIS",
  nb_tiges_emis: "NB tiges EMIS",
  matiere_tiges_emis: "Matière tiges EMIS",
  materiel_adf: "Matériel bronze",
  dimension_tige_emis: "Dimension tige EMIS",
  nb_joints_prov_emis: "NB joints prov. EMIS",
  nb_joints_def_emis: "NB joints déf. EMIS",
  rondelle_emis: "Rondelle EMIS",
  face_bride_emis: "Face de bride EMIS",
  cle: "Clé",
  // Divers
  commentaires: "Commentaires",
  calorifuge: "Calorifuge",
  echafaudage: "Échafaudage",
};

/**
 * Groupement des champs DB J&T par catégorie (ordre d'affichage).
 */
export const JT_FIELD_GROUPS: { label: string; fields: string[] }[] = [
  {
    label: "Identification",
    fields: ["id_ubleam", "nom", "zone", "famille_travaux", "type"],
  },
  {
    label: "Repères",
    fields: ["repere_buta", "repere_emis", "repere_ubleam", "commentaire_repere"],
  },
  {
    label: "Opération",
    fields: ["rob", "operation", "barrette"],
  },
  {
    label: "Données client",
    fields: [
      "dn_buta",
      "pn_buta",
      "nb_jp_buta",
      "nb_bp_buta",
      "materiel_buta",
      "matiere_joint_buta",
      "nb_tiges_buta",
      "matiere_tiges_buta",
      "dimension_tige_buta",
      "nb_joints_prov_buta",
      "nb_joints_def_buta",
      "rondelle_buta",
      "face_bride_buta",
    ],
  },
  {
    label: "Données EMIS",
    fields: [
      "dn_emis",
      "pn_emis",
      "nb_jp_emis",
      "nb_bp_emis",
      "materiel_emis",
      "matiere_joint_emis",
      "nb_tiges_emis",
      "matiere_tiges_emis",
      "materiel_adf",
      "dimension_tige_emis",
      "nb_joints_prov_emis",
      "nb_joints_def_emis",
      "rondelle_emis",
      "face_bride_emis",
      "cle",
    ],
  },
  {
    label: "Divers",
    fields: ["commentaires", "calorifuge", "echafaudage"],
  },
];
