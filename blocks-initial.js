var request = require('request');

// query btcd to get initial block hash
var DEBUG = 1;

var options = {
  'method': 'POST',
  'url': 'http://192.168.1.200:8332',
  'headers': {
    'Content-Type': 'text/plain',
    'Authorization': 'Basic cGhvYm9zOjE='
  },
  body: '{"jsonrpc": "1.0", "id":"curltest", "method": "getblockhash", "params": [1] }'
};

request(options, function (error, response) {
  if (error) {
      console.log(error);
      throw new Error(error);
  }
  
  var responseObject = JSON.parse(response.body);

  var outputObject = { "blockHeight": 0, "blockHash": responseObject.result, "status": "new" };
  if (DEBUG) console.log(outputObject);

  // outputObject is ready, let's push it to ES
  // TODO: store in ES to start processing
  // set status to new

  var ESoptions = {
    'method': 'PUT',
    'url': 'http://192.168.1.210:9200/block_list/block/' + outputObject.blockHeight,
    body: JSON.stringify(outputObject),
    'headers': {
      'Content-Type': 'application/json'
    }
  }

  request(ESoptions, function(error, response){
    if (error) {
      console.log(error);
      throw new Error(error);
    }
    console.log(response.body);
  });
});

