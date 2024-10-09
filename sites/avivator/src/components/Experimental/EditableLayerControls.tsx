import { Box, Button, Divider, Grid, IconButton } from '@material-ui/core';
import React, { useCallback } from 'react'; //why is this necessary here?
import { useEditState } from './editableLayerState';
import { useMetadata } from '../../state';
import {
  DrawPolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode,
  // TransformMode,
  TranslateMode,
  CompositeMode,
} from '@deck.gl-community/editable-layers';
import TranslateModeEx from './translate-mode-exp';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import type { FeatureCollection } from '@deck.gl-community/editable-layers';

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

function EditOperationList({edits}: {edits: FeatureCollection[]}) {
  return (
    <ul>
      {edits.map((feature, i) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <li key={i}>{feature.features.length} features</li>
        )
      })}
    </ul>
  )
}


function UndoPanel() {
  const { undo, redo } = useEditState(({undo, redo}) => ({undo, redo}));
  const { undoStack, redoStack } = useEditState(({ undoStack, redoStack }) => ({ undoStack, redoStack }));
  return (
    <>
    <Button onClick={undo}>undo</Button>
    <Button onClick={redo}>redo</Button>
    <Divider />
    Undo history:
    <EditOperationList edits={undoStack} />
    Redo:
    <EditOperationList edits={redoStack} />
    </>
  )
}

function FeatureView() {
  const { features, setFeatures, commitEdit } = useEditState(({ features, setFeatures, commitEdit }) => ({ features, setFeatures, commitEdit }));
  return features.features.map((feature, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: may consider having ids for features.
    <Grid key={i}>
      Polygon {i}
      <IconButton
        aria-label="delete-shape"
        size="small"
        onClick={() => {
          const newArr = features.features.slice(i);
          setFeatures({...features, features: newArr});
          commitEdit('deleteShape');
        }}
        >
          <HighlightOffIcon fontSize="small" />
        </IconButton>
    </Grid>
  ));
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
    </Box>
  )
}
