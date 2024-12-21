# Free Sheets API
Convert your Google Sheets into a REST API.

This backend service, built upon Nest.js, connects to your Google Sheet either through OAUTH2 
or a service account. The front end is seperate project built on Nuxt which must be used to add 
Sheets and configure the access method.

## Install

### Backend

* Clone this repo.
* [Set up a Google Cloud project](https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication?id=setting-up-your-quotapplicationquot).
* [Create a Google service account](https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication?id=service-account) and download the JSON file.
* Put the JSON file into `src/config/service_account.json`.
* Set up a MySQL DB or use an existing one.
* Set up a Redis instance or use an existing one.
* Create a DB user and DB for this project.
* Create a .env file in the root of the repo similar to .env.example. Leave `DB_SYNC=true` for now.
* Run `npm install` to install the dependencies.
* Copy front end into public
* Run `npm run start` to start the server. This will create the tables and seed the DB.
* Stop the server and set `DB_SYNC=false`.
* Prepare the front end.

### Frontend

* Clone the sheet-api-fe repo.
* Run `npm install` to install the dependencies.
* Edit the .env file in the root of the repo similar to .env.example.
* Run `npm run generate` to build the front end into the .output folder.
* Copy .output/public folder into the root of the backend repo.


### Running

* Go back to the backend repo and run `npm run start` to start the server.


## Docker

docker run  --restart=unless-stopped -d -p 3010:3000 --name sheet-api-be -v /usr/src/sheet-api-be:/app -v /usr/src/sheet-api-be/public:/app/public -v /app/node_modules -e REDIS_HOST=10.0.0.4 gcleaves/sheet-api-be:1.1 npm run start
