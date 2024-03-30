FROM node:20

RUN mkdir /code
COPY . /code/

WORKDIR /code
RUN npm install
RUN npm run build

RUN mv dist /app
RUN mv proto /app/proto
RUN mv node_modules /app/node_modules
RUN rm -rf /code

WORKDIR /app
CMD ["node", "index.js"]

#docker build --platform linux/amd64 --no-cache -t dmgarvis/discord-observer:latest .
#docker push dmgarvis/discord-observer:latest

#docker run --env-file .env dmgarvis/discord-observer:latest