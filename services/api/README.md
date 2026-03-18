# api

API backend da gamer-machine. Fornece autenticação OTP, gerenciamento de sessões com timer em tempo real (WebSocket) e integração com pagamento PIX.

## Stack

- **NestJS 10** — framework
- **Prisma 5** — ORM
- **PostgreSQL 16** — banco de dados
- **Socket.io 4** — WebSocket para atualizações de sessão
- **JWT + Passport** — autenticação
- **AWS SNS** — envio de SMS (OTP)
- **AbacatePay** — geração de QR Code PIX

## Desenvolvimento

```bash
pnpm dev      # Watch mode (ts-node + nodemon)
pnpm build    # Compila para dist/
pnpm start    # Roda a build compilada
pnpm lint     # ESLint
```

## Variáveis de Ambiente

Copie `.env.example` para `.env`:

```env
DATABASE_URL=postgresql://gamer:gamer@localhost:5432/gamer_machine
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d

# SMS (AWS SNS) — se ausente, SMS vira log no console
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# PIX (AbacatePay) — se ausente, retorna QR Code mock
ABACATEPAY_API_KEY=
ABACATEPAY_WEBHOOK_SECRET=

PRICE_PER_MINUTE_CENTS=200
PORT=3001
THROTTLE_TTL=60000
THROTTLE_LIMIT=5
```

## Banco de Dados

```bash
# Criar/aplicar migrations
npx prisma migrate dev --name <descricao>

# Visualizar dados
npx prisma studio

# Regenerar client após alterar schema
npx prisma generate
```

Schema em `prisma/schema.prisma`. Modelos: `User`, `OtpCode`, `Session`, `Payment`.

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | Envio de OTP, verificação, emissão de JWT |
| `UsersModule` | Consulta de perfil e saldo |
| `SessionsModule` | Início/fim de sessão, timer, WebSocket |
| `PaymentsModule` | Criação de cobrança PIX, webhook de confirmação |
| `PrismaModule` | Cliente de banco compartilhado |

## Endpoints

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/send-otp` | Envia OTP via SMS para o telefone |
| POST | `/auth/verify-otp` | Verifica OTP, retorna JWT + dados do usuário |

### Users
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/users/me` | JWT | Perfil e saldo do usuário autenticado |

### Sessions
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/sessions/start` | JWT | Inicia sessão (requer saldo > 0) |
| POST | `/sessions/end/:id` | JWT | Encerra sessão e debita saldo |

### Payments
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/payments/create-pix` | JWT | Gera cobrança PIX |
| POST | `/payments/webhook` | — | Callback AbacatePay (confirma pagamento) |

## WebSocket

**Namespace**: `/sessions`
**Auth**: token JWT em `socket.handshake.auth.token`

| Evento (cliente → server) | Descrição |
|---|---|
| `join` | Entra na sala do usuário para receber eventos |

| Evento (server → cliente) | Payload | Descrição |
|---|---|---|
| `balance_update` | `{ balance_cents, time_remaining_seconds, session_id }` | Emitido a cada 5s |
| `warning` | `{ type: 'WARNING_1MIN' \| 'WARNING_30SEC' \| 'SESSION_ENDED' }` | Avisos de fim de sessão |

## Mocks Automáticos

- **SMS**: sem `AWS_ACCESS_KEY_ID` → OTP é logado no console (`[SMS MOCK]`)
- **PIX**: sem `ABACATEPAY_API_KEY` → retorna QR Code fake (`[PIX MOCK]`)

Não é necessário nenhuma flag ou env especial — basta omitir as credenciais.

## Lógica de Custo

```
custo = Math.ceil(duracaoEmSegundos / 60) * PRICE_PER_MINUTE_CENTS
```

Arredonda para cima para o minuto mais próximo. O timer calcula tempo restante a partir de `session.started_at` (persiste reinicializações do DB), mas os intervalos em memória são perdidos se a API reiniciar.
