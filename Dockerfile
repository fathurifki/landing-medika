FROM node:alpine3.19

# Install build tools

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install && yarn cache clean

COPY . .

# Run build with verbose logging
RUN yarn build

# Cleanup
# RUN rm -rf /var/cache/apk/* /tmp/*

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["yarn", "preview", "--host"]