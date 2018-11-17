import fetch from 'node-fetch';

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
    english: string;
}

export interface ImageObj {
    default: string;
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
    private _cache: ArtifactCache;

    constructor(cache: ArtifactCache) {
        this._cache = cache;
    }

    public async getSet(setId: string): Promise<CardSetResponse> {
        try {
            const preflightUrl = `${this.API_ROOT}${setId}`;
            const preflight: any = await this._fetchPreflight(preflightUrl);
            const cardUrl = `${preflight.cdn_root}${preflight.url.substring(1, preflight.url.length)}`;
            const cardset = await fetch(cardUrl);
            const cardsetJson = cardset.json();
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
