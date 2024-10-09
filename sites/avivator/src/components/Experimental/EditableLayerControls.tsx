import "react18-json-view/src/style.css";
// If dark mode is needed, import `dark.css`.
import "react18-json-view/src/dark.css";

import { Box, Button, Checkbox, Divider, Grid, IconButton } from '@material-ui/core';
import React, { useCallback, useState } from 'react'; //why is this necessary here?
import { useEditState } from './editableLayerState';
import { useMetadata } from '../../state';
import {
  DrawPolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode,
  // TransformMode,
  // TranslateMode,
  CompositeMode,
} from '@deck.gl-community/editable-layers';
import TranslateModeEx from './translate-mode-exp';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import JsonView from "react18-json-view";

function DownloadButton() {
  const metadata = useMetadata() as unknown as { Name?: string };
  const download = useCallback(() => {
    const { features } = useEditState.getState();
    const str = JSON.stringify(features, null, 2);
    const name = metadata?.Name || 'default';
    const file = new File([str], `${name}.json`, { type: 'text/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(file);
  
    link.href = url
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
  
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [metadata]);
  return <Button onClick={download}>Download JSON</Button>
}

function ModeSelector() {
  const { mode, setMode } = useEditState(({mode, setMode}) => ({mode, setMode}));
  const setEditMode = () => setMode(new CompositeMode([
    new TranslateModeEx(), //this Ex version works without mercator coordinates...
    new ModifyMode(), 
  ]));
  const setDrawDrag = () => setMode(new DrawPolygonByDraggingMode());
  const setDraw = () => setMode(new DrawPolygonMode());
  const drawPoly = mode instanceof DrawPolygonMode && !(mode instanceof DrawPolygonByDraggingMode);
  return (
    <>
    <Button variant={mode instanceof CompositeMode ? "outlined" : undefined} onClick={setEditMode}>edit</Button>
    <Button variant={mode instanceof DrawPolygonByDraggingMode ? "outlined" : undefined} onClick={setDrawDrag}>lasso</Button>
    <Button variant={drawPoly ? "outlined" : undefined} onClick={setDraw}>draw</Button>
    </>
  )
}

function EditOperationList() {
  const { undoStack } = useEditState(({ undoStack }) => ({ undoStack }));
  const { undoIndex } = useEditState(({ undoIndex }) => ({ undoIndex }));
  const { goToUndo } = useEditState(({ goToUndo }) => ({ goToUndo }));

  return (
    <ul>
      {undoStack.map(({editType, features}, i) => {
        const current = undoIndex === i ? '<' : '';
        return (
          <li 
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          key={i}>
            <Button onClick={() => goToUndo(i)}>
              {editType}: {features.features.length} features {current}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}


function UndoPanel() {
  const { undo, redo } = useEditState(({undo, redo}) => ({undo, redo}));
  const [ showHistory, setShowHistory ] = useState(false);
  return (
    <>
    <Button onClick={undo}>undo</Button>
    <Button onClick={redo}>redo</Button>
    <Divider />
    Undo history: <Checkbox onChange={(_, checked) => setShowHistory(checked)} checked={showHistory} />
    {showHistory && <EditOperationList />}
    </>
  )
}

function FeatureView() {
  const { features, setFeatures, commitEdit } = useEditState(({ features, setFeatures, commitEdit }) => ({ features, setFeatures, commitEdit }));
  const { setSelectedFeatureIndexes } = useEditState(({ setSelectedFeatureIndexes }) => ({ setSelectedFeatureIndexes }));
  return features.features.map((feature, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: may consider having ids for features.
    <Grid key={i}
    onMouseEnter={() => setSelectedFeatureIndexes([i])}
    onMouseLeave={() => setSelectedFeatureIndexes([])}
    >
      Polygon {i} ({feature.geometry.coordinates.flat().length-1} vertices)
      <IconButton
        aria-label="delete-shape"
        size="small"
        onClick={() => {
          const newArr = features.features.toSpliced(i, 1);
          setFeatures({...features, features: newArr});
          commitEdit('deleteShape');
        }}
        >
          <HighlightOffIcon fontSize="small" />
        </IconButton>
    </Grid>
  ));
}

function GeoJSON() {
  const { features } = useEditState(({features}) => ({features}));
  return <JsonView src={features} collapsed={true}/>
}

export default function EditableLayerControls() {
  return (
    <Box position="absolute" left={0} top={0} m={1} style={{ color: "white" }} >
      <ModeSelector />
      <Divider />
      <FeatureView />
      <UndoPanel />
      <Divider />
      <DownloadButton />
      <GeoJSON />
    </Box>
  )
}
