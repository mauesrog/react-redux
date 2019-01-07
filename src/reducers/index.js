import { combineReducers } from 'redux';

import GeometryReducer from './geometry-reducer';
import CountryReducer from './country-reducer';

const appReducer = combineReducers({
  geometries: GeometryReducer,
  countries: CountryReducer,
});

export default appReducer;
