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
import { CArtifactDeckDecoder } from './modules/decks';

const decoder = new CArtifactDeckDecoder();

const deck = decoder.ParseDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');

console.log(deck);

/* tslint:enable */

// [37, 105, 19, 101, 125, 57, 194, 187, 1, 194, 131, 9, 21, 120, 93, 1, 194, 178, 195, 157, 1, 194, 139, 194, 154, 194, 165, 1, 194, 131, 194, 129, 194, 144, 38, 1, 194, 139, 26, 3, 194, 187, 1, 194, 160, 1, 71, 114, 101, 101, 110, 47, 66, 108, 97, 99, 107, 32, 69, 120, 97, 109, 112, 108, 101]
// [37, 105, 19, 101, 125, 57, 187, 1, 131, 9, 21, 120, 93, 1, 178, 221, 1, 139, 154, 165, 1, 131, 129, 144, 38, 1, 139, 26, 3, 187, 1, 160, 1, 71, 114, 101, 101, 110, 47, 66, 108, 97, 99, 107, 32, 69, 120, 97, 109, 112, 108, 101]
