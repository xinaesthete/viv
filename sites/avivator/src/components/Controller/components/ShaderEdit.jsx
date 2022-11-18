import React from 'react';
import { TextareaAutosize } from '@material-ui/core';
import { useShaderCode, useImageSettingsStore } from '../../../state';
import { RENDERING_MODES } from '@hms-dbmi/viv';
import { get3DExtension } from '../../../utils';

export function get3DExtensionOverride(colormap, renderingMode, shaderCode) {
  const ext = get3DExtension(colormap, renderingMode);
  ext.rendering._AFTER_RENDER = shaderCode._AFTER_RENDER;
  // eslint-disable-next-line no-console
  console.log(ext);
  return ext;
}



export default function ShaderEdit() {
  const shaderCode = useShaderCode();
  const renderingMode = useImageSettingsStore(store => store.renderingMode);
  const renderingOptions = Object.values(RENDERING_MODES);

  const apply = () => {
    const r = (renderingOptions.indexOf(renderingMode) + 1) % renderingOptions.length;
    const renderingModeOld = renderingMode;
    useImageSettingsStore.setState({ renderingMode: renderingOptions[r] });
    setTimeout(() => {
      useImageSettingsStore.setState({ renderingMode: renderingModeOld });
    }, 10);
  };

  return (
    <div style={{maxWidth: '30em'}}>
      <h2 style={{color: 'white'}}>_AFTER_RENDER glsl:</h2>
      <TextareaAutosize style={{ backgroundColor: '#111', color: '#ccc', width: '100%', fontSize: '10px' }}
        defaultValue={shaderCode._AFTER_RENDER}
        onChange={e => shaderCode.setAfterRender(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) apply(); }}
      />
      <button
        onClick={apply}
      >apply</button>
    </div>
  );
}
