# 1. Fase de Construção (Build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Fase de Execução (Runtime)
FROM node:20-alpine
WORKDIR /app
# Instalamos um servidor web leve chamado 'serve'
RUN npm install -g serve
# Copiamos apenas a pasta 'dist' que foi gerada no build
COPY --from=builder /app/dist ./dist

EXPOSE 8000

# O 'serve' não bloqueia hosts, então o erro de sslip.io some
CMD ["serve", "-s", "dist", "-l", "8000"]
