import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../state';

const PanLock = () => {
  const { togglePanLock, panLock } = useImageSettingsStore();
  const { isLoading } = useViewerStore();
  return (
    <Button
      disabled={isLoading}
      onClick={togglePanLock}
      variant="outlined"
      size="small"
      fullWidth
    >
      {panLock ? 'Unlock' : 'Lock'} Pan
    </Button>
  );
};
export default PanLock;
