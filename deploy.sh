#!/bin/bash
set -e

echo "============================================="
echo "   ServicoPro - Deploy Automático"
echo "============================================="

echo "[1/4] Build do Frontend (React/Vite)..."
cd /opt/servicopro/frontend
npm run build

echo "[2/4] Copiando arquivos do Frontend para o Nginx..."
cp -r /opt/servicopro/frontend/dist/* /var/www/servicopro/

echo "[3/4] Build do Backend (C#/.NET)..."
cd /opt/servicopro/backend
dotnet publish -c Release -o /opt/servicopro/runtime/api

echo "[4/4] Reiniciando serviço do Backend..."
systemctl restart servicopro-api.service

echo "============================================="
echo "   Deploy concluído com sucesso!"
echo "============================================="
