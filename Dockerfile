FROM node:alpine3.19 AS base
WORKDIR /app


COPY package.json yarn.lock ./

RUN yarn install
RUN yarn build

FROM base AS runtime
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs