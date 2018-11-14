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
const cards_1 = require("./modules/cards");
const decks_1 = require("./modules/decks");
exports.ArtifactDeckDecoder = decks_1.ArtifactDeckDecoder;
const cardApi = new cards_1.CardApi();
const deckApi = new decks_1.DeckApi();
exports.decodeDeck = (deckId) => {
    return deckApi.getDeck(deckId);
};
exports.getSet = (setId) => __awaiter(this, void 0, void 0, function* () {
    return cardApi.getSet(setId);
});
