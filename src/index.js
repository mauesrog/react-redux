/**
 * @fileoverview Sample React Index.
 */

// External modules.
import React from 'react';
import ReactDOM from 'react-dom';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { Router, browserHistory } from 'react-router';

// Local modules.
import './style.scss';
import routes from './routes';
import reducers from './reducers';

// Constants
const /* React.Store */ store = createStore(reducers, {}, compose(
  applyMiddleware(thunk),
  window.devToolsExtension ? window.devToolsExtension() : (f) => (f),
)); // Only store used by the app.


ReactDOM.render(
  <Provider store={store}>
    <Router history={browserHistory} routes={routes} />
  </Provider>
  , document.getElementById('main'));
