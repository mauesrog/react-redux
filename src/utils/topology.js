function sortLineStringGeometries(
  { properties: { c: c1, l: l1, o: o1, p: p1, i: i1 } },
  { properties: { c: c2, l: l2, o: o2, p: p2, i: i2 } },
) {
  const [[country1], [country2]] = [i1, i2]
  .map(i => (i.split('-')[0]));

  if (country1 > country2) { return 1; }
  if (country1 < country2) { return -1; }

  if (c1 > c2) { return 1; }
  if (c1 < c2) { return -1; }

  if (p1 > p2) { return 1; }
  if (p1 < p2) { return -1; }

  if (l1 > l2) { return 1; }
  if (l1 < l2) { return -1; }

  return o1 - o2;
}

function multiPolygonToPolygonArray(feature) {
  const {
    geometry: { type, coordinates },
    properties: { c, i, n: name, cN: capitalName, a: area },
  } = feature;

  let polygons = null;

  if (type === 'MultiPolygon') {
    polygons = coordinates.reduce((arr, p) => {
      const coords = p.reduce((linearRings, l) => {
        if (l.length > 3) { linearRings.push(l); }

        return linearRings;
      }, []);

      if (coords.length > 0) {
        arr.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: coords,
          },
          properties: { c, i, name, capitalName, area },
        });
      }

      return arr;
    }, []);
  } else {
    const coords = coordinates[0].reduce((linearRings, l) => {
      if (l.length > 3) { linearRings.push(l); }

      return linearRings;
    }, []);

    polygons = [];

    if (coords.length > 0) {
      polygons.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coordinates[0],
        },
        properties: { c, i, name, capitalName, area },
      });
    }
  }

  return polygons;
}

function decomposeFeatures(features) {
  const { rawPolygons, extraLines, countryTracker } = features.reduce((obj, feat) => {
    const { properties: { o, i, c } } = feat;
    const country = i.split('-')[0];
    const update = {};

    update[country] = {};

    if (!Object.prototype.hasOwnProperty.call(
      obj.countryTracker,
      country,
    )) {
      Object.assign(obj.countryTracker, update);
    }

    if (o === -1) {
      obj.extraLines.push(feat);
    } else {
      obj.rawPolygons.push(feat);

      update[country][c] = true;
      Object.assign(obj.countryTracker[country], update[country]);
    }

    return obj;
  }, { rawPolygons: [], extraLines: [], countryTracker: {} });

  const countriesFound = Object.keys(countryTracker);

  const polygons = rawPolygons.sort(sortLineStringGeometries);

  return { extraLines, countriesFound, polygons };
}

function lineStringsToPolygons(lineStrings) {
  let currC = null;
  let currCIndex = -1;
  let currP = null;
  let currPIndex = -1;
  let currL = null;
  let currLIndex = -1;

  return lineStrings.map((g, i, arr) => {
    const { properties: { c, p, l } } = g;

    if (c !== currC) {
      currC = c;
      currCIndex += 1;

      currP = null;
      currPIndex = -1;
    }

    if (p !== currP) {
      currP = p;
      currPIndex += 1;

      currL = null;
      currLIndex = -1;
    }

    if (l !== currL) {
      currL = l;
      currLIndex += 1;
    }

    Object.assign(g.properties, {
      q: currCIndex,
      c,
      p: currPIndex,
      l: currLIndex,
    });

    if (i === arr.length - 1) {
      currC = null;
      currP = null;
      currL = null;
    }

    return g;
  }).reduce((
    arr,
    {
      properties: { c, q, p, l, i: code, n: name, cN, a, complete },
      geometry: { coordinates },
    },
    i,
    all,
  ) => {
    if (!arr[q]) {
      arr.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
        properties: { c, i: code, complete, n: name, a, cN },
      });
    }

    const polygon = arr[q];

    if (currC !== null && currP !== null && currL !== null &&
        (currC !== q || currP !== p)) {
      const lastRing = arr[currC].geometry.coordinates[currP][currL];
      const { length: n } = lastRing;

      if (lastRing[0][0] !== lastRing[n - 1][0] ||
          lastRing[0][1] !== lastRing[n - 1][1]) {
        lastRing.push(lastRing[0]);
      }
    }

    if (p > 0 && polygon.geometry.type === 'Polygon') {
      polygon.geometry.type = 'MultiPolygon';
    }

    if (!polygon.geometry.coordinates[p]) {
      polygon.geometry.coordinates.push([]);
    }

    if (!polygon.geometry.coordinates[p][l]) {
      polygon.geometry.coordinates[p].push([]);
    }

    polygon.geometry.coordinates[p][l].push(...coordinates);

    if (i === all.length - 1) {
      const lastRing = polygon.geometry.coordinates[p][l];
      const { length: n } = lastRing;

      if (lastRing[0][0] !== lastRing[n - 1][0] ||
          lastRing[0][1] !== lastRing[n - 1][1]) {
        lastRing.push(lastRing[0]);
      }
    }

    currC = q;
    currP = p;
    currL = l;

    return arr;
  }, [])
  .reduce((arr, feat) => {
    const polygonGroup = multiPolygonToPolygonArray(feat);
    arr.push(...polygonGroup);

    return arr;
  }, []);
}

function separatePolygons(polygonsRaw) {
  const countryCodeDict = polygonsRaw.reduce((obj, polygon) => {
    const { properties: { c, i, t: total, p } } = polygon;
    const country = i.split('-')[0];
    const update = {};

    update[country] = {};

    if (!Object.prototype.hasOwnProperty.call(obj, country)) {
      Object.assign(obj, update);
    }

    if (Object.prototype.hasOwnProperty.call(obj[country], c)) {
      update[country][c] = obj[country][c];
    } else {
      update[country][c] = {};
      Object.assign(obj[country], update[country]);
    }


    if (Object.prototype.hasOwnProperty.call(obj[country][c], p)) {
      update[country][c][p] = obj[country][c][p];
    } else {
      update[country][c][p] = { count: 0, total };
    }

    update[country][c][p].count += 1;
    Object.assign(obj[country][c], update[country][c]);

    return obj;
  }, {});

  const { polygons: polygonArr, extraLines } = polygonsRaw.reduce((obj, g) => {
    const { properties: { c, p, i: id } } = g;
    const country = id.split('-')[0];
    const { count, total } = countryCodeDict[country][c][p];
    const complete = count === total;

    if (complete) {
      obj.polygons.push(g);
    } else {
      obj.extraLines.push(g);
    }

    return obj;
  }, { polygons: [], extraLines: [] });

  const incompletePolygons = lineStringsToPolygons(extraLines);
  const polygons = lineStringsToPolygons(polygonArr);

  return { polygons, incompletePolygons, extraLines };
}

export const extrapolatePolygons = (features, areaType) => {
  const {
    polygons: polygonsRaw,
    extraLines: eL,
    countriesFound,
  } = decomposeFeatures(features);
  const {
    polygons,
    incompletePolygons,
    extraLines: eL2,
  } = separatePolygons(polygonsRaw);

  const extraLines = [...eL, ...eL2];

  return { polygons, incompletePolygons, countriesFound, extraLines };
};
