export const hasProp = (props, prop) => {
  return props.hasOwnProperty(prop) && props[prop] !== null &&
         typeof props[prop] !== 'undefined';
};
