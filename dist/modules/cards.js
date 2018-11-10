"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
class CardApi {
    constructor() {
        this.API_ROOT = 'https://playartifact.com/cardset/';
    }
    getSet(setId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const preflightUrl = `${this.API_ROOT}${setId}`;
                const preflight = yield this._fetchPreflight(preflightUrl);
                const cardUrl = `${preflight.cdn_root}${preflight.url.substring(1, preflight.url.length)}`;
                const cardset = yield node_fetch_1.default(cardUrl);
                const cardsetJson = cardset.json();
                return cardsetJson;
            }
            catch (error) {
                console.log(error);
                throw Error(`Error while fetching card: ${JSON.stringify(error)}`);
            }
        });
    }
    _fetchPreflight(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prefetch = yield node_fetch_1.default(url);
                const json = prefetch.json();
                return json;
            }
            catch (error) {
                console.log(error);
                throw Error(`Error while fetching preflight: ${JSON.stringify(error)}`);
            }
        });
    }
}
exports.CardApi = CardApi;
