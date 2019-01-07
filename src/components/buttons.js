import React, { Component } from 'react';


class Buttons extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectClass: 'disabled',
      countriesToggle: false,
      newZoom: null,
    };

    this.printProps = this.printProps.bind(this);
  }

  componentWillReceiveProps(props) {
    if (props.activeCountries === null && props.countries.length > 0) {
      const activeCountries = {};

      props.countries.forEach(code => {
        activeCountries[code] = true;
      });

      this.props.initCountries(activeCountries);
    }

    this.setState({ newZoom: Math.round(props.zoom * 1000) / 1000 });
  }

  printProps() {
    const data = this.props.geomData;
    const keys = Object.keys(data);

    if (keys.length === 0) { return 'Select geometry'; }

    let i = 0;

    return keys.reduce((arr, key) => {
      const val = data[key];

      if (val !== '-1' && typeof val !== 'undefined') {
        let text = val;

        if (key === 'area') {
          text = `${Math.round((+text / (1000 ** 2)) * 100) / 100} km`;
        }

        arr.push(<tspan key={i} x={20} dy="1.4em">{`${text}`}</tspan>);

        i += 1;
      }

      return arr;
    }, []);
  }

  render() {
    return (
      <g className="buttons" display="none">
        <g id="toggle-sectors" onClick={e => { this.props.toggleSectors(); }}>
          <rect x={10} y={10} />
          <text x={20} y={40} >
            {this.props.sectorsVisible ? 'Hide sectors' : 'Show sectors'}
          </text>
        </g>
        <g id="sector-identifier">
          <rect x={10} y={70} />
          <text x={20} y={100} >
            {
              `${this.props.mousePosition ?
                this.props.mousePosition
                .map((x) => (`${Math.round(x * 100) / 100}`)).join(', ') :
                'None'}`
            }
          </text>
        </g >
        <g id="zoom-action">
          <rect x={10} y={130} />
          <text x={20} y={160} >{this.state.newZoom || ''}</text>
        </g >
        <g
          id="country-selector-toggle"
          onClick={e => {
            if (this.props.countries.length > 0) {
              this.setState({ countriesToggle: !this.state.countriesToggle });
            }
          }}
        >
          <rect x={10} y={190} />
          <text x={20} y={220} >Countries</text>
        </g >
        {this.state.countriesToggle ?
          <g id="country-selector">
            <rect
              className="special"
              x={170}
              y={190}
              height={(this.props.countries.length * 50) + 10}
            />
            {
              this.props.countries.map((el, i) => (
                <g key={i}>
                  <text x={180} y={220 + (i * 50)} key={`text-${i}`} >{
                    el
                  }</text>
                  <text
                    x={220}
                    y={220 + (i * 50)}
                    key={`togg-${i}`}
                    onClick={e => {
                      this.props.toggleCountry(el);
                      this.setState({ countriesToggle: false });
                    }}
                  >{this.props.activeCountries[el] ? 'y' : 'n'}</text>
                </g>
              ))
            }
          </g >
          : null
        }
        <g id="geometry-identifier">
          <rect x={10} y={250} />
          <text x={20} y={280} >
            {this.printProps()}
          </text>
        </g >
      </g >
    );
  }
}

export default Buttons;
