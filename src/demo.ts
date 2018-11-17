import { getSet } from './index';

const testGetSet = async (setId: string) => {
    try {
        const testSet = await getSet(setId);
        console.log(testSet);
        testSet.card_set.card_list.forEach((card, i) => {
            if (i === 7) {
                console.log(JSON.stringify(card));
            }
        });
    } catch (e) {
        console.log(e);
    }
};

testGetSet('00');
testGetSet('01');

/* tslint:disable */
// import { decodeDeck } from './index';

// // const deck = decoder.ParseDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
// const deck = decodeDeck('ADCJQUQI30zuwEYg2ABeF1Bu94BmWIBTEkLtAKlAZakAYmHh0JsdWUvUmVkIEV4YW1wbGU_');
// console.log(deck);
// console.log(deck.cards.length);

/* tslint:enable */
