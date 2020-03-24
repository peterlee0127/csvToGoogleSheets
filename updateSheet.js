const fs = require('fs');
const authTool = require('./auth');
const {google} = require('googleapis');
const spreadsheetId = require('./config.json').spreadsheetId;

Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}

function start() {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authTool.authorize(JSON.parse(content), function(auth) {
      compareData(auth);
    });
  });
 }

function compareData(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'A2:E2000',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    let csvDict = readCSV();
    let sheetDict = {};

    if (rows && rows.length) {
      let lastIndex = rows.length;
      rows.map((row, index) => {
        let actionIndex = index+2;
        if(row.length>2) {
            let rowDict = parseField(row, false);
            rowDict["index"] = actionIndex;
            let rowKey = rowDict["key"];
            sheetDict[rowKey] = rowDict;  
        }
      });
      compareDict(csvDict, sheetDict, lastIndex , auth);
      
    } else {
      console.log('No data found.');
      compareDict(csvDict, {}, 1 , auth);
    }
  });
}

function compareDict(csvDict, rowDict, lastIndex, auth) {
  let actionDict = {
    'append': [],
    'update': []
  };
  let csvKeys = Object.keys(csvDict);
  csvKeys.forEach ( key=> {
    if(rowDict[key]) {
      actionDict["update"].push({
        index: rowDict[key]['index'],
        value: csvDict[key]
      });
    }else {       
      actionDict["append"].push({
        index: null,
        value: csvDict[key]
      });
    }
   
  })
  console.log(actionDict);


  let updateValues = actionDict["update"].map(item => {
    let itemIndex = item.index;
    return { 
      'range': `A${itemIndex}:E${itemIndex}`, 
      'majorDimension': 'ROWS', 
      'values': [[
        item.value["key"], item.value["unique_record_hourly"], item.value["record_hourly"], 
        item.value["total_unique_record"], item.value["total_record"]]
      ]
    }
  });
  if(updateValues.length>0){ 
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues 
      }
    }, (err, res) => {
      if(err){console.error(err.errors);return;}
      console.log(res.statusText);
    });
  }


  const appendValues = actionDict["append"].map(item => {
    return [item.value["key"], item.value["unique_record_hourly"], item.value["record_hourly"], 
      item.value["total_unique_record"], item.value["total_record"]]
  });
  if(appendValues.length>0) {
    console.log(appendValues);
    const sheets = google.sheets({version: 'v4', auth});
    const range = `A${lastIndex}:A${lastIndex+appendValues.length}`;
    console.log(range);
    sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: appendValues
      },
    }, (err, res) => {
      if(err){console.error(err.errors);return;}
      console.log(res.statusText);
    });
  } 
}


function readCSV() {
    let csvContent = fs.readFileSync('data.csv','utf8').split("\n");
    // skip header.
    if(csvContent[0].includes("timestamp_start")){
      csvContent.shift();
    }
    let csvDict = {};
    csvContent.forEach( line=>  {
      // ingnore last line.
      if(line=="" || line==",,,,,"){return;}
      let fields = line.split(",");
      if(fields.length==6) {
        let rowDict = parseField(fields, true);
        csvDict[rowDict["key"]] = rowDict;
      }

    });
    return csvDict;
}

function parseField(fields, isCSV) {
  if(isCSV) {
    let startTS = fields[0];
    let endTS = fields[1];
    let startTime = new Date(startTS*1000).addHours(8).toISOString().replace(/T/g, " ").split(".")[0];
    startTime = startTime.split(":")
    startTime.pop();
    startTime = `${startTime[0]}:${startTime[1]}`;
    let endTime = new Date(endTS*1000).addHours(8).toISOString().split("T")[1].split(".")[0];
    endTime = endTime.split(":")
    endTime.pop();
    endTime = `${endTime[0]}:${endTime[1]}`;
    let key = `${startTime}~${endTime}`;
    let unique_record_hourly = fields[2];
    let record_hourly = fields[3];
    let total_unique_record = fields[4];
    let total_record = fields[5];
    return {
      key: key,
      startTime: startTime,
      endTime: endTime,
      unique_record_hourly: unique_record_hourly,
      record_hourly: record_hourly,
      total_unique_record: total_unique_record,
      total_record: total_record
    }
  } else {
    let startTime = fields[0].split("~")[0];
    let endTime = fields[0].split("~")[1]
    let key = fields[0];
    let unique_record_hourly = fields[1];
    let record_hourly = fields[2];
    let total_unique_record = fields[3];
    let total_record = fields[4];
    return {
      key: key,
      startTime: startTime,
      endTime: endTime,
      unique_record_hourly: unique_record_hourly,
      record_hourly: record_hourly,
      total_unique_record: total_unique_record,
      total_record: total_record
    }
  }
}


module.exports = {
  start
}; 
