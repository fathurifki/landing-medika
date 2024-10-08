FROM node:alpine3.19 AS base
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

RUN yarn build

# Adding environment variables
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD yarn prod
