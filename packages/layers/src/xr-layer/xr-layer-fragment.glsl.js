export default `\
#version 300 es
#define SHADER_NAME xr-layer-fragment-shader

precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// MAX_CHANNELS is defined via shader compilation defines from the constants package
// Texture sampler array - samplers cannot be in UBOs so they remain as individual uniforms
uniform SAMPLER_TYPE channels[MAX_CHANNELS];

// Channel data in a Uniform Buffer Object with separate arrays
layout(std140) uniform ChannelData {
  int numChannels;
  float _padding1;
  float _padding2;
  float _padding3;
  float intensities[MAX_CHANNELS];
  vec2 contrastLimits[MAX_CHANNELS];  // [min, max] for each channel
};

in vec2 vTexCoord;

out vec4 fragColor;

void main() {
  // Sample textures and apply processing
  float processedIntensities[MAX_CHANNELS];
  
  for(int i = 0; i < MAX_CHANNELS; i++) {
    if(i < numChannels) {
      float rawIntensity = float(texture(channels[i], vTexCoord).r);
      processedIntensities[i] = rawIntensity;
      DECKGL_PROCESS_INTENSITY(processedIntensities[i], contrastLimits[i], i);
    } else {
      processedIntensities[i] = 0.0;
    }
  }
  
  // Use the array-friendly approach - this allows extensions to either:
  // 1. Continue using individual parameters (backwards compatible)
  // 2. Use DECKGL_MUTATE_COLOR_ARRAY for array-based implementations
  #ifdef DECKGL_MUTATE_COLOR_ARRAY
    DECKGL_MUTATE_COLOR_ARRAY(fragColor, processedIntensities, numChannels, vTexCoord);
  #else
    // Backwards compatible individual parameter version
    DECKGL_MUTATE_COLOR(
      fragColor, 
      processedIntensities[0], 
      processedIntensities[1], 
      processedIntensities[2], 
      processedIntensities[3], 
      processedIntensities[4], 
      processedIntensities[5], 
      vTexCoord
    );
  #endif

  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
