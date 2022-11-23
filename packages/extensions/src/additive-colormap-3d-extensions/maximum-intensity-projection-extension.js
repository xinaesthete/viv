import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float maxVals[6] = float[6](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
  // Set render coordinate to basically inifnite distance.
	vec4 backFaceCoord = transformed_eye + t_hit.y * 10. * ray_dir;
	vec4 renderDepthCoord = backFaceCoord;
`;

const _RENDER = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] > maxVals[i]) {
      maxVals[i] = intensityArray[i];
      renderDepthCoord = p;
    }
  }
`;

const _AFTER_RENDER = `\
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    total += maxVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
  if (color.a < 1./256.) discard;
  vec4 _p = mvp * renderDepthCoord;
  float depth = _p.z / _p.w;
  gl_FragDepth = (depth + 1.)/2.;
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Maximum Intensity Projection in 3D.
 */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
