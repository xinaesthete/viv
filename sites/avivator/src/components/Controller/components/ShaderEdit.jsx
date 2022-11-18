import React from 'react';
import { TextareaAutosize } from '@material-ui/core';
import { useShaderCode } from '../../../state';

export default function ShaderEdit() {
  const shaderCode = useShaderCode();
  return (
    <div style={{maxWidth: '30em'}}>
      <h2 style={{color: 'white'}}>_AFTER_RENDER glsl:</h2>
      <TextareaAutosize style={{ backgroundColor: '#111', color: '#ccc', width: '100%', fontSize: '10px' }}
        defaultValue={shaderCode._AFTER_RENDER}
        onChange={e => shaderCode.setAfterRender(e.target.value)}
      />
      <button
        onClick={() => {
          //TODO...
        }}
      >apply</button>
    </div>
  );
}
