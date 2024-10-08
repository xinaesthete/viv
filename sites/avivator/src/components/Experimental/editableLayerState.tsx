import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  type FeatureCollection,
  CompositeMode,
  // type Feature //different Feature to the one in FeatureCollection???
} from '@deck.gl-community/editable-layers';
import type { GeoJsonEditMode } from '@deck.gl-community/editable-layers';
import { useMemo, useState } from 'react';
import { getVivId } from '@vivjs/views';
import create from 'zustand';

type EditState = {
  mode: GeoJsonEditMode,
  setMode: (mode: GeoJsonEditMode) => void,
  features: FeatureCollection,
  setFeatures: (features: FeatureCollection) => void,
}

export const useEditState = create<EditState>(set => ({
  mode: new DrawPolygonMode(),
  setMode: mode => set(state => ({ ...state, mode })),
  features: {
    type: "FeatureCollection",
    features: []
  },
  setFeatures: features => set(state => ({ ...state, features }))
}));

export default function useEditableLayer() {
  const { mode, features, setFeatures } = useEditState();
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState<number[]>([]);
  const id = `edit_${getVivId('detail')}`;
  const editableLayer = useMemo(() => {
    return new EditableGeoJsonLayer({
      id,
      mode: mode,
      data: features,
      selectedFeatureIndexes, // behaviour of this when undefined is a significant pain-point.
      onEdit: ({ updatedData, editContext }) => {
        setFeatures(updatedData);
        // const featureIndexes = editContext.featureIndexes as number[];
        // setSelectedFeatureIndexes(featureIndexes || []);
      },
      onHover: (pickingInfo) => {
        if (!(mode instanceof CompositeMode)) return;
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        if ((pickingInfo as any).featureType === 'points') return;

        // -- try to avoid selecting invisible features etc - refer to notes in other prototype
        setSelectedFeatureIndexes(pickingInfo.index !== -1 ? [pickingInfo.index] : []);
      },
    })
  }, [mode, features, setFeatures, selectedFeatureIndexes, id]);
  return editableLayer;
}
