FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code (excluding embeddings folder)
COPY server.js .
COPY *.js ./

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server.js"]
