const { v4: uuid } = require('uuid');

const DB = {
  users: [
    { id: 'u-001', name: 'Admin Matriz',      email: 'admin@matriz.com',      password: 'admin',   role: 'MATRIZ_ADMIN',    branchId: null    },
    { id: 'u-002', name: 'Gerente Filial SP', email: 'gerente@filial-sp.com', password: 'gerente', role: 'FILIAL_MANAGER',  branchId: 'b-001' },
    { id: 'u-003', name: 'Joao Funcionario',  email: 'joao@filial-sp.com',    password: 'joao',    role: 'FILIAL_EMPLOYEE', branchId: 'b-001' },
  ],

  branches: [
    {
      id: 'b-001', name: 'Filial Sao Paulo - Centro',
      city: 'Sao Paulo', state: 'SP', address: 'Rua das Flores, 123', phone: '(11) 99999-0001',
      isActive: true,
      rules: { maxOrderValue: 500, allowPickup: true, loyaltyMultiplier: 1.2 },
    },
    {
      id: 'b-002', name: 'Filial Curitiba - Batel',
      city: 'Curitiba', state: 'PR', address: 'Av. do Batel, 456', phone: '(41) 99999-0002',
      isActive: true,
      rules: { maxOrderValue: 300, allowPickup: true, loyaltyMultiplier: 1.0 },
    },
  ],

  employees: [
    { id: 'e-001', branchId: 'b-001', name: 'Joao Funcionario', role: 'Atendente', salary: 2500, hiredAt: '2024-01-15', isActive: true },
  ],

  stock: [
    { id: 's-001', branchId: 'b-001', product: 'Hamburguer Classico', quantity: 50,  minQuantity: 10, unit: 'un' },
    { id: 's-002', branchId: 'b-001', product: 'Refrigerante Lata',   quantity: 120, minQuantity: 20, unit: 'un' },
    { id: 's-003', branchId: 'b-001', product: 'Batata Frita P',      quantity: 80,  minQuantity: 15, unit: 'un' },
    { id: 's-004', branchId: 'b-002', product: 'Hamburguer Classico', quantity: 30,  minQuantity: 10, unit: 'un' },
  ],

  orders: [
    {
      id: 'o-001', branchId: 'b-001', clientId: 'client-001',
      clientName: 'Maria Silva', clientEmail: 'maria@email.com',
      items: [
        { product: 'Hamburguer Classico', quantity: 2, unitPrice: 25.90 },
        { product: 'Refrigerante Lata',   quantity: 2, unitPrice: 7.50  },
      ],
      total: 66.80, status: 'CONFIRMED', isPickup: true,
      paymentStatus: 'APPROVED', createdAt: new Date().toISOString(),
    },
  ],

  payments: [
    {
      id: 'p-001', orderId: 'o-001', amount: 66.80, method: 'PIX',
      status: 'APPROVED', gatewayTransactionId: 'gw-mock-001',
      processedAt: new Date().toISOString(),
    },
  ],

  notifications: [],

  loyalty: [
    {
      id: 'ly-001', clientId: 'client-001', clientName: 'Maria Silva', branchId: 'b-001',
      points: 134, totalSpent: 268.0,
      history: [{ date: new Date().toISOString(), points: 134, description: 'Compra #o-001' }],
    },
  ],

  auditLog: [],
};

function audit(action, userId, entity, entityId, details = {}) {
  DB.auditLog.push({
    id: uuid(), action, userId, entity, entityId, details,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { DB, audit };
