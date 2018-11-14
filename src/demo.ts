// import { getSet } from './index';

// const testGetSet = async () => {
//     try {
//         const testSet = await getSet('00');
//         console.log(testSet);
//         testSet.card_set.card_list.forEach((card) => {
//             console.log(card.card_name.english);
//         });
//     } catch (e) {
//         console.log(e);
//     }
// };

// testGetSet();

/* tslint:disable */
import { decodeDeck } from './index';

// const deck = decoder.ParseDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
const deck = decodeDeck('ADCJQUQI30zuwEYg2ABeF1Bu94BmWIBTEkLtAKlAZakAYmHh0JsdWUvUmVkIEV4YW1wbGU_');
console.log(deck);
console.log(deck.cards.length);

/* tslint:enable */
