FROM node:22-alpine

WORKDIR /app

# Install only production dependencies (cached unless package files change)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# GIT_SHA is passed by the CI pipeline; empty means "use RENDER_GIT_COMMIT"
ARG GIT_SHA=""
ENV NODE_ENV=production PORT=3000 GIT_SHA=$GIT_SHA

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
