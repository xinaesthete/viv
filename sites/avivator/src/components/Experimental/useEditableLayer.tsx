import { EditableGeoJsonLayer, CompositeMode } from "@deck.gl-community/editable-layers";
import { getVivId } from "@vivjs/views";
import { useMemo } from "react";
import { v4 as uuid } from "uuid";
import { useKeyboardShortcuts, useEditState } from "./editableLayerState";

function isEditFinished(editType: string) {
  if (editType === "translated") return true;
  if (editType === "addFeature") return true;
  if (editType === "addPosition") return true;
  if (editType.includes("finish")) return true;
  if (editType.includes("remove")) return true;
  return false;
}

export default function useEditableLayer() {
  useKeyboardShortcuts();
  const { mode, features, setFeatures, commitEdit } = useEditState(({ mode, features, setFeatures, commitEdit }) => ({ mode, features, setFeatures, commitEdit }));
  const { selectedFeatureIndexes, setSelectedFeatureIndexes } = useEditState(({ selectedFeatureIndexes, setSelectedFeatureIndexes }) => ({ selectedFeatureIndexes, setSelectedFeatureIndexes }));
  const id = `edit_${getVivId('detail')}`;
  // nb should this be in zustand as well?
  const editableLayer = useMemo(() => {
    return new EditableGeoJsonLayer({
      id,
      mode: mode,
      //@ts-ignore-next-line - this is a pain-point; editable-layers type seems a bit bad...
      data: features,
      selectedFeatureIndexes, // behaviour of this when undefined is a significant pain-point.
      onEdit({ updatedData, editType }) {
        // ensure all features have an id - should this be a default behaviour?
        for (const f of updatedData.features) {
          f.id = f.id || uuid();
        }
        setFeatures(updatedData);
        if (isEditFinished(editType)) commitEdit(editType);
        // const featureIndexes = editContext.featureIndexes as number[];
        // setSelectedFeatureIndexes(featureIndexes || []);
      },
      onHover(pickingInfo) {
        if (!(mode instanceof CompositeMode)) return;
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        if ((pickingInfo as any).featureType === 'points') return;

        // -- try to avoid selecting invisible features etc - refer to notes in other prototype
        setSelectedFeatureIndexes(pickingInfo.index !== -1 ? [pickingInfo.index] : []);
      },
      getFillColor(feature, isSelected, mode) {
        return isSelected ? [0, 0, 255, 128] : [255, 255, 255, 64];
      }
    });
  }, [mode, features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes, id, commitEdit]);
  return editableLayer;
}
