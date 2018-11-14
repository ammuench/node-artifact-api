export interface ArtifactDeck {
    cards: DeckCard[];
    heroes: DeckHero[];
    name: string;
}
export interface DeckCard {
    count: number;
    id: number;
}
export interface DeckHero {
    id: number;
    turn: number;
}
export declare class DeckApi {
    private deckDecoder;
    constructor();
    getDeck(deckId: string): ArtifactDeck;
}
export declare class ArtifactDeckDecoder {
    $s_nCurrentVersion: number;
    private $sm_rgchEncodedPrefix;
    private $deckBytes;
    ParseDeck($strDeckCode: string): ArtifactDeck;
    RawDeckBytes($strDeckCode: string): any;
    private DecodeDeckString;
    private _unpackArray;
    private ReadBitsChunk;
    private ReadVarEncodedUint32;
    private ReadSerializedCard;
    private ParseDeckInternal;
}
