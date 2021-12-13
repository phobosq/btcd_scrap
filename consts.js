const params = {
    btcdHost: 'http://192.168.1.200:8332',
    esHost: 'http://192.168.1.210:9200',
    btcdHeaders: {
        'Content-Type': 'text/plain',
        'Authorization': 'Basic cGhvYm9zOjE='
    },
    esHeadersPost: {
        'Content-Type': 'application/json'
    },
    btcdBody:(method, params) => {return {
        jsonrpc: "1.0",
        id: "curltest",
        method: method,
        params: params}
    }, // params to be filled accordingly
    esQueries: {
        getLatestBlock: () => { return params.esHost + '/block_list/_search?q=status:new&size=1&sort=blockHeight:asc' },
        updateBlockList: () => { return params.esHost + '/block_list/_update_by_query?refresh&conflicts=proceed' },
        createNewBlockOnTheList: (blockHeight) => { return params.esHost + '/block_list/block/' + blockHeight; },
        createNewTransactionOnTheList: (txid) => { return params.esHost + '/transaction_list/transaction/' + txid; },
        createNewBlock: (blockHeight) => { return params.esHost + '/blocks/block/' + blockHeight; },
        createNewTransaction: (txid) => { return params.esHost + '/transactions/transaction/' + txid; },
        updateBlockObject: (blockHash, status) => {
            return {
                "script": {
                    "source": "ctx._source.status = '" + status + "'",
                    "lang": "painless"
                },
                "query": {
                    "term": {
                        "blockHash": blockHash
                    }
                }
            };
        },
        putNewBlockListObject: (height, nextblockhash) => {
            return { "blockHeight": height + 1, "blockHash": nextblockhash, "status": "new" };
        },
        getFirstTransaction: () => { return params.esHost + '/transaction_list/_search?q=status:new,processing&size=1&sort=height:asc' },
        updateTransactionList: () => { return params.esHost + '/transaction_list/_update_by_query?refresh&conflicts=proceed' },
        updateTransactionObject: (txid, status) => {
            return {
                "script": {
                    "source": "ctx._source.status = '" + status + "'",
                    "lang": "painless"
                },
                "query": {
                    "term": {
                        "txid": txid
                    }
                }
            };
        },
        getPreviousTransactionById: (txid) => { return params.esHost +  '/transactions/transaction/' + txid; }
    }
};

exports.settings = params;