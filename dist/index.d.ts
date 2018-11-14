import { ArtifactCard, CardPreflight, CardSet, CardSetResponse, ImageObj, Reference, TextObj } from './modules/cards';
import { ArtifactDeck, ArtifactDeckDecoder, DeckCard, DeckHero } from './modules/decks';
export { ArtifactCard, ArtifactDeck, CardPreflight, CardSet, CardSetResponse, DeckCard, DeckHero, ImageObj, Reference, TextObj };
export { ArtifactDeckDecoder };
export declare const decodeDeck: (deckId: string) => ArtifactDeck;
export declare const getSet: (setId: string) => Promise<CardSetResponse>;
