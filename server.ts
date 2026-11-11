import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { generateHeraldicSvg } from './src/utils/heraldicGenerator.ts';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const TREES_DIR = path.join(DATA_DIR, 'trees');
const TREE_FILE = path.join(DATA_DIR, 'tree.json');

// Ensure data, uploads, and trees directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TREES_DIR)) {
  fs.mkdirSync(TREES_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Auth: stateless HMAC-signed tokens. No default password: admin mode is
// disabled until ADMIN_PASSWORD is set (AI Studio: Secrets panel).
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`rodovid-session:${ADMIN_PASSWORD}`).digest('hex');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest();

function passwordMatches(input: unknown): boolean {
  if (!ADMIN_PASSWORD || typeof input !== 'string') return false;
  return crypto.timingSafeEqual(sha256(input), sha256(ADMIN_PASSWORD));
}

function signToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!ADMIN_PASSWORD || !token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

const requireAdmin: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (verifyToken(token)) return next();
  return res.status(401).json({ success: false, error: 'Потрібна авторизація адміністратора' });
};

// Simple in-memory login throttle: 10 failed attempts per 15 minutes per IP
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;
const loginFails = new Map<string, { count: number; resetAt: number }>();

const ALLOWED_IMAGE_EXT = new Set(['jpg', 'png', 'gif', 'webp']);

// ---------------------------------------------------------------------------
// Images: tree.json must hold URLs, not base64. Any inline data:image/* found in
// the tree is written to data/uploads/<content-hash>.<ext> (idempotent) and
// replaced with its /uploads/ URL. Runs on startup (migration) and on every save.
// ---------------------------------------------------------------------------
const INLINE_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;

function externalizeImages<T>(value: T): { value: T; count: number } {
  let count = 0;
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const m = node.length > 200 ? INLINE_IMAGE_RE.exec(node) : null;
      if (!m) return node;
      const ext = m[1].toLowerCase().replace('jpeg', 'jpg');
      const buffer = Buffer.from(node.slice(m[0].length), 'base64');
      const name = `${crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 20)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, name);
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
      count += 1;
      return `/uploads/${name}`;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v);
      return out;
    }
    return node;
  };
  return { value: walk(value) as T, count };
}

function writeTreeAtomically(data: unknown) {
  const tempFile = `${TREE_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, TREE_FILE);
}

function migrateInlineImages() {
  if (!fs.existsSync(TREE_FILE)) return;
  try {
    const before = fs.statSync(TREE_FILE).size;
    const { value, count } = externalizeImages(JSON.parse(fs.readFileSync(TREE_FILE, 'utf-8')));
    if (count === 0) return;
    // One-time safety copy of the original file before it is rewritten
    const safety = path.join(DATA_DIR, 'tree.pre-externalize.json');
    if (!fs.existsSync(safety)) fs.copyFileSync(TREE_FILE, safety);
    writeTreeAtomically(value);
    const after = fs.statSync(TREE_FILE).size;
    console.log(`[migrate] moved ${count} inline image(s) to /uploads: tree.json ${(before / 1048576).toFixed(1)} MB -> ${(after / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error('[migrate] failed, tree.json left untouched:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  migrateInlineImages();
  if (!ADMIN_PASSWORD) {
    console.warn('[auth] ADMIN_PASSWORD is not set: admin login is disabled. Set it in Secrets / .env.');
  }

  app.use(express.json({ limit: '20mb' }));

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Admin login endpoint
  app.post('/api/login', (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ success: false, error: 'Пароль адміністратора не налаштовано на сервері (ADMIN_PASSWORD)' });
    }
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = loginFails.get(ip);
    if (entry && entry.resetAt > now && entry.count >= LOGIN_MAX_FAILS) {
      return res.status(429).json({ success: false, error: 'Забагато спроб. Спробуйте пізніше.' });
    }

    const { password } = req.body || {};
    if (passwordMatches(password)) {
      loginFails.delete(ip);
      return res.json({ success: true, token: signToken() });
    }

    const fresh = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    fresh.count += 1;
    loginFails.set(ip, fresh);
    return res.status(401).json({ success: false, error: 'Невірний пароль адміністратора' });
  });

  // Health check endpoint for checking connection status
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'online', timestamp: Date.now() });
  });

  // Validates a stored token (used by the client on startup)
  app.get('/api/session', requireAdmin, (_req, res) => res.json({ success: true }));

  // Upload image endpoint (receives base64 data URI)
  app.post('/api/upload', (req, res) => {
    try {
      const { image, filename } = req.body || {};
      if (!image) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      let buffer: Buffer;
      let ext = 'jpg';

      if (image.startsWith('data:image/')) {
        const matches = image.match(/^data:image\/([a-zA-Z+-]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ success: false, error: 'Invalid image data format' });
        }
        ext = matches[1].toLowerCase().replace('jpeg', 'jpg');
        if (!ALLOWED_IMAGE_EXT.has(ext)) {
          return res.status(400).json({ success: false, error: 'Unsupported image type' });
        }
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      const baseName = filename ? String(filename).replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 60) : 'upload';
      const uniqueFilename = `${Date.now()}_${baseName || 'upload'}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);

      fs.writeFileSync(filePath, buffer);
      return res.json({ success: true, url: `/uploads/${uniqueFilename}` });
    } catch (err) {
      console.error('Error saving uploaded file:', err);
      return res.status(500).json({ success: false, error: 'Failed to upload image' });
    }
  });

  // Generate Coat of Arms for a clan (using Gemini Image AI if available, falling back to authentic heraldic SVG)
  app.post('/api/coat-of-arms/generate', async (req, res) => {
    try {
      const { clanName, motto, symbol, style = 'classic', shieldColor = 'azure' } = req.body || {};
      if (!clanName || typeof clanName !== 'string') {
        return res.status(400).json({ success: false, error: 'Вкажіть назву роду (клану)' });
      }

      const cleanClan = clanName.trim().replace(/[^a-zA-Zа-яА-ЯіїєґІЇЄҐ0-9_-]/g, '_').slice(0, 40) || 'clan';

      // 1. If Gemini AI is configured and raster style is requested, try Gemini Image model
      if (ai && style === 'gemini_image') {
        try {
          const symbolDesc = symbol === 'lion' ? 'Галицький Золотий Лев у короні' : symbol === 'falcon' ? 'Шляхетський Сокіл' : symbol === 'wheat' ? 'Золоте колосся пшениці та дубове листя' : symbol === 'cross' ? 'Козацький лапчастий хрест' : 'лицарський гербовий знак';
          const prompt = `A magnificent authentic Ukrainian heraldic family coat of arms (герб роду) for the Ukrainian clan "${clanName}". Elegant heraldic escutcheon shield with gold-trimmed borders, featuring: ${symbolDesc}. Royal coronet on top, ornate heraldic mantling flourishes, bottom scroll ribbon inscribed with "${motto || clanName}". Crisp historical heraldry, high contrast, clean white background, detailed aristocratic emblem.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: '1:1',
              },
            },
          });

          for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
              const buffer = Buffer.from(part.inlineData.data, 'base64');
              const fileName = `coat_of_arms_${Date.now()}_${cleanClan}.${ext}`;
              const filePath = path.join(UPLOADS_DIR, fileName);
              fs.writeFileSync(filePath, buffer);

              return res.json({
                success: true,
                url: `/uploads/${fileName}`,
                description: `Згенеровано Gemini AI для роду ${clanName}`,
              });
            }
          }
        } catch (geminiErr: any) {
          console.warn('[Gemini Coat of Arms] Image model error, falling back to vector heraldic generator:', geminiErr?.message || geminiErr);
        }
      }

      // 2. Vector Heraldic Crest Generator (Reliable, high-res scalable vector heraldry)
      const svgContent = generateHeraldicSvg({
        clanName,
        motto,
        style: style === 'gemini_image' ? 'classic' : style,
        symbol: symbol || 'lion',
        shieldColor: shieldColor || 'azure',
      });

      const fileName = `coat_of_arms_${Date.now()}_${cleanClan}.svg`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, svgContent, 'utf-8');

      return res.json({
        success: true,
        url: `/uploads/${fileName}`,
        description: `Геральдичний герб роду ${clanName}`,
      });
    } catch (err) {
      console.error('Error generating coat of arms:', err);
      return res.status(500).json({ success: false, error: 'Не вдалося створити герб' });
    }
  });

  function getTreeFilePath(treeId: string): string {
    const isMain = !treeId || treeId === 'my-family-tree' || treeId === 'main-tree' || treeId === 'default-tree';
    if (isMain) return TREE_FILE;
    const cleanId = String(treeId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(TREES_DIR, `${cleanId}.json`);
  }

  function writeTreeFileAtomically(filePath: string, data: unknown) {
    const tempFile = `${filePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  }

  // List all available trees / canvases (Main tree + all custom sub-canvases)
  app.get('/api/trees', (_req, res) => {
    try {
      const list: Array<{
        id: string;
        title: string;
        personCount: number;
        updatedAt: string;
        isMain: boolean;
      }> = [];

      // 1. Add Main Tree
      if (fs.existsSync(TREE_FILE)) {
        try {
          const raw = fs.readFileSync(TREE_FILE, 'utf-8');
          const data = JSON.parse(raw);
          list.push({
            id: 'my-family-tree',
            title: data.title || 'Головне родове дерево',
            personCount: Object.keys(data.persons || {}).length,
            updatedAt: data.updatedAt || new Date().toISOString(),
            isMain: true,
          });
        } catch (e) {
          console.warn('Error reading main tree header:', e);
        }
      }

      // 2. Add all custom canvases from TREES_DIR
      if (fs.existsSync(TREES_DIR)) {
        const files = fs.readdirSync(TREES_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const filePath = path.join(TREES_DIR, f);
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);
            const id = data.id || f.replace(/\.json$/, '');
            list.push({
              id,
              title: data.title || 'Родове полотно',
              personCount: Object.keys(data.persons || {}).length,
              updatedAt: data.updatedAt || new Date().toISOString(),
              isMain: false,
            });
          } catch (err) {
            console.warn(`Error reading tree file ${f}:`, err);
          }
        }
      }

      return res.json({ success: true, trees: list });
    } catch (err) {
      console.error('Error listing trees from server storage:', err);
      return res.status(500).json({ success: false, error: 'Failed to list trees' });
    }
  });

  // API Routes for persistent Family Tree storage on server (with atomic write & backup)
  app.get('/api/tree', (req, res) => {
    try {
      if (fs.existsSync(TREE_FILE)) {
        const raw = fs.readFileSync(TREE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      console.error('Error reading tree from server storage:', err);
      return res.status(500).json({ success: false, error: 'Failed to read tree data' });
    }
  });

  app.get('/api/tree/:id', (req, res) => {
    try {
      const treeId = req.params.id;
      const filePath = getTreeFilePath(treeId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data });
      }
      return res.status(404).json({ success: false, error: 'Полотно не знайдено на сервері' });
    } catch (err) {
      console.error(`Error reading tree ${req.params.id}:`, err);
      return res.status(500).json({ success: false, error: 'Failed to read tree data' });
    }
  });

  app.post('/api/tree', (req, res) => {
    try {
      if (!req.body || !req.body.persons || typeof req.body.persons !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid tree data structure' });
      }
      const { value: treeData } = externalizeImages(req.body);

      // Create backup if tree.json exists
      if (fs.existsSync(TREE_FILE)) {
        fs.copyFileSync(TREE_FILE, path.join(DATA_DIR, 'tree.json.bak'));
      }

      // Atomic write via temp file
      writeTreeAtomically(treeData);

      return res.json({ success: true, message: 'Tree saved atomically to server' });
    } catch (err) {
      console.error('Error saving tree to server storage:', err);
      return res.status(500).json({ success: false, error: 'Failed to save tree data' });
    }
  });

  app.post('/api/tree/:id', (req, res) => {
    try {
      const treeId = req.params.id;
      if (!req.body || !req.body.persons || typeof req.body.persons !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid tree data structure' });
      }
      const { value: treeData } = externalizeImages(req.body);
      const filePath = getTreeFilePath(treeId);

      // If main tree, backup
      const isMain = !treeId || treeId === 'my-family-tree' || treeId === 'main-tree' || treeId === 'default-tree';
      if (isMain && fs.existsSync(TREE_FILE)) {
        fs.copyFileSync(TREE_FILE, path.join(DATA_DIR, 'tree.json.bak'));
      }

      writeTreeFileAtomically(filePath, treeData);
      return res.json({ success: true, message: `Tree ${treeId} saved atomically to server` });
    } catch (err) {
      console.error(`Error saving tree ${req.params.id}:`, err);
      return res.status(500).json({ success: false, error: 'Failed to save tree data' });
    }
  });

  app.delete('/api/tree/:id', (req, res) => {
    try {
      const treeId = req.params.id;
      const isMain = !treeId || treeId === 'my-family-tree' || treeId === 'main-tree' || treeId === 'default-tree';
      if (isMain) {
        return res.status(400).json({ success: false, error: 'Головне дерево не можна видалити' });
      }

      const filePath = getTreeFilePath(treeId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.json({ success: true, message: `Tree ${treeId} deleted from server` });
    } catch (err) {
      console.error(`Error deleting tree ${req.params.id}:`, err);
      return res.status(500).json({ success: false, error: 'Failed to delete tree data' });
    }
  });

  if (!isProduction) {
    // Vite development server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
