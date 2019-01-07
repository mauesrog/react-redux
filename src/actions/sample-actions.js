/**
 * @fileoverview Sample header.
 */

// External modules.
import * as axios from 'axios';

// Configuration parameters.
import { ROOT_URL } from '../config';

// Constants.
export const /* object.<string, string> */ SampleActionTypes = {
  SAMPLE_ACTION_NAME: 'SAMPLE_ACTION_NAME',
  SAMPLE_ERROR: 'SAMPLE_ERROR',
}; // Sample action types.


/**
 * Sample action.
 * @param {*} param - Sample param.
 * @return {thunkDispatch} A thunked-dispatch callback to notify and update
 * stores as soon as an asynchronous response is received.
 * @export
 */
export const sampleAction = (param) => {
  return (dispatch) => {
    axios.get(`${ROOT_URL}/sampleUrl`)
    .then(response => {
      dispatch({ type: SampleActionTypes.ACTION_NAME, payload: response.data });
    })
    .catch(error => {
      dispatch({ type: SampleActionTypes.SAMPLE_ERROR, error });
    });
  };
};
