const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { DB } = require('../data/db');
const { auth, roles } = require('../middleware/auth');

// GET /api/notifications  (admin only)
router.get('/', auth, roles('MATRIZ_ADMIN'), (req, res) => {
  res.json(DB.notifications);
});

// POST /api/notifications/delay-alert
router.post('/delay-alert', auth, roles('MATRIZ_ADMIN', 'FILIAL_MANAGER'), (req, res) => {
  const { clientName, clientEmail, orderId, reason, newEta } = req.body;
  const n = {
    id: uuid(), type: 'DELAY_ALERT',
    recipient: { name: clientName, email: clientEmail },
    payload: { message: `Pedido #${orderId} com atraso. Motivo: ${reason}. Nova previsao: ${newEta}` },
    channel: 'EMAIL_MOCK', sentAt: new Date().toISOString(),
  };
  DB.notifications.push(n);
  console.log(`[NOTIF DELAY_ALERT] -> ${clientEmail}`);
  res.status(201).json(n);
});

module.exports = router;
