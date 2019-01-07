/**
 * @fileoverview React Root Reducer.
 */

// External modules.
import { combineReducers } from 'redux';

// Reducers.
import SampleReducer from './sample-reducer';

// Constants
const /* object.<string, reducer> */ appReducer = combineReducers({
  sample: SampleReducer,
}); // React root reducer.


export default appReducer;
