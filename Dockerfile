FROM node:alpine3.19 AS base
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

# Adding environment variables
ENV HOST=0.0.0.0
ENV PORT=4321

ENV PUBLIC_API=http://medika-cms.pomerain.org
ENV PUBLIC_IMAGE=http://medika-cms.pomerain.org/assets

EXPOSE 4321
CMD yarn prod
