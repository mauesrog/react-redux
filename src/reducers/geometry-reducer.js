/* eslint-disable no-case-declarations */
import { GeometryActionTypes } from '../actions/geometry-actions';
import { expandGeometries } from '../common/geometry';
import { PHANTOM_ACTIVE } from '../config';

const BLANK_GEOMETRIES = {
  countryBorders: {},
  statePolygons: [],
  stateExteriors: {},
  stateInteriors: {},
  municipalityPolygons: [],
  municipalityInteriors: {},
  localityPolygons: [],
  localityInteriors: {},
  empty: false,
};

const DEFAULT_STATE = Object.assign({
  countries: [],
  nonTrivialTiles: [],
  error: null,
}, BLANK_GEOMETRIES);

const GeometryReducer = (geometries = DEFAULT_STATE, action) => {
  switch (action.type) {
    case GeometryActionTypes.CLEAR_GEOMETRIES:
      return Object.assign({}, geometries, BLANK_GEOMETRIES);
    case GeometryActionTypes.GET_NON_TRIVIAL_TILES:
      const { payload: nonTrivialTiles } = action;
      return Object.assign(
        {},
        geometries,
        { nonTrivialTiles },
        BLANK_GEOMETRIES,
      );
    case GeometryActionTypes.FETCH_GEOMETRIES:
      const { payload: { areaTypes, data } } = action;


      if (data.length === 0 || data[0].length === 0 ||
          data[0][0].length === 0) {
        return Object.assign({}, geometries, {
          countryBorders: {},
          statePolygons: [],
          stateExteriors: {},
          stateInteriors: {},
          municipalityPolygons: [],
          municipalityInteriors: {},
          localityPolygons: [],
          localityInteriors: {},
          empty: true,
        });
      }

      const [allAreas, countries] = data;
      const update = expandGeometries(areaTypes, countries, allAreas);
      return Object.assign({}, geometries, update, { empty: false });

    case GeometryActionTypes.CANCEL_GEOMETRY_REQUEST:
      console.log('Cancelled request.');
      return geometries;
    case GeometryActionTypes.GEOMETRY_ERROR:
      if (PHANTOM_ACTIVE && window.callPhantom) {
        const { error } = action;
        window.callPhantom({ error: error.message ? error.message : error });
      }

      console.log(action.error);
      return geometries;
    default: return geometries;
  }
};

export default GeometryReducer;
