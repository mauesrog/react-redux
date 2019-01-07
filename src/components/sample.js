/**
 * @fileoverview Sample Smart React Component.
 */

// External modeules.
import React, { Component } from 'react';
import { connect } from 'react-redux';

// Actions
import { sampleAction } from '../actions/sample-actions';


/**
 * Sample map state to props.
 * @param {*} sampleProp - Sample state prop.
 * @return {object} Props.
 */
const mapStateToProps = ({
  sample: { error, sampleProp },
}) => ({ error, sampleProp });

/**
 * Sample map state to props.
 * @extends {React.Component}
 */
class SampleComponent extends Component {
  /**
  * @param {object} props - Parent props.
  */
  constructor(props) {
    super(props);

    this.state = { isSample: true };
  }

  /**
  * @param {object} props - Parent props plus reducer props.
  */
  componentWillReceiveProps(props) {
    const /* * */ { sampleProp, error = null } = props; // A sample prop.

    if (error) { this.handleError(error); }

    console.log(`This is a sample use of ${sampleProp}.`);
  }

  /**
   * Sample error handler.
   * @param {Error} error - Error.
   */
  handleError(error) {
    console.log(error);
  }

  /**
  * @return {JSX} The components JSX structure.
  */
  render() {
    return (
      <div>
        <h1>Sample header.</h1>
      </div>
    );
  }
}

export default connect(mapStateToProps, { sampleAction })(SampleComponent);
