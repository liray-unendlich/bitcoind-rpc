# phored-rpc.js

[![NPM Package](https://img.shields.io/npm/v/phored-rpc.svg?style=flat-square)](https://www.npmjs.org/package/phored-rpc)

[![Build Status](https://img.shields.io/travis/liray-unendlich/phored-rpc.svg?branch=master&style=flat-square)](https://travis-ci.org/liray-unendlich/phored-rpc)

[![Coverage Status](https://img.shields.io/coveralls/liray-unendlich/phored-rpc.svg?style=flat-square)](https://coveralls.io/r/liray-unendlich/phored-rpc?branch=master)

A client library to connect to Phore Core RPC in JavaScript.

## Get Started

phored-rpc.js runs on [node](http://nodejs.org/), and can be installed via [npm](https://npmjs.org/):

```bash
npm install phored-rpc
```

## Examples

```javascript
var run = function() {
  var phorecore = require("phorecore");
  var RpcClient = require("phored-rpc");

  var config = {
    protocol: "http",
    user: "user",
    pass: "pass",
    host: "127.0.0.1",
    port: "11771"
  };

  // config can also be an url, e.g.:
  // var config = 'http://user:pass@127.0.0.1:18332';

  var rpc = new RpcClient(config);

  var txids = [];

  function showNewTransactions() {
    rpc.getRawMemPool(function(err, ret) {
      if (err) {
        console.error(err);
        return setTimeout(showNewTransactions, 10000);
      }

      function batchCall() {
        ret.result.forEach(function(txid) {
          if (txids.indexOf(txid) === -1) {
            rpc.getRawTransaction(txid);
          }
        });
      }

      rpc.batch(batchCall, function(err, rawtxs) {
        if (err) {
          console.error(err);
          return setTimeout(showNewTransactions, 10000);
        }

        rawtxs.map(function(rawtx) {
          var tx = new phorecore.Transaction(rawtx.result);
          console.log("\n\n\n" + tx.id + ":", tx.toObject());
        });

        txids = ret.result;
        setTimeout(showNewTransactions, 2500);
      });
    });
  }

  showNewTransactions();
};
```

## License

**Code released under [the MIT license](https://github.com/liray-unendlich/phorecore/blob/master/LICENSE).**

Copyright 2013-2018 BitPay, Inc.
