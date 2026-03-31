import db from '../db.js';

export function initEstimatorSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_number TEXT,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      gc_name TEXT,
      address TEXT NOT NULL,
      bid_date TEXT,
      due_date TEXT,
      project_type TEXT,
      estimator TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_date TEXT NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}',
      proposal_settings TEXT NOT NULL DEFAULT '{}',
      scopes TEXT NOT NULL DEFAULT '[]',
      rooms TEXT NOT NULL DEFAULT '[]',
      bundles TEXT NOT NULL DEFAULT '[]',
      alternates TEXT NOT NULL DEFAULT '[]',
      lines TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS catalog_items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      family TEXT,
      description TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      uom TEXT NOT NULL DEFAULT 'EA',
      base_material_cost REAL NOT NULL DEFAULT 0,
      base_labor_minutes REAL NOT NULL DEFAULT 0,
      labor_unit_type TEXT,
      taxable INTEGER NOT NULL DEFAULT 0,
      ada_flag INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS modifiers_v1 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      modifier_key TEXT NOT NULL,
      applies_to_categories TEXT NOT NULL DEFAULT '[]',
      add_labor_minutes REAL NOT NULL DEFAULT 0,
      add_material_cost REAL NOT NULL DEFAULT 0,
      percent_labor REAL NOT NULL DEFAULT 0,
      percent_material REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bundles_v1 (
      id TEXT PRIMARY KEY,
      bundle_name TEXT NOT NULL,
      category TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bundle_items_v1 (
      id TEXT PRIMARY KEY,
      bundle_id TEXT NOT NULL REFERENCES bundles_v1(id) ON DELETE CASCADE,
      sku TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS global_bundles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS global_addins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      labor_minutes REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '{}'
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('global', '{}');

    CREATE TABLE IF NOT EXISTS rooms_v1 (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS takeoff_lines_v1 (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      room_id TEXT,
      sku TEXT,
      description TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      uom TEXT NOT NULL DEFAULT 'EA',
      material_cost REAL NOT NULL DEFAULT 0,
      labor_minutes REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS settings_v1 (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '{}'
    );

    INSERT OR IGNORE INTO settings_v1 (key, value) VALUES ('global', '{}');
  `);
}
