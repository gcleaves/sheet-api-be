# Free Sheets API
Convert your Google Sheets into a REST API.

This backend service, built upon Nest.js, connects to your Google Sheet either through OAUTH2 
or a service account. There is a front end built on Nuxt which can be used to add 
Sheets and configure the access method.

## Install
Proper docs to follow.

Relies on a MySQL DB and Redis for cache and session storage.

npx nuxi generate

service_account.json

DB_SYNC=true then change to false

docker run  --restart=unless-stopped -d -p 3010:3000 --name sheet-api-be -v /usr/src/sheet-api-be:/app -v /usr/src/sheet-api-be/public:/app/public -v /app/node_modules -e REDIS_HOST=10.0.0.4 gcleaves/sheet-api-be:1.1 npm run start
