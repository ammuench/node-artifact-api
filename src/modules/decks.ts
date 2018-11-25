import {ArtifactDeckDecoder} from './decoder';
import {ArtifactDeckEncoder} from './encoder';

export interface ArtifactDeck {
    cards: DeckCard[];
    heroes: DeckHero[];
    name: string;
}

export interface Card {
    id: number
}

export interface DeckCard extends Card {
    count: number;
}

export interface DeckHero extends Card {
    turn: number;
}

export class DeckApi {
    private deckDecoder: ArtifactDeckDecoder;
    private deckEncoder: ArtifactDeckEncoder;
    constructor() {
        this.deckDecoder = new ArtifactDeckDecoder();
        this.deckEncoder = new ArtifactDeckEncoder();
    }

    public getDeck(deckId: string): ArtifactDeck {
        try {
            const deck: ArtifactDeck = this.deckDecoder.ParseDeck(deckId);
            return deck;
        } catch (e) {
            return {
                cards: [],
                heroes: [],
                name: 'Invalid Code',
            };
        }
    }

    public encodeDeck(deckContents: ArtifactDeck):string {
        try {
            const deckCode: string = this.deckEncoder.encodeDeck(deckContents)
            return deckCode
        } catch (e) {
            return 'Invalid deck object'
        }
    }
}


