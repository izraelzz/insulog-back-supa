const path = require('path')
const os = require('os')

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
})
const app = require('./app')
const { testDatabaseConnection } = require("./config/database");

const PORT = process.env.PORT || 3000

async function startServer() {
  await testDatabaseConnection();

  const server = app.listen(PORT, '0.0.0.0', () => {
    const port = server.address().port
    console.log(`Servidor rodando em http://${getLocalIP()}:${port}`);
    if (process.send) process.send({ type: 'listening', port })
  });
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

startServer();
