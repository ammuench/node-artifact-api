import { CURRENT_UNIX_TIME } from '../helpers/constants';
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

    public getCacheCard(cardId: string, clearCache: boolean = false): ArtifactCard {
        if (clearCache) {
            this.CARDS_CACHE = {};
            return null;
        }

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

    public getCacheSet(setId: string, clearCache: boolean = false): CardSet {
        if (clearCache) {
            this.SETS_CACHE = {};
            return null;
        }

        try {
            const fetchedSet = this.SETS_CACHE[setId];
            if (fetchedSet) {
                const cacheTime = parseInt(fetchedSet.cacheInfo.expire_time, 10);
                if (cacheTime > CURRENT_UNIX_TIME()) {
                    return fetchedSet.set;
                }

                return null;
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
