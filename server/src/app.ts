import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createStream } from 'rotating-file-stream';
import { isProduction } from './utils/env';

const logStream = isProduction 
  ? createStream('app.log', {
      interval: '1d',
      path: path.join(__dirname, '../../logs')
    })
  : process.stdout;
import {
  parseCsvBuffer,
  detectCsvKind,
  toCanonicalRows,
  canonicalHeadersFor,
  fromCanonicalRows,
  rowsToCsv,
  CsvKind,
} from './utils/csvUtils';
import { validateStrings } from './utils/validation';
import store from './store';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(morgan(isProduction ? 'combined' : 'dev', {
    stream: logStream,
    skip: (req: Request) => req.path === '/api/health'
  }));

  app.use('/api', apiLimiter);
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      const { headers: rawHeaders, rows: rawRows } = await parseCsvBuffer(req.file.buffer);
      
      const requestedType = req.body.type as CsvKind | 'auto' | undefined;
      let kind: CsvKind;
      
      if (requestedType && requestedType !== 'auto') {
        kind = requestedType;
      } else {
        const detectedKind = detectCsvKind(rawHeaders);
        if (detectedKind === 'unknown') {
          return res.status(400).json({
            error: 'Could not detect CSV type from headers. Please specify the type manually.',
            receivedHeaders: rawHeaders,
            expected: {
              strings: ['Tier', 'Industry', 'Topic', 'Subtopic', 'Prefix', 'Fuzzing-Idx', 'Prompt', 'Risks', 'Keywords'],
              classifications: ['Topic', 'Subtopic', 'Industry', 'Classification']
            }
          });
        }
        kind = detectedKind;
      }
      if (kind === 'unknown') {
        return res.status(400).json({
          error: 'Could not detect CSV type from headers. Expected strings or classifications schema.',
          receivedHeaders: rawHeaders,
          expected: {
            strings: canonicalHeadersFor('strings'),
            classifications: canonicalHeadersFor('classifications'),
          },
        });
      }
      const canonicalRows = toCanonicalRows(kind, rawHeaders, rawRows);
      const canonicalHeaders = canonicalHeadersFor(kind);
      store.set(kind, canonicalRows);
      res.json({ type: kind, headers: canonicalHeaders, rows: canonicalRows });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to parse CSV' });
    }
  });

  app.get('/api/data', (_req: Request, res: Response) => {
    res.json({
      strings: { headers: canonicalHeadersFor('strings'), rows: store.get('strings') },
      classifications: { headers: canonicalHeadersFor('classifications'), rows: store.get('classifications') },
    });
  });

  app.post('/api/validate', (req: Request, res: Response) => {
    const { rows } = (req.body || {}) as { rows?: any[] };
    const stringsRows = rows && Array.isArray(rows) ? rows : store.get('strings');
    const normalizedStrings = fromCanonicalRows('strings', stringsRows);
    const normalizedClassifications = fromCanonicalRows('classifications', store.get('classifications'));
    const result = validateStrings(normalizedStrings, normalizedClassifications);
    res.json(result);
  });

  app.post('/api/save', (req: Request, res: Response) => {
    const { type, rows } = (req.body || {}) as { type: CsvKind; rows: any[] };
    if (type !== 'strings' && type !== 'classifications') {
      return res.status(400).json({ error: 'Invalid type' });
    }
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Rows must be an array' });
    }
    if (type === 'strings') {
      const normalizedStrings = fromCanonicalRows('strings', rows);
      const normalizedClassifications = fromCanonicalRows('classifications', store.get('classifications'));
      const result = validateStrings(normalizedStrings, normalizedClassifications);
      if (!result.valid) {
        return res.status(400).json(result);
      }
    }
    store.set(type, rows);
    res.json({ ok: true });
  });

  app.get('/api/export/:type', (req: Request, res: Response) => {
    const type = req.params.type as CsvKind;
    if (type !== 'strings' && type !== 'classifications') {
      return res.status(400).json({ error: 'Invalid type' });
    }
    const headers = canonicalHeadersFor(type);
    const rows = store.get(type);
    const csv = rowsToCsv(type, headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
    res.send(csv);
  });
  const publicDir = path.join(__dirname, '..', 'public');
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    app.use(express.static(publicDir));
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
      res.status(statusCode).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        stack: isProduction ? undefined : err.stack,
      });
      
      if (!isProduction) {
        console.error(err);
      }
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection at:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });    
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(indexPath, (err: any) => {
        if (err) next(err);
      });
    });
  }
  return app;
}
