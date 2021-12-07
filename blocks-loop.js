var http_wrapper = require('./es_wrapper');
var params = require('./consts');
var async = require('async');

// query btcd to get actual block with a given hash
// update params on line 15 with a hash to get a different block
var tasks = [];

for (var i = 0; i < 10000; i++) {
    tasks.push((seriesCallback) => {
        console.log('fetching first new block from ES...');

        async.waterfall(
            [(done) => {
                try {
                    var blockHash = '';
                    var height = 0;

                    http_wrapper.get(params.settings.esQueries.getLatestBlock(), null)
                        .then(function (response) {
                            blockHash = response.hits.hits[0]._source.blockHash;
                            height = response.hits.hits[0]._source.blockHeight;

                            console.log('found hash ' + blockHash + ', height: ' + height);
                            done(null, blockHash);
                        });
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (blockHash, done) => {
                try {
                    var blockBody = params.settings.btcdBody("getblock", [blockHash]);

                    console.log('requesting block from btc core daemon...');
                    http_wrapper.post(params.settings.btcdHost, blockBody, params.settings.btcdHeaders)
                        .then(function (response) {
                            done(null, blockHash, response.result);
                        });
                }
                catch (e) {
                    console.log(e);
                }
            },
            (blockHash, blockObject, done) => {
                var updateObject = params.settings.esQueries.updateBlockObject(blockHash, 'processing');

                http_wrapper.post(params.settings.esQueries.updateBlockList(), updateObject, params.settings.esHeadersPost)
                    .then(function (response) {
                        done(null, blockObject);
                    });
            },
            (blockObject, done) => {
                var updateObject = params.settings.esQueries.putNewBlockListObject(blockObject.height, blockObject.nextblockhash);

                console.log('put a block hash from nextblockhash to blocks_list with status "new"');
                http_wrapper.put(params.settings.esQueries.createNewBlockOnTheList(blockObject.height), updateObject, params.settings.esHeadersPost)
                    .then(function (response) {
                        done(null, blockObject);
                    });
            },
            (blockObject, done) => {
                console.log('store a list of transactions with block number and a hash in transactions_list and set status to "new"');

                Promise.all(blockObject.tx.map(element => {
                    var transactionsList = { height: blockObject.height, blockHash: blockObject.hash, txid: element, status: 'new' };

                    console.log('  txid: ' + element);
                    return http_wrapper.put(params.settings.esQueries.createNewTransactionOnTheList(element), transactionsList, params.settings.esHeadersPost);

                })).then(function (results) {
                    done(null, blockObject);
                }).catch(function (error) {
                    console.error(error);
                    done(error);
                });
            },
            (blockObject, done) => {
                console.log('store the block in blocks table');

                http_wrapper.put(params.settings.esQueries.createNewBlock(blockObject.height), blockObject, params.settings.esHeadersPost)
                    .then(function (response) {
                        done(null, blockObject);
                    }).catch(function (error) {
                        console.error(error);
                        done(error);
                    });
            },
            (blockObject, done) => {
                console.log('update status to completed if all above were successful');

                var updateObject = params.settings.esQueries.updateBlockObject(blockObject.hash, 'completed');

                http_wrapper.post(params.settings.esQueries.updateBlockList(), updateObject, params.settings.esHeadersPost)
                    .then(function (response) {
                        done(null, blockObject.hash);
                    })
            }], function (error, result) {
                seriesCallback(null, 1);
            });
    })
}

async.series(tasks, function (error, result) {
    console.log(error);
    console.log(result);
});