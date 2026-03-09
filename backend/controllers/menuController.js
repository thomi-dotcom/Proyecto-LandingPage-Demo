const Menu = require('../models/Menu');


// =========================================================
// OBTENER MENÚ
// =========================================================

exports.getMenu = async (req, res) => {

  try {

    const menu = await Menu.findOne().sort({ _id: -1 });

    if (!menu) {
      return res.status(404).json({
        message: "Menú no encontrado"
      });
    }

    res.json(menu);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};


// =========================================================
// GUARDAR MENÚ
// =========================================================

exports.saveMenu = async (req, res) => {

  try {

    await Menu.deleteMany({});

    const newMenu = new Menu(req.body);

    await newMenu.save();

    res.json({
      message: "Menú actualizado",
      data: newMenu
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};


// =========================================================
// RESPUESTA DE SUBIDA DE IMAGEN
// =========================================================

exports.uploadImage = (req, res) => {

  if (!req.file) {

    return res.status(400).json({
      message: "No se subió ningún archivo"
    });

  }

  res.json({
    filePath: `./assets/${req.file.filename}`
  });

};