const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { DB, audit } = require('../data/db');
const { auth, roles } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = DB.users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ error: 'Email ou senha invalidos.' });

  audit('LOGIN', user.id, 'auth', user.id);

  res.json({
    mock_hint: `Use o header X-Mock-User-Id: ${user.id} nas proximas requisicoes`,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId },
  });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { password, ...safe } = req.user;
  res.json(safe);
});

// PUT /api/auth/me
router.put('/me', auth, (req, res) => {
  const user = DB.users.find(u => u.id === req.user.id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.password) user.password = req.body.password;
  audit('UPDATE_PROFILE', user.id, 'auth', user.id);
  const { password, ...safe } = user;
  res.json(safe);
});

// GET /api/auth/users  (admin only)
router.get('/users', auth, roles('MATRIZ_ADMIN'), (req, res) => {
  res.json(DB.users.map(({ password, ...u }) => u));
});

// POST /api/auth/users  (admin only)
router.post('/users', auth, roles('MATRIZ_ADMIN'), (req, res) => {
  const { name, email, password, role, branchId } = req.body;

  if (DB.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email ja cadastrado.' });
  }

  const newUser = { id: uuid(), name, email, password, role, branchId: branchId || null };
  DB.users.push(newUser);
  audit('CREATE_USER', req.user.id, 'auth', newUser.id);

  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

module.exports = router;
