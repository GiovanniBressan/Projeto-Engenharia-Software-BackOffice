const router = require("express").Router();
const { v4: uuid } = require("uuid");
const { DB, audit } = require("../data/db");
const { auth, roles, branchScope } = require("../middleware/auth");

// GET /api/branches
router.get("/", auth, (req, res) => {
  if (req.user.role === "MATRIZ_ADMIN") return res.json(DB.branches);
  res.json(DB.branches.filter((b) => b.id === req.user.branchId));
});

// GET /api/branches/:id
router.get("/:branchId", auth, branchScope, (req, res) => {
  const branch = DB.branches.find((b) => b.id === req.params.branchId);
  if (!branch) return res.status(404).json({ error: "Filial nao encontrada." });
  res.json(branch);
});

// POST /api/branches  (admin only)
router.post("/", auth, roles("MATRIZ_ADMIN"), (req, res) => {
  const { name, city, state, address, phone } = req.body;
  const branch = {
    id: uuid(),
    name,
    city,
    state,
    address,
    phone,
    isActive: true,
    rules: { maxOrderValue: 500, allowPickup: true, loyaltyMultiplier: 1.0 },
  };
  DB.branches.push(branch);
  audit("CREATE_BRANCH", req.user.id, "branches", branch.id);
  res.status(201).json(branch);
});

// PATCH /api/branches/:id/rules
router.patch(
  "/:branchId/rules",
  auth,
  roles("MATRIZ_ADMIN", "FILIAL_MANAGER"),
  branchScope,
  (req, res) => {
    const branch = DB.branches.find((b) => b.id === req.params.branchId);
    if (!branch)
      return res.status(404).json({ error: "Filial nao encontrada." });

    // Gerente nao pode ultrapassar limite de R$1000 (coloquei esse max p/ ver como o sistema se comporta com max)
    if (req.user.role === "FILIAL_MANAGER" && req.body.maxOrderValue > 1000) {
      return res
        .status(403)
        .json({ error: "Gerente nao pode definir limite acima de R$1000." });
    }

    branch.rules = { ...branch.rules, ...req.body };
    audit("UPDATE_RULES", req.user.id, "branches", branch.id);
    res.json(branch);
  },
);

// PATCH /api/branches/:id/toggle-active  (admin only)
router.patch(
  "/:branchId/toggle-active",
  auth,
  roles("MATRIZ_ADMIN"),
  (req, res) => {
    const branch = DB.branches.find((b) => b.id === req.params.branchId);
    if (!branch)
      return res.status(404).json({ error: "Filial nao encontrada." });
    branch.isActive = !branch.isActive;
    audit("TOGGLE_BRANCH", req.user.id, "branches", branch.id);
    res.json(branch);
  },
);

// GET /api/branches/:id/metrics
router.get("/:branchId/metrics", auth, branchScope, (req, res) => {
  const { branchId } = req.params;
  const orders = DB.orders.filter((o) => o.branchId === branchId);
  const revenue = orders
    .filter((o) => o.paymentStatus === "APPROVED")
    .reduce((s, o) => s + o.total, 0);
  const lowStock = DB.stock
    .filter((s) => s.branchId === branchId && s.quantity <= s.minQuantity)
    .map((s) => s.product);

  res.json({
    branchId,
    totalOrders: orders.length,
    revenue: revenue.toFixed(2),
    averageTicket: orders.length
      ? (revenue / orders.length).toFixed(2)
      : "0.00",
    lowStockAlerts: lowStock,
    activeEmployees: DB.employees.filter(
      (e) => e.branchId === branchId && e.isActive,
    ).length,
  });
});

// GET /api/branches/:branchId/employees
router.get(
  "/:branchId/employees",
  auth,
  roles("MATRIZ_ADMIN", "FILIAL_MANAGER"),
  branchScope,
  (req, res) => {
    res.json(DB.employees.filter((e) => e.branchId === req.params.branchId));
  },
);

// POST /api/branches/:branchId/employees
router.post(
  "/:branchId/employees",
  auth,
  roles("MATRIZ_ADMIN", "FILIAL_MANAGER"),
  branchScope,
  (req, res) => {
    const employee = {
      id: uuid(),
      branchId: req.params.branchId,
      isActive: true,
      ...req.body,
    };
    DB.employees.push(employee);
    audit("CREATE_EMPLOYEE", req.user.id, "employees", employee.id);
    res.status(201).json(employee);
  },
);

// GET /api/branches/:branchId/stock
router.get("/:branchId/stock", auth, branchScope, (req, res) => {
  const items = DB.stock.filter((s) => s.branchId === req.params.branchId);
  res.json({
    branchId: req.params.branchId,
    items,
    alerts: items
      .filter((s) => s.quantity <= s.minQuantity)
      .map((s) => ({
        product: s.product,
        current: s.quantity,
        minimum: s.minQuantity,
        status: "ESTOQUE_BAIXO",
      })),
  });
});

// PATCH /api/branches/:branchId/stock
router.patch(
  "/:branchId/stock",
  auth,
  roles("MATRIZ_ADMIN", "FILIAL_MANAGER"),
  branchScope,
  (req, res) => {
    const { product, quantity, minQuantity, unit } = req.body;
    let item = DB.stock.find(
      (s) => s.branchId === req.params.branchId && s.product === product,
    );

    if (item) {
      item.quantity = quantity;
      if (minQuantity !== undefined) item.minQuantity = minQuantity;
    } else {
      item = {
        id: uuid(),
        branchId: req.params.branchId,
        product,
        quantity,
        minQuantity: minQuantity || 5,
        unit: unit || "un",
      };
      DB.stock.push(item);
    }

    audit("UPDATE_STOCK", req.user.id, "stock", item.id);
    res.json(item);
  },
);

// GET /api/branches/:branchId/clients/:clientId/history
router.get(
  "/:branchId/clients/:clientId/history",
  auth,
  branchScope,
  (req, res) => {
    const { branchId, clientId } = req.params;
    res.json({
      loyalty:
        DB.loyalty.find(
          (l) => l.clientId === clientId && l.branchId === branchId,
        ) || null,
      orders: DB.orders.filter(
        (o) => o.clientId === clientId && o.branchId === branchId,
      ),
    });
  },
);

module.exports = router;
