import {expect} from 'chai';
import {encodeDeck} from '../src/index';
// import {ArtifactDeckEncoder} from '../src/modules/encoder';

describe('Artifact Deck Api', () => {
    describe('encodeDeck function', () => {
        it('should return deck code for Green/Black Example deck', () => {
            const exampleDeck = { heroes:
                [ { id: 4005, turn: 2 },
                  { id: 10014, turn: 1 },
                  { id: 10017, turn: 3 },
                  { id: 10026, turn: 1 },
                  { id: 10047, turn: 1 } ],
                                  cards:
                [ { id: 3000, count: 2 },
                  { id: 3001, count: 1 },
                  { id: 10091, count: 3 },
                  { id: 10102, count: 3 },
                  { id: 10128, count: 3 },
                  { id: 10165, count: 3 },
                  { id: 10168, count: 3 },
                  { id: 10169, count: 3 },
                  { id: 10185, count: 3 },
                  { id: 10223, count: 1 },
                  { id: 10234, count: 3 },
                  { id: 10260, count: 1 },
                  { id: 10263, count: 1 },
                  { id: 10322, count: 3 },
                  { id: 10354, count: 3 } ],
                                  name: 'Green/Black Example' };

            expect(encodeDeck(exampleDeck)).to.be.a('string').that.equals('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
        });
        it('should return deck code for Blue/Red Example deck', () => {
            const exampleDeck = { heroes:
                [ { id: 4003, turn: 1 },
                  { id: 10006, turn: 1 },
                  { id: 10030, turn: 1 },
                  { id: 10033, turn: 3 },
                  { id: 10065, turn: 2 } ],
                                  cards:
                [ { id: 3000, count: 2 },
                  { id: 3001, count: 2 },
                  { id: 10132, count: 3 },
                  { id: 10157, count: 3 },
                  { id: 10191, count: 2 },
                  { id: 10203, count: 2 },
                  { id: 10212, count: 2 },
                  { id: 10223, count: 1 },
                  { id: 10307, count: 3 },
                  { id: 10344, count: 3 },
                  { id: 10366, count: 3 },
                  { id: 10402, count: 3 },
                  { id: 10411, count: 3 },
                  { id: 10418, count: 3 },
                  { id: 10425, count: 3 } ],
                                  name: 'Blue/Red Example' };
            expect(encodeDeck(exampleDeck)).to.be.a('string').that.equals('ADCJQUQI30zuwEYg2ABeF1Bu94BmWIBTEkLtAKlAZakAYmHh0JsdWUvUmVkIEV4YW1wbGU_');
        });
    });
});
