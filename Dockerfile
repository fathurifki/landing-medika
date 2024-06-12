FROM node:alpine3.19

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["yarn", "preview", "--host"]