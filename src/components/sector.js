import React from 'react';

const Sector = ({ path: p, geometry, id }) => {
  function drawPaths() {
    return <path key={0} d={p(geometry)} />;
  }

  return (
    <g id={`sector-${id}`}>
      {drawPaths()}
    </g>
  );
};

export default Sector;
