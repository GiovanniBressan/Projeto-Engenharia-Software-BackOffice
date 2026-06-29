# Back-Office — Monolito Modular (Piloto)



Sistema de gestão back-office para rede de franquias, desenvolvido como projeto piloto para validação de arquitetura, fluxos operacionais e hierarquia entre matriz e filiais.



---



# Como Rodar



## Pré-requisitos



* Node.js 20 ou superior

* npm



## Instalação



```bash

# 1. Descompacte o projeto



# 2. Entre na pasta do projeto



# 3. Instale as dependências

npm install



# 4. Inicie o servidor

npm run dev

```



O servidor estará disponível em:



```text

http://localhost:3000

```



## Confirmação de que está rodando



Ao iniciar a aplicação, deverá aparecer algo semelhante a:



```text

================================================

Back-Office — Piloto

http://localhost:3000

================================================



Headers de autenticação (X-Mock-User-Id):



u-001 → MATRIZ_ADMIN

u-002 → FILIAL_MANAGER (filial b-001)

u-003 → FILIAL_EMPLOYEE (filial b-001)



================================================

```



---



# Sobre o Sistema



O sistema foi projetado para atender à operação interna de uma rede de franquias, cobrindo desde o gerenciamento de filiais e funcionários até o processamento de pedidos, pagamentos e notificações ao cliente.



O foco deste piloto é validar:



* Hierarquia de acesso entre matriz e filiais;

* Fluxos operacionais principais (pedido → pagamento → notificação → fidelidade);

* Regras de negócio de cada módulo;

* Separação de responsabilidades entre os módulos.



---



# Arquitetura



## Monolito Modular



O sistema adota a arquitetura de **Monolito Modular**, onde toda a aplicação executa em um único processo, mas é organizada internamente em módulos com responsabilidades bem definidas e baixo acoplamento.



## Por que Monolito Modular?



Para um projeto piloto, essa arquitetura oferece vantagens importantes:



* **Simplicidade operacional**

  Um único processo para executar, depurar e testar.



* **Velocidade de desenvolvimento**

  Todos os módulos compartilham o mesmo processo e um banco de dados em memória, eliminando a necessidade de filas, service discovery e comunicação entre serviços.



* **Facilidade de evolução**

  A separação em módulos permite extrair qualquer domínio para um microsserviço futuramente, sem reescrever a lógica de negócio.



* **Adequado ao estágio atual**

  O sistema está em fase de validação de conceito (PoC). Adotar microsserviços neste momento adicionaria complexidade sem benefícios proporcionais.



---



# Módulos do Sistema



| Módulo          | Responsabilidade                                  |

| --------------- | ------------------------------------------------- |

| `auth`          | Login, usuários, perfis e controle de acesso      |

| `branches`      | Gestão de filiais, regras locais e métricas       |

| `employees`     | Cadastro de funcionários e controle de estoque    |

| `orders`        | Pedidos, fluxo de status e programa de fidelidade |

| `payments`      | Integração com gateway de pagamento               |

| `notifications` | Envio de notificações ao cliente                  |



---



# Hierarquia de Acesso



```text

MATRIZ_ADMIN

├── Acesso total a todas as filiais

├── Criar e desativar filiais

├── Criar usuários

└── Visualizar todos os pedidos e pagamentos



FILIAL_MANAGER

├── Acesso restrito à própria filial

├── Gerenciar funcionários e estoque

├── Sobrescrever regras locais (dentro dos limites definidos pela matriz)

└── Visualizar métricas da filial



FILIAL_EMPLOYEE

├── Acesso restrito à própria filial

├── Criar pedidos

├── Atualizar status dos pedidos

└── Consultar estoque

```



---



# Stack



| Tecnologia           | Utilizada                |

| -------------------- | ------------------------ |

| Runtime              | Node.js 20+              |

| Framework            | Express 4                |

| Linguagem            | JavaScript (ES6+)        |

| Banco de Dados       | JSON em memória (mock)   |

| Autenticação         | Header `X-Mock-User-Id`  |

| Gateway de Pagamento | Mock interno             |

| Notificações         | Mock com logs no console |



---



# Usuários Disponíveis



| Header (`X-Mock-User-Id`) | Usuário           | Perfil            | Filial  |

| ------------------------- | ----------------- | ----------------- | ------- |

| `u-001`                   | Admin Matriz      | `MATRIZ_ADMIN`    | Todas   |

| `u-002`                   | Gerente Filial SP | `FILIAL_MANAGER`  | `b-001` |

| `u-003`                   | João Funcionário  | `FILIAL_EMPLOYEE` | `b-001` |



> **Produção:** substituir o header mock por autenticação JWT utilizando `Authorization: Bearer <token>`.



---



# Fluxo Principal para Teste



1. **POST** `/api/auth/login`

   Identifica o usuário e retorna o ID utilizado no header.



2. **POST** `/api/orders`

   Cria um pedido, processa automaticamente o pagamento e envia a notificação de confirmação.



3. **GET** `/api/orders/branch/b-001`

   Lista os pedidos da filial.



4. **PATCH** `/api/orders/:id/status`



```json

{

  "status": "PREPARING"

}

```



Atualiza o pedido para **PREPARING** e envia uma notificação.



5. **PATCH** `/api/orders/:id/status`



```json

{

  "status": "READY"

}

```



Atualiza o pedido para **READY** e envia a notificação de retirada.



6. **GET** `/api/notifications`

   Lista todas as notificações enviadas.



7. **GET** `/api/branches/b-001/metrics`

   Exibe faturamento e indicadores atualizados da filial.



8. **GET** `/api/branches/b-001/clients/:clientId/history`

   Exibe o histórico e os pontos de fidelidade do cliente.



---



# Mock do Gateway de Pagamento



| Método      | Valor           | Resultado  |

| ----------- | --------------- | ---------- |

| PIX         | Qualquer valor  | `APPROVED` |

| CASH        | Qualquer valor  | `APPROVED` |

| CREDIT_CARD | Até R$ 400      | `APPROVED` |

| CREDIT_CARD | Acima de R$ 400 | `REJECTED` |

| DEBIT_CARD  | Até R$ 400      | `APPROVED` |

| DEBIT_CARD  | Acima de R$ 400 | `REJECTED` |



---
