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
class DeckApi {
    constructor() {
        this.API_ROOT = 'https://playartifact.com/d/';
    }
    getDeck(deckId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deckUrl = `${this.API_ROOT}${deckId}`;
                const deck = yield node_fetch_1.default(deckUrl);
                return deck.json();
            }
            catch (error) {
                console.log(error);
                throw Error(`Error while fetching deck: ${JSON.stringify(error)}`);
            }
        });
    }
}
exports.DeckApi = DeckApi;
