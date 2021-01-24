const express = require("express");

const Category = require("../models/Category");
const Product = require("../models/Product");
const Review = require("../models/Review");
const User = require("../models/User");

const { authorization, withUser } = require("../middlewares/auth");

const { mongoql } = require("../middlewares/mongoql");

const { filterWithUserId } = require("../middlewares/mongoql-filters");

const router = express.Router();

const options = {
  pagination: {
    limit: 50,
  },
  paths: [
    {
      model: User,
      whitelist: {
        id: true,
        name: true,
        email: {
          middlewares: [authorization, withUser],
          filters: [filterWithUserId],
        },
        card: {
          middlewares: [authorization, withUser],
          filters: [filterWithUserId],
        },
      },
    },
    {
      model: Product,
      whitelist: ["id", "title", "description", "price", "category"],
    },
    {
      model: Category,
      whitelist: ["id", "title"],
    },
    {
      model: Review,
      whitelist: ["id", "user", "product", "rating", "createdAt"],
    },
  ],
};

router.post("/", mongoql(options));

module.exports = router;
