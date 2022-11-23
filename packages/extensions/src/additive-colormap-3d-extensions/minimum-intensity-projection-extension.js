import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float minVals[6] = float[6](1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0.);
  // Set render coordinate to basically inifnite distance.
	vec4 backFaceCoord = transformed_eye + t_hit.y * 10. * ray_dir;
	vec4 renderDepthCoord = backFaceCoord;
`;

const _RENDER = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] < minVals[i]) {
      minVals[i] = intensityArray[i];
      renderDepthCoord = p;
    }
  }
`;

const _AFTER_RENDER = `\
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    total += minVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
  gl_FragDepth = (mvp * renderDepthCoord).z / (mvp * renderDepthCoord).w;
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Minimum Intensity Projection in 3D.
 */
const MinimumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MinimumIntensityProjectionExtension.extensionName =
  'MinimumIntensityProjectionExtension';

export default MinimumIntensityProjectionExtension;
