/**
 * @fileoverview Sample Reducer.
 */

// Local modules.
import { SampleActionTypes } from '../actions/sample-actions';

// Constants
const /* object */ DEFAULT_STATE = { error: null, sampleProp: 'sampleProp' };
// Initial store state.


/**
 * Sample reducer.
 * @param {state = DEFAULT_STATE} state - Current store state. Defaults to
 * `DEFAULT_STATE`.
 * @param {object} action - Sample action.
 * @return {object} New store state.
 */
const SampleReducer = (state = DEFAULT_STATE, action) => {
  switch (action.type) {
    case SampleActionTypes.SAMPLE_ACTION_NAME:
      return { sampleProp: 'samplePropChanged' };

    case SampleActionTypes.SAMPLE_ERROR:
      return Object.assign({}, state, { error: action.error });

    default:
      return state;
  }
};

export default SampleReducer;
