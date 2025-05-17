const express = require("express");
const dotenv = require("dotenv");
const { connectMongoDb } = require("./config/connectdb");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userRoute = require("./routes/user");
const productRoute = require("./routes/product");
const alertRoute = require("./routes/alert");
require("./service/scheduler");

const app = express();
const PORT = process.env.PORT || 8000;

dotenv.config();

connectMongoDb(process.env.MONGO_URI)
  .then(() => {
    console.log("mongodb connected");
  })
  .catch((err) => console.log("error:", err));

const corsConfig = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent with requests
};

app.options("", cors(corsConfig));
app.use(cors(corsConfig));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello World");
});

// API routes
app.use("/api/user", userRoute);
app.use("/api/product", productRoute);
app.use("/api/alerts", alertRoute);

app.listen(PORT, () => {
  console.log(`Listening at port: ${PORT}`);
});
