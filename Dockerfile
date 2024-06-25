FROM node:alpine3.19 AS base
WORKDIR /app

COPY package.json yarn.lock ./

# Cache the node_modules layer
RUN yarn install --frozen-lockfile

COPY . .

ENV PUBLIC_API=${PUBLIC_API}

RUN yarn install
RUN yarn build

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs