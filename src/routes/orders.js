const router = require("express").Router();
const { v4: uuid } = require("uuid");
const { DB, audit } = require("../data/db");
const { auth, roles } = require("../middleware/auth");

// ───  mock gateway ──────────────────────────────────────────────────────
function mockGateway(amount, method) {
  if (method === "PIX" || method === "CASH") return "APPROVED";
  return amount <= 400 ? "APPROVED" : "REJECTED";
}

// ─── mock notificacao ──────────────────────────────────────────────────
function notify(type, recipient, payload) {
  const n = {
    id: uuid(),
    type,
    recipient,
    payload,
    channel: "EMAIL_MOCK",
    sentAt: new Date().toISOString(),
  };
  DB.notifications.push(n);
  console.log(
    `[NOTIF ${type}] -> ${recipient.email || recipient.phone} | ${JSON.stringify(payload)}`,
  );
  return n;
}

// GET /api/orders  (admin apenas — todos os pedidos)
router.get("/", auth, roles("MATRIZ_ADMIN"), (req, res) => {
  res.json(DB.orders);
});

// GET /api/orders/:id
router.get("/:id", auth, (req, res) => {
  const order = DB.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });

  if (
    req.user.role !== "MATRIZ_ADMIN" &&
    req.user.branchId !== order.branchId
  ) {
    return res.status(403).json({ error: "Acesso negado." });
  }
  res.json(order);
});

// GET /api/branches/:branchId/orders  (via branches router — re-exportado aqui para facilitar)
router.get("/branch/:branchId", auth, (req, res) => {
  const { branchId } = req.params;
  if (req.user.role !== "MATRIZ_ADMIN" && req.user.branchId !== branchId) {
    return res.status(403).json({ error: "Acesso negado." });
  }
  res.json(
    DB.orders
      .filter((o) => o.branchId === branchId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
});

// POST /api/orders  (criar pedido + processar pagamento automaticamente)
router.post("/", auth, (req, res) => {
  const {
    branchId,
    clientId,
    clientName,
    clientEmail,
    items,
    isPickup,
    paymentMethod,
  } = req.body;

  const branch = DB.branches.find((b) => b.id === branchId);
  if (!branch) return res.status(404).json({ error: "Filial nao encontrada." });
  if (!branch.isActive)
    return res.status(400).json({ error: "Filial inativa." });

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  if (total > branch.rules.maxOrderValue) {
    return res
      .status(400)
      .json({
        error: `Total R$${total.toFixed(2)} excede o limite da filial de R$${branch.rules.maxOrderValue}.`,
      });
  }
  if (isPickup && !branch.rules.allowPickup) {
    return res
      .status(400)
      .json({ error: "Esta filial nao permite retirada (pickup)." });
  }

  // Cria o pedido
  const order = {
    id: uuid(),
    branchId,
    clientId,
    clientName,
    clientEmail,
    items,
    total,
    isPickup,
    status: "PENDING",
    paymentStatus: "PENDING",
    createdAt: new Date().toISOString(),
  };
  DB.orders.push(order);

  // Processa pagamento via mock gateway
  const gatewayResult = mockGateway(total, paymentMethod);
  const payment = {
    id: uuid(),
    orderId: order.id,
    amount: total,
    method: paymentMethod,
    status: gatewayResult,
    gatewayTransactionId: `gw-mock-${uuid().slice(0, 8)}`,
    processedAt: new Date().toISOString(),
  };
  DB.payments.push(payment);

  // Atualiza status do pedido conforme pagamento
  order.paymentStatus = gatewayResult;
  order.status = gatewayResult === "APPROVED" ? "CONFIRMED" : "CANCELLED";

  if (gatewayResult === "APPROVED") {
    // Notificacao de confirmacao
    notify(
      "ORDER_CONFIRMED",
      { name: clientName, email: clientEmail },
      {
        message: `Pedido #${order.id} confirmado! Total: R$${total.toFixed(2)}`,
        estimatedTime: isPickup ? "20 minutos" : "40 minutos",
      },
    );

    // Atualiza fidelizacao
    const points = Math.floor(total * branch.rules.loyaltyMultiplier);
    let loyalty = DB.loyalty.find(
      (l) => l.clientId === clientId && l.branchId === branchId,
    );
    if (!loyalty) {
      loyalty = {
        id: uuid(),
        clientId,
        clientName,
        branchId,
        points: 0,
        totalSpent: 0,
        history: [],
      };
      DB.loyalty.push(loyalty);
    }
    loyalty.points += points;
    loyalty.totalSpent += total;
    loyalty.history.push({
      date: new Date().toISOString(),
      points,
      description: `Compra #${order.id}`,
    });
  }

  audit("CREATE_ORDER", req.user.id, "orders", order.id, { total, branchId });

  res.status(201).json({
    order,
    payment,
    mock_note:
      gatewayResult === "APPROVED"
        ? "Gateway mock: aprovado"
        : "Gateway mock: rejeitado (cartao acima de R$400)",
  });
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", auth, (req, res) => {
  const order = DB.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });

  if (
    req.user.role !== "MATRIZ_ADMIN" &&
    req.user.branchId !== order.branchId
  ) {
    return res.status(403).json({ error: "Acesso negado." });
  }

  const { status, reason, newEta } = req.body;
  const previous = order.status;
  order.status = status;

  // Dispara notificacao conforme o status
  if (status === "READY" && order.isPickup) {
    notify(
      "PICKUP_READY",
      { name: order.clientName, email: order.clientEmail },
      {
        message: `Pedido #${order.id} pronto para retirada!`,
      },
    );
  } else if (status === "CANCELLED" && reason) {
    notify(
      "DELAY_ALERT",
      { name: order.clientName, email: order.clientEmail },
      {
        message: `Pedido #${order.id} cancelado. Motivo: ${reason}. Nova previsao: ${newEta || "N/A"}`,
      },
    );
  } else {
    notify(
      "STATUS_UPDATE",
      { name: order.clientName, email: order.clientEmail },
      {
        message: `Pedido #${order.id} atualizado para: ${status}`,
      },
    );
  }

  audit("UPDATE_ORDER_STATUS", req.user.id, "orders", order.id, {
    previous,
    status,
  });
  res.json(order);
});

module.exports = router;
