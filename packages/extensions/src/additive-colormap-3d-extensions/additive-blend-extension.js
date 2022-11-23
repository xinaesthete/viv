import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  // Set render coordinate to basically inifnite distance.
	vec4 backFaceCoord = transformed_eye + t_hit.y * 10. * ray_dir;
	vec4 renderDepthCoord = backFaceCoord;
`;

const _RENDER = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
  float total = 0.0;

  for(int i = 0; i < 6; i++) {
    total += intensityArray[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);

  vec4 val_color = colormap(total, total);

  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  renderDepthCoord = p;
  if (color.a >= 0.95) {
    break;
  }
  p += ray_dir * dt;
`;

const _AFTER_RENDER = `\
if (color.a < 1./256.) discard;
vec4 _p = mvp * renderDepthCoord;
float depth = _p.z / _p.w;
gl_FragDepth = (depth + 1.)/2.;
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Additive Blending in 3D.
 * */
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

export default AdditiveBlendExtension;
