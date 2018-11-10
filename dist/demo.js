"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decks_1 = require("./modules/decks");
const decoder = new decks_1.CArtifactDeckDecoder();
const deck = decoder.ParseDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
console.log(deck);
