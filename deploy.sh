#!/bin/sh
# deploy.sh — gamer-machine API deploy em Alpine Linux
# Uso: sh deploy.sh [--update]
#
# --update  apenas faz pull + rebuild, sem reinstalar Docker/dependências

set -e

REPO_DIR="/opt/gamer-machine"
REPO_URL="https://github.com/SEU_USER/SEU_REPO.git"  # <- altere aqui
ENV_FILE="$REPO_DIR/services/api/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { printf "${GREEN}[deploy]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[warn]${NC}  %s\n" "$1"; }
die()  { printf "${RED}[erro]${NC}  %s\n" "$1"; exit 1; }

# ── 1. Instala Docker (Alpine) ───────────────────────────────────────────────
install_docker() {
  log "Instalando Docker..."
  apk add --no-cache docker docker-cli-compose git curl

  # Habilita e sobe o serviço
  rc-update add docker default
  service docker start

  # Aguarda o daemon
  for i in $(seq 1 15); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
  docker info >/dev/null 2>&1 || die "Docker daemon não subiu"
  log "Docker $(docker --version) instalado."
}

# ── 2. Clona ou atualiza o repositório ──────────────────────────────────────
setup_repo() {
  if [ -d "$REPO_DIR/.git" ]; then
    log "Atualizando repositório..."
    git -C "$REPO_DIR" pull --rebase
  else
    log "Clonando repositório em $REPO_DIR..."
    git clone "$REPO_URL" "$REPO_DIR"
  fi
}

# ── 3. Configura o .env (apenas na primeira vez) ────────────────────────────
setup_env() {
  if [ -f "$ENV_FILE" ]; then
    warn ".env já existe — pulando. Edite $ENV_FILE manualmente se necessário."
    return
  fi

  log "Criando .env a partir do .env.example..."
  cp "$REPO_DIR/services/api/.env.example" "$ENV_FILE"

  # Gera JWT_SECRET aleatório
  JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '=+/' | head -c 40)
  sed -i "s|JWT_SECRET=change_me_in_production|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"

  # Senha do admin
  printf "${YELLOW}Senha para o admin da API (ADMIN_PASSWORD): ${NC}"
  read -r ADMIN_PASS
  [ -z "$ADMIN_PASS" ] && ADMIN_PASS=$(head -c 16 /dev/urandom | base64 | tr -d '=+/' | head -c 20)
  sed -i "s|ADMIN_PASSWORD=change_me_in_production|ADMIN_PASSWORD=$ADMIN_PASS|" "$ENV_FILE"

  printf "\n"
  warn "Revise $ENV_FILE e preencha ABACATEPAY_API_KEY, SMTP_*, etc. antes de subir em produção."
}

# ── 4. Build e sobe os containers ───────────────────────────────────────────
deploy() {
  cd "$REPO_DIR"

  log "Fazendo build e subindo containers..."
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose build --no-cache
  docker compose up -d

  log "Aguardando API ficar saudável..."
  for i in $(seq 1 30); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' gamer_machine_api 2>/dev/null || echo "starting")
    [ "$STATUS" = "healthy" ] && break
    # API não tem healthcheck — verifica porta
    curl -sf http://localhost:3001/health >/dev/null 2>&1 && break
    sleep 2
  done

  log "Status dos containers:"
  docker compose ps
}

# ── Main ─────────────────────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  die "Execute como root: sudo sh deploy.sh"
fi

UPDATE_ONLY=0
[ "$1" = "--update" ] && UPDATE_ONLY=1

if [ "$UPDATE_ONLY" -eq 0 ]; then
  command -v docker >/dev/null 2>&1 || install_docker
fi

setup_repo
setup_env
deploy

printf "\n${GREEN}✓ Deploy concluído!${NC}\n"
printf "  API:      http://localhost:3001\n"
printf "  Logs:     docker compose -f %s/docker-compose.yml logs -f api\n" "$REPO_DIR"
printf "  Atualizar: sh %s/deploy.sh --update\n" "$REPO_DIR"
