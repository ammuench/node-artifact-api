import { ArtifactCard, CardApi, CardPreflight, CardSet, CardSetResponse, ImageObj, Reference, TextObj } from './modules/cards';
// import { DeckApi } from './modules/decks';

// Export Interfaces
export { ArtifactCard, CardPreflight, CardSet, CardSetResponse, ImageObj, Reference, TextObj };

const cardApi = new CardApi();
// const deckApi = new DeckApi();

// export const getDeck = async (deckId: string): Promise<any> => {
//     return deckApi.getDeck(deckId);
// };

export const getSet = async (setId: string): Promise<CardSetResponse> => {
    return cardApi.getSet(setId);
};
