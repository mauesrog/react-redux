import config from '../../../../config';

// Map
export const MAX_LNG = config.MAX_LNG;
export const MAX_LAT = config.MAX_LAT;
export const DELTA = config.DELTA;
export const STROKE_INIT_WIDTH = 0.5;
export const CENTER = [0, 0];
export const LABELS_ACTIVE = false;
export const MAX_POLAR_AREA = config.MAX_POLAR_AREA;
export const MIN_PIXEL_AREA = config.MIN_PIXEL_AREA;

// In-line style
export const CONTROL_PANE_WIDTH = 150;
export const SIZE = 800;
export const PHANTOM_SIZE = 512;

// API
export const METADATA = { name: 1, area: 1 };
export const ROOT_URL = 'http://localhost:9090/api';
export const ROADMAP_COUNTRIES = ['mx', 'co', 'us', 'cr'];

// Misc
export const MAX_CACHE_BYTE_SIZE = 5e7;

// Zoom
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 1000;

// Phantom
export const COMPLEXITIES = [0, 1];
export const PHANTOM_ACTIVE = true;
export const PHANTOM_ZOOM_DELTA = 1;
export const PHANTOM_ZOOM_MIN = 1;
export const PHANTOM_ZOOM_MAX = 9;


const a1 = 4 ** (PHANTOM_ZOOM_MIN - 1);
const r = 4 ** PHANTOM_ZOOM_DELTA;
const n = parseInt(
  Math.floor(
    ((PHANTOM_ZOOM_MAX - PHANTOM_ZOOM_MIN) + 1) / PHANTOM_ZOOM_DELTA,
  ),
  10,
);
const tot = (a1 * (1 - (r ** n))) / (1 - r);

export const PHANTOM_TOTAL_TILES = COMPLEXITIES.length * (tot + 1);


// Phantom session
export const PHANTOM_INIT_POINTER = [0, 0];
export const PHANTOM_INIT_COMPLEXITY = 1;
export const PHANTOM_INIT_ZOOM = 1;
