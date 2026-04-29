/**
 * Dictionnaire de synonymes pour l'import adaptatif Excel.
 * Chaque champ DB connu est associé à une liste de noms d'en-têtes possibles.
 * Les synonymes sont normalisés (lowercase, sans accents) lors de la comparaison.
 *
 * Source de vérité côté J&T : libellés des en-têtes (ligne 3) du fichier
 * `data/J&T REV E - 20250209 pour correction.xlsm`. Les variantes secondaires
 * couvrent les écarts typographiques (espace, accent, ponctuation, casse).
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
    // === CARACTERISTIQUES ===
    nom: ["N°ITEM", "N° ITEM", "NITEM", "ITEM"],
    zone: ["ZONE"],
    famille_travaux: ["FAMILLE TRAVAUX"],
    type: ["TYPE ITEM"],
    repere_buta: ["REPERE CLIENT"],
    repere_emis: ["REPERE EMIS"],
    commentaire_repere: ["Com. Repere", "COM REPERE", "COMMENTAIRE REPERE"],
    dn_emis: ["DN"],
    pn_emis: ["PN"],
    // === TRAVAUX + MATERIEL (côté EMIS) ===
    operation: ["OPERATION EMIS"],
    nb_jp_emis: ["NB JP EMIS"],
    nb_bp_emis: ["NB BP EMIS"],
    nb_joints_prov_emis: ["NB JT PROV"],
    nb_joints_def_emis: ["NB JT DEF"],
    materiel_emis: ["MATERIEL SPECIFIQUE"],
    materiel_adf: ["SECURITE"],
    cle: ["CLE"],
    // === JOINTS ET TIGES (côté EMIS) ===
    // ORDRE IMPORTANT : nb_tiges_emis avant dimension_tige_emis pour éviter
    // que "TIGES" matche "NB TIGES" en pass-2 d'inclusion.
    nb_tiges_emis: ["NB TIGES"],
    dimension_tige_emis: ["TIGES"],
    matiere_tiges_emis: ["MAT TIGES"],
    matiere_joint_emis: ["MAT JT"],
    rondelle_emis: ["RONDELLES"],
    face_bride_emis: ["FACE DE BRIDE"],
    // === DIVERS ===
    id_ubleam: ["ID UBLEAM"],
    amiante_plomb: ["AMIANTE / PLOMB", "AMIANTE/PLOMB"],
    num_rob: ["N° ROB", "N°ROB", "NUM ROB", "NUMERO ROB"],
    echafaudage: ["ECHAF"],
    calorifuge: ["CALO"],
    // === DONNEES CLIENT ===
    dn_buta: ["DN CLIENT"],
    pn_buta: ["PN CLIENT"],
    operation_buta: ["OPERATION client", "OPERATION CLIENT"],
    nb_jp_buta: ["NB PLAT. CLIENT", "NB PLAT CLIENT"],
    nb_bp_buta: ["Nb BP CLIENT", "NB BP CLIENT"],
    nb_joints_prov_buta: ["NB JOINT PROV CLIENT"],
    nb_joints_def_buta: ["NB JOINT DEF CLIENT"],
    nb_tiges_buta: ["NB TIGES CLIENT"],
    dimension_tige_buta: ["DIM. TIGES CLIENT", "DIM TIGES CLIENT"],
    matiere_tiges_buta: ["MAT TIGE CLIENT"],
    matiere_joint_buta: ["MATIERE JOINT CLIENT"],
    rondelle_buta: ["RONDELLES CLIENT"],
    face_bride_buta: ["FACE DE BRIDE CLIENT"],
    securite_buta: ["Sécurité CLIENT", "SECURITE CLIENT"],
    sap_buta: ["SAP CLIENT"],
  },
};

/**
 * Labels affichés dans la colonne de gauche du composant MappingPreview.
 * Pour le J&T, ce sont strictement les en-têtes Excel verbatim.
 */
export const JT_FIELD_LABELS: Record<string, string> = {
  // CARACTERISTIQUES
  nom: "N°ITEM",
  zone: "ZONE",
  famille_travaux: "FAMILLE TRAVAUX",
  type: "TYPE ITEM",
  repere_buta: "REPERE CLIENT",
  repere_emis: "REPERE EMIS",
  commentaire_repere: "Com. Repere",
  dn_emis: "DN",
  pn_emis: "PN",
  // TRAVAUX + MATERIEL
  operation: "OPERATION EMIS",
  nb_jp_emis: "NB JP EMIS",
  nb_bp_emis: "NB BP EMIS",
  nb_joints_prov_emis: "NB JT PROV",
  nb_joints_def_emis: "NB JT DEF",
  materiel_emis: "MATERIEL SPECIFIQUE",
  materiel_adf: "SECURITE",
  cle: "CLE",
  // JOINTS ET TIGES
  nb_tiges_emis: "NB TIGES",
  dimension_tige_emis: "TIGES",
  matiere_tiges_emis: "MAT TIGES",
  matiere_joint_emis: "MAT JT",
  rondelle_emis: "RONDELLES",
  face_bride_emis: "FACE DE BRIDE",
  // DIVERS
  id_ubleam: "ID UBLEAM",
  amiante_plomb: "AMIANTE / PLOMB",
  num_rob: "N° ROB",
  echafaudage: "ECHAF",
  calorifuge: "CALO",
  // DONNEES CLIENT
  dn_buta: "DN CLIENT",
  pn_buta: "PN CLIENT",
  operation_buta: "OPERATION client",
  nb_jp_buta: "NB PLAT. CLIENT",
  nb_bp_buta: "Nb BP CLIENT",
  nb_joints_prov_buta: "NB JOINT PROV CLIENT",
  nb_joints_def_buta: "NB JOINT DEF CLIENT",
  nb_tiges_buta: "NB TIGES CLIENT",
  dimension_tige_buta: "DIM. TIGES CLIENT",
  matiere_tiges_buta: "MAT TIGE CLIENT",
  matiere_joint_buta: "MATIERE JOINT CLIENT",
  rondelle_buta: "RONDELLES CLIENT",
  face_bride_buta: "FACE DE BRIDE CLIENT",
  securite_buta: "Sécurité CLIENT",
  sap_buta: "SAP CLIENT",
};

/**
 * Groupes affichés dans MappingPreview, en miroir des 5 catégories
 * de la ligne 2 du fichier J&T.
 */
export const JT_FIELD_GROUPS: { label: string; fields: string[] }[] = [
  {
    label: "CARACTERISTIQUES",
    fields: [
      "nom",
      "zone",
      "famille_travaux",
      "type",
      "repere_buta",
      "repere_emis",
      "commentaire_repere",
      "dn_emis",
      "pn_emis",
    ],
  },
  {
    label: "TRAVAUX + MATERIEL",
    fields: [
      "operation",
      "nb_jp_emis",
      "nb_bp_emis",
      "nb_joints_prov_emis",
      "nb_joints_def_emis",
      "materiel_emis",
      "materiel_adf",
      "cle",
    ],
  },
  {
    label: "JOINTS ET TIGES",
    fields: [
      "nb_tiges_emis",
      "dimension_tige_emis",
      "matiere_tiges_emis",
      "matiere_joint_emis",
      "rondelle_emis",
      "face_bride_emis",
    ],
  },
  {
    label: "DIVERS",
    fields: ["id_ubleam", "amiante_plomb", "num_rob", "echafaudage", "calorifuge"],
  },
  {
    label: "DONNEES CLIENT",
    fields: [
      "dn_buta",
      "pn_buta",
      "operation_buta",
      "nb_jp_buta",
      "nb_bp_buta",
      "nb_joints_prov_buta",
      "nb_joints_def_buta",
      "nb_tiges_buta",
      "dimension_tige_buta",
      "matiere_tiges_buta",
      "matiere_joint_buta",
      "rondelle_buta",
      "face_bride_buta",
      "securite_buta",
      "sap_buta",
    ],
  },
];

/**
 * Descriptions affichées dans le tooltip d'aide (icône `?`) de chaque champ
 * canonique du J&T. `description` = rôle du champ ; `mapTo` = libellé Excel
 * verbatim attendu (issu du fichier J&T REV E).
 */
export const JT_FIELD_DESCRIPTIONS: Record<string, { description: string; mapTo: string }> = {
  // CARACTERISTIQUES
  nom: {
    description: "Numéro d'équipement, clé de liaison avec la LUT.",
    mapTo: "N°ITEM",
  },
  zone: { description: "Unité de l'usine (BUTADIENE, SYNTHESE, ...).", mapTo: "ZONE" },
  famille_travaux: {
    description: "Catégorie de travaux (APPAREIL, ROBINETTERIE, TUYAUTERIE, ...).",
    mapTo: "FAMILLE TRAVAUX",
  },
  type: {
    description: "Sous-type d'équipement (ECHANGEUR, BALLON, VANNE AUTO, ...).",
    mapTo: "TYPE ITEM",
  },
  repere_buta: {
    description: "Repère officiel de la bride sur les plans du donneur d'ordres.",
    mapTo: "REPERE CLIENT",
  },
  repere_emis: {
    description:
      "Sous-repère ajouté par EMIS quand le repère client n'est pas assez précis (ex. 1 vanne = 2 brides).",
    mapTo: "REPERE EMIS",
  },
  commentaire_repere: {
    description: "Commentaire de précision quand EMIS ajoute des sous-repères.",
    mapTo: "Com. Repere",
  },
  dn_emis: {
    description: "Diamètre Nominal relevé sur site par le préparateur.",
    mapTo: "DN",
  },
  pn_emis: {
    description: "Pression Nominale relevée sur site (20 = CL150, 50 = CL300, 100 = CL600).",
    mapTo: "PN",
  },
  // TRAVAUX + MATERIEL
  operation: {
    description:
      "Opération à réaliser sur la bride. Colonne moteur — pilote nb joints/brides via la table Operations.",
    mapTo: "OPERATION EMIS",
  },
  nb_jp_emis: {
    description: "Nombre de Joints Pleins (platines) à poser pour cette bride.",
    mapTo: "NB JP EMIS",
  },
  nb_bp_emis: {
    description: "Nombre de Brides Pleines (blind flanges) à installer.",
    mapTo: "NB BP EMIS",
  },
  nb_joints_prov_emis: {
    description: "Nombre de joints provisoires (phase platinage).",
    mapTo: "NB JT PROV",
  },
  nb_joints_def_emis: {
    description: "Nombre de joints définitifs (reconnexion finale).",
    mapTo: "NB JT DEF",
  },
  materiel_emis: {
    description: "Matériel particulier nécessaire en plus du standard.",
    mapTo: "MATERIEL SPECIFIQUE",
  },
  materiel_adf: {
    description:
      "Contrainte de sécurité matière — ex. ADF (anti-déflagrant en bronze) pour zones ATEX.",
    mapTo: "SECURITE",
  },
  cle: {
    description: "Taille de clé nécessaire au boulonnage (déterminée par le DN).",
    mapTo: "CLE",
  },
  // JOINTS ET TIGES
  nb_tiges_emis: {
    description: "Nombre de tiges filetées de la bride (relevé terrain).",
    mapTo: "NB TIGES",
  },
  dimension_tige_emis: {
    description: "Dimension de la tige en texte libre, ex. M14 x 80 (filetage × longueur).",
    mapTo: "TIGES",
  },
  matiere_tiges_emis: {
    description: "Matière des tiges (ex. B7).",
    mapTo: "MAT TIGES",
  },
  matiere_joint_emis: {
    description: "Matière du joint (ex. SIG/V2J).",
    mapTo: "MAT JT",
  },
  rondelle_emis: {
    description: "Présence de rondelles (oui/non).",
    mapTo: "RONDELLES",
  },
  face_bride_emis: {
    description: "Type de face de bride : RF (Raised Face), RTJ, simple/double emboîtement.",
    mapTo: "FACE DE BRIDE",
  },
  // DIVERS
  id_ubleam: {
    description: "Identifiant Ubleam (système de tag NFC/QR pour l'identification terrain).",
    mapTo: "ID UBLEAM",
  },
  amiante_plomb: {
    description: "Alerte présence amiante ou plomb — contrainte sécurité majeure.",
    mapTo: "AMIANTE / PLOMB",
  },
  num_rob: {
    description:
      "Numéro de fiche robinetterie. Au sein d'un même item, deux brides avec le même numéro forment une vanne (paire ADM/REF).",
    mapTo: "N° ROB",
  },
  echafaudage: {
    description: "Indique si un échafaudage est nécessaire pour accéder à la bride.",
    mapTo: "ECHAF",
  },
  calorifuge: {
    description: "Indique si un calorifuge est en place et doit être déposé/reposé.",
    mapTo: "CALO",
  },
  // DONNEES CLIENT
  dn_buta: { description: "DN théorique côté client (BUTA).", mapTo: "DN CLIENT" },
  pn_buta: { description: "PN théorique côté client (BUTA).", mapTo: "PN CLIENT" },
  operation_buta: {
    description: "Opération prévue côté client (vue miroir de OPERATION EMIS).",
    mapTo: "OPERATION client",
  },
  nb_jp_buta: {
    description: "Nombre de platines (joints pleins) côté client.",
    mapTo: "NB PLAT. CLIENT",
  },
  nb_bp_buta: {
    description: "Nombre de brides pleines côté client.",
    mapTo: "Nb BP CLIENT",
  },
  nb_joints_prov_buta: {
    description: "Nombre de joints provisoires côté client.",
    mapTo: "NB JOINT PROV CLIENT",
  },
  nb_joints_def_buta: {
    description: "Nombre de joints définitifs côté client.",
    mapTo: "NB JOINT DEF CLIENT",
  },
  nb_tiges_buta: {
    description: "Nombre de tiges côté client (théorie BUTA).",
    mapTo: "NB TIGES CLIENT",
  },
  dimension_tige_buta: {
    description: "Dimension de tige côté client.",
    mapTo: "DIM. TIGES CLIENT",
  },
  matiere_tiges_buta: {
    description: "Matière des tiges côté client.",
    mapTo: "MAT TIGE CLIENT",
  },
  matiere_joint_buta: {
    description: "Matière du joint côté client.",
    mapTo: "MATIERE JOINT CLIENT",
  },
  rondelle_buta: {
    description: "Présence de rondelles selon la base client.",
    mapTo: "RONDELLES CLIENT",
  },
  face_bride_buta: {
    description: "Face de bride selon la base client.",
    mapTo: "FACE DE BRIDE CLIENT",
  },
  securite_buta: {
    description: "Contrainte de sécurité côté client (vue miroir de SECURITE).",
    mapTo: "Sécurité CLIENT",
  },
  sap_buta: {
    description: "Référence article dans le système SAP du client.",
    mapTo: "SAP CLIENT",
  },
};
