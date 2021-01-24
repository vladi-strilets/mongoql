const express = require("express");

// Load env vars
if (process.env.NODE_ENV !== "production") {
  const dotenv = require("dotenv");
  dotenv.config({ path: "./.env.development.local" });
}

// middlewares
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const xss = require("xss-clean");

// database
const connectDB = require("./config/db");

// routes
const mongoql = require("./routes/mongoql");

// Connect DB
connectDB();

// create app
const app = express();

// apply middlewares

// Body parser
app.use(express.json());
// support encoded bodies
app.use(express.urlencoded({ extended: true }));
// Sanitize data
app.use(mongoSanitize());
// Set security headers
app.use(helmet());
// Prevent XSS attacks
app.use(xss());
// Prevent http param pollution
app.use(hpp());
// Enable CORS
app.use(cors());

// Dev logginf middleware
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

app.get("/", (req, res) => res.send("Welcome to MongoQL API example"));
app.use("/mongoql", mongoql);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
