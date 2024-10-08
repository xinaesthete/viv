import { Box, Button, Divider } from '@material-ui/core';
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
  const setEditMode = () => setMode(new CompositeMode([new ModifyMode(), 
    new TranslateModeEx() //this Ex version works without mercator coordinates...
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

function UndoPanel() {
  const { undo, redo } = useEditState(({undo, redo}) => ({undo, redo}));
  return (
    <>
    <Button onClick={undo}>undo</Button>
    <Button onClick={redo}>redo</Button>
    </>
  )
}

export default function EditableLayerControls() {
  return (
    <Box position="absolute" left={0} top={0} m={1}>
      <ModeSelector />
      <Divider />
      <UndoPanel />
      <Divider />
      <DownloadButton />
    </Box>
  )
}
