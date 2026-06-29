const router = require("express").Router();
const { v4: uuid } = require("uuid");
const { DB, audit } = require("../data/db");
const { auth, roles } = require("../middleware/auth");

// POST /api/payments  (processamento de pagamento avulso)
router.post("/", auth, (req, res) => {
  const { orderId, amount, method } = req.body;

  const order = DB.orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });

  const approved = method === "PIX" || method === "CASH" || amount <= 400;
  const payment = {
    id: uuid(),
    orderId,
    amount,
    method,
    status: approved ? "APPROVED" : "REJECTED",
    gatewayTransactionId: `gw-mock-${uuid().slice(0, 8)}`,
    processedAt: new Date().toISOString(),
  };

  DB.payments.push(payment);
  order.paymentStatus = payment.status;
  order.status = approved ? "CONFIRMED" : "CANCELLED";

  audit("PROCESS_PAYMENT", req.user.id, "payments", payment.id, {
    orderId,
    status: payment.status,
  });

  res.json({
    payment,
    order: {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    mock_note: approved ? "Gateway mock: aprovado" : "Gateway mock: rejeitado",
  });
});

// POST /api/payments/:id/callback  (simula retorno do gateway)
router.post("/:id/callback", auth, (req, res) => {
  const payment = DB.payments.find((p) => p.id === req.params.id);
  if (!payment)
    return res.status(404).json({ error: "Pagamento nao encontrado." });

  payment.status = req.body.status === "approved" ? "APPROVED" : "REJECTED";

  const order = DB.orders.find((o) => o.id === payment.orderId);
  if (order) order.paymentStatus = payment.status;

  res.json({ payment, order });
});

// GET /api/payments/order/:orderId
router.get("/order/:orderId", auth, (req, res) => {
  res.json(DB.payments.filter((p) => p.orderId === req.params.orderId));
});

// GET /api/payments  (admin only)
router.get("/", auth, roles("MATRIZ_ADMIN"), (req, res) => {
  res.json(DB.payments);
});

module.exports = router;
