// Configuración central de la aplicación.
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env si existe
const envFile = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  lines.forEach(line => {
    const [key, ...valParts] = line.split('=');
    if (key && !process.env[key.trim()] && valParts.length) {
      process.env[key.trim()] = valParts.join('=').trim();
    }
  });
}

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey_bikeshare_2024',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  dataDir: process.env.DATA_DIR || './data'
};

module.exports = config;
