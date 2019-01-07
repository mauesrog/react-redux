import React, { Component } from 'react';
import d3 from 'd3';

import { MAX_LNG, MAX_LAT, DELTA, CENTER } from '../config';


class Sectors extends Component {
  constructor(props) {
    super(props);

    const sectorData = [];

    for (let lng = -MAX_LNG; lng <= MAX_LNG; lng += DELTA) {
      sectorData.push([[lng, -MAX_LAT + DELTA], [lng, MAX_LAT]]);
    }

    for (let lat = -MAX_LAT + DELTA; lat <= MAX_LAT; lat += DELTA) {
      sectorData.push([[-MAX_LNG, lat], [MAX_LNG, lat]]);
    }

    // init component state here
    this.state = { sectorData };

    this.determineSectors = this.determineSectors.bind(this);

    this.determineSectors(this.props.scale, this.props.translate);
  }

  componentWillReceiveProps(props) {
    const { scale, translate } = props;
    const [x1, y1] = translate;
    const [x2, y2] = this.projection.translate();

    if (scale !== this.projection.scale() || x1 !== x2 || y1 !== y2) {
      this.determineSectors(scale, translate);
    }
  }

  determineSectors(scale, translate) {
    this.projection = d3.geo.mercator()
    .translate(translate)
    .scale(scale)
    .center(CENTER);

    this.sectors = this.state.sectorData.map((points, key) => {
      const sectorCodes = points.map((pointPair) => (pointPair.map(
        (p, i) => (Math.floor((p + (i === 0 ? MAX_LNG : MAX_LAT)) / DELTA)),
      )));

      let sectorCode = null;

      const [p1, p2] = points.map(p => (this.projection(p)));

      if (sectorCodes[0][1] === sectorCodes[1][1]) {
        const lat = sectorCodes[0][1];
        sectorCode = `lat-${lat}`;
      } else {
        const lng = sectorCodes[0][0];
        sectorCode = `lng-${lng}`;
      }

      const line = (
        <g className="sector-line" id={sectorCode} key={key}>
          <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} />
        </g>
      );

      return line;
    });
  }

  render() {
    return (
      <g className="sectors">{this.sectors}</g >
    );
  }
}

export default Sectors;
