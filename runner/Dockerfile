FROM node:20-alpine

RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

COPY package*.json* ./
RUN npm install 2>/dev/null || true

COPY . .

RUN addgroup -S runner && adduser -S -G runner runner
RUN chown -R runner:runner /app
USER runner

ENV NODE_ENV=production
ENV PORT=8081

EXPOSE 8081

CMD ["npx", "tsx", "index.ts"]
