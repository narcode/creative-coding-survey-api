const express = require('express');
const mysql = require('mysql2');
const {routes} = require('./handlers.js');

function createPool(password) {
  return mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    port: '3306',
    user: 'mapping',
    password: password,
    database: 'mapping',
  });
}

function allowCORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Content-Security-Policy', "default-src * 'unsafe-inline'");

  next();
}

function main() {
  const port = process.env.CREATIVE_CODING_API_PORT;
  const app = express();
  const dbPool  = createPool(process.env.MAPPING_DB_PASSWORD);

  app.use(allowCORS);
  
  routes.forEach(([path, makeHandler]) => {
    app.get(path, makeHandler(dbPool));
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({error: true, message: "Server error"});
  });

  app.listen(port, () => {
    console.log(`Creative coding api listening at http://localhost:${port}`);
  });
}

main();
