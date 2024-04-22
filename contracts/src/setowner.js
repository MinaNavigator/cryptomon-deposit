"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
exports.__esModule = true;
/**
 * Configure smartcontract to be usable once deployed
 */
var promises_1 = require("fs/promises");
var o1js_1 = require("o1js");
var index_js_1 = require("./index.js");
// check command line arg
var deployAlias = process.argv[2];
if (!deployAlias)
    throw Error("Missing <deployAlias> argument.\n\nUsage:\nnode build/src/interact.js <deployAlias>\n");
Error.stackTraceLimit = 1000;
var DEFAULT_NETWORK_ID = 'testnet';
var configJson = JSON.parse(await promises_1["default"].readFile('config.json', 'utf8'));
var config = configJson.deployAliases[deployAlias];
var feepayerKeysBase58 = JSON.parse(await promises_1["default"].readFile(config.feepayerKeyPath, 'utf8'));
var zkAppKeysBase58 = JSON.parse(await promises_1["default"].readFile(config.keyPath, 'utf8'));
var feepayerKey = o1js_1.PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
var zkAppGameContractPrivateKey = o1js_1.PrivateKey.fromBase58(zkAppKeysBase58.privateKey);
var zkAppGameDepositPrivateKey = o1js_1.PrivateKey.fromBase58(zkAppKeysBase58.privateKey);
// set up Mina instance and contract we interact with
var Network = o1js_1.Mina.Network({
    // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
    // This is to ensure the backward compatibility.
    networkId: ((_a = config.networkId) !== null && _a !== void 0 ? _a : DEFAULT_NETWORK_ID),
    mina: config.url
});
// const Network = Mina.Network(config.url);
var fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
o1js_1.Mina.setActiveInstance(Network);
var feepayerAddress = feepayerKey.toPublicKey();
var zkAppGameContractAddress = zkAppGameContractPrivateKey.toPublicKey();
var zkAppGameContract = new index_js_1.GameContract(zkAppGameContractAddress);
var zkAppGameDepostiAddress = zkAppGameDepositPrivateKey.toPublicKey();
var zkAppGameDeposit = new index_js_1.GameDeposit(zkAppGameDepostiAddress);
// compile the contract to create prover keys
console.log('compile the contract...');
await index_js_1.GameContract.compile();
await index_js_1.GameDeposit.compile();
try {
    // define owner and send transaction
    console.log('build transaction and create proof...');
    var tx = await o1js_1.Mina.transaction({ sender: feepayerAddress, fee: fee }, function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            zkAppGameDeposit.setOwner(feepayerAddress);
            zkAppGameDeposit.requireSignature();
            zkAppGameContract.setOwner(feepayerAddress);
            zkAppGameContract.requireSignature();
            return [2 /*return*/];
        });
    }); });
    await tx.prove();
    console.log('send transaction...');
    var sentTx = await tx.sign([feepayerKey, zkAppGameContractPrivateKey, zkAppGameDepositPrivateKey]).send();
    if (sentTx.status === 'pending') {
        console.log('\nSuccess! Update transaction sent.\n' +
            '\nYour smart contract owner will be updated' +
            '\nas soon as the transaction is included in a block:' +
            "\n".concat(getTxnUrl(config.url, sentTx.hash)));
    }
}
catch (err) {
    console.log(err);
}
function getTxnUrl(graphQlUrl, txnHash) {
    var _a, _b;
    var txnBroadcastServiceName = (_a = new URL(graphQlUrl).hostname
        .split('.')
        .filter(function (item) { return item === 'minascan' || item === 'minaexplorer'; })) === null || _a === void 0 ? void 0 : _a[0];
    var networkName = (_b = new URL(graphQlUrl).hostname
        .split('.')
        .filter(function (item) { return item === 'berkeley' || item === 'testworld' || item === 'devnet'; })) === null || _b === void 0 ? void 0 : _b[0];
    if (txnBroadcastServiceName && networkName) {
        return "https://minascan.io/".concat(networkName, "/tx/").concat(txnHash, "?type=zk-tx");
    }
    return "Transaction hash: ".concat(txnHash);
}
