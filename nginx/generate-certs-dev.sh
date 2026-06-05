#!/bin/sh
# Gera certificado autoassinado para desenvolvimento local.
# Para produção use Certbot (Let's Encrypt) — veja nginx/ssl/.gitkeep.

set -e

CERT_DIR="$(dirname "$0")/ssl"

echo "Gerando certificado autoassinado para desenvolvimento..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out    "$CERT_DIR/fullchain.pem" \
  -subj   "/C=BR/ST=SP/L=SaoPaulo/O=ReviewAI-Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificado gerado em $CERT_DIR"
echo "  fullchain.pem  → certificado"
echo "  privkey.pem    → chave privada"
echo ""
echo "ATENÇÃO: Para produção use Let's Encrypt."
