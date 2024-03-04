import React from 'react';
import { TextareaAutosize } from '@material-ui/core';
import { useShaderCode, useImageSettingsStore } from '../../../state';
import { RENDERING_MODES } from '@hms-dbmi/viv';
import { get3DExtension } from '../../../utils';
import { LayerExtension } from '@deck.gl/core';

export function get3DExtensionOverride(colormap, renderingMode, shaderCode) {
  const ext = get3DExtension(colormap, renderingMode);
  ext.rendering._AFTER_RENDER = shaderCode._AFTER_RENDER;
  ext.rendering._FS_DECL = `//https://www.shadertoy.com/view/XljGzV
  vec3 hsl2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
  }`;
  return ext;
}

export class DepthVisExtension extends LayerExtension {
  getShaders() {
    return {
      inject: {
        'fs:#decl': `
        const bool visualiseDepth = true;
        const vec2 depthContrastLimits = vec2(0.1, 0.3);
        float linear_to_srgb(float x) {
          if (x <= 0.0031308) {
            return 12.92 * x;
          }
          return 1.055 * pow(x, 1. / 2.4) - 0.055;
        }
        `,
        'fs:DECKGL_FILTER_COLOR': `
        if (visualiseDepth) {
          float d = gl_FragCoord.z;
          vec2 lim = depthContrastLimits;
          d = (d - lim[0]) / max(0.0005, lim[1] - lim[0]);
          d = linear_to_srgb(d);
          color.rgb = vec3(d);
        }
        `
      }
    };
  }
}

/// this probably shouldn't be trying to extend LensExtension,
// should it be an extra LayerExtension that goes alongside...
// nb, the actual error wrong thing that happens internally is:
// layer.ts:778   _initialize() {
//   assert(!this.internalState); // finalized layer cannot be reused
let shaderCodeGlobal; //hack
export class DynamicShaderExtension extends LayerExtension {
  //shaderCode is a bad name, it's shaderInjections or something
  constructor(shaderCode) {
    super();
    this.shaderCode = shaderCode;
    shaderCodeGlobal = shaderCode;
  }
  getShaders() {
    const { inject } = shaderCodeGlobal; //'this' is not what it seems
    return { inject };
  }
  // todo less hardcoding / ability to add sliders / potentially animation...
  updateState(params) {
    // pixelValues -> uniforms...xx
    const { pixelValues = [160.0, 20.0, 20.0, 20.0, 0, 0], intensityPower = 1, contrastLimits } = params.props;
    // a bit garbage, but working around contrastLimits uniform being declared too late for us to use it in the our injected hooks
    const pixValsNormalized = pixelValues.map((v, i) => {
      const limits = contrastLimits[i];
      if (!limits) return 0; //assert - shouldn't happen
      return (v - limits[0]) / (limits[1] - limits[0]);
    });
    const misoWidth = 0.02;
    const afFactor = .0;
    for (const model of this.getModels()) model.setUniforms({ pixelValues, intensityPower, misoWidth, afFactor, pixValsNormalized });
  }
}

function ShaderCodeBlock({ hookName, docText, apply }) {
  const shaderCode = useShaderCode();
  return (
    <details>
      <summary>{hookName}</summary>
      <code>{docText}</code>
      <TextareaAutosize style={{ backgroundColor: '#111', color: '#ccc', width: '100%', fontSize: '10px' }}
        defaultValue={shaderCode.inject[hookName]}
        onChange={e => shaderCode.setCodeForHook(hookName, e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) apply(); }}
      />
    </details>
  );
}

export default function ShaderEdit() {
  //const shaderCode = useShaderCode();
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
      {/* <ShaderCodeBlock hookName="_AFTER_RENDER" apply={apply} /> */}
      <ShaderCodeBlock hookName="fs:#decl" apply={apply} />
      <ShaderCodeBlock hookName="fs:DECKGL_PROCESS_INTENSITY" apply={apply} doc="inout float intensity, vec2 contrastLimits, int channelIndex"/>
      <ShaderCodeBlock hookName="fs:DECKGL_MUTATE_COLOR" apply={apply} />
      <button
        onClick={apply}
      >apply</button>
    </div>
  );
}
