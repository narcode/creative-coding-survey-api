module.exports = {
  apps : [{
    name: "mapping-api",
    script: "./app.js",
    watch: true,
    cwd: "/var/www/creative-coding-survey-api/backend",
    exec_mode:  "cluster",
    instances: "-1",
    production: {
      NODE_ENV: "production",
      CREATIVE_CODING_API_PORT: "8081",
      MAPPING_DB_PASSWORD: "...",
    },
  }]
}
