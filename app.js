var utility = require("./utility");
const express = require("express");
const schedule = require("node-schedule"); // For scheduler

var app = express();

// Specify path to routing.
app.get("/covid19", async function (req, res) {
  // If daily data doesn't exist then go and push data from https://covid19.saglik.gov.tr/
  let resultOfDb = await Promise.all([utility.getDataFromDb()]);
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.send(JSON.parse(JSON.stringify(resultOfDb, null, " ")));
});

app.get("/allCovid19", async function (req, res) {
  // If daily data doesn't exist then go and push data from https://covid19.saglik.gov.tr/
  let resultOfDb = await utility.getDataFromDbAll();
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.send(JSON.parse(JSON.stringify(resultOfDb, null, " ")));
});

// Every 5 minute run for data exists or not.
schedule.scheduleJob("*/59 * * * *", function () {
  utility.saveDataToDb();
});

// If path doestn't exist then give below message.
app.use(function (_req, res, _next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.status(404).send("Sorry, that route doesn't exist.");
});

// 3000 port listen to coming request.
app.listen(3002, function () {
  console.log("Covid - 19 server listening port...");
});
