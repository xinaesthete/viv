import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  // Set render coordinate to basically inifnite distance.
	vec3 backFaceCoord = transformed_eye + t_hit.y * 10. * ray_dir;
	vec3 renderDepthCoord = backFaceCoord;
`;

const _RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    float intensityValue = intensityArray[i];
    rgbCombo += max(0.0, min(1.0, intensityValue)) * colors[i];
    total += intensityValue;
  }
  // Do not go past 1 in opacity.
  total = min(total, 1.0);
  vec4 val_color = vec4(rgbCombo, total);
  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  renderDepthCoord = p;
  if (color.a >= 0.95) {
    break;
  }
`;

const _AFTER_RENDER = `\
  if (color.a < 1./256.) discard;
  vec4 _p = mvp * vec4(renderDepthCoord, 1.);
  float depth = _p.z / _p.w;
  gl_FragDepth = (depth + 1.)/2.;
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with additive blending.
 * */
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

export default AdditiveBlendExtension;
