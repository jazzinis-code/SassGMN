# ─── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas manifests para aproveitar cache de layers
COPY package.json ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo devDependencies para build)
RUN npm install

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante do código e compila TypeScript
COPY . .
RUN npm run build

# ─── Stage 2: production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copia apenas o necessário para rodar
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

USER nestjs

EXPOSE 3001

# Roda migrations e inicia o servidor
CMD ["node", "dist/main"]
