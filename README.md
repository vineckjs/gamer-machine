# gamer-machine

Sistema de gerenciamento de lan house / kiosque gamer com controle de sessão por minuto, autenticação via celular e pagamento PIX.

## Estrutura do Monorepo

```
apps/machine-guard/     — App desktop Electron (React + Vite)
services/api/           — API NestJS (REST + WebSocket)
packages/shared/        — Tipos TypeScript compartilhados
```

Gerenciado com **pnpm workspaces** + **Turbo**.

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker (para o PostgreSQL)

## Setup Inicial

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir banco de dados
docker-compose up -d

# 3. Configurar variáveis de ambiente
cp services/api/.env.example services/api/.env
cp apps/machine-guard/.env.example apps/machine-guard/.env
# Editar os .env conforme necessário

# 4. Rodar migrations
cd services/api && npx prisma migrate dev
```

## Desenvolvimento

```bash
# Rodar tudo junto
pnpm dev

# Ou separadamente:
cd services/api && pnpm dev           # API em :3001
cd apps/machine-guard && pnpm dev     # Electron + Vite em :5173
cd packages/shared && pnpm dev        # Watch de tipos compartilhados
```

## Build

```bash
pnpm build   # Compila todos os pacotes (via Turbo)
pnpm lint    # Lint em todos os pacotes
```

## Stack

| Camada | Tecnologia |
|---|---|
| Desktop | Electron 31, React 18, Vite 5, Tailwind CSS |
| Estado | Zustand |
| API | NestJS 10, Prisma 5, Socket.io 4 |
| Banco | PostgreSQL 16 (Docker) |
| Auth | JWT + OTP via SMS (AWS SNS) |
| Pagamento | PIX via AbacatePay |
| Build | pnpm workspaces, Turbo |

## Documentação por Pacote

- [`apps/machine-guard`](apps/machine-guard/README.md) — App Electron (kiosque)
- [`services/api`](services/api/README.md) — API NestJS
- [`packages/shared`](packages/shared/README.md) — Tipos compartilhados
