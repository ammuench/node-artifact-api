import { ArtifactCache } from './modules/cache';
import { ArtifactCard, CardApi, CardPreflight, CardSet, CardSetResponse, ImageObj, Reference, TextObj } from './modules/cards';
import { ArtifactDeck, ArtifactDeckDecoder, DeckApi, DeckCard, DeckHero } from './modules/decks';

// Export Interfaces
export { ArtifactCard, ArtifactDeck, CardPreflight, CardSet, CardSetResponse, DeckCard, DeckHero, ImageObj, Reference, TextObj };

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
 * @param {Array<string>} searchSets (OPTIONAL): Array of sets to search for card in.  Used for expanding the hardcoded base set, or limiting your scope of ID search
 * @returns {Promise<ArtifactCard>}
 */
export const getCard = async (cardId: string, searchSets?: string[], clearCache: boolean = false): Promise<ArtifactCard> => cardApi.getCard(cardId, searchSets, clearCache);

/**
 * Fetches all cards for a given Set Id
 *
 * @param {string} setId ID value for desired set
 * @returns {Promise<CardSetResponse>}
 */
export const getSet = async (setId: string, clearCache: boolean = false): Promise<CardSetResponse> => cardApi.getSet(setId, clearCache);
