const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passportConfig = require("./lib/passportConfig");
const cors = require("cors");
const fs = require("fs");

require("dotenv").config();
const corsOptions = {
  origin: process.env.HOST,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};

const db = require("./config/keys").mongoURI;

// Updated MongoDB connection options
async function connectToDB() {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

connectToDB();

// Initialize directories
const createDirectoryIfNotExists = async (directory) => {
  try {
    if (!fs.existsSync(directory)) {
      await fs.promises.mkdir(directory, { recursive: true });
    }
  } catch (err) {
    console.error("Error creating directory:", err);
  }
};

createDirectoryIfNotExists("./public");
createDirectoryIfNotExists("./public/resume");
createDirectoryIfNotExists("./public/profile");

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(passportConfig.initialize());

// Routing
app.use("/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/apiRoutes"));
app.use("/upload", require("./routes/uploadRoutes"));
app.use("/host", require("./routes/downloadRoutes"));

app.listen(port, () => {
  console.log(`Server started on port ${port}!`);
});
