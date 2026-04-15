# ION EV Charging Dashboard

A React + TypeScript dashboard for managing EV charging infrastructure.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **State:** React Query
- **Charts:** Recharts
- **Deployment:** Docker + Nginx

## Features

- Real-time charger & connector monitoring
- Session reports with filters
- Organizations, Locations, Chargers, Connectors CRUD
- Setup Wizard (Org → Location → Charger → Connector → Tariff)
- Audit Log & Access Log
- RBAC (Role-Based Access Control)
- Notifications system

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Development

npm install --legacy-peer-deps
npm run dev

### Production (Docker)

docker-compose up -d --build

App runs on port **8080**.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_APP_VERSION` | App version (injected at build) |

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

| Version | Notes |
|---|---|
| v0.2.2 | Current release |
| v0.2.1 | — |
| v0.2.0 | Initial release |