const dotenv = require("dotenv");
dotenv.config({ path: "./.env.development.local" });

// database
const connectDB = require("./config/db");
const Category = require("./models/Category");
const Product = require("./models/Product");
const User = require("./models/User");

// Connect DB
connectDB();

const create = async () => {
  const user1 = await User.create({
    email: "user1@gmail.com",
    name: "User 1",
  });
  const user2 = await User.create({
    email: "user2@gmail.com",
    name: "User 2",
  });

  const category1 = await Category.create({
    title: "Category 1",
  });
  const category2 = await Category.create({
    title: "Category 2",
  });

  const product1 = await Product.create({
    title: "Product 1",
    description: "Description of the product 1",
    price: 1,
    category: category1._id,
  });

  const product2 = await Product.create({
    title: "Product 2",
    description: "Description of the product 2",
    price: 2,
    category: category1._id,
  });

  const product3 = await Product.create({
    title: "Product 3",
    description: "Description of the product 3",
    price: 3,
    category: category2._id,
  });

  const product4 = await Product.create({
    title: "Product 4",
    description: "Description of the product 4",
    price: 4,
    category: category2._id,
  });

  const product5 = await Product.create({
    title: "Product 5",
    description: "Description of the product 5",
    price: 5,
    category: category2._id,
  });

  await User.findByIdAndUpdate(user1._id, {
    card: [product1._id, product3._id, product4._id],
  });

  await User.findByIdAndUpdate(user2._id, {
    card: [product2._id, product3._id, product4._id, product5._id],
  });
};

create();
