FROM node:alpine3.19

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .

RUN yarn build && rm -rf /var/cache/apk/* /tmp/*

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["yarn", "preview", "--host"]