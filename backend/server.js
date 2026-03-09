// =========================================================
// IMPORTACIONES
// =========================================================

require('dotenv').config({ quiet: true });

const dns = require('node:dns/promises');
dns.setServers(['1.1.1.1', '1.0.0.1']);

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const menuRoutes = require('./routes/menuRoutes');


// =========================================================
// APP
// =========================================================

const app = express();


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());
app.use(express.json());


// =========================================================
// BASE DE DATOS
// =========================================================

connectDB();


// =========================================================
// RUTAS
// =========================================================

app.use('/api', menuRoutes);


// =========================================================
// SERVIDOR
// =========================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`
════════════════════════════════════
🚀 Backend iniciado correctamente
════════════════════════════════════

🌐 API:        http://localhost:${PORT}
📦 MongoDB:    Conectado
📁 Assets:     /frontend/assets

💡 Listo para recibir requests
════════════════════════════════════
`);

});