FROM node:24-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --ignore-scripts evita o "prepare" (lefthook install), que não faz sentido na imagem
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=8080 \
    API_PROTOCOL=http

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

USER node
EXPOSE 8080

CMD ["node", "src/index.js"]
