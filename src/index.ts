import { ArtifactCache, SetsCache } from './modules/cache';
import { ArtifactCard, CardApi, CardPreflight, CardSet, CardSetResponse, ImageObj, Reference, TextObj } from './modules/cards';
import { ArtifactDeck, ArtifactDeckDecoder, DeckApi, DeckCard, DeckHero } from './modules/decks';

// Export Interfaces
export { ArtifactCard, ArtifactDeck, CardPreflight, CardSet, CardSetResponse, DeckCard, DeckHero, ImageObj, Reference, SetsCache, TextObj };

// Export Deck Decoder Class Directly
export { ArtifactDeckDecoder };

const cache = new ArtifactCache();
const cardApi = new CardApi(cache);
const deckApi = new DeckApi();
/**
 * Decodes an encoded Artifact deckId into a JSON object
 *
 * @param {string} deckId Encoded deck ID string.  From playartifact.com website or Artifact client
 * @returns {ArtifactDeck}
 */
export const decodeDeck = (deckId: string): ArtifactDeck =>  deckApi.getDeck(deckId);

/**
 * Fetches a card for given Card ID
 *
 * @param {string} cardId ID value of desired card
 * @returns {Promise<ArtifactCard>}
 */
export const getCard = async (cardId: string): Promise<ArtifactCard> => cardApi.getCard(cardId);

/**
 * Fetches all cards for a given Set Id
 *
 * @param {string} setId ID value for desired set
 * @returns {Promise<CardSetResponse>}
 */
export const getSet = async (setId: string): Promise<CardSetResponse> => cardApi.getSet(setId);
