const path = require('path');
const fs = require('fs');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const logDirectoryPath = path.join(__dirname, 'log-files');
let logFiles = [];

fs.readdir(logDirectoryPath, function (err, files) {

  if (err) {
    return console.log('Unable to scan directory: ' + err);
  } 

  const csvWriter = createCsvWriter({
    path: 'processed-waf-logs.csv',
    header: [
      {id: 'timestamp', title: 'TimeStamp'},
      {id: 'uri', title: 'URI'},
      {id: 'action', title: 'Action'},
      {id: 'country', title: 'Country'},
      {id: 'count', title: 'Count'},
    ]
  });
  
  files.forEach(function (file) {
    console.log(file);
    if (file.indexOf('DS_Store') === -1) {
      logFiles.push(`${logDirectoryPath}/${file}`);
    }
  });

  console.log(logFiles);

  let allLogData = [];
  let csvData = [];

  logFiles.forEach( (thisFile, i) => {
    let thisFileContents = fs.readFileSync(thisFile).toString().split("\n");
    console.log(thisFileContents.length);
    allLogData.push(...thisFileContents);
  });

  console.log(allLogData.length);

  function isRedirectli(header) {
    return (header.name === 'x-request' && header.value === 'redirect.li');
  }

  for (i in allLogData) {

    if (allLogData[i].trim().length) {

      let lineJSON = JSON.parse(allLogData[i]);
      let logEntryDT = new Date(lineJSON.timestamp);
      let dateString =  
        ("0" + logEntryDT.getUTCHours()).slice(-2) + ":" + 
        ("0" + logEntryDT.getUTCMinutes()).slice(-2);
  
      const existingURI = csvData.findIndex(element => element.uri === lineJSON.httpRequest.uri);

      if (lineJSON.httpRequest.headers.find(isRedirectli) !== undefined) {
        console.log(lineJSON);
        console.log(lineJSON.httpRequest.headers);
      }

      // if (lineJSON.httpRequest.uri.includes('projects/')) {
      //   console.log(lineJSON.httpRequest.headers);
      //   console.log(lineJSON);
      // }
      
      if (existingURI === -1) {
        let csvObject = {
          timestamp: dateString,
          uri: lineJSON.httpRequest.uri,
          action: lineJSON.action,
          country: lineJSON.httpRequest.country,	
          count: 1,	
        };
        csvData.push(csvObject);
      } else {
  
        csvData[existingURI].count++;
  
        if (csvData[existingURI].timestamp.indexOf(dateString) === -1) {
          csvData[existingURI].timestamp += `|${dateString}`
        }
  
        if (csvData[existingURI].action.indexOf(lineJSON.action) === -1) {
          csvData[existingURI].action += `|${lineJSON.action}`
        }
  
        if (csvData[existingURI].country.indexOf(lineJSON.httpRequest.country) === -1) {
          csvData[existingURI].country += `|${lineJSON.httpRequest.country}`
        }
      }
    }
  }
  
  csvWriter
    .writeRecords(csvData)
    .then(()=> console.log('The CSV file was written successfully'));
});

// JSON structure per log entry:

// {
//   timestamp: 1643383390060,
//   formatVersion: 1,
//   webaclId: 'arn:aws:wafv2:us-east-1:518970837364:global/webacl/www_asheville_gov-block_unwanted_requests/e3e19fb4-629a-4ac7-a13b-ddc601261d81',
//   terminatingRuleId: 'Default_Action',
//   terminatingRuleType: 'REGULAR',
//   action: 'ALLOW',
//   terminatingRuleMatchDetails: [],
//   httpSourceName: 'CF',
//   httpSourceId: 'E315WDQGOU59T7',
//   ruleGroupList: [
//     {
//       ruleGroupId: 'AWS#AWSManagedRulesWordPressRuleSet',
//       terminatingRule: null,
//       nonTerminatingMatchingRules: [],
//       excludedRules: null
//     },
//     {
//       ruleGroupId: 'AWS#AWSManagedRulesBotControlRuleSet',
//       terminatingRule: null,
//       nonTerminatingMatchingRules: [],
//       excludedRules: null
//     }
//   ],
//   rateBasedRuleList: [],
//   nonTerminatingMatchingRules: [],
//   requestHeadersInserted: [ { name: 'x-amzn-waf-default-acl-action', value: 'coa-allow' } ],
//   responseCodeSent: null,
//   httpRequest: {
//     clientIp: '68.189.168.148',
//     country: 'US',
//     headers: [ [Object], [Object], [Object], [Object], [Object], [Object] ],
//     uri: '/wp-content/plugins/the-events-calendar/common/src/resources/js/underscore-after.js',
//     args: '',
//     httpVersion: 'HTTP/2.0',
//     httpMethod: 'GET',
//     requestId: '6TWpV2xF3uprKdne5yyvnG_KxCH495l90EJyNyaDer3E-vBPYGazAA=='
//   }
// }