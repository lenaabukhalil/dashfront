/**
 * Geocode API server. Run: node server/index.js
 * Port: 3001. Vite proxies /api/* to this server in dev.
 */
import express from "express";
import { handleAutocomplete, handleGeocode } from "./geocode-proxy.js";

const app = express();
const PORT = process.env.GEOCODE_SERVER_PORT || 3001;

app.get("/api/autocomplete", handleAutocomplete);
app.get("/api/geocode", handleGeocode);

app.listen(PORT, () => {
  console.log(`Geocode API listening on http://localhost:${PORT}`);
});
