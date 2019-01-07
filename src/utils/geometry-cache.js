import { MAX_CACHE_BYTE_SIZE } from '../config';

function areaTypesToKey(areas) {
  return areas.sort()
  .map(a => {
    if (a === 'state') { return 0; }

    return 1;
  })
  .join(',');
}

function geometryToKey(minLng, minLat, maxLng, maxLat, areas, zoom, countries) {
  const types = areaTypesToKey(areas);

  let key = `${minLng},${minLat},${maxLng},${maxLat},${types},${zoom},`;
  key += countries.sort().join(',');

  return key;
}

function nonTrivialTilesToKey(width, height, zoom, countries) {
  let key = `${width},${height},${zoom},`;
  key += countries.sort().join(',');

  return key;
}

class GeometryCache {
  constructor() {
    this.size = 0;
    this.cache = {};
    this.keys = [];
  }

  add(key, value) {
    const { cache, keys } = this;
    const { length: n } = value;

    if (n > MAX_CACHE_BYTE_SIZE) { return; }

    while (this.size + n > MAX_CACHE_BYTE_SIZE) {
      delete cache[keys.shift()];
      this.size = JSON.stringify(cache).length;
    }

    cache[key] = value;

    keys.push(key);

    this.size = JSON.stringify(cache).length;
  }

  addGeometry(geometry, ...args) {
    const key = geometryToKey(...args);
    this.add(key, JSON.stringify(geometry));
  }

  addNonTrivialTiles(tiles, ...args) {
    const key = nonTrivialTilesToKey(...args);
    this.add(key, JSON.stringify(tiles));
  }

  get(key) {
    let value = this.cache[key];

    if (value) {
      value = JSON.parse(value);
    } else {
      value = null;
    }

    return value;
  }

  getGeometry(...args) {
    const key = geometryToKey(...args);

    return this.get(key);
  }

  getNonTrivialTiles(...args) {
    const key = nonTrivialTilesToKey(...args);

    return this.get(key);
  }
}

export default GeometryCache;
