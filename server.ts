import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("properties.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS plot_status (
    plot_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'available',
    owner_name TEXT,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/plots", (req, res) => {
    const plots = db.prepare("SELECT * FROM plot_status").all();
    res.json(plots);
  });

  app.post("/api/plots/:id", (req, res) => {
    const { id } = req.params;
    const { status, owner_name, notes } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO plot_status (plot_id, status, owner_name, notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plot_id) DO UPDATE SET
        status = excluded.status,
        owner_name = excluded.owner_name,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(id, status, owner_name, notes);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
