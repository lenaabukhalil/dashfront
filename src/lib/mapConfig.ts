const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_KEY as string)?.trim();

export const mapConfig = {
  tileUrl: MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

  attribution: MAPTILER_KEY
    ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',

  smoothZoom: true,

  scrollWheelZoom: true,
} as const;
