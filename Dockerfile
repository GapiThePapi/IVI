FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "--import", "tsx", "server/index.ts", "--production"]
