# Viv UBO Development Roadmap

## Overview

This document outlines the development strategy for migrating Viv to use Uniform Buffer Objects (UBOs) and implementing variable channel support, along with considerations for future-proofing the codebase.

## Current Status

This is a first sketch at prompting an LLM to start migrating and it is likely that these changes will be rolled back and staged in a different way. That also goes for the majority of this document - so "completed" is a bit of a stretch to say the least, and things like the timeline and risk mitigation are likely to be wrong.

### Completed Work

- ✅ Implemented UBO layout with `ChannelData` uniform block
- ✅ Added array-based shader hooks (`DECKGL_MUTATE_COLOR_ARRAY`)
- ✅ Updated core shader modules to support both legacy and array-based approaches
- ✅ Maintained backward compatibility during transition period (`uniform` declerations in extensionswill be supported but deprecated)

### Implementation Details
The current implementation includes:
- UBO with separate arrays for `intensities` and `contrastLimits`
- Texture samplers remain as individual uniforms (cannot be in UBOs)
- Dual shader hook system supporting both legacy and new array-based extensions

## Development Phases

### Phase 1: UBO Foundation (Current)
**Goal**: Establish UBO infrastructure while maintaining backward compatibility

**Completed**:
- Core UBO implementation in shaders
- Array-based processing loops
- Documentation updates for new shader hooks

**Remaining**:
- JavaScript layer updates to populate UBOs
- Performance testing and validation
- Extension migration examples

### Phase 2: Mandatory UBO Migration
**Goal**: Remove backward compatibility, mandate UBO usage for all extensions

**Breaking Changes**:
- Extensions MUST use UBO-compatible uniform declarations
- Remove legacy `DECKGL_MUTATE_COLOR` individual parameter support
- Extensions MUST implement `DECKGL_MUTATE_COLOR_ARRAY`

**Migration Requirements**:
- All existing extensions need updates
- Clear migration guide with before/after examples
- Deprecation warnings in previous release

### Phase 3: Variable Channel Count
**Goal**: Dynamic channel support beyond fixed arrays

**Considerations**:
- Shader pre-processing for dynamic uniform array sizes
- Extension API design for variable channel handling
- Performance implications of dynamic loops vs unrolled code
- Memory layout optimization

**Compile-time Shader Generation**: Generate shaders on-demand using `#define MAX_CHANNELS ${n}` based on actual channel count. Apparently modern shader compilers are quite good at optimization when loop bounds are known at compile time. This should allow GPU optimization (loop unrolling, dead code elimination) while keeping implementation simple and maintainable.

If there are upstream issues with missing features in the luma.gl implementation, we should raise them with the luma.gl team again / submit PRs if necessary.

**Channel Visibility Optimization**: A key insight is that `channelsVisible` could become redundant with compile-time generation. Instead of:
- Generating shader for MAX_CHANNELS=6 (or whatever the max is)
- Populating only visible channels 
- Using `channelsVisible` array to skip invisible channels in shader

We could optimize to:
- Generate shader for exactly N visible channels
- Populate UBOs only with visible channel data
- Eliminate `channelsVisible` logic entirely from shader

This would provide significant benefits:
- **Memory efficiency**: Smaller UBOs (only visible channel data)
- **GPU performance**: Fewer texture samples, smaller loops, no conditional branching
- **Shader simplicity**: No visibility checks needed

**Implementation considerations**:
- Shader regeneration when channels are toggled on/off
- UI responsiveness during shader compilation
- Caching strategies for common channel combinations
- State management would need to be have a somewhat different approach.

luma.gl should cache the shaders it has already compiled, and I don't expect the shader compilation to be a major performance bottleneck given that it is only done when toggling channels on/off, adding/removing. 

### Phase 4: WebGPU/WGSL Transition
**Goal**: Future-proof for next-generation graphics APIs

**Challenges**:
- Parallel GLSL/WGSL shader maintenance
- Extension dual-target support
- API differences between WebGL 2.0 and WebGPU
- Build system complexity

**Strategy**:
- Shader abstraction layer
- Extension capability negotiation
- Gradual migration with fallback support

## Technical Considerations

### UBO Design Principles

```glsl
layout(std140) uniform ChannelData {
  int numChannels;           // Active channel count
  float _padding1;           // std140 alignment
  float _padding2;
  float _padding3;
  float intensities[MAX_CHANNELS];        // Per-channel intensity multipliers
  vec2 contrastLimits[MAX_CHANNELS];      // [min, max] contrast limits
  // Future: Additional per-channel properties can be added here
  // There may be a `VIV_CHANNEL_UNIFORMS` hook for extensions?
};
```

**Benefits**:
- Single GPU buffer update vs multiple uniform calls
- Extensible design for future channel properties
- Better performance for high channel counts

**Limitations**:
- Texture samplers cannot be in UBOs (remain as individual uniforms)
- std140 layout padding requirements
- Maximum UBO size limits (typically 16KB-64KB)

### Extension Migration Impact

Extensions currently define shader uniforms in two places that will be significantly affected by the UBO migration:

#### Shader Module Declarations (`fs` string)

**Before (Legacy - Individual Uniforms)**:
```glsl
const fs = `\
// Extension-specific uniforms
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;
uniform bool lensEnabled;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;
uniform vec3 colors[6];  // Fixed array size

void mutate_color(inout vec3 rgb, float intensity0, float intensity1, 
                  float intensity2, float intensity3, float intensity4, 
                  float intensity5) {
  // Fixed parameter approach with individual uniforms
}
`;
```

**After (UBO-compatible)**:
```glsl
const fs = `\
// Extension-specific UBO block
layout(std140) uniform LensExtensionData {
  float majorLensAxis;
  float minorLensAxis;
  vec2 lensCenter;
  bool lensEnabled;
  int lensSelection;
  vec3 lensBorderColor;
  float lensBorderRadius;
  float _padding;  // std140 alignment
};

// Colors remain in main ChannelData UBO: colors[MAX_CHANNELS]

void mutate_color_array(inout vec3 rgb, float intensities[MAX_CHANNELS], 
                        int numChannels) {
  for(int i = 0; i < numChannels && i < MAX_CHANNELS; i++) {
    // Extension logic using UBO data
    float useColorValue = getLensColorValue(i);
    rgb += max(0.0, min(1.0, intensities[i])) * mix(vec3(1.0), colors[i], useColorValue);
  }
}
`;
```

#### JavaScript Property System Integration

**Current System (Deck.gl `setUniforms`)**:
```javascript
draw() {
  const uniforms = {
    majorLensAxis: calculatedValue,
    minorLensAxis: calculatedValue,
    lensCenter: [x, y],
    lensEnabled: true,
    colors: paddedColors  // Individual uniform updates
  };
  this.state.model?.setUniforms(uniforms);
}
```

**Required UBO System**:
```javascript
draw() {
  // Extension-specific UBO buffer
  const lensUBOData = new Float32Array([
    majorLensAxis, minorLensAxis, 
    lensCenter[0], lensCenter[1],
    lensEnabled ? 1.0 : 0.0,
    lensSelection,
    ...lensBorderColor,
    // padding for std140 alignment
  ]);
  
  // Shared channel data UBO (managed by core layer)
  this.updateExtensionUBO('LensExtensionData', lensUBOData);
  
  // Colors handled by core ChannelData UBO
  this.updateChannelColors(paddedColors);
}
```

#### TypeScript Property Interface Changes

**Current (Loosely Typed)**:
```typescript
// Extension properties defined as generic objects
type LensExtensionProps = {
  lensEnabled: boolean;
  lensSelection: number;
  // ... other props
};
```

**Future UBO-Compatible (Strongly Typed)**:
```typescript
// UBO layout interfaces
interface LensExtensionUBO {
  majorLensAxis: number;
  minorLensAxis: number;
  lensCenter: [number, number];
  lensEnabled: boolean;
  lensSelection: number;
  lensBorderColor: [number, number, number];
  lensBorderRadius: number;
}

// Extension class with UBO integration
interface UBOExtension<T extends Record<string, any> = {}> {
  getUBOLayout(): UBOLayout<T>;
  updateUBO(data: Partial<T>): void;
  validateUBOData(data: T): boolean;
}

class LensExtension extends LayerExtension implements UBOExtension<LensExtensionUBO> {
  getUBOLayout(): UBOLayout<LensExtensionUBO> {
    return {
      name: 'LensExtensionData',
      layout: 'std140',
      fields: {
        majorLensAxis: { type: 'float', offset: 0 },
        minorLensAxis: { type: 'float', offset: 4 },
        lensCenter: { type: 'vec2', offset: 8 },
        // ... complete layout definition
      }
    };
  }
}
```

### TypeScript Migration Evaluation

#### Current State Analysis

**What's Already TypeScript-Ready**:
- ✅ Base `tsconfig.json` with strict mode enabled
- ✅ `@vivjs/types` package with comprehensive type definitions
- ✅ Build system generates `.d.ts` files via `unbuild`
- ✅ Extension props are typed via the `Viv<>` utility type

**What Needs Migration**:
- ❌ **Extensions package**: Currently `.js` files, needs conversion to `.ts`
- ❌ **Layers package**: Mix of `.js` and `.glsl.js`, needs typing for shader management
- ❌ **UBO Management**: No type system for buffer layouts and validation
- ❌ **Shader Module System**: No TypeScript support for shader compilation pipeline

#### Migration Benefits

1. **UBO Safety**: Compile-time validation of buffer layouts and std140 alignment
2. **Extension Interface**: Strongly typed extension property validation
3. **Shader Integration**: Type-safe shader uniform management
4. **Refactoring Support**: Safe code changes during UBO migration
5. **Developer Experience**: Better IDE support, auto-completion for complex shader APIs

#### Migration Strategy

**Phase 1: Extension TypeScript Migration**
```typescript
// New UBO-aware extension base class
abstract class UBOLayerExtension<TProps = {}, TUBOData = {}> 
  extends LayerExtension {
  
  abstract getUBOLayout(): UBOLayout<TUBOData>;
  abstract getShaderModule(): ShaderModule;
  
  // Type-safe UBO update methods
  protected updateUBO(data: Partial<TUBOData>): void {
    const layout = this.getUBOLayout();
    const buffer = this.packUBOData(data, layout);
    this.setUniformBlock(layout.name, buffer);
  }
  
  // Validate UBO data against layout at runtime
  private validateUBOData(data: TUBOData, layout: UBOLayout<TUBOData>): boolean {
    // Runtime validation logic
  }
}
```

**Phase 2: Shader System Types**
```typescript
// Shader compilation pipeline types
interface ShaderModule {
  name: string;
  fs: string;
  vs?: string;
  inject: Record<string, string>;
  uniforms?: UBOLayout[];
}

interface UBOLayout<T = Record<string, any>> {
  name: string;
  layout: 'std140' | 'std430';
  fields: {
    [K in keyof T]: UBOFieldDescriptor;
  };
}

interface UBOFieldDescriptor {
  type: GLSLType;
  offset: number;
  size?: number; // for arrays
}

type GLSLType = 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'mat4';
```

**Phase 3: Build System Integration**
- Shader type generation from GLSL analysis
- UBO layout validation at build time
- Extension compatibility checking

#### Estimated Migration Effort

- **Extensions Package**: 1-2 weeks (straightforward conversion)
- **UBO Type System**: 2-3 weeks (new infrastructure)
- **Shader Pipeline Types**: 3-4 weeks (complex integration)
- **Build System Updates**: 1-2 weeks (tooling changes)

**Total TypeScript Migration**: 7-11 weeks (can be done in parallel with UBO work)

### Performance Considerations

1. **UBO Updates**: Single large buffer vs multiple small uniforms
2. **Dynamic Loops**: Runtime loop bounds vs compile-time unrolling
3. **Memory Layout**: Cache-friendly data organization
4. **Shader Variants**: Specialized vs general-purpose shaders
5. **Extension UBO Overhead**: Multiple UBO blocks vs consolidated buffers
6. **std140 Padding**: Memory waste vs alignment requirements

## Development Strategy

### Incremental Migration Approach

1. **Phase 1 (Current)**: Dual support system
   - Maintain backward compatibility
   - Allow gradual extension migration
   - Validate UBO performance

2. **Phase 2**: Breaking change release
   - Remove legacy support
   - Mandate UBO usage
   - Provide comprehensive migration tools

3. **Phase 3**: Enhanced capabilities
   - Variable channel count
   - Advanced shader features
   - Performance optimizations

### TypeScript Migration

**Motivation**:
- Better developer experience during major refactoring
- Catch interface changes during UBO transition
- Improved maintainability for complex shader management

**Approach**:
- Migrate core packages first
- Extension template with TypeScript
- Gradual conversion of existing extensions

### Avivator Site Updates

**Current Issues**:
- Outdated dependencies

**Strategy**:
- Dependency audit and updates
- UBO compatibility testing
- Performance benchmarking with real datasets

## Timeline and Resource Considerations

### Estimated Effort
- **Phase 1 Completion**: 2-3 weeks (mostly JS integration)
- **Phase 2 Migration**: 4-6 weeks (breaking changes, documentation)
- **Phase 3 Variable Channels**: 6-8 weeks (complex shader work)
- **TypeScript Migration**: 4-6 weeks (parallel with other phases)

### Risk Mitigation
- Extensive testing with existing extensions
- Performance benchmarking at each phase
- Clear rollback plans for breaking changes
- Community feedback integration

## Open Questions for Discussion

1. **Backward Compatibility Duration**: How long should dual support be maintained?
2. **Extension Migration Timeline**: Should we provide migration tooling/automation?
3. **Performance vs Flexibility**: Accept some performance cost for variable channels?
4. **WebGPU Priority**: How soon should we start parallel WGSL development?
5. **TypeScript Scope**: Which packages should be prioritized for TS migration?
6. **Release Strategy**: Single major version vs incremental releases?
7. **UBO Architecture**: Should extensions have individual UBOs or share consolidated buffers?
8. **Shader Declaration Migration**: Provide automated tools to convert `fs` strings to UBO format?
9. **Extension API Design**: How complex should the UBO-aware extension base class be?
10. **Build-time Validation**: Should UBO layout validation be enforced at compile time?

## Next Steps

1. **Immediate**: Complete Phase 1 JavaScript integration
2. **Short-term**: Create detailed extension migration guide
3. **Medium-term**: Plan breaking change release timeline
4. **Long-term**: Begin WebGPU/WGSL prototyping

## Conclusion

This roadmap represents a significant evolution of the Viv architecture. While challenging, the benefits of UBOs, variable channel support, and future WebGPU compatibility justify the investment. The key to success will be careful planning, thorough testing, and clear communication with the community throughout the migration process. 

### Avivator State Management Impact

The "only visible channels" optimization would require significant restructuring of Avivator's state management, which currently relies on parallel arrays indexed by channel position:

**Current State Structure**:
```javascript
// All arrays have the same length and are indexed by channel position
const channelState = {
  channelsVisible: [true, false, true, false],    // visibility flags
  contrastLimits: [[0,100], [0,200], [0,150], [0,300]], // contrast for each position
  colors: [[255,0,0], [0,255,0], [0,0,255], [255,255,0]], // colors for each position
  domains: [[0,100], [0,200], [0,150], [0,300]],  // domains for each position  
  selections: [{c:0}, {c:1}, {c:2}, {c:3}],       // selections for each position
  ids: ['id1', 'id2', 'id3', 'id4']               // unique IDs for each position
};
```

**Issues with Current Approach**:
1. **Hidden Channel Persistence**: Invisible channels maintain their configuration (contrast, colors, etc.) for quick toggling
2. **UI Indexing**: All UI components reference channels by their fixed array position
3. **Parallel Array Coupling**: Adding/removing channels affects all arrays simultaneously
4. **State Synchronization**: Toggle operations only modify `channelsVisible` without affecting other arrays

**Required State Architecture Changes**:

**Option A: Dual State Model**
```javascript
// Separate "configured" vs "active" channel states
const channelState = {
  // All configured channels (including hidden ones)
  configuredChannels: [
    { id: 'id1', visible: true, contrastLimits: [0,100], colors: [255,0,0], selection: {c:0} },
    { id: 'id2', visible: false, contrastLimits: [0,200], colors: [0,255,0], selection: {c:1} },
    { id: 'id3', visible: true, contrastLimits: [0,150], colors: [0,0,255], selection: {c:2} },
    { id: 'id4', visible: false, contrastLimits: [0,300], colors: [255,255,0], selection: {c:3} }
  ],
  // Derived state: only visible channels for shader/rendering
  activeChannels: [
    { id: 'id1', contrastLimits: [0,100], colors: [255,0,0], selection: {c:0} },
    { id: 'id3', contrastLimits: [0,150], colors: [0,0,255], selection: {c:2} }
  ]
};
```

**Option B: Channel Registry Model**
```javascript
// Channel registry with visibility filtering
const channelState = {
  channels: {
    'id1': { visible: true, contrastLimits: [0,100], colors: [255,0,0], selection: {c:0} },
    'id2': { visible: false, contrastLimits: [0,200], colors: [0,255,0], selection: {c:1} },
    'id3': { visible: true, contrastLimits: [0,150], colors: [0,0,255], selection: {c:2} },
    'id4': { visible: false, contrastLimits: [0,300], colors: [255,255,0], selection: {c:3} }
  },
  channelOrder: ['id1', 'id2', 'id3', 'id4'], // UI display order
  // Computed selectors
  get visibleChannels() { return Object.values(this.channels).filter(c => c.visible); },
  get visibleChannelData() { /* data for shader generation */ }
};
```

**Migration Challenges**:

1. **UI Component Updates**: All components expecting array indices need to work with channel IDs or derived indices
2. **State Actions**: `toggleIsOn(index)` becomes `toggleChannel(id)` with different update logic  
3. **Derived State Management**: Need efficient recomputation of `activeChannels` when visibility changes
4. **Performance**: State selectors and memoization become more complex
5. **Backward Compatibility**: Existing URL params, saved states, etc. may break

**Implementation Strategy**:
- **Phase 1**: Introduce dual state model while maintaining array-based APIs
- **Phase 2**: Migrate UI components to use channel IDs instead of indices  
- **Phase 3**: Remove legacy array-based state structure
- **Phase 4**: Optimize state selectors and derived state computation

**Estimated Effort**: 3-4 weeks of focused development, plus extensive testing of UI state transitions. 
