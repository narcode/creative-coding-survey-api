# Creative Coding Ecologies

The Creative Coding Ecologies project contains the following moving parts:

* `/backend` Node.js back-end with API endpoints for retrieving responses to the [Creative Coding Survey](https://mapping.creativecodingutrecht.nl/) by [Creative Coding Urecht](https://creativecodingutrecht.nl/) (CCU). 
* `/website` Static HTML/CSS front-end application. This web application shows an interacive Creative Coding Ecologies mapping. See [creativecoding.community](https://creativecoding.community) for the production environment of this website.

The codebase for the Creative Coding Survey (developed with Elm) can be found [here](https://github.com/narcode/livecoders-mapping-on-the-fly-ccu).

## Prerequisites

* Node.js, up to version 20 (LTS) is supported.
* MySQL server, for the database used by the back-end.

## The back-end / API 
All sources and dependencies for the front-end are located in the directory `backend`.

### Development

Set the following environment variables:
* `CREATIVE_CODING_API_PORT` - the HTTP port number (e.g. `export CREATIVE_CODING_API_PORT=8081`)
* `MAPPING_DB_PASSWORD` - the password for accessing the `mappping` database on the local machine (e.g. `export MAPPING_DB_PASSWORD="password"`)

### Running
During development, you can start the front-end with:

```bash
export CREATIVE_CODING_API_PORT=8081
export MAPPING_DB_PASSWORD="password"

node backend/app.js
```

## Deployment
The server process will typically be managed by `pm2`. The project contains an ecosystem file for this.

Please note, through GitHub Actions the deployment is being updated after each push to the `main` branch!

## Front-end
All sources and dependencies for the front-end are located in the directory `website`.

### Development
During development, you can start the front-end with:

```bash
npm run start
```

When running the project, Node.js might complain about OpenSSL providers. In that case, you can provide the following option when starting Node:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run start
```

The front-end assumes the back-end to be hosted at [mapping-api.creativecodingutrecht.nl](https://mapping-api.creativecodingutrecht.nl). If retrieving data from the back-end fails, the application will revert back to using mock data in `src/data/surveyData.js`.

### Building
The front-end can be built for production with: 

```bash
npm run build
```
