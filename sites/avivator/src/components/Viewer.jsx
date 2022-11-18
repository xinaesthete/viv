/* eslint-disable no-nested-ternary */
import shallow from 'zustand/shallow';
import React from 'react';
import debounce from 'lodash/debounce';
import {
  SideBySideViewer,
  PictureInPictureViewer,
  VolumeViewer,
  AdditiveColormapExtension,
  LensExtension
} from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useViewerStore,
  useChannelsStore,
  useLoader,
  useShaderCode
} from '../state';
import { useWindowSize, get3DExtension } from '../utils';
import { DEFAULT_OVERVIEW } from '../constants';

function get3DExtensionOverride(colormap, renderingMode, shaderCode) {
  const ext = get3DExtension(colormap, renderingMode);
  ext.rendering._AFTER_RENDER = shaderCode._AFTER_RENDER;
  // eslint-disable-next-line no-console
  console.log(ext);
  return ext;
}


const Viewer = () => {
  const [useLinkedView, use3d, viewState] = useViewerStore(
    store => [store.useLinkedView, store.use3d, store.viewState],
    shallow
  );
  const [colors, contrastLimits, channelsVisible, selections] =
    useChannelsStore(
      store => [
        store.colors,
        store.contrastLimits,
        store.channelsVisible,
        store.selections
      ],
      shallow
    );
  const loader = useLoader();
  const viewSize = useWindowSize();
  const [
    lensSelection,
    colormap,
    renderingMode,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    lensEnabled,
    zoomLock,
    panLock,
    isOverviewOn,
    onViewportLoad,
    useFixedAxis
  ] = useImageSettingsStore(
    store => [
      store.lensSelection,
      store.colormap,
      store.renderingMode,
      store.xSlice,
      store.ySlice,
      store.zSlice,
      store.resolution,
      store.lensEnabled,
      store.zoomLock,
      store.panLock,
      store.isOverviewOn,
      store.onViewportLoad,
      store.useFixedAxis
    ],
    shallow
  );

  const onViewStateChange = ({ viewState: { zoom } }) => {
    const z = Math.min(Math.max(Math.round(-zoom), 0), loader.length - 1);
    useViewerStore.setState({ pyramidResolution: z });
  };
  const shaderCode = useShaderCode();

  return use3d ? (
    <VolumeViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      channelsVisible={channelsVisible}
      selections={selections}
      colormap={colormap}
      xSlice={xSlice}
      ySlice={ySlice}
      zSlice={zSlice}
      resolution={resolution}
      extensions={[get3DExtensionOverride(colormap, renderingMode, shaderCode)]}
      height={viewSize.height}
      width={viewSize.width}
      onViewportLoad={onViewportLoad}
      useFixedAxis={useFixedAxis}
      viewStates={[viewState]}
      onViewStateChange={debounce(
        ({ viewState: newViewState, viewId }) =>
          useViewerStore.setState({
            viewState: { ...newViewState, id: viewId }
          }),
        250,
        { trailing: true }
      )}
    />
  ) : useLinkedView ? (
    <SideBySideViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      channelsVisible={channelsVisible}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      zoomLock={zoomLock}
      panLock={panLock}
      hoverHooks={{
        handleValue: v => useViewerStore.setState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      lensEnabled={lensEnabled}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
    />
  ) : (
    <PictureInPictureViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      channelsVisible={channelsVisible}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      overview={DEFAULT_OVERVIEW}
      overviewOn={isOverviewOn}
      hoverHooks={{
        handleValue: v => useViewerStore.setState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      lensEnabled={lensEnabled}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
      onViewStateChange={onViewStateChange}
    />
  );
};
export default Viewer;
