import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './components/app';
import Map from './components/map';

export default(
  <Route path="/" component={App}>
    <IndexRoute component={Map} />
  </Route>
);
