/**
 * @fileoverview React Dumb Root Component.
 */

// External modules.
import React from 'react';

/**
 * Stateless React root.
 * @param {React.Component[]} children - Root descendants.
 * @return {JSX} Root JSX code.
 * @export
 */
const App = ({ children }) => ((<div>{children}</div>));

export default App;
