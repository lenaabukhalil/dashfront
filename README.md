# ION Dashboard (Front-end)

React + Vite dashboard for EVSE/charging management.

## Setup

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

Runs at **http://localhost:8080**

## Build (production)

```bash
npm run build
```

Output is in the **`dist/`** folder.

## Deploy (EC2)

**After `git pull` on the server:** run `npm install`, then `npm run build`, then `sudo cp -r dist/* /var/www/html/`.

If build fails with `Cannot find module @rollup/rollup-linux-x64-gnu`, run:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

## Environment

Optional: create a **`.env`** file and set `VITE_API_BASE_URL` (and other `VITE_*` vars) if you need to point the app at a different API.
