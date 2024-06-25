FROM node:alpine3.19 AS base
WORKDIR /app

COPY package.json yarn.lock ./

# Cache the node_modules layer
RUN yarn install --frozen-lockfile

COPY . .

FROM base AS build
RUN yarn build

# Final stage
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs