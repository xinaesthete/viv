import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode,
  // TransformMode,
  TranslateMode,
  CompositeMode,
  type FeatureCollection,
  // type Feature //different Feature to the one in FeatureCollection???
} from '@deck.gl-community/editable-layers';
import { useMemo, useState } from 'react';
import { getVivId } from '@vivjs/views';

export default function useEditableLayer() {
  const [mode, setMode] = useState(() => new DrawPolygonByDraggingMode());
  const [features, setFeatures] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState<number[]>([]);
  const id = `edit_${getVivId('detail')}`;
  const editableLayer = useMemo(() => {
    return new EditableGeoJsonLayer({
      id,
      mode: mode,
      data: features,
      selectedFeatureIndexes,
      onEdit: ({ updatedData, editContext }) => {
        setFeatures(updatedData);
        // const featureIndexes = editContext.featureIndexes as number[];
        // setSelectedFeatureIndexes(featureIndexes || []);
      }
    })
  }, [mode, features, selectedFeatureIndexes, id]);
  return editableLayer;
}
