const cheerio = require("cheerio"); // Core Jquery and dom parsing functionality.
const numeral = require("numeral"); // For number format

const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");
//const request = require("request");
const requestPromise = require("request-promise");
const webAdressConstants = require("./Constants/SideAdress");
//const fs = require("fs");

// firebase configurations.
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

  findMonth: function (month) {
    let months = [
      "OCAK",
      "ŞUBAT",
      "MART",
      "NİSAN",
      "MAYIS",
      "HAZİRAN",
      "TEMMUZ",
      "AĞUSTOS",
      "EYLÜL",
      "EKİM",
      "KASIM",
      "ARALIK",
    ];
    let result = 0;

    for (let index = 0; index < months.length; index++) {
      if (months[index] === month) {
        result = index + 1; // index 0 but months begin from 1
        break;
      }
    }

    return result;
  },
  // Html data is converting and parsing.
  parseHtmlToJson: function (body) {
    const $ = cheerio.load(body);
    const numberOfCovid = [];
    var resultOfCovid = [];
    var covidJsonData = {};

    let day, month, year, temp;
    $("div .takvim")
      .find("p")
      .each(function (i, _element) {
        switch (i) {
          case 0:
            temp = $(this).text();
            day = temp.length === 2 ? temp : "0" + temp;
            break;
          case 1:
            temp = utility.findMonth($(this).text());
            month = temp.length === 2 ? temp : "0" + temp;
            break;
          case 2:
            year = $(this).text();
            break;
          default:
            break;
        }
      });

    let id = day + "." + month + "." + year;
    //console.log(id);

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
    resulOfCovidJson["Id"] = id;
    return JSON.parse(JSON.stringify(resulOfCovidJson));
  },
  saveDataToDb: async function () {
    // If there is already daily covid-19 data then no action.
    const dbQuery = await utility.getDataFromDb();
    if (dbQuery) {
      return;
    }

    requestPromise(webAdressConstants.TurkeyHealthMinistery, {
      method: "GET",
      json: true,
    })
      .then(function (res) {
        let resultOfParsing = utility.parseHtmlToJson(res);
        let id = utility.formattedDateOfToday();
        if (resultOfParsing["Id"] !== id) {
          return;
        }
        return db
          .collection("covid19")
          .doc(id.split(".").join(""))
          .set(resultOfParsing["Turkey"])
          .then(() => {
            console.log("added to firebase.");
          });
      })
      .catch((error) => console.log(error));
  },
  getDataFromDb: async function () {
    let resultOfQuery;
    let result;
    try {
      // Get daily data from db.
      resultOfQuery = await db
        .collection("covid19")
        .doc(utility.formattedDateOfToday().split(".").join(""))
        .get();

      if (resultOfQuery && resultOfQuery[0] && resultOfQuery[0].exists) {
        result = resultOfQuery[0].data();
      }
    } catch (error) {
      console.log(error);
    }

    return result;
  },
  getDataFromDbAll: async function () {
    // Get all data from db.
    let resultOfQuery;
    let result = {};
    try {
      resultOfQuery = await admin.firestore().collection("covid19").get();
      resultOfQuery.docs.map((doc) => (result[doc.id] = doc.data()));
    } catch (error) {
      console.log(error);
    }

    return result;
  },
};
module.exports = utility;
