const fs = require('fs');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // Importamos Multer
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE SUBIDA ROBUSTA ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ruta absoluta a la carpeta assets
    const dir = path.join(__dirname, '../frontend/assets');
    
    // SI NO EXISTE, LA CREAMOS:
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Nombre limpio: img-fecha.jpg
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, 'img-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// --- CONEXIÓN MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión:', err));

// --- ESQUEMA ---
const ItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  desc: String,
  image: String,
  recommended: Boolean,
  note: String,
  available: { type: Boolean, default: true }
});

const SectionSchema = new mongoose.Schema({
  id: String,
  title: String,
  items: [ItemSchema]
});

const MenuSchema = new mongoose.Schema({
  meta: Object,
  contact: Object,
  sections: [SectionSchema]
}, { collection: 'menu' });

const Menu = mongoose.model('Menu', MenuSchema);

// --- RUTAS ---

// 1. Subir Imagen (NUEVO ENDPOINT)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ningún archivo" });
  }
  // Devolvemos la ruta relativa para que la web la pueda leer
  res.json({ filePath: `./assets/${req.file.filename}` });
});

// 2. Obtener Menú
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await Menu.findOne().sort({ _id: -1 });
    if (!menu) return res.status(404).json({ message: "Menú no encontrado" });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Guardar Menú
app.put('/api/menu', async (req, res) => {
  try {
    await Menu.deleteMany({});
    const newMenu = new Menu(req.body);
    await newMenu.save();
    res.json({ message: "Menú actualizado", data: newMenu });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Arrancar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});