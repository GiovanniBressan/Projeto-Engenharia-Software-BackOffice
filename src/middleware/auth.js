const { DB } = require("../data/db");

// ─── Mock Auth ─────────────────────────────────────────────────────────────────
// Lê o header X-Mock-User-Id e injeta o usuário em req.user.
// Melhoria para o sistema: trocar por verificação de JWT real.

function auth(req, res, next) {
  const userId = req.headers["x-mock-user-id"];

  if (!userId) {
    return res.status(401).json({
      error: "Nao autorizado. Envie o header X-Mock-User-Id.",
      hint: "u-001 = Admin Matriz | u-002 = Gerente Filial | u-003 = Funcionario",
    });
  }

  const user = DB.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Usuario nao encontrado no mock." });
  }

  req.user = user;
  next();
}

// sistema de hierarquia de RBAC (seguindo de referencia a descrição do RedHat)
// Uso: roles('MATRIZ_ADMIN', 'FILIAL_MANAGER')
function roles(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Roles permitidas: ${allowed.join(", ")}. Sua role: ${req.user.role}`,
      });
    }
    next();
  };
}

// ─── Escopo de filial ──────────────────────────────────────────────────────────
// Garante que FILIAL_* so acesse a propria filial e suas demais ações dentro do sistema
function branchScope(req, res, next) {
  const branchId = req.params.branchId || req.body.branchId;
  if (req.user.role === "MATRIZ_ADMIN") return next();
  if (req.user.branchId !== branchId) {
    return res
      .status(403)
      .json({ error: "Voce so pode acessar dados da sua propria filial." });
  }
  next();
}

module.exports = { auth, roles, branchScope };
