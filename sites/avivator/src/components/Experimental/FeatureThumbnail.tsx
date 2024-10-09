// import type { Feature, Position } from "@deck.gl-community/editable-layers";
import type { Feature, Geometry, Position } from "@turf/helpers";
import React, { useMemo } from "react";


export default function FeatureThumbnail({feature}: {feature: Feature}) {
  const coords = useMemo(() => {
    //these casts are unsafe in a general sense, but should be ok in our editor.
    const geometry = feature.geometry as Geometry;
    const raw = geometry.coordinates as Position[][];
    return raw[0];
  }, [feature]);
  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const c of coords) {
      minX = Math.min(c[0], minX);
      minY = Math.min(c[1], minY);
      maxX = Math.max(c[0], maxX);
      maxY = Math.max(c[1], maxY);
    }
    return { minX, minY, maxX, maxY };
  }, [coords]);
  if (!Number.isFinite(minX)) return null;
  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      width="20"
      height="20"
      >
      <title>Feature Thumbnail</title>
      <polygon points={coords.map(c => c.join(",")).join(" ")} fill="white" stroke="blue"  />
    </svg>
  )
}
