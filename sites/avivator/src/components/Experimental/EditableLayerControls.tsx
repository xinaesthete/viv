import { Button } from '@material-ui/core';
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
    // new TranslateMode() //this assumes mercator coordinates...
  ]));
  const setDrawDrag = () => setMode(new DrawPolygonByDraggingMode());
  const setDraw = () => setMode(new DrawPolygonMode());
  return (
    <>
    <Button onClick={setEditMode}>edit</Button>
    <Button onClick={setDrawDrag}>lasso</Button>
    <Button onClick={setDraw}>draw</Button>
    </>
  )
}


export default function EditableLayerControls() {
  return (
    <>
      <ModeSelector />
      <DownloadButton />
    </>
  )
}
