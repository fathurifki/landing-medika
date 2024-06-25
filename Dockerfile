FROM node:alpine3.19

# Install build tools

WORKDIR /app

COPY package.json yarn.lock ./

# Run build with verbose logging
FROM base AS prod-deps
RUN yarn install --production

FROM base AS build-deps
RUN yarn install

FROM build-deps AS build
COPY . .
RUN yarn build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Cleanup
# RUN rm -rf /var/cache/apk/* /tmp/*

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD node ./dist/server/entry.mjs