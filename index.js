const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const mysql = require("mysql2");
const dbConfig = require("./config/db.config.js");

// Create a connection to the database
const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
});

// open the MySQL connection
connection.connect((error) => {
  if (error) throw error;
  console.log("Successfully connected to the database.");
});
const createTable =
  "CREATE TABLE IF NOT EXITS info (id int PRIMARY KEY AUTO_INCREMENT, name TEXT, image VARCHAR(255))";

connection.query(createTable, function (err, result) {
  if (err) throw err;
  console.log("table created");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use(cors());

async function getImageInfoAndStoreToDb(param) {
  // Imports the Google Cloud client library
  const vision = require("@google-cloud/vision");

  // Creates a client
  const client = new vision.ImageAnnotatorClient({
    keyFilename: "./APIKey.json",
  });

  // Performs label detection on the image file
  const [result] = await client.labelDetection(param);
  const labels = result.labelAnnotations;
  console.log("Labels:");
  const array = [];
  labels.forEach((label) => {
    array.push(label.description);
    console.log(label.description);
  });
  console.log("Array of: ", array);
  const sqlInsert = `INSERT INTO info (name, image) VALUES (?,?)`;
  connection.query(sqlInsert, [`[${array}]`, param], (err, rows) => {
    if (err) throw err;
    console.log("Data inserted in Db");
  });
}
// this line should help display images in frontend
app.use("/images", express.static(path.join(__dirname, "./images")));

app.get("/api/get", (req, res) => {
  const sqlSelectAll = "SELECT * FROM info";
  connection.query(sqlSelectAll, (err, result) => {
    if (err) res.send({ msg: err });

    if (result) res.send({ result });
  });
});

app.post("/api/post", upload.single("file"), (req, res, err) => {
  const image = `images/${req.file.filename}`;
  getImageInfoAndStoreToDb(image);
  res.send({ msg: "The image has been uploaded" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
