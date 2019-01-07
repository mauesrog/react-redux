import React from 'react';
import d3 from 'd3';

import { LABELS_ACTIVE, METADATA } from '../config';

const Polygon = ({
  className,
  path,
  polygon,
  projection,
  updateGeomData,
}) => {
  function drawPaths() {
    return <path d={path(polygon)} className={className} />;
  }

  function generateLabel() {
    if (polygon === null) { return null; }

    const { properties, geometry: { coordinates, type: t } } = polygon;
    const label = properties[Object.keys(METADATA)[0]];
    const bbox = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    let coordArr = coordinates;

    if (t === 'Polygon') { coordArr = [coordinates]; }

    coordArr.forEach((c => {
      c[0].forEach(([lng, lat]) => {
        bbox[0] = Math.min(bbox[0], lng);
        bbox[1] = Math.min(bbox[1], lat);
        bbox[2] = Math.max(bbox[2], lng);
        bbox[3] = Math.max(bbox[3], lat);
      });
    }));

    const [x, y] = projection([
      (bbox[0] + bbox[2]) / 2,
      (bbox[1] + bbox[3]) / 2,
    ]);

    return <text x={x} y={y}>{label}</text>;
  }

  const { properties } = polygon;
  const renderText = LABELS_ACTIVE && Object.keys(METADATA).length > 0;
  const { i: id, areaType, code, name, capitalName, area } = properties;

  return (
    <g
      className="polygon"
      id={`${areaType}-${id}`}
      onMouseEnter={e => {
        updateGeomData({ code, name, capitalName, area });
      }}
      onMouseLeave={e => {
        updateGeomData({});
      }}
    >
      {drawPaths()}
      {renderText ? generateLabel() : null}
    </g>
  );
};

export default Polygon;
