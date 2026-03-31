import { Router, Request, Response } from 'express';
import db from '../../db.js';

export const v1Router = Router();

// Health
v1Router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: 'v1' });
});

// Projects
v1Router.get('/projects', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_date DESC').all();
  res.json(rows);
});

v1Router.get('/projects/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  return res.json(row);
});

// Rooms
v1Router.get('/rooms', (req: Request, res: Response) => {
  const { projectId } = req.query;
  const rows = projectId
    ? db.prepare('SELECT * FROM rooms_v1 WHERE project_id = ? ORDER BY sort_order, id').all(String(projectId))
    : db.prepare('SELECT * FROM rooms_v1 ORDER BY sort_order, id').all();
  res.json(rows);
});

v1Router.post('/rooms', (req: Request, res: Response) => {
  const { id, projectId, name, sortOrder } = req.body as {
    id: string;
    projectId: string;
    name: string;
    sortOrder?: number;
  };
  db.prepare('INSERT INTO rooms_v1 (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)')
    .run(id, projectId, name, sortOrder ?? 0);
  res.status(201).json({ id, projectId, name, sortOrder: sortOrder ?? 0 });
});

// Takeoff lines
v1Router.get('/takeoff/lines', (req: Request, res: Response) => {
  const { projectId, roomId } = req.query;
  let rows: unknown[];
  if (projectId && roomId) {
    rows = db.prepare('SELECT * FROM takeoff_lines_v1 WHERE project_id = ? AND room_id = ? ORDER BY sort_order, id').all(String(projectId), String(roomId));
  } else if (projectId) {
    rows = db.prepare('SELECT * FROM takeoff_lines_v1 WHERE project_id = ? ORDER BY sort_order, id').all(String(projectId));
  } else {
    rows = db.prepare('SELECT * FROM takeoff_lines_v1 ORDER BY sort_order, id').all();
  }
  res.json(rows);
});

v1Router.post('/takeoff/lines', (req: Request, res: Response) => {
  const line = req.body as {
    id: string;
    projectId: string;
    roomId?: string | null;
    sku?: string | null;
    description?: string | null;
    quantity: number;
    uom?: string;
    materialCost?: number;
    laborMinutes?: number;
    sortOrder?: number;
    notes?: string | null;
  };
  db.prepare(`
    INSERT INTO takeoff_lines_v1 (id, project_id, room_id, sku, description, quantity, uom, material_cost, labor_minutes, sort_order, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    line.id, line.projectId, line.roomId ?? null, line.sku ?? null,
    line.description ?? null, line.quantity, line.uom ?? 'EA',
    line.materialCost ?? 0, line.laborMinutes ?? 0, line.sortOrder ?? 0, line.notes ?? null,
  );
  res.status(201).json(line);
});

// Takeoff summary
v1Router.get('/takeoff/summary/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const lines = db.prepare('SELECT * FROM takeoff_lines_v1 WHERE project_id = ?').all(projectId) as Array<{
    material_cost: number;
    labor_minutes: number;
    quantity: number;
  }>;
  const materialTotal = lines.reduce((sum, l) => sum + (l.material_cost * l.quantity), 0);
  const laborTotal = lines.reduce((sum, l) => sum + (l.labor_minutes * l.quantity), 0);
  res.json({ projectId, materialTotal, laborTotal, lineCount: lines.length });
});

// Settings
v1Router.get('/settings', (_req: Request, res: Response) => {
  const row = db.prepare("SELECT value FROM settings_v1 WHERE key = 'global'").get() as { value: string } | undefined;
  res.json(row ? JSON.parse(row.value) : {});
});

v1Router.put('/settings', (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Settings must be a JSON object.' });
  }
  db.prepare("UPDATE settings_v1 SET value = ? WHERE key = 'global'").run(JSON.stringify(req.body));
  return res.json(req.body);
});
