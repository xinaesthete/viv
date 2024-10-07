import { Button } from '@material-ui/core';
import React, { useCallback } from 'react'; //why is this necessary here?
import { useEditState } from './editableLayerState';
import { useMetadata } from '../../state';

export default function EditableLayerControls() {
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
  return (
    <>
    <div>
      <Button onClick={download}>Download JSON</Button>
    </div>
    </>
  )
}
