import fetch from 'node-fetch';

export class DeckApi {
    private API_ROOT = 'https://playartifact.com/d/';

    public async getDeck(deckId: string): Promise<any> {
        try {
            const deckUrl = `${this.API_ROOT}${deckId}`;
            const deck = await fetch(deckUrl);
            return deck.json();
        } catch (error) {
            console.log(error);
            throw Error(`Error while fetching deck: ${JSON.stringify(error)}`);
        }
    }
}
