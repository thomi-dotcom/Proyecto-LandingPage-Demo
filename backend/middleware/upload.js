const multer = require('multer');
const path = require('path');
const fs = require('fs');


// =========================================================
// STORAGE CONFIG
// =========================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    const dir = path.join(__dirname, '../../frontend/assets');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: function (req, file, cb) {

    const uniqueSuffix = Date.now() + path.extname(file.originalname);

    cb(null, 'img-' + uniqueSuffix);
  }

});


module.exports = multer({ storage });