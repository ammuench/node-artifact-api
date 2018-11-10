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
    is_green: boolean;
    attack: number;
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
export declare class CardApi {
    private API_ROOT;
    getSet(setId: string): Promise<CardSetResponse>;
    private _fetchPreflight;
}
