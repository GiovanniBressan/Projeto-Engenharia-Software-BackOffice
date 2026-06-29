const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Rotas ─────────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/branches", require("./routes/branches"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/notifications", require("./routes/notifications"));

// ─── Rota de saude ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Rota ${req.method} ${req.path} nao encontrada.` });
});

// ─── Error ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

// ─── TERMINAL VSCODE RETURNO ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("================================================");
  console.log("  Back-Office — Piloto");
  console.log(`  http://localhost:${PORT}`);
  console.log("================================================");
  console.log("  Headers de autenticacao (X-Mock-User-Id):");
  console.log("  u-001  →  MATRIZ_ADMIN");
  console.log("  u-002  →  FILIAL_MANAGER  (filial b-001)");
  console.log("  u-003  →  FILIAL_EMPLOYEE (filial b-001)");
  console.log("================================================");
});
