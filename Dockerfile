# 1. Usar uma imagem do Node.js
FROM node:20-alpine

# 2. Criar a pasta do app
WORKDIR /app

# 3. Copiar os arquivos de pacotes e instalar
COPY package*.json ./
RUN npm install

# 4. Copiar o restante do código
COPY . .

# 5. Abrir a porta e rodar o comando que você já tinha colocado
EXPOSE 8000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8000", "--allowed-hosts", "all"]
