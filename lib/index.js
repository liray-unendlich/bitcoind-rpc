"use strict";

var http = require("http");
var https = require("https");
var url = require("url");

function decodeURL(str) {
  var parsedUrl = url.parse(str);
  var hostname = parsedUrl.hostname;
  var port = parseInt(parsedUrl.port, 10);
  var protocol = parsedUrl.protocol;
  // strip trailing ":"
  protocol = protocol.substring(0, protocol.length - 1);
  var auth = parsedUrl.auth;
  var parts = auth.split(":");
  var user = parts[0] ? decodeURIComponent(parts[0]) : null;
  var pass = parts[1] ? decodeURIComponent(parts[1]) : null;
  var opts = {
    host: hostname,
    port: port,
    protocol: protocol,
    user: user,
    pass: pass
  };
  return opts;
}

function RpcClient(opts) {
  // opts can ba an URL string
  if (typeof opts === "string") {
    opts = decodeURL(opts);
  }
  opts = opts || {};
  this.host = opts.host || "127.0.0.1";
  this.port = opts.port || 11771;
  this.user = opts.user || "user";
  this.pass = opts.pass || "pass";
  this.protocol = opts.protocol === "http" ? http : https;
  this.batchedCalls = null;
  this.disableAgent = opts.disableAgent || false;

  var isRejectUnauthorized = typeof opts.rejectUnauthorized !== "undefined";
  this.rejectUnauthorized = isRejectUnauthorized
    ? opts.rejectUnauthorized
    : true;

  if (RpcClient.config.log) {
    this.log = RpcClient.config.log;
  } else {
    this.log = RpcClient.loggers[RpcClient.config.logger || "normal"];
  }
}

var cl = console.log.bind(console);

var noop = function() {};

RpcClient.loggers = {
  none: { info: noop, warn: noop, err: noop, debug: noop },
  normal: { info: cl, warn: cl, err: cl, debug: noop },
  debug: { info: cl, warn: cl, err: cl, debug: cl }
};

RpcClient.config = {
  logger: "normal" // none, normal, debug
};

function rpc(request, callback) {
  var self = this;
  request = JSON.stringify(request);
  var auth = new Buffer(self.user + ":" + self.pass).toString("base64");

  var options = {
    host: self.host,
    path: "/",
    method: "POST",
    port: self.port,
    rejectUnauthorized: self.rejectUnauthorized,
    agent: self.disableAgent ? false : undefined
  };

  if (self.httpOptions) {
    for (var k in self.httpOptions) {
      options[k] = self.httpOptions[k];
    }
  }

  var called = false;

  var errorMessage = "Phore JSON-RPC: ";

  var req = this.protocol.request(options, function(res) {
    var buf = "";
    res.on("data", function(data) {
      buf += data;
    });

    res.on("end", function() {
      if (called) {
        return;
      }
      called = true;

      if (res.statusCode === 401) {
        callback(
          new Error(errorMessage + "Connection Rejected: 401 Unnauthorized")
        );
        return;
      }
      if (res.statusCode === 403) {
        callback(
          new Error(errorMessage + "Connection Rejected: 403 Forbidden")
        );
        return;
      }
      if (
        res.statusCode === 500 &&
        buf.toString("utf8") === "Work queue depth exceeded"
      ) {
        var exceededError = new Error(
          "Phore JSON-RPC: " + buf.toString("utf8")
        );
        exceededError.code = 429; // Too many requests
        callback(exceededError);
        return;
      }

      var parsedBuf;
      try {
        parsedBuf = JSON.parse(buf);
      } catch (e) {
        self.log.err(e.stack);
        self.log.err(buf);
        self.log.err("HTTP Status code:" + res.statusCode);
        var err = new Error(errorMessage + "Error Parsing JSON: " + e.message);
        callback(err);
        return;
      }

      callback(parsedBuf.error, parsedBuf);
    });
  });

  req.on("error", function(e) {
    var err = new Error(errorMessage + "Request Error: " + e.message);
    if (!called) {
      called = true;
      callback(err);
    }
  });

  req.setHeader("Content-Length", request.length);
  req.setHeader("Content-Type", "application/json");
  req.setHeader("Authorization", "Basic " + auth);
  req.write(request);
  req.end();
}

RpcClient.prototype.batch = function(batchCallback, resultCallback) {
  this.batchedCalls = [];
  batchCallback();
  rpc.call(this, this.batchedCalls, resultCallback);
  this.batchedCalls = null;
};

RpcClient.callspec = {
  addMultiSigAddress: "int obj str",
  addNode: "str str",
  backupWallet: "str",
  checkBudgets: "",
  clearBanned: "",
  createMasternodeBroadcast: "str str",
  createMasternodeKey: "",
  createMultiSig: "int obj",
  createRawTransaction: "obj obj",
  createWitnessAddress: "str",
  decodeMasternodeBroadcast: "str",
  decodeRawTransaction: "str",
  decodeScript: "str",
  disconnectNode: "str",
  dumpAllPrivateKeys: "",
  dumpPrivKey: "str",
  dumpWallet: "str",
  encryptWallet: "str",
  estimateFee: "int",
  estimatePriority: "int",
  exportZerocoins: "bool int",
  findSerial: "str",
  getAccount: "str",
  getAccountAddress: "str",
  getAddedNodeInfo: "bool str",
  getAddressesByAccount: "str",
  getArchivedZerocoin: "",
  getBalance: "str int bool",
  getBestBlockHash: "",
  getBlock: "str bool",
  getBlockchainInfo: "",
  getBlockCount: "",
  getBlockHashes: "int int obj",
  getBlockHash: "int",
  getBlockHeader: "str bool",
  getBlockTemplate: "",
  getBudgetInfo: "str",
  getBudgetProjection: "",
  getBudgetVotes: "str",
  getChainTips: "",
  getConnectionCount: "",
  getDifficulty: "",
  getGenerate: "",
  getHashesPerSec: "",
  getInfo: "",
  getMasternodeCount: "",
  getMasternodesOutputs: "",
  getMasternodeStatus: "",
  getMasternodeScores: "int",
  getMasternodeWinners: "",
  getMemPoolInfo: "",
  getMiningInfo: "",
  getNetTotals: "",
  getNetworkHashps: "",
  getNetworkInfo: "",
  getNewAddress: "str str",
  getNextSuperBlock: "",
  getPeerInfo: "",
  getPoolInfo: "",
  getRawChangeAddress: "str",
  getRawMemPool: "bool",
  getRawTransaction: "str int",
  getReceivedByAccount: "str int",
  getReceivedByAddress: "str int",
  getSpentZerocoinAmount: "str int",
  getStakeSplitThreshold: "",
  getStakingStatus: "",
  getTransaction: "str bool",
  getTxOut: "str int bool",
  getTxOutSetInfo: "",
  getUnconfirmedBalance: "",
  getWalletInfo: "",
  help: "str",
  importAddress: "str str bool bool",
  importPrivKey: "str str bool",
  importPubKey: "str str bool",
  importWallet: "str",
  importZerocoins: "str",
  invalidateBlock: "str",
  keyPoolRefill: "int",
  listAccounts: "int bool",
  listAddressGroupings: "",
  listBanned: "",
  listLockUnspent: "",
  listMasternodeConf: "str",
  listMasternodes: "str",
  listMintedZerocoins: "",
  listReceivedByAccount: "int bool bool",
  listReceivedByAddress: "int bool bool",
  listSinceBlock: "str int bool",
  listSpentZerocoins: "",
  listTransactions: "str int int bool",
  listUnspent: "int int obj int",
  listLockUnspent: "",
  listZerocoinAmounts: "",
  lockUnspent: "bool obj",
  makeKeyPair: "str",
  masternodeConnect: "str",
  masternodeCurrent: "",
  masternodeDebug: "",
  mintZerocoin: "int obj",
  mnBudget: "str str str", //TODO check each commands, like vote-many proposal-name passphrase
  mnBudgetRawVote: "str int str bool int str",
  mnBudgetVote: "str str str str",
  mnFinalBudget: "str str str", //TODO check each commands, like vote-many proposal-name passphrase
  move: "str str float int str",
  multiSend: "str str", //TODO check each commands
  ping: "",
  prepareBudget: "str str int int str int",
  prioritiseTransaction: "str float int",
  searchRawTransaction: "str bool int int",
  sendFrom: "str str float int str str",
  sendMany: "str obj int str",
  sendRawTransaction: "str bool bool",
  sendToAddress: "str float str str",
  sendToAddressIx: "str float str str", //TODO check what this command do
  setAccount: "str str",
  setBan: "str str int bool",
  setGenerate: "bool int",
  setMockTime: "int",
  setStakeSplitThreshold: "int",
  setTxFee: "float",
  setZphrSeed: "str",
  signMessage: "str str",
  signRawTransaction: "str str str str",
  spendZerocoin: "int bool bool int str",
  spork: "str int",
  startMasternode: "str bool str",
  stop: "",
  submitBlock: "",
  submitBudget: "str str int int str int str",
  validateAddress: "str",
  verifyMessage: "str str str",
  verifychain: "str str",
  walletLock: "",
  walletPassPhrase: "str int bool",
  walletPassphraseChange: "str str"
};

var slice = function(arr, start, end) {
  return Array.prototype.slice.call(arr, start, end);
};

function generateRPCMethods(constructor, apiCalls, rpc) {
  function createRPCMethod(methodName, argMap) {
    return function() {
      var limit = arguments.length - 1;

      if (this.batchedCalls) {
        limit = arguments.length;
      }

      for (var i = 0; i < limit; i++) {
        if (argMap[i]) {
          arguments[i] = argMap[i](arguments[i]);
        }
      }

      if (this.batchedCalls) {
        this.batchedCalls.push({
          jsonrpc: "2.0",
          method: methodName,
          params: slice(arguments),
          id: getRandomId()
        });
      } else {
        rpc.call(
          this,
          {
            method: methodName,
            params: slice(arguments, 0, arguments.length - 1),
            id: getRandomId()
          },
          arguments[arguments.length - 1]
        );
      }
    };
  }

  var types = {
    str: function(arg) {
      return arg.toString();
    },
    int: function(arg) {
      return parseFloat(arg);
    },
    float: function(arg) {
      return parseFloat(arg);
    },
    bool: function(arg) {
      return (
        arg === true ||
        arg == "1" ||
        arg == "true" ||
        arg.toString().toLowerCase() == "true"
      );
    },
    obj: function(arg) {
      if (typeof arg === "string") {
        return JSON.parse(arg);
      }
      return arg;
    }
  };

  for (var k in apiCalls) {
    var spec = [];
    if (apiCalls[k].length) {
      spec = apiCalls[k].split(" ");
      for (var i = 0; i < spec.length; i++) {
        if (types[spec[i]]) {
          spec[i] = types[spec[i]];
        } else {
          spec[i] = types.str;
        }
      }
    }
    var methodName = k.toLowerCase();
    constructor.prototype[k] = createRPCMethod(methodName, spec);
    constructor.prototype[methodName] = constructor.prototype[k];
  }
}

function getRandomId() {
  return parseInt(Math.random() * 100000);
}

generateRPCMethods(RpcClient, RpcClient.callspec, rpc);

module.exports = RpcClient;
