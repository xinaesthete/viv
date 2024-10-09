import {
  DrawPolygonMode,
  // type Feature //different Feature to the one in FeatureCollection???
} from '@deck.gl-community/editable-layers';
// import clone from '@turf/clone';
import type { GeoJsonEditMode } from '@deck.gl-community/editable-layers';
import type { FeatureCollection } from '@turf/helpers';
import { useEffect } from 'react';
import create from 'zustand';

type EditOperation = {
  editType: string,
  features: FeatureCollection
}

type EditState = {
  mode: GeoJsonEditMode,
  setMode: (mode: GeoJsonEditMode) => void,
  features: FeatureCollection,
  setFeatures: (features: FeatureCollection) => void,
  selectedFeatureIndexes: number[],
  setSelectedFeatureIndexes: (selectedFeatureIndexes: number[]) => void,
  undoStack: EditOperation[],
  undoIndex: number,
  undo: () => void,
  redo: () => void,
  goToUndo: (i: number) => void,
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
  undoStack: [{ editType: 'init', features: getEmptyFeatureCollection()}],
  undoIndex: 0,
  undo: () => set(state => {
    if (state.undoStack.length) {
      const { undoStack } = state;
      let { undoIndex } = state;
      if (--undoIndex < 0) return;
      // may want to clone here (or rather, in commitEdit) - turfjs vs editable-layers type...
      const { features } = undoStack[undoIndex];// || getEmptyFeatureCollection();
      return { ...state, features, undoStack, undoIndex };
    }
    console.log("undo no-op")
  }),
  redo: () => set(state => {
    const { undoStack, undoIndex } = state;
    const n = undoStack.length;
    if (undoIndex === n-1) return;
    if (undoIndex >= n) throw `illegal undoIndex ${undoIndex} with undoStack.length ${n}`;
    const newIndex = undoIndex + 1;
    const { features } = undoStack[newIndex];
    return  {...state, features, undoIndex: newIndex };
  }),
  goToUndo(undoIndex) {
    set(state => {
      const { undoStack } = state;
      if (undoIndex >= undoStack.length || undoIndex < 0) {
        console.error('goToUndo out of bounds', undoIndex, undoStack.length);
        return;
      }
      const { features } = undoStack[undoIndex];
      return { ...state, features, undoIndex };
    })
  },
  commitEdit(editType) {
    console.log('commit', editType)
    set(state => {
      let undoIndex = state.undoIndex;
      // check for off-by-one etc
      const undoStack = state.undoStack.slice(0, undoIndex + 1);
      const { features } = state;
      const entry = { editType, features };
      undoIndex = undoStack.push(entry) - 1; //will the first undo will pop back to the current state, not previous?
      // const redoStack = [] as FeatureCollection[];
      return { ...state, undoStack, undoIndex }
    })
  }
}));


/**ChatGPT generated function; LGTM(?)
 */
export function useKeyboardShortcuts() {
  const { undo, redo } = useEditState(({ undo, redo }) => ({ undo, redo }));
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect Undo: Ctrl+Z or Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (event.shiftKey) {
          redo(); // Ctrl+Shift+Z (or Cmd+Shift+Z)
        } else {
          undo(); // Ctrl+Z (or Cmd+Z)
        }
        event.preventDefault(); // Prevent the default browser behavior
      }

      // Detect Redo: Ctrl+Y (for non-Mac platforms)
      if (event.ctrlKey && event.key === 'y') {
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


