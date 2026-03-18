# machine-guard

App desktop Electron que funciona como kiosque gamer. Bloqueia o sistema operacional enquanto não há sessão ativa e exibe um overlay transparente com avisos de tempo durante o jogo.

## Stack

- **Electron 31** — dois processos: kiosk window + overlay window
- **React 18 + Vite 5** — UI da aplicação
- **Zustand** — estado global
- **Tailwind CSS** — estilização
- **Socket.io-client** — recebe eventos de balanço/avisos em tempo real
- **React Router 6** — navegação entre telas

## Desenvolvimento

```bash
pnpm dev        # Inicia Vite (:5173) + Electron em modo dev
pnpm build      # Compila TypeScript + Vite + empacota Electron
pnpm preview    # Visualiza build do Vite
```

## Variáveis de Ambiente

Copie `.env.example` para `.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## Arquitetura

### Dois Processos Electron

**Kiosk window** (`electron/windowManager.ts`)
- Fullscreen + kiosk mode em produção, bloqueando Alt+F4, Alt+Tab etc.
- Exibe as telas de autenticação e dashboard.
- Escondida quando uma sessão começa.

**Overlay window**
- Janela transparente, `type: 'toolbar'`, `focusable: false`, `setIgnoreMouseEvents(true)`.
- Renderiza a mesma build React com `?overlay=true` na URL.
- Aparece sobre qualquer jogo em fullscreen sem roubar foco ou mouse.
- Criada ao iniciar sessão, destruída ao encerrar.

O **cliente WebSocket** roda no processo principal e repassa eventos para as janelas via IPC.

### Telas (`src/screens/`)

| Tela | Componente | Condição |
|---|---|---|
| Inserir telefone | `PhoneInput` | `screen === 'PHONE_INPUT'` |
| Inserir OTP | `OtpInput` | `screen === 'OTP_INPUT'` |
| Dashboard | `Dashboard` | `screen === 'DASHBOARD'` |
| Jogando | `Playing` | `screen === 'PLAYING'` |
| Overlay | `Overlay` | `?overlay=true` na URL |

### Zustand Store (`src/store/appStore.ts`)

```ts
screen: 'PHONE_INPUT' | 'OTP_INPUT' | 'DASHBOARD' | 'PLAYING'
overlayState: 'HIDDEN' | 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED'
phone, accessToken, user, sessionId, timeRemainingSeconds
```

### IPC Channels

| Canal | Tipo | Descrição |
|---|---|---|
| `session:start` | invoke | Inicia sessão |
| `session:end` | invoke | Encerra sessão manualmente |
| `balance_update` | event | Atualização de saldo/tempo restante |
| `warning` | event | Aviso de fim de sessão |
| `session_ended` | event | Kiosk volta ao estado bloqueado |

## Fluxo de Sessão

1. Usuário autentica (telefone + OTP)
2. Dashboard exibe saldo disponível
3. "Iniciar jogo" → IPC `session:start` → API cria sessão
4. `unlockKiosk()`: esconde kiosk, mostra overlay, conecta WebSocket
5. Eventos `balance_update` chegam a cada 5s
6. Avisos em ≤60s e ≤30s restantes
7. `SESSION_ENDED` → `lockKiosk()` → overlay some, kiosk volta
