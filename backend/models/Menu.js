const mongoose = require('mongoose');


// =========================================================
// ITEM
// =========================================================

const ItemSchema = new mongoose.Schema({

  name: String,
  price: Number,
  desc: String,
  image: String,
  recommended: Boolean,
  note: String,
  available: {
    type: Boolean,
    default: true
  }

});


// =========================================================
// SECTION
// =========================================================

const SectionSchema = new mongoose.Schema({

  id: String,
  title: String,
  items: [ItemSchema]

});


// =========================================================
// MENU
// =========================================================

const MenuSchema = new mongoose.Schema({

  meta: Object,
  contact: Object,
  sections: [SectionSchema]

}, {
  collection: 'menu'
});


module.exports = mongoose.model('Menu', MenuSchema);