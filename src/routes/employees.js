const router = require('express').Router();
const { DB, audit } = require('../data/db');
const { auth, roles } = require('../middleware/auth');

// PUT /api/employees/:id
router.put('/:id', auth, roles('MATRIZ_ADMIN', 'FILIAL_MANAGER'), (req, res) => {
  const employee = DB.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: 'Funcionario nao encontrado.' });

  if (req.user.role !== 'MATRIZ_ADMIN' && req.user.branchId !== employee.branchId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  Object.assign(employee, req.body);
  audit('UPDATE_EMPLOYEE', req.user.id, 'employees', employee.id);
  res.json(employee);
});

// DELETE /api/employees/:id  (soft delete)
router.delete('/:id', auth, roles('MATRIZ_ADMIN', 'FILIAL_MANAGER'), (req, res) => {
  const employee = DB.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: 'Funcionario nao encontrado.' });

  if (req.user.role !== 'MATRIZ_ADMIN' && req.user.branchId !== employee.branchId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  employee.isActive = false;
  audit('DEACTIVATE_EMPLOYEE', req.user.id, 'employees', employee.id);
  res.json({ message: 'Funcionario desativado.', employee });
});

module.exports = router;
