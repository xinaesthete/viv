import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  // Set render coordinate to basically inifnite distance.
	vec3 backFaceCoord = transformed_eye + t_hit.y * 10. * ray_dir;
	vec3 renderDepthCoord = backFaceCoord;
  float maxVals[6] = float[6](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
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
  vec3 rgbCombo = vec3(0.0);
  for(int i = 0; i < 6; i++) {
    rgbCombo += max(0.0, min(1.0, maxVals[i])) * vec3(colors[i]);
  }
  color = vec4(rgbCombo, 1.0);
  if (color.a < 1./256.) discard;
  vec4 _p = mvp * vec4(renderDepthCoord, 1.);
  float depth = _p.z / _p.w;
  gl_FragDepth = (depth + 1.)/2.;
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Maximum Intensity Projection.
 * */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
