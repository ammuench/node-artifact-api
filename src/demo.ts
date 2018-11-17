/* tslint:disable */
import { getCard, getSet } from './index';

const testGetSet = async (setId: string, cache: boolean = false) => {
    try {
        const testSet = await getSet(setId, cache);
        console.log(testSet.card_set.version);
        // testSet.card_set.card_list.forEach((card, i) => {
        //     if (i === 7) {
        //         console.log(card.card_id);
        //     }
        // });
    } catch (e) {
        console.log('e');
    }
};

const testGetCard = async (cache: boolean) => {
    try {
        const tCard = await getCard('10006', null, cache);
        console.log(tCard.card_name.english);
        // getCard('asddfjas;ldfjas;ldjf;aslds').then((res) => { console.log(res); })
    } catch (e) {
        console.log('e');
    }
}

// testGetCard();

// TIMER TEST
console.time('nocache');
testGetSet('00', false);
console.timeEnd('nocache');
setTimeout(() => {
    console.time('yescache');
    testGetSet('00', false);
    console.timeEnd('yescache');
}, 5000);
setTimeout(() => {
    console.time('clearcache');
    testGetSet('00', true);
    console.timeEnd('clearcache');
}, 5000);
// import { decodeDeck } from './index';

// // const deck = decoder.ParseDeck('ADCJWkTZX05uwGDCRV4XQGy3QGLmqUBg4GQJgGLGgO7AaABR3JlZW4vQmxhY2sgRXhhbXBsZQ__');
// const deck = decodeDeck('ADCJQUQI30zuwEYclg2ABeF1Bu94BmWIBTEkLtAKlAZakAYmHh0JsdWUvUmVkIEV4YW1wbGU_');
// console.log(deck);
// console.log(deck.cards.length);

/* tslint:enable */
