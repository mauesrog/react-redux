import * as axios from 'axios';

export const CountryActionTypes = { FETCH_CODES: 'FETCH_CODES' };

export const fetchCodes = () => {
  return (dispatch) => {
    axios.get(`${ROOT_URL}/countries/codes`)
    .then(response => {
      dispatch({
        type: CountryActionTypes.FETCH_CODES,
        payload: response.data,
      });
    })
    .catch(err => {
      // dispatch({
      //   type: GeometryActionTypes.CAR_GET_ERR,
      // });
      console.log(err);
    });
  };
};
