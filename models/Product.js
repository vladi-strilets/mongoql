const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", ProductSchema);
