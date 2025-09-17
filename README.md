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

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node 20 recommended)
- npm 9+
- Docker (optional, for containerized deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/knostic-csv-app.git
   cd knostic-csv-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - The frontend is configured to proxy API requests to the backend

4. **Try the sample data**
   - Use the sample CSVs in the `samples/` directory to test the application
   - The application is header-based, so filenames don't matter as long as the headers match

## 🏗️ Building for Production

### Using npm

```bash
# Build both client and server
npm run build

# Start production server
npm start

# Server will be available at http://localhost:3001
```

### Using Docker

1. **Build the Docker image**
   ```bash
   docker build -t knostic-csv-app .
   ```

2. **Run the container**
   ```bash
   docker run -p 3001:3001 knostic-csv-app
   ```
   - The application will be available at http://localhost:3001

3. **Using Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3001:3001"
       environment:
         - NODE_ENV=production
         - PORT=3001
   ```
   Run with: `docker-compose up --build`

## 🧪 Testing

### Running Tests

```bash
# Run all tests (client and server)
npm test

# Watch mode (re-run on changes)
npm test -- --watch

# Generate coverage report
npm test -- --coverage

# Run server tests only
npm run test -w server

# Run client tests only
npm run test -w client
```

### Test Structure
- Server tests: `server/tests/`
- Client tests: `client/src/tests/`
- Test utilities: `test/setup.ts`

## 👩‍💻 User Guide

### 1. Uploading Files
1. Click "Upload" in the navigation
2. Select either a strings or classifications CSV file
3. The application will automatically detect the file type based on headers
4. Use the sample files in `samples/` for reference

### 2. Editing Data
- **Edit Cells**: Click any cell to edit its contents
- **Add Rows**: Use the "Add Row" button to insert new entries
- **Delete Rows**: Click the trash icon to remove rows
- **Save Changes**: Click "Save Changes" to persist your edits

### 3. Validating Data
1. Click the "Validate" button to check for errors
2. Invalid entries will be highlighted
3. Hover over error indicators to see validation messages
4. Fix any issues before exporting

### 4. Exporting Data
1. Click "Export" in the navigation
2. Select the data type (strings or classifications)
3. The file will be downloaded automatically
4. The exported file will include all current changes

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
