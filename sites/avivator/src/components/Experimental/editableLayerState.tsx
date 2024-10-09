import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  type FeatureCollection,
  CompositeMode,
  // type Feature //different Feature to the one in FeatureCollection???
} from '@deck.gl-community/editable-layers';
import type { GeoJsonEditMode } from '@deck.gl-community/editable-layers';
import { useMemo } from 'react';
import { getVivId } from '@vivjs/views';
import create from 'zustand';
import { v4 as uuid } from 'uuid';

type EditOperation = {
  editType: 'string',
  features: FeatureCollection
}

type EditState = {
  mode: GeoJsonEditMode,
  setMode: (mode: GeoJsonEditMode) => void,
  features: FeatureCollection,
  setFeatures: (features: FeatureCollection) => void,
  selectedFeatureIndexes: number[],
  setSelectedFeatureIndexes: (selectedFeatureIndexes: number[]) => void,
  undoStack: FeatureCollection[],
  redoStack: FeatureCollection[],
  undo: () => void,
  redo: () => void,
  commitEdit: (editType: string) => void
}

const getEmptyFeatureCollection = () => ({
  type: "FeatureCollection",
  features: []
} as FeatureCollection);

export const useEditState = create<EditState>(set => ({
  mode: new DrawPolygonMode(),
  setMode: mode => set(state => ({ ...state, mode })),
  features: getEmptyFeatureCollection(),
  setFeatures: features => set(state => ({ ...state, features })),
  selectedFeatureIndexes: [],
  setSelectedFeatureIndexes: selectedFeatureIndexes => set(state => ({...state, selectedFeatureIndexes})),
  undoStack: [getEmptyFeatureCollection()],
  redoStack: [],
  undo: () => set(state => {
    if (state.undoStack.length) {
      const undoStack = [...state.undoStack];
      const features = undoStack.pop() || getEmptyFeatureCollection();
      // if (!features) return state;
      const undone = state.features;
      const redoStack = [...state.redoStack, undone];
      return { ...state, features, undoStack, redoStack };
    }
    console.log("undo no-op")
  }),
  redo: () => set(state => {
    if (state.redoStack.length) {
      const redoStack = [...state.redoStack];
      const features = redoStack.pop();
      if (!features) return state;
      const undoStack = [...state.undoStack, state.features];
      return { ...state, features, undoStack, redoStack };
    }
    console.log("redo no-op");
  }),
  commitEdit(editType) {
    console.log('commit', editType)
    set(state => {
      const undoStack = [...state.undoStack, state.features]; //the first undo will pop back to the current state, not previous.
      const redoStack = [] as FeatureCollection[];
      return { ...state, undoStack, redoStack }
    })
  }
}));

import { useEffect } from 'react';

/**ChatGPT generated function; LGTM(?)
 */
function useKeyboardShortcuts() {
  const { undo, redo } = useEditState(({ undo, redo }) => ({ undo, redo }));
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // Detect Undo: Ctrl+Z or Cmd+Z
      if ((event.ctrlKey || (isMac && event.metaKey)) && event.key === 'z') {
        if (event.shiftKey) {
          redo(); // Ctrl+Shift+Z (or Cmd+Shift+Z)
        } else {
          undo(); // Ctrl+Z (or Cmd+Z)
        }
        event.preventDefault(); // Prevent the default browser behavior
      }

      // Detect Redo: Ctrl+Y (for non-Mac platforms)
      if (event.ctrlKey && event.key === 'y' && !isMac) {
        redo();
        event.preventDefault();
      }
    };

    // Attach the event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);
}


function isEditFinished(editType: string) {
  if (editType === "translated") return true;
  if (editType === "addFeature") return true;
  if (editType === "addPosition") return true;
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
      }
    })
  }, [mode, features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes, id, commitEdit]);
  return editableLayer;
}
