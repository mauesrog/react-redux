import { CountryActionTypes } from '../actions/country-actions';


const DEFAULT_STATE = { codes: [] };

const CountryReducer = (countries = DEFAULT_STATE, action) => {
  switch (action.type) {
    case CountryActionTypes.FETCH_CODES:
      return { codes: action.payload.codes };

    default: return countries;
  }
};

export default CountryReducer;
