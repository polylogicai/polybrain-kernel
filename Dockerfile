FROM node:20-alpine
WORKDIR /app

# Dependencies first, for better caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ports:
#   4849 — build/run progress dashboard
#   4850 — §8 four-predicate publisher
EXPOSE 4849 4850

# Start all three services (dashboard, publisher, kernel) in one container.
# The kernel is the foreground process so docker tracks its lifecycle;
# dashboard and publisher run in the background sharing the container's
# filesystem (canon/, state/, rules/).
CMD ["sh", "-c", "node tools/dashboard/server.mjs & node src/publisher.mjs & exec node src/kernel.mjs"]
