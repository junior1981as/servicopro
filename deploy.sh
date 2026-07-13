#!/bin/bash
set -euo pipefail

ROOT_DIR="/opt/servicopro"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
RUNTIME_API_DIR="$ROOT_DIR/runtime/api"
WEB_ROOT="/var/www/servicopro"
SERVICE_NAME="servicopro-api.service"
HEALTH_URL="http://127.0.0.1:7771/api/health"
SECRETS_FILE="$ROOT_DIR/segredos/servicopro_mssql.env"

echo "============================================="
echo "   ServicoPro - Deploy Automático"
echo "============================================="

if [[ -f "$SECRETS_FILE" ]]; then
    # Carrega variaveis do .env sem executar o arquivo como shell script.
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        key="${line%%=*}"
        value="${line#*=}"
        export "$key=$value"
    done < "$SECRETS_FILE"
fi

echo "[1/6] Build do Frontend (React/Vite)..."
cd "$FRONTEND_DIR"
npm run build

echo "[2/6] Publicando frontend no Nginx..."
mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r "$FRONTEND_DIR/dist/"* "$WEB_ROOT/"

echo "[3/6] Publish do Backend (.NET)..."
cd "$BACKEND_DIR"
dotnet publish -c Release -o "$RUNTIME_API_DIR"

echo "[4/6] Aplicando migrations do banco..."
dotnet ef database update --context ServicoProDbContext --project "$BACKEND_DIR/ServicoPro.Api.csproj" --startup-project "$BACKEND_DIR/ServicoPro.Api.csproj"

echo "[5/6] Reiniciando serviço da API..."
systemctl restart "$SERVICE_NAME"

echo "[6/6] Validando saúde da API..."
for tentativa in {1..10}; do
    if curl -fsS "$HEALTH_URL" >/dev/null; then
        echo "API respondeu com sucesso em $HEALTH_URL"
        echo "============================================="
        echo "   Deploy concluído com sucesso!"
        echo "============================================="
        exit 0
    fi

    echo "Aguardando API subir... tentativa $tentativa/10"
    sleep 3
done

echo "API não respondeu após o deploy. Verifique os logs com:"
echo "journalctl -u $SERVICE_NAME -n 200 --no-pager"
exit 1
