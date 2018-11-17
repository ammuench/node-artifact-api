import fetch from 'node-fetch';

import { SET_IDS } from '../helpers/constants';
import { ArtifactCache } from './cache';

export interface CardSetResponse {
    card_set: CardSet;
}

export interface CardSet {
    version: number;
    set_info: {
        set_id: number;
        pack_item_def: number;
        name: TextObj;
    };
    card_list: ArtifactCard[];
}

export interface ArtifactCard {
    card_id: number;
    base_card_id: number;
    card_type: string;
    card_name: TextObj;
    card_text: TextObj;
    mini_image: ImageObj;
    large_image: ImageObj;
    ingame_image: ImageObj;
    illustrator?: string;
    sub_type?: string;
    is_black?: boolean;
    is_red?: boolean;
    is_green?: boolean;
    is_blue?: boolean;
    gold_cost?: number;
    mana_cost?: number;
    attack?: number;
    hit_points: number;
    references: Reference[];
}

export interface TextObj {
    english?: string;
    german?: string;
    french?: string;
    italian?: string;
    koreana?: string;
    spanish?: string;
    schinese?: string;
    tchinese?: string;
    russian?: string;
    thai?: string;
    japanese?: string;
    portuguese?: string;
    polish?: string;
    danish?: string;
    dutch?: string;
    finnish?: string;
    norwegian?: string;
    swedish?: string;
    hungarian?: string;
    czech?: string;
    romanian?: string;
    turkish?: string;
    brazilian?: string;
    bulgarian?: string;
    greek?: string;
    ukrainian?: string;
    latam?: string;
    vietnamese?: string;
}

export interface ImageObj {
    default: string;
    german?: string;
    french?: string;
    italian?: string;
    koreana?: string;
    spanish?: string;
    schinese?: string;
    tchinese?: string;
    russian?: string;
    japanese?: string;
    brazilian?: string;
    latam?: string;
}

export interface Reference {
    card_id: number;
    ref_type: string;
    count?: number;
}

export interface CardPreflight {
    cdn_root: string;
    url: string;
    expire_time: string;
}

export class CardApi {
    private API_ROOT = 'https://playartifact.com/cardset/';
    private CACHE: ArtifactCache;

    constructor(cache: ArtifactCache) {
        this.CACHE = cache;
    }

    public async getCard(cardId: string): Promise<ArtifactCard> {
        let cacheCard = this.CACHE.getCacheCard(cardId);
        if (cacheCard) {
            return cacheCard;
        }

        // If card can't be found, load all sets into cache
        SET_IDS.forEach(async (setId) => {
            try {
                const set = await this.getSet(setId);
            } catch (e) {
                throw Error(e);
            }
        });

        cacheCard = this.CACHE.getCacheCard(cardId);

        // Check again if card exists, else throw invalid ID error
        if (cacheCard) {
            return cacheCard;
        }

        throw Error('Invalid Card ID');
    }

    public async getSet(setId: string): Promise<CardSetResponse> {
        try {
            const cacheSet = this.CACHE.getCacheSet(setId);
            if (!!cacheSet) {
                return {
                    card_set: cacheSet,
                };
            }
            const preflightUrl = `${this.API_ROOT}${setId}`;
            const preflight: CardPreflight = await this._fetchPreflight(preflightUrl);
            const cardUrl = `${preflight.cdn_root}${preflight.url.substring(1, preflight.url.length)}`;
            const cardset = await fetch(cardUrl);
            const cardsetJson: CardSetResponse = (cardset as any).json();
            this.CACHE.setCacheSet(setId, preflight, cardsetJson.card_set);
            return cardsetJson;
        } catch (error) {
            console.log(error);
            throw Error(`Error while fetching card: ${JSON.stringify(error)}`);
        }
    }

    private async _fetchPreflight(url: string): Promise<CardPreflight> {
        try {
            const prefetch: any = await fetch(url);
            const json: CardPreflight = prefetch.json();
            return json;
        } catch (error) {
            console.log(error);
            throw Error(`Error while fetching preflight: ${JSON.stringify(error)}`);
        }
    }
}
