const fs = require('fs');
const fileURL = require('./config.json').fileURL;
const updateSheet = require('./updateSheet');
const exec = require('child_process').exec;
// code for one time use. sync csv to google sheets.

function decryptFile(filename) {
    exec(`gpg --decrypt ${filename} >  data.csv`,
            (error, stdout, stderr) => {
                console.log(`${stdout}`);
                console.log(`${stderr}`);
                updateSheet.start();
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                }
    });
}


exec(`curl -O ${fileURL}`,
(error, stdout, stderr) => {
    console.log(`${stdout}`);
    console.log(`${stderr}`);
    decryptFile('lastest.csv.asc')
    if (error !== null) {
        console.log(`exec error: ${error}`);
    }
});
       
 
