import { type TerrainFieldKey } from "@/lib/terrain/fields";
import { RecapRow } from "./RecapRow";
import type { Step, WizardValues } from "./types";

interface Props {
  values: WizardValues;
  steps: Step[];
  selectedFields: TerrainFieldKey[] | null;
  caloMode: boolean;
  editStep: (target: Step) => void;
  handleComplete: () => void;
}

export function RecapStep({
  values,
  steps,
  selectedFields,
  caloMode,
  editStep,
  handleComplete,
}: Props) {
  const show = (field: TerrainFieldKey) => !selectedFields || selectedFields.includes(field);
  const canEdit = (target: Step) => steps.includes(target);
  const editIfPossible = (target: Step) => (canEdit(target) ? () => editStep(target) : undefined);

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-bold text-mcm-charcoal text-center mb-4">Récapitulatif</h2>
      {caloMode && (
        <div className="mb-2 px-3 py-2 bg-amber-50 rounded-xl text-center">
          <span className="text-sm font-medium text-amber-700">
            Bride calorifugée — données client reprises
          </span>
        </div>
      )}
      {show("dn") && <RecapRow label="DN" value={values.dn_emis} onEdit={editIfPossible("dn")} />}
      {show("pn") && <RecapRow label="PN" value={values.pn_emis} onEdit={editIfPossible("pn")} />}
      {show("nb_tiges") && (
        <RecapRow
          label="Nb tiges"
          value={values.nb_tiges_emis}
          onEdit={editIfPossible("nb_tiges")}
        />
      )}
      {show("dimension_tige") && (
        <RecapRow
          label="Dim. tige"
          value={values.dimension_tige_emis}
          onEdit={editIfPossible("dimension_tige")}
        />
      )}
      {show("face_bride") && (
        <RecapRow
          label="Face"
          value={values.face_bride_emis}
          onEdit={editIfPossible("face_bride")}
        />
      )}
      {show("matiere_joint") && (
        <RecapRow
          label="Matière joint"
          value={values.matiere_joint_emis}
          onEdit={editIfPossible("matiere_joint")}
        />
      )}
      {show("rondelle") && (
        <RecapRow
          label="Rondelle"
          value={values.rondelle_emis}
          onEdit={editIfPossible("rondelle")}
        />
      )}
      {show("calorifuge") && (
        <RecapRow
          label="Calorifugé"
          value={values.calorifuge ? "Oui" : "Non"}
          onEdit={editIfPossible("calorifuge")}
        />
      )}
      {show("echafaudage") && (
        <>
          <RecapRow
            label="Échafaudage"
            value={values.echafaudage ? "Oui" : "Non"}
            onEdit={() => editStep("echafaudage")}
          />
          {!!values.echafaudage && (
            <>
              {values.echaf_longueur && (
                <RecapRow
                  label="Échaf. L"
                  value={`${values.echaf_longueur} m`}
                  onEdit={() => editStep("echafaudage_dimensions")}
                />
              )}
              {values.echaf_largeur && (
                <RecapRow
                  label="Échaf. l"
                  value={`${values.echaf_largeur} m`}
                  onEdit={() => editStep("echafaudage_dimensions")}
                />
              )}
              {values.echaf_hauteur && (
                <RecapRow
                  label="Échaf. H"
                  value={`${values.echaf_hauteur} m`}
                  onEdit={() => editStep("echafaudage_dimensions")}
                />
              )}
            </>
          )}
        </>
      )}
      {show("commentaires") && values.commentaires && (
        <RecapRow
          label="Commentaire"
          value={values.commentaires}
          onEdit={() => editStep("commentaires")}
        />
      )}
      <button
        onClick={handleComplete}
        className="w-full h-16 rounded-xl bg-mcm-teal text-white text-xl font-bold
                   active:bg-mcm-teal-dark transition-colors mt-4"
      >
        Valider la bride
      </button>
    </div>
  );
}
