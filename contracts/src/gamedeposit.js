"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.__esModule = true;
exports.GameDeposit = exports.DepositData = void 0;
var o1js_1 = require("o1js");
var DepositData = /** @class */ (function (_super) {
    __extends(DepositData, _super);
    function DepositData(value) {
        return _super.call(this, value) || this;
    }
    DepositData.prototype.hash = function () {
        return o1js_1.Poseidon.hash([
            new o1js_1.Field(this.id.value),
            this.user.x,
            this.user.isOdd.toField(),
            new o1js_1.Field(this.amount.value),
        ]);
    };
    return DepositData;
}((0, o1js_1.Struct)({
    id: o1js_1.UInt64,
    user: o1js_1.PublicKey,
    amount: o1js_1.UInt64
})));
exports.DepositData = DepositData;
/**
 * Smartcontract to deposit money on cryptomon game
 */
var GameDeposit = /** @class */ (function (_super) {
    __extends(GameDeposit, _super);
    function GameDeposit() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.GameContract = (0, o1js_1.State)();
        _this.Owner = (0, o1js_1.State)();
        _this.CurrentId = (0, o1js_1.State)();
        _this.events = {
            deposit: DepositData
        };
        return _this;
    }
    GameDeposit.prototype.init = function () {
        _super.prototype.init.call(this);
        this.account.permissions.set(__assign(__assign({}, o1js_1.Permissions["default"]()), { editState: o1js_1.Permissions.signature() }));
    };
    /** Owner right to update owner or contract address receiver */
    GameDeposit.prototype.setOwner = function (newOwner) {
        return __awaiter(this, void 0, void 0, function () {
            var actualOwner, contractOwner;
            return __generator(this, function (_a) {
                actualOwner = this.Owner.getAndRequireEquals();
                contractOwner = o1js_1.Provable["if"](actualOwner.equals(o1js_1.PublicKey.empty()), newOwner, actualOwner);
                o1js_1.AccountUpdate.createSigned(contractOwner);
                this.Owner.set(newOwner);
                return [2 /*return*/];
            });
        });
    };
    /** Define the address who will receive the funds */
    GameDeposit.prototype.setContractAddress = function (contractAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var actualOwner;
            return __generator(this, function (_a) {
                actualOwner = this.Owner.getAndRequireEquals();
                // don't set is the owner is not defined
                actualOwner.isEmpty().assertFalse();
                o1js_1.AccountUpdate.createSigned(actualOwner);
                this.GameContract.set(contractAddress);
                return [2 /*return*/];
            });
        });
    };
    /** Deposit mina to the contract address, the event will be use to get amount deposited from the game */
    GameDeposit.prototype.deposit = function (amount) {
        return __awaiter(this, void 0, void 0, function () {
            var senderPublicKey, senderUpdate, contractAddress, actualId, newId, data;
            return __generator(this, function (_a) {
                // can't deposit 0
                amount.greaterThan(o1js_1.UInt64.zero).assertTrue();
                senderPublicKey = this.sender.getAndRequireSignature();
                senderUpdate = o1js_1.AccountUpdate.createSigned(senderPublicKey);
                contractAddress = this.GameContract.getAndRequireEquals();
                // don't send is the contract is not defined
                contractAddress.isEmpty().assertFalse();
                senderUpdate.send({ to: contractAddress, amount: amount });
                actualId = this.CurrentId.getAndRequireEquals();
                newId = actualId.add(1);
                data = new DepositData({ id: newId, user: senderPublicKey, amount: amount });
                this.CurrentId.set(newId);
                this.emitEvent('deposit', data);
                return [2 /*return*/];
            });
        });
    };
    __decorate([
        (0, o1js_1.state)(o1js_1.PublicKey)
    ], GameDeposit.prototype, "GameContract");
    __decorate([
        (0, o1js_1.state)(o1js_1.PublicKey)
    ], GameDeposit.prototype, "Owner");
    __decorate([
        (0, o1js_1.state)(o1js_1.UInt64)
    ], GameDeposit.prototype, "CurrentId");
    __decorate([
        o1js_1.method
    ], GameDeposit.prototype, "setOwner");
    __decorate([
        o1js_1.method
    ], GameDeposit.prototype, "setContractAddress");
    __decorate([
        o1js_1.method
    ], GameDeposit.prototype, "deposit");
    return GameDeposit;
}(o1js_1.SmartContract));
exports.GameDeposit = GameDeposit;
