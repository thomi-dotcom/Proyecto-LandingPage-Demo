const express = require('express');

const router = express.Router();

const {
  getMenu,
  saveMenu,
  uploadImage
} = require('../controllers/menuController');

const upload = require('../middleware/upload');


// =========================================================
// RUTAS
// =========================================================

// Subir imagen
router.post('/upload', upload.single('image'), uploadImage);

// Obtener menú
router.get('/menu', getMenu);

// Guardar menú
router.put('/menu', saveMenu);


module.exports = router;