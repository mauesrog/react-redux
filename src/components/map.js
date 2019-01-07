import React, { Component } from 'react';
import { connect } from 'react-redux';
import d3 from 'd3';

import {
  getGeometry,
  getNonTrivialTiles,
  fetchGeometries,
  clearGeometries,
  cancelGeomRequest,
} from '../actions/geometry-actions';
import { fetchCodes } from '../actions/country-actions';

import Sectors from './sectors';
import Sector from './sector';
import Buttons from './buttons';
import Polygon from './polygon';
import Loader from './loader';

import {
  CENTER,
  CONTROL_PANE_WIDTH,
  COMPLEXITIES,
  DELTA,
  GEOM_IDS,
  MAX_LAT,
  MAX_LNG,
  MAX_ZOOM,
  PHANTOM_ACTIVE,
  PHANTOM_INIT_COMPLEXITY,
  PHANTOM_INIT_POINTER,
  PHANTOM_INIT_ZOOM,
  PHANTOM_SIZE,
  PHANTOM_TOTAL_TILES,
  PHANTOM_ZOOM_DELTA,
  PHANTOM_ZOOM_MAX,
  PHANTOM_ZOOM_MIN,
  SIZE,
  STROKE_INIT_WIDTH,
} from '../config';


const rasterizing = PHANTOM_ACTIVE && window.callPhantom;

const mapStateToProps = ({
  geometries: {
    countryBorders,
    statePolygons,
    stateExteriors,
    stateInteriors,
    municipalityPolygons,
    municipalityInteriors,
    localityPolygons,
    localityInteriors,
    countries: missingCountries,
    nonTrivialTiles,
    empty,
  },
  countries: { codes: countries },
}) => (
  {
    countryBorders,
    statePolygons,
    stateExteriors,
    stateInteriors,
    municipalityPolygons,
    municipalityInteriors,
    localityPolygons,
    localityInteriors,
    missingCountries,
    nonTrivialTiles,
    empty,
    countries,
  }
);

function toArea([minX, maxX, minY, maxY]) {
  return ((maxX - minX) + 1) * ((maxY - minY) + 1);
}

function computeAllTiles(z) {
  const tiles = [];

  for (let i = 0; i < 2 ** (z - 1); i += 1) {
    for (let j = 0; j < 2 ** (z - 1); j += 1) { tiles.push([i, j]); }
  }

  return tiles;
}

function extractCoord([minX, maxX, minY, maxY], j) {
  const w = ((maxX - minX) + 1);

  const dx = j % w;
  const dy = (j - dx) / w;

  return [minX + dx, minY + dy];
}

// example class based component (smart component)
class Map extends Component {
  constructor(props) {
    super(props);

    // init component state here
    this.state = {
      activeCountries: null,
      geomData: {},
      isLoading: true,
      maxLat: null,
      maxLng: null,
      minLat: null,
      minLng: null,
      path: null,
      projection: null,
      sectorsVisible: false,
      strokeWidth: STROKE_INIT_WIDTH,
      x: null,
      y: null,
      zoom: null,
    };

    // Properties
    this.currComplexity = PHANTOM_INIT_COMPLEXITY;
    this.currentPhantomZoom = PHANTOM_INIT_ZOOM;
    this.currID = 0;
    this.emptyDone = true;
    this.height = null;
    this.initScale = null;
    this.initTranslate = null;
    this.newGeoms = false;
    this.phantomStarted = false;
    this.ptr = [...PHANTOM_INIT_POINTER];
    this.coordTracker = {};
    this.lastCoord = null;
    this.sectors = null;
    this.svg = null;
    this.timeout = null;
    this.width = null;
    this.zoom = null;

    // Getters
    this.getGeometries = this.getGeometries.bind(this);
    this.getSVGBbox = this.getSVGBbox.bind(this);
    this.getSectorLims = this.getSectorLims.bind(this);
    this.getTileCoord = this.getTileCoord.bind(this);

    // Updaters
    this.updateMapLimits = this.updateMapLimits.bind(this);
    this.updateMouseCoords = this.updateMouseCoords.bind(this);
    this.updateGeomData = this.updateGeomData.bind(this);

    // Renderers
    this.paintCountryBorders = this.paintCountryBorders.bind(this);
    this.paintStatePolygons = this.paintStatePolygons.bind(this);
    this.paintStateExteriors = this.paintStateExteriors.bind(this);
    this.paintMunicipalityPolygons = this.paintMunicipalityPolygons
    .bind(this);

    // Toggles
    this.toggleSectors = this.toggleSectors.bind(this);
    this.toggleCountry = this.toggleCountry.bind(this);

    // Events
    this.onInit = this.onInit.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onPhantomReady = this.onPhantomReady.bind(this);
    this.onReceivedCountries = this.onReceivedCountries.bind(this);
    this.zoomed = this.zoomed.bind(this);

    // Misc
    this.progZoom = this.progZoom.bind(this);
    this.interpolateZoom = this.interpolateZoom.bind(this);
    this.fetchGeometries = this.fetchGeometries.bind(this);
  }

  componentDidMount() {
    const svg = d3.select('svg');
    const { left, top } = d3.select('g#all').node().getBoundingClientRect();

    this.svg = svg;
    this.left = left;
    this.top = top;

    this.onInit();

    document.addEventListener('keypress', this.onKeyPress);

    this.props.fetchCodes();
  }

  componentWillReceiveProps(props) {
    const { nonTrivialTiles } = props;

    if (nonTrivialTiles !== this.props.nonTrivialTiles) {
      let scale = this.initScale;

      if (PHANTOM_ACTIVE) { scale *= 2 ** (this.currentPhantomZoom - 1); }

      if (this.phantomStarted) {
        if (this.emptyDone) {
          this.zoomed({ scale, nonTrivialTiles });
        } else {
          this.onPhantomReady(true);
        }
      } else {
        const n = PHANTOM_TOTAL_TILES;
        let ptr = parseInt(
          Math.round((n * this.currComplexity) / COMPLEXITIES.length),
          10,
        );

        for (let i = PHANTOM_ZOOM_MIN; i < this.currentPhantomZoom;
             i += PHANTOM_ZOOM_DELTA) {
          ptr += 4 ** (i - 1);
        }

        ptr += (4 ** (this.currentPhantomZoom - 1)) - nonTrivialTiles.length;
        ptr += nonTrivialTiles.slice(0, this.ptr[0])
        .map(toArea)
        .reduce((tot, a) => (a + tot), 0);

        this.setState({ isLoading: false });

        if (window.callPhantom) {
          window.callPhantom({ n, ptr });
        }
      }
    }

    const areaTypes = this.getAreaTypes();
    const polygons = props[`${areaTypes[0]}Polygons`];

    if (polygons !== this.props[`${areaTypes[0]}Polygons`] && this.emptyDone) {
      if (polygons.length > 0) {
        if (props.missingCountries.length !== 0) {
          this.updateMapLimits();
        } else if (PHANTOM_ACTIVE &&
                   this.currentPhantomZoom <= PHANTOM_ZOOM_MAX) {
          this.newGeoms = true;
        }

        this.setState({ isLoading: false });
      } else if (window.callPhantom && props.empty) {
        console.log('EMPTY FUCKING DATA');

        const { coord: [x, y], reduction } = this.getTileCoord();
        const coord = `${x},${y}`;

        window.callPhantom({
          zoom: this.currentPhantomZoom,
          coord,
          reduction,
          complexity: COMPLEXITIES[this.currComplexity],
          complexityIndex: this.currComplexity,
          pointer: this.ptr,
        });

        this.ptr[1] += 1;

        if (this.lastCoord) {
          this.coordTracker[this.lastCoord] = true;
          this.lastCoord = null;
        }
      }
    }
  }

  componentDidUpdate() {
    if (this.newGeoms) {
      this.newGeoms = false;

      console.log('LALA');

      if (window.callPhantom) {
        const { coord: [x, y], reduction } = this.getTileCoord();
        const coord = `${x},${y}`;

        window.callPhantom({
          zoom: this.currentPhantomZoom,
          coord,
          reduction,
          complexity: COMPLEXITIES[this.currComplexity],
          complexityIndex: this.currComplexity,
          pointer: this.ptr,
        });
      }

      this.ptr[1] += 1;

      if (this.lastCoord) {
        this.coordTracker[this.lastCoord] = true;
        this.lastCoord = null;
      }
    }
  }

  onInit() {
    ({
      height: this.height,
      width: this.width,
    } = this.svg.node().getBoundingClientRect());

    if (!rasterizing) { this.width -= CONTROL_PANE_WIDTH; }

    this.initTranslate = [this.width / 2, this.height / 2];
    this.initScale = this.width / (2 * Math.PI);

    let scale = this.initScale;

    if (PHANTOM_ACTIVE) { scale *= PHANTOM_INIT_ZOOM; }

    const projection = d3.geo.mercator()
                             .translate(this.initTranslate)
                             .scale(scale)
                             .center(CENTER);

    const path = d3.geo.path().projection(projection);

    this.zoom = d3.behavior.zoom()
    .scaleExtent([scale, scale * MAX_ZOOM])
    .scale(scale)
    .translate(this.initTranslate);

    const zoom = this.zoom.scale() / this.initScale;

    this.svg.call(this.zoom);

    this.setState({ projection, path, zoom });
  }

  onKeyPress(e) {
    if (e.keyCode && PHANTOM_ACTIVE) {
      const increaseZoom = e.keyCode === 65;

      if (increaseZoom || e.keyCode === 83) {
        this.onPhantomReady(increaseZoom);
      }
    }
  }

  onPhantomReady(increaseZoom) {
    const tile = this.getTileCoord();
    const { activeCountries } = this.state;

    if (!increaseZoom) {
      this.phantomStarted = true;

      console.log('Empty tile ready!');
      if (window.callPhantom) {
        window.callPhantom({
          reduction: 0,
          complexity: COMPLEXITIES[this.currComplexity],
          complexityIndex: this.currComplexity,
          isEmpty: true,
        });
      }

      this.emptyDone = true;
    } else if (!this.emptyDone) {
      this.props.clearGeometries();

      console.log('Empty tile ready!');

      if (window.callPhantom) {
        window.callPhantom({
          reduction: 0,
          complexity: COMPLEXITIES[this.currComplexity],
          complexityIndex: this.currComplexity,
          isEmpty: true,
        });
      } else {
        this.progZoom(this.currentPhantomZoom);
      }

      setTimeout(() => { this.emptyDone = true; }, 10);
    } else if (tile === null) {
      this.ptr = [0, 0];
      this.coordTracker = {};
      this.currentPhantomZoom += PHANTOM_ZOOM_DELTA;

      if (this.currentPhantomZoom <= PHANTOM_ZOOM_MAX ||
          this.currComplexity + 1 < COMPLEXITIES.length) {
        if (this.currentPhantomZoom > PHANTOM_ZOOM_MAX) {
          this.currentPhantomZoom = PHANTOM_ZOOM_MIN;
          this.currComplexity += 1;
          this.emptyDone = false;
        }

        this.setState({ isLoading: true });

        this.props.getNonTrivialTiles(
          this.currentPhantomZoom,
          ['state'],
          activeCountries,
          this.width,
          this.height,
        );
      } else if (window.callPhantom) {
        window.callPhantom(null);
      }
    } else {
      this.progZoom(this.currentPhantomZoom);
    }
  }

  onReceivedCountries(activeCountries) {
    this.setState(() => {
      if (PHANTOM_ACTIVE) {
        this.props.getNonTrivialTiles(
          PHANTOM_INIT_ZOOM,
          ['state'],
          activeCountries,
          this.width,
          this.height,
        );
      }

      return { activeCountries };
    });
  }

  getStatesMinZoom() {
    const complexity = COMPLEXITIES[this.currComplexity];

    switch (complexity) {
      case 0:
        return PHANTOM_ZOOM_MAX + 1;
      default:
        return PHANTOM_ZOOM_MIN;
    }
  }

  getAreaTypes() {
    const complexity = COMPLEXITIES[this.currComplexity];
    const areaTypes = [];

    switch (complexity) {
      case 0:
      case 1:
        areaTypes.push('state');
        break;
      case 2:
        areaTypes.push('state');
        areaTypes.push('municipality');
        break;
      default:
    }

    return areaTypes;
  }

  getGeometries() {
    this.props.getGeometry(GEOM_IDS[this.currID], this.zoom.scale());
  }

  getSVGBbox(projection) {
    const bbox = [
      [0, 0],
      [0, this.height],
      [this.width, 0],
      [this.width, this.height],
    ]
    .map((p) => (projection.invert(p)))
    .map(([lng, lat], i) => {
      let fnLng = Math.max;
      let fnLat = Math.max;
      let lng0 = MAX_LNG;
      let lat0 = MAX_LAT;

      if (i > 1) {
        fnLng = Math.min;
      } else {
        lng0 *= -1;
        lng0 += DELTA;
      }

      if (i % 2 === 0) {
        fnLat = Math.min;
      } else {
        lat0 *= -1;
        lat0 += DELTA;
      }

      return [fnLng(lng, lng0), fnLat(lat, lat0)];
    });

    return bbox;
  }

  getSectorLims(projection) {
    const bboxCodes = this.getSVGBbox(projection)
    .map(([p1, p2]) => ([(p1 + MAX_LNG) / DELTA, (p2 + MAX_LAT) / DELTA]))
    .map((p) => (p.map(Math.floor)));

    const [minLng, maxLat] = bboxCodes[0];
    const [maxLng, minLat] = bboxCodes[3];

    return { minLng, maxLng, minLat, maxLat };
  }

  getTileCoord(nonTrivialTiles = null) {
    const allTiles = nonTrivialTiles === null ?
      this.props.nonTrivialTiles :
      nonTrivialTiles;
    const tiles = allTiles.length ? allTiles : computeAllTiles(this.state.zoom);

    let [i, j] = this.ptr;
    let coord = null;
    let tile = null;

    while (i < tiles.length && coord === null) {
      if (j >= toArea(tiles[i])) {
        this.ptr[0] += 1;
        this.ptr[1] = 0;
        [i, j] = this.ptr;
      } else {
        coord = extractCoord(tiles[i], j);

        const code = `${coord.join(',')}`;

        if (Object.prototype.hasOwnProperty.call(this.coordTracker, code)) {
          coord = null;
          this.ptr[1] += 1;
          j = this.ptr[1];
        } else {
          this.lastCoord = code;
        }
      }
    }

    if (coord) { tile = { coord, reduction: 0 }; }

    console.log(coord);

    // if (coord !== null) {
    //   let reduction = 0;
    //
    //   if (this.ptr === 0) {
    //     reduction = (4 ** (this.currentPhantomZoom - 1)) - tiles.length;
    //   }
    //
    //   tile = Object.assign({}, { reduction, coord });
    // }

    return tile;
  }

  fetchGeometries(sectorLims, zoom) {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.props.cancelGeomRequest();
    }

    this.timeout = setTimeout(() => {
      const areaTypes = this.getAreaTypes();

      if (this.state.activeCountries !== null) {
        this.setState({ isLoading: true });

        this.props.fetchGeometries(
          sectorLims,
          zoom,
          this.state.activeCountries,
          areaTypes,
          COMPLEXITIES[this.currComplexity],
          this.state.path,
        );
      }

      this.timeout = null;
    }, 100);
  }

  paintStatePolygons() {
    const { props: { statePolygons: polygons } } = this;

    if (polygons.length < 1) { return null; }

    return polygons.map((polygon, k) => ((
      <Polygon
        className="fill"
        key={k}
        id={k}
        polygon={polygon}
        projection={this.state.projection}
        path={this.state.path}
        type="state"
        updateGeomData={this.updateGeomData}
      />
    )));
  }

  paintStateExteriors() {
    const { props: { stateExteriors } } = this;

    if (Object.keys(stateExteriors).length === 0) { return null; }

    return Object.keys(stateExteriors).map(id => (
      <Sector
        key={id}
        id={id}
        geometry={stateExteriors[id]}
        projection={this.state.projection}
        path={this.state.path}
      />
    ));
  }

  paintStateInteriors() {
    const {
      props: { stateInteriors },
      state: { zoom },
    } = this;

    if (zoom < this.getStatesMinZoom() ||
        Object.keys(stateInteriors).length === 0) {
      return null;
    }

    return Object.keys(stateInteriors).map(id => (
      <Sector
        key={`interior-${id}`}
        id={`interior-${id}`}
        geometry={stateInteriors[id]}
        projection={this.state.projection}
        path={this.state.path}
      />
    ));
  }

  paintMunicipalityPolygons() {
    const { props: { municipalityPolygons: polygons } } = this;

    if (polygons.length === 0) { return null; }

    return polygons.map((polygon, k) => ((
      <Polygon
        key={k}
        id={k}
        polygon={polygon}
        projection={this.state.projection}
        path={this.state.path}
        type="municipality"
        updateGeomData={this.updateGeomData}
      />
    )));
  }

  paintCountryBorders() {
    const { props: { countryBorders } } = this;

    if (Object.keys(countryBorders).length === 0) { return null; }

    return Object.keys(countryBorders).map(id => (
      <Sector
        key={`border-${id}`}
        id={`border-${id}`}
        geometry={countryBorders[id]}
        projection={this.state.projection}
        path={this.state.path}
      />
    ));
  }

  updateMapLimits() {
    const { zoom, projection } = this.state;
    const sectorLims = this.getSectorLims(projection);

    this.fetchGeometries(sectorLims, zoom);
  }

  interpolateZoom(translate, scale) {
    const self = this;

    const s = this.zoom.scale();
    const t = this.zoom.translate();

    const iTranslate = d3.interpolate(t, translate);
    const iScale = d3.interpolate(s, scale);

    self.zoom.scale(iScale(1)).translate(iTranslate(1));
    self.zoomed({ translate, scale });
  }

  progZoom(z) {
    const scale = this.zoom.scale();
    const translate = this.zoom.translate();

    const zoom = (2 ** (z - 1)) * this.initScale;

    const center = [this.width / 2, this.height / 2];
    const normal = center.map((p, i) => ((p - translate[i]) / scale));
    const offset = normal.map((p, i) => ((p * zoom) + translate[i]));
    const newTrans = translate.map((p, i) => ((p + center[i]) - offset[i]));

    this.interpolateZoom(newTrans, zoom);
  }

  zoomed(z = null) {
    const { scale, nonTrivialTiles = null } = z === null ? d3.event : z;

    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.props.cancelGeomRequest();
    }

    this.setState(({ projection }) => {
      const realZoom = scale / this.initScale;
      const zoom = Math.log2(realZoom) + 1;
      const { coord: [x, y] } = this.getTileCoord(nonTrivialTiles);

      const trans = [
        ((realZoom * this.width) / 2) - (this.width * 3),
        ((realZoom * this.height) / 2) - (this.height * 8),
      ];

      projection.scale(scale);
      projection.translate(trans);

      const translate = [
        ((realZoom * this.width) / 2) - (this.width * x),
        ((realZoom * this.height) / 2) - (this.height * y),
      ];

      projection.scale(scale);
      projection.translate(translate);

      const sectorLims = this.getSectorLims(projection);

      this.fetchGeometries(sectorLims, zoom);

      return Object.assign({ projection, zoom }, sectorLims);
    });
  }

  toggleSectors() {
    const sectorsVisible = !this.state.sectorsVisible;
    this.setState({ sectorsVisible });
  }

  updateMouseCoords(e) {
    const { left, top } = this;
    const dx = e.pageX;
    const dy = e.pageY;
    const coord = this.state.projection.invert([dx - left, dy - top]);
    const [x, y] = coord.map((p, i) => (
      Math.floor((p + (i === 0 ? MAX_LNG : MAX_LAT)) / DELTA)
    ));

    this.setState({ x, y });
  }

  updateGeomData(geomData) {
    this.setState({ geomData });
  }

  toggleCountry(code) {
    const activeCountries = this.state.activeCountries;

    activeCountries[code] = !activeCountries[code];

    if (!activeCountries[code]) {
      this.props.clearGeometries();
    } else {
      this.updateMapLimits();
    }

    this.setState({ activeCountries });
  }

  render() {
    let transform = null;

    if (!rasterizing) {
      const scale = 1.0 / 100;
      const scaleX = (SIZE - 20) * scale;
      const scaleY = SIZE * scale;
      const translateX = (CONTROL_PANE_WIDTH + 20) / scaleX;

      transform = `scale(${scaleX},${scaleY}) translateX(${translateX}px)`;
    }


    return (
      <svg
        strokeWidth={`${this.state.strokeWidth}px`}
        fontSize={`${10 * this.state.strokeWidth}px`}
        id="map"
        width={`${rasterizing ? PHANTOM_SIZE : SIZE + CONTROL_PANE_WIDTH}px`}
        height={`${rasterizing ? PHANTOM_SIZE : SIZE}px`}
        style={{ border: rasterizing ? 'none' : '1px solid black' }}
      >
        <g
          id="all"
          style={{ transform: rasterizing ? 'none' : 'translate(170px, 0px)' }}
          onMouseMove={this.updateMouseCoords}
          onMouseLeave={() => { this.setState({ x: null, y: null }); }}
        >
          {rasterizing ? null :
          <clipPath id="clip">
            <rect />
          </clipPath>
          }
          <g id="outlines">
            <rect
              stroke={rasterizing ? 'none' : 'black'}
              width={`${rasterizing ? PHANTOM_SIZE : SIZE}px`}
              height={`${rasterizing ? PHANTOM_SIZE : SIZE}px`}
            />
          </g>
          <g className="boundaries">
            <g id="exterior">
              {this.paintStateExteriors()}
            </g>
          </g>
          <g className="geom">
            <g id="states">
              {this.paintStatePolygons()}
            </g>
            <g id="municipalities">
              {this.paintMunicipalityPolygons()}
            </g>
          </g>
          <g className="boundaries">
            <g id="states">
              {this.paintStateInteriors()}
            </g>
            <g id="municipalities">
              {this.paintMunicipalityPolygons()}
            </g>
            <g id="country-border">
              {this.paintCountryBorders()}
            </g>
          </g>
          {
            this.state.sectorsVisible ?
              <Sectors
                scale={this.state.projection.scale()}
                translate={this.state.projection.translate()}
                updateMapLimits={this.updateMapLimits}
                path={this.state.path}
                lims={{
                  minLng: this.state.minLng,
                  maxLng: this.state.maxLng,
                  minLat: this.state.minLat,
                  maxLat: this.state.maxLat,
                }}
              /> :
              null
          }
        </g>
        <Buttons
          toggleSectors={this.toggleSectors}
          sectorsVisible={this.state.sectorsVisible}
          zoom={this.state.zoom}
          progZoom={this.progZoom}
          mousePosition={
            this.state.x && this.state.y ?
            [this.state.x, this.state.y] :
            null
          }
          geomData={this.state.geomData}
          countries={this.props.countries}
          activeCountries={this.state.activeCountries}
          toggleCountry={this.toggleCountry}
          initCountries={this.onReceivedCountries}
        />
        <Loader
          render={this.state.isLoading && !rasterizing}
          transform={transform}
        />
      </svg>
    );
  }
}

export default connect(mapStateToProps, {
  getGeometry,
  getNonTrivialTiles,
  fetchGeometries,
  clearGeometries,
  cancelGeomRequest,
  fetchCodes,
})(Map);
