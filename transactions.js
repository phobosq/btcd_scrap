var request = require('request');

// query btcd to get an actual transaction data

var txId = '0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098';
var blockId = '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048';

var options = {
  'method': 'POST',
  'url': 'http://192.168.1.200:8332',
  'headers': {
    'Content-Type': 'text/plain',
    'Authorization': 'Basic cGhvYm9zOjE='
  },
  body: '{"jsonrpc": "1.0", "id":"curltest", "method": "getrawtransaction", "params": ["' + txId + '", true, "' + blockId + '"] }'

};

request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});

// 