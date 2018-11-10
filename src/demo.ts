import { getSet } from './index';

const testGetSet = async () => {
    try {
        const testSet = await getSet('00');
        console.log(testSet);
        testSet.card_set.card_list.forEach((card) => {
            console.log(card.card_name.english);
        });
    } catch (e) {
        console.log(e);
    }
};

testGetSet();

// const testGetDeck = async () => {
//     try {
//         const testDeck = await getDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
//         console.log(testDeck);
//     } catch (e) {
//         console.log(e);
//     }
// };

// testGetDeck();
