/**
 * @fileoverview Helper functions for `Geometry` actions and reducer
 */

// External modules
import * as topojson from 'topojson';
import d3 from 'd3';

// Configuration parameters
import { MAX_POLAR_AREA } from '../config';


/**
 * Expands an array of minified geometries into an entirely accumulable and
 * displayable TopoJSON geometries (to be used only via the geometry reducer).
 * @param {string[]} areaTypes - The geometry area types in the order they were
 * requested
 * @param {string[]} countries - Helps validate that all desired countries were
 * received
 * @param {Array[]} geometries - The minified geometries (the outer array's
 * length should match the number of area types requested/received)
 * @return {Object.<string, *>} A state update to be consumed by the geometry
 * reducer containing the fully expanded geometries if the data is valid,
 * an error otherwise
 * @export
 */
export const expandGeometries = (areaTypes, countries, geometries) => {
  // geometry reducer init state
  const initState = { countries: {} };

  areaTypes.forEach((areaType) => {
    initState[`${areaType}Polygons`] = [];
    initState[`${areaType}Interiors`] = {};

    if (areaType === 'state') {
      initState.stateExteriors = {};
      initState.countryBorders = {};
    }
  });

  const result = geometries.map((g, i) => ([g, areaTypes[i], countries]))
  .reduce(expandGeometriesHelper, initState);

  const countriesFound = Object.keys(result.countries);
  result.countries = countries.filter((x) => (countriesFound.indexOf(x) < 0));

  return result;
};

/**
 * Expands an array of minified objects into a regular TopoJSON objects with
 * metadata.
 * @param {string[]} areaType - Area type of location containing the minified
 * objects
 * @param {Object.<string, *>[]} objects - Array of minified objects
 * @return {Object.<string, *>} The condensed TopoJSON object if successful, an
 * error otherwise
 */
function expandObjects(areaType, objects) {
  // currently available meta data values
  const metaDataLabels = { a: 'area', cN: 'capitalName', n: 'name' };

  // expand the objects and return the resulting object
  return objects.reduce((dict, [obj, props], i) => {
    const update = {};
    const properties = Object.assign({}, props);

    // update requested meta data with readable labels
    Object.keys(metaDataLabels)
    .forEach(key => {
      if (properties[key]) {
        properties[key] = metaDataLabels[key];
        delete properties[key];
      }
    });

    // record area type
    properties.areaType = areaType;

    // add the object into the reduced TopoJSON object and return the latter
    update[i] = { type: 'Polygon', arcs: obj, properties };
    return Object.assign(dict, update);
  }, {});
}

/**
 * Given a state containing geometries and country codes, adds expanded TopoJSON
 * geometries into the accumulator (reduction routine callback).
 * @param {Object.<string, *>} state - Current state of the accumulator
 * @param {Array[]} geoms - An array containing minified TopoJSON geometries
 * @param {string} areaType - Area type of current location
 * @param {string[]} countries - Codes of all requested countries
 * @param {number} j - Index of current minified geometries
 * @return {Object.<string, *>} The new accumulated state containing TopoJSON
 * geometries if success, an error otherwise
 * @todo Isolate boundaries that separate countries from those that are
 * adjacent to the sea
 */
function expandGeometriesHelper(state, [geoms, areaType, countries], j) {
  // data that will get accumulated into current state
  const newState = {};

  // only do work if there is at least one valid geometry in the set
  if (geoms.length > 0) {
    // destructure minified geometry into TopoJSON components
    const [arcs, bbox, transform, objArr] = geoms;

    // process minified TopoJSON objects and expand them
    const objects = expandObjects(areaType, objArr);

    // convert back into a regular TopoJSON object
    const topologyAll = { arcs, bbox, objects, transform };

    // compute the geometries that correspond to fully-drawn polygons
    const polygons = Object.values(objects).reduce((arr, obj) => {
      const feat = topojson.feature(topologyAll, obj);

      // exclude invalid geometries
      if (d3.geo.area(feat) <= MAX_POLAR_AREA) { arr.push(feat); }

      return arr;
    }, []);

    // group all individual geometries into a TopoJSON GeometryCollection and
    // record countries as they get encountered
    const topology = topojson.topology(countries.map(code => ({
      type: 'GeometryCollection',
      geometries: polygons.reduce((arr, feat) => {
        const { properties, geometry } = feat;

        if (!newState.countries) { newState.countries = {}; }

        newState.countries[code] = true;

        // ignore secondary geometries
        if (properties.i.indexOf(code) > -1) { arr.push(geometry); }

        return arr;
      }, []),
    })));

    // compute the lines that make up countries' inner political divisions
    const interiors = Object.keys(topology.objects).reduce((obj, key) => {
      const lines = topojson
      .mesh(topology, topology.objects[key], (a, b) => (a !== b));
      const newObj = {};

      newObj[key] = lines;

      return Object.assign(obj, newObj);
    }, {});

    // insert geomtries into accumulator
    newState[`${areaType}Polygons`] = polygons;
    newState[`${areaType}Interiors`] = interiors;

    // also compute country boundaries when dealing with states
    if (areaType === 'state') {
      // compute state exterior boundaries
      const exteriors = Object.keys(topology.objects)
      .reduce((obj, key) => {
        const lines = topojson
        .mesh(topology, topology.objects[key], (a, b) => (a === b));
        const newObj = {};

        newObj[key] = lines;

        return Object.assign(obj, newObj);
      }, {});

      newState.stateExteriors = exteriors;

      // TODO: compute country boundaries
      newState.countryBorders = exteriors;
    }
  }

  return Object.assign(state, newState);
}
