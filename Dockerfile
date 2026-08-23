FROM node:20-alpine
WORKDIR /app
COPY standalone.js package.json ./
# Zero npm dependencies (Node core modules only) — nothing to install.
ENV NODE_ENV=production
CMD ["node", "standalone.js"]
