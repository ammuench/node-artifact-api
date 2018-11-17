import { ArtifactCard, CardPreflight, CardSet } from './cards';

export interface CardsCache {
    [cardId: string]: ArtifactCard;
}

export interface SetsCache {
    [setID: string]: {
        cacheInfo: CardPreflight;
        set: CardSet;
    };
}

export class ArtifactCache {
    private CARDS_CACHE: CardsCache = {};
    private SETS_CACHE: SetsCache = {};

    public getCacheCard(cardId: string): ArtifactCard {
        try {
            const fetchedCard = this.CARDS_CACHE[cardId];
            if (fetchedCard) {
                return fetchedCard;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    public getCacheSet(setId: string): CardSet {
        try {
            const fetchedSet = this.SETS_CACHE[setId];
            if (fetchedSet) {
                return fetchedSet.set;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    public setCacheSet(setId: string, setCacheInfo: CardPreflight, setData: CardSet): void {
        this.SETS_CACHE[setId] = {
            cacheInfo: setCacheInfo,
            set: setData,
        };

        setData.card_list.forEach((card) => {
            this.CARDS_CACHE[card.card_id] = card;
        });
    }
}
