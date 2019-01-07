/**
 * @fileoverview Sample React Index.
 */

// External modules.
import React from 'react';
import { Route, IndexRoute } from 'react-router';

// Local modules
import App from './components/app';
import SampleComponent from './components/sample';


export default(
  <Route path="/" component={App}>
    <IndexRoute component={SampleComponent} something="foo" />
  </Route>
);
