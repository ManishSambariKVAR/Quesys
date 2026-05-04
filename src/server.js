const app = require("./app");
const { connectDatabase } = require("./config/database");
const https = require("https");
const fs = require("fs");
const path = require("path");

const port = 5001;
const HTTPort = 4001;

connectDatabase()
  .then(() => {
    try {
      const options = {
        key: fs.readFileSync(path.join(__dirname, "../localhost-key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "../localhost.pem")),
      };
      const server = https.createServer(options, app);
      server.listen(port, () => {
        console.log(`HTTPS Server running at https://localhost:${port}`);
      });
    } catch (err) {
      console.log("SSL Certificates not found. HTTPS server will not start.");
    }

    app.listen(HTTPort, () => {
      console.log(`HTTP Server running at http://localhost:${HTTPort}`);
    });
  })
  .catch((err) => {
    console.error("Exiting application due to database connection error", err);
    process.exit(1);
  });
