/* tslint:disable */
import { decodeDeck, getCard } from './index';

const deck = decodeDeck('ADCJWkHJLkCChGDU3hdoN4BmwE0AVMCQQQBQ2cBlBhJlIImAUSoAQ9SQiBXb21w');
console.log(deck);
console.log(deck.cards.length);

deck.heroes.forEach((hero) => {
    getCard(hero.id.toString())
        .then((res) => {
            console.log(res.card_name.english);
        })
});

/* tslint:enable */
