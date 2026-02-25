# DeadTrees Frontend

React + TypeScript frontend for `deadtrees.earth` and GeoLabel workflows (map visualization, correction editing, and audit UI).

## Repositories

- Frontend: https://github.com/Deadwood-ai/deadtrees-frontend
- Backend: https://github.com/Deadwood-ai/deadtrees-backend
- Upload service: https://github.com/Deadwood-ai/deadtrees-upload
- Live platform: https://deadtrees.earth

## GeoLabel At A Glance

The frontend provides:
- high-performance map rendering with OpenLayers
- polygon editing tools (draw/delete/cut/merge/clip/undo)
- optional AI-assisted boundaries
- auditor review queue with approve/revert workflow

<p align="center">
<img src="https://github.com/Deadwood-ai/deadtrees-backend/blob/main/docs/assets/ui-screenshot.jpg?raw=1" alt="GeoLabel UI overview" width="100%"/>
</p>

<p align="center">
<img src="https://github.com/Deadwood-ai/deadtrees-backend/blob/main/docs/assets/adding-ai.gif?raw=1" alt="AI-assisted editing" width="48%"/>
<img src="https://github.com/Deadwood-ai/deadtrees-backend/blob/main/docs/assets/approve.gif?raw=1" alt="Audit approval workflow" width="48%"/>
</p>

## Tech Stack

- React 18 + TypeScript + Vite
- OpenLayers for map rendering and interaction
- Ant Design for UI components
- TanStack Query for async state
- Supabase client for auth/data access

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install and Run

```bash
npm install
npm run dev
```

By default, Vite serves at `http://localhost:5173`.

### Build and Lint

```bash
npm run lint
npm run build
npm run preview
```

## Environment Variables

Create a `.env.local` file (or equivalent environment setup) and provide the values your deployment mode needs:

```bash
VITE_MODE=development
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# optional integrations
VITE_SAM_API_URL=...
VITE_MAPBOX_ACCESS_TOKEN=...
VITE_GEOPIFY_KEY=...
VITE_SUPABASE_SENTINEL_PROCESSING_URL=...
VITE_SUPABASE_SENTINEL_PROCESSING_ANON_KEY=...
```

## Important Feature Areas

- `src/components/DeadwoodMap/`: GeoLabel editing map and correction tooling
- `src/pages/DatasetAudit.tsx`: auditor review flows
- `src/hooks/`: data fetching and map-related behavior hooks
- `src/config.ts`: runtime configuration and environment-driven setup

## Related Documentation

- Full GeoLabel pilot roadmap: https://github.com/Deadwood-ai/deadtrees-backend/blob/main/docs/projects/geolabel/roadmap-report.md
- Backend architecture and processing docs: https://github.com/Deadwood-ai/deadtrees-backend

## License

MIT (see `LICENSE`).
