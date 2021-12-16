var crypto = require("crypto-js");
var base58check = require('base58check');
var http_wrapper = require('./es_wrapper');
var params = require('./consts');
var async = require('async');

// query btcd to get an actual transaction data
var DEBUG = 0;

function pubkeyToAddress(pubkey) {
    if (DEBUG) console.log("converting pubkey " + pubkey + " to address");

    var hexParsed = crypto.enc.Hex.parse(pubkey);
    let hexSha256 = crypto.SHA256(hexParsed);

    let step1 = hexSha256.toString(crypto.enc.Hex);
    if (DEBUG) console.log(step1);

    let hexRipeMD160 = crypto.RIPEMD160(hexSha256);
    let step2 = hexRipeMD160.toString(crypto.enc.Hex);
    if (DEBUG) console.log(step2);

    // prepend "00" in front of second hexstring, it's mainnet
    let step3 = "00" + step2;
    if (DEBUG) console.log(step3);

    // looks like base58check library takes care of steps 4 - 7
    let step8 = base58check.encode(step3, "", "hex");
    if (DEBUG) console.log(step8);
    return step8;
}

var tasks = [];

for (var i = 0; i < 1000; i++) {
    tasks.push((seriesCallback) => {
        console.log('fetching first new transaction from ES...');

        async.waterfall(
            [(done) => {
                var txid = ''
                try {
                    var blockHash = '';

                    http_wrapper.get(params.settings.esQueries.getFirstTransaction())
                        .then(function (response) {
                            if (response.hits.total.value === 0) {
                                console.log("No suitable records, awaiting 10 secs");
                                new Promise(resolve => setTimeout(resolve, 10000)).then((response) => {
                                    done("retrying");
                                })();
                            } else {
                                txid = response.hits.hits[0]._source.txid;
                                blockHash = response.hits.hits[0]._source.blockHash;

                                console.log("found hashes:\n  txid: " + txid + "\n  blockHash: " + blockHash);
                                // testing
                                // txid = 'a3b0e9e7cddbbe78270fa4182a7675ff00b92872d8df7d14265a2b1e379a9d33';
                                // blockHash = '00000000b0c5a240b2a61d2e75692224efd4cbecdf6eaf4cc2cf477ca7c270e7';
                                
                                done(null, txid, blockHash);
                            }
                        })
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (txid, blockHash, done) => {
                try {
                    console.log("update transaction status to processing");
                    var updateObject = params.settings.esQueries.updateTransactionObject(txid, 'processing');

                    http_wrapper.post(params.settings.esQueries.updateTransactionList(), updateObject, params.settings.esHeadersPost)
                        .then(function (response) {
                            done(null, txid, blockHash);
                        })
                        .catch(function(error) {
                            console.log(error);
                            done(error);
                        });
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (txid, blockHash, done) => {
                try {
                    var transactionBody = params.settings.btcdBody("getrawtransaction", [txid, true, blockHash]);

                    console.log("get raw transaction from btc core...")
                    http_wrapper.post(params.settings.btcdHost, transactionBody, params.settings.btcdHeaders)
                        .then(function (response) {
                            done(null, txid, blockHash, response.result);
                        });
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (txid, blockHash, transaction, done) => {
                try {
                    console.log("process transaction and get it ready for loading");

                    var transactionObject = {};

                    if (transaction.vin[0].coinbase) {  // mined
                        var targetAddress = "";

                        if (transaction.vout[0].scriptPubKey.address) { // new transaction, contains address
                            targetAddress = transaction.vout[0].scriptPubKey.address;
                        } else {
                            let asmScript = transaction.vout[0].scriptPubKey.asm.toString();
                            let pubKey = asmScript.substring(0, asmScript.indexOf(" "));
                            targetAddress = pubkeyToAddress(pubKey);
                        }

                        transactionObject = {
                            txid: txid,
                            blockHash: blockHash,
                            fromAddressArray: null,
                            toAddressArray: [{
                                address: targetAddress,
                                quantity: transaction.vout[0].value
                            }],
                            rawTransaction: transaction
                        };

                        done(null, transactionObject);
                    } else { // from m addresses to n addresses
                        var fromAddresses = [], toAddresses = [];

                        var promises = [];
                        var txOutputs = [];
                        // console.log(transaction);
                        transaction.vin.forEach((element) => {
                            // if (DEBUG) console.log(element);
                            try {
                                //console.log(params.settings.esQueries.getPreviousTransactionById(element.txid));
                                promises.push(http_wrapper.get(params.settings.esQueries.getPreviousTransactionById(element.txid)));
                                txOutputs[element.txid] = element.vout;
                            }
                            catch (e) {
                                console.log(e);
                                done(e);
                            }
                        });

                        Promise.all(promises)
                            .then((response) => {
                                response.forEach((element) => {
                                    fromAddresses.push(element._source.toAddressArray[txOutputs[element._id]]);
                                })

                                transaction.vout.forEach((element) => {
                                    var targetAddress = "";
        
                                    if (element.scriptPubKey.address) {
                                        targetAddress = element.scriptPubKey.address;
                                    } else {
                                        let asmScript = element.scriptPubKey.asm.toString();
                                        let pubKey = asmScript.replace(" .*$", "");
                                        targetAddress = pubkeyToAddress(pubKey);
                                    }
                                    toAddresses.push({
                                        address: targetAddress,
                                        quantity: element.value
                                    });
                                });
        
                                transactionObject = {
                                    txid: txid,
                                    blockHash: blockHash,
                                    fromAddressArray: fromAddresses,
                                    toAddressArray: toAddresses,
                                    rawTransaction: transaction
                                }
        
                                done(null, transactionObject);
        
                            })
                            .catch((response) => {
                                console.log(response);
                                done(response);
                            });
                    }
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (transactionObject, done) => {
                try {
                    console.log("store transaction in transactions table");
                    http_wrapper.put(params.settings.esQueries.createNewTransaction(transactionObject.txid), transactionObject, params.settings.esHeadersPost)
                        .then(function(response){
                            done(null, transactionObject);
                        });
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            },
            (transactionObject, done) => {
                try {
                    console.log("update transaction status to completed");
                    var updateObject = params.settings.esQueries.updateTransactionObject(transactionObject.txid, 'completed');

                    http_wrapper.post(params.settings.esQueries.updateTransactionList(), updateObject, params.settings.esHeadersPost)
                        .then(function (response) {
                            done(null);
                        });
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            }
            ], function (error, result) {
                seriesCallback(error, result);
            });
    })
}

async.series(tasks, function (error, result) {
    if (error) console.log(error);
    console.log(result);
});