const cheerio = require("cheerio"); // Core Jquery and dom parsing functionality.
const numeral = require("numeral"); // For number format

const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");
const request = require("request");
const requestPromise = require("request-promise");
const webAdressConstants = require("./Constants/SideAdress");
const fs = require("fs");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dailycovid19api.firebaseio.com",
});

const db = admin.firestore();

const utility = {
  // Date format
  formattedDateOfToday: function () {
    let date = new Date();
    let dayOfDate = date.getDate();
    let monthOfDate = date.getMonth() + 1;
    let yearOfDate = date.getFullYear();

    if (dayOfDate < 10) dayOfDate = "0" + dayOfDate;
    if (monthOfDate < 10) monthOfDate = "0" + monthOfDate;

    return dayOfDate + "." + monthOfDate + "." + yearOfDate;
  },
  // Html data is converting and parsing.
  parseHtmlToJson: function (body) {
    const $ = cheerio.load(body);
    const numberOfCovid = [];
    var resultOfCovid = [];
    var covidJsonData = {};
    $("ul")
      .find("li")
      .each(function (i, _elem) {
        let str = $(this).text();
        numberOfCovid[i] = str
          .replace("\n", "")
          .replace("\t", "")
          .split(" ")
          .filter((x) => x !== "" && x !== "\n");
      });

    numberOfCovid.map((item) => {
      //Get the copy of array without reference.
      let arr = [...item];
      let title = "";
      let result = 0;
      for (let j = 0; j < arr.length; j++) {
        if (j < arr.length - 1) title += " " + arr[j].replace("\n", "");
        else result = numeral(arr[j].replace("\n", "").split(".").join(""));
      }

      title = title.trim();
      covidJsonData[title] = result.value();
    });
    resultOfCovid.push(covidJsonData);
    let resulOfCovidJson = {};
    resulOfCovidJson["Turkey"] = resultOfCovid;
    return JSON.parse(JSON.stringify(resulOfCovidJson));
  },
  saveDataToDb: async function () {
    requestPromise(webAdressConstants.TurkeyHealthMinistery, {
      method: "GET",
      json: true,
    })
      .then(function (res) {
        let resultOfParsing = utility.parseHtmlToJson(res);
        return db
          .collection("covid19")
          .doc(utility.formattedDateOfToday().split(".").join(""))
          .set(resultOfParsing)
          .then(() => {
            console.log("added to firebase.");
          });
      })
      .catch((error) => console.log(error));
  },
  getDataFromDb: async function () {
    const resultOfQuery = await Promise.all([
      db
        .collection("covid19")
        .doc(utility.formattedDateOfToday().split(".").join(""))
        .get(),
    ]);

    let result;
    // If daily data doesn't exist then go and push data from https://covid19.saglik.gov.tr/
    if (resultOfQuery && resultOfQuery[0] && resultOfQuery[0].exists) {
      result = resultOfQuery[0].data(); //JSON.parse(JSON.stringify(, null, " "));
    }
    return result;
  },
  getDataFromDbAll: async function () {
    const resultOfQuery = await admin.firestore().collection("covid19").get(); //await Promise.all([db.collection("covid19").get()]);
    let result = {};
    resultOfQuery.docs.map((doc) => (result[doc.id] = doc.data()));
    return result;
  },
};
module.exports = utility;
