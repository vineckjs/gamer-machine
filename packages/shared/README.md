# @gamer-machine/shared

Biblioteca de tipos TypeScript compartilhados entre `apps/machine-guard` e `services/api`. Não possui dependências de runtime — apenas definições de tipos e interfaces.

## Uso

```ts
import { UserDto, SessionDto, BalanceUpdatePayload } from '@gamer-machine/shared';
```

O pacote é referenciado como workspace dependency nos outros pacotes:

```json
"dependencies": {
  "@gamer-machine/shared": "workspace:*"
}
```

## Desenvolvimento

```bash
pnpm dev      # Watch mode (tsc --watch)
pnpm build    # Compila para dist/
```

## Tipos Exportados

### Auth
- `SendOtpDto` — payload para `/auth/send-otp`
- `VerifyOtpDto` — payload para `/auth/verify-otp`
- `VerifyOtpResponseDto` — resposta com JWT + dados do usuário

### User
- `UserDto` — `{ id, phone, balance_cents }`

### Session
- `SessionDto` — dados de uma sessão
- `StartSessionResponseDto` — resposta de início de sessão
- `EndSessionResponseDto` — resposta de encerramento (com custo e duração)

### Payment
- `PaymentDto` — dados de um pagamento
- `CreatePixDto` — payload para `/payments/create-pix`
- `CreatePixResponseDto` — resposta com QR Code
- `PaymentStatus` — `'pending' | 'paid' | 'expired'`

### WebSocket
- `BalanceUpdatePayload` — `{ balance_cents, time_remaining_seconds, session_id }`
- `WarningPayload` — `{ type: WarningType }`
- `WarningType` — `'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED'`

## Convenção

Nunca duplique definições de tipo entre `machine-guard` e `api`. Se um tipo precisa ser compartilhado, ele vai aqui. Se é exclusivamente interno de um pacote, pode ficar local.
