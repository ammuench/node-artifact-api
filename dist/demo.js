"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decks_1 = require("./modules/decks");
const decoder = new decks_1.CArtifactDeckDecoder();
const deck = decoder.ParseDeck('ADCJQUQI30zuwEYg2ABeF1Bu94BmWIBTEkLtAKlAZakAYmHh0JsdWUvUmVkIEV4YW1wbGU_');
console.log(deck);
console.log(deck.cards.length);
