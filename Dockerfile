FROM node:21-alpine

RUN mkdir /app
WORKDIR /app
COPY ./package.json /app

RUN npm install

VOLUME /app/node_modules
VOLUME /app/public

EXPOSE 3000
