# Knostic CSV Data Management Web Application

A full-stack Node.js + React (TypeScript) app to upload, view, edit, validate, and export two CSV datasets:

- strings.csv → fields: Tier, Industry, Topic, Subtopic, Prefix, Fuzzing-Idx, Prompt, Risks, Keywords
- classifications.csv → fields: Topic, SubTopic, Industry, Classification

The application is filename-agnostic. Detection is based on headers (case/punctuation-insensitive), not filenames.

## Features

- Upload either CSV at any time (order doesn’t matter)
- Editable tables with add/delete rows and inline cell editing
- Validation on strings: every Topic + Subtopic + Industry must exist in classifications
- Prevent saving invalid strings, highlight invalid rows with clear messages
- Export updated CSVs back to your machine

## Tech Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- CSV parsing: @fast-csv/parse
- Testing: Jest + ts-jest + Supertest (server), Vitest + React Testing Library (client)
- Monorepo: npm workspaces

## Getting Started (Local Dev)

Requirements: Node 18+ (recommended Node 20), npm 9+

```bash
# from repo root
npm install
npm run dev
```

- Server runs on http://localhost:3001
- Client runs on http://localhost:5173 (proxy to /api)

Open http://localhost:5173 and try the flow:

1) Upload classifications.csv (or any file with the right headers)
2) Upload strings.csv
3) Edit in-place, add/delete rows
4) Validate strings
5) Save and Export

You can also use the sample CSVs under `samples/`.

## Build & Run (Production)

```bash
# Build client → copy to server/public → build server
npm run build
# Start server serving the built client
npm start
# Server at http://localhost:3001
```

## Testing

```bash
# Run all workspace tests
npm test

# Server tests only
npm run test -w server

# Client tests only
npm run test -w client
```

## Docker

Build a single-image container that serves the built client via the Node server:

```bash
# Build image
docker build -t knostic-csv-app .
# Run image
docker run -p 3001:3001 knostic-csv-app
# Open http://localhost:3001
```

## API Overview

- POST `/api/upload` (multipart form-data `file`)
  - Detects CSV type by headers, stores in-memory table, returns canonical headers + rows
- GET `/api/data`
  - Returns current canonical headers + rows for both tables
- POST `/api/validate`
  - Validates strings table, returns `{ valid, errors, invalidIndices }`
- POST `/api/save` (JSON: `{ type: 'strings'|'classifications', rows: string[][] }`)
  - Saves rows to in-memory store; rejects with validation payload on invalid strings
- GET `/api/export/:type`
  - Returns a CSV for the given type

## Notes on Header Detection

The app normalizes headers (case-insensitive, trims whitespace and punctuation) and supports aliases. It does not rely on filenames.

- Strings expected canonical headers: `Tier, Industry, Topic, Subtopic, Prefix, Fuzzing-Idx, Prompt, Risks, Keywords`
- Classifications expected: `Topic, Subtopic, Industry, Classification`

## Deployment (Railway example)

One simple approach:

- Create a new Railway project
- Connect GitHub repo
- Set Node version to 20
- Build Command: `npm run build`
- Start Command: `npm start`
- Expose port 3001

Railway will build the client, copy assets into `server/public`, build the server, and start the Node process.

## Folder Structure

```
root/
  client/              # React app (Vite + TypeScript)
  server/              # Node.js + Express (TypeScript)
  samples/             # Sample CSVs for quick testing
  Dockerfile           # Single image build (client+server)
  README.md
  package.json         # npm workspaces + scripts
```

## Limitations

- Storage is in-memory; restarting the server resets data
- CSV dialect: RFC4180-ish; headers/values are trimmed and quoted values handled by parser

## License

MIT
