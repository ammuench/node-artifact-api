import { CardSet } from './cards';

export interface SetsCache {
    [setID: string]: CardSet;
}

export class ArtifactCache {
    private _setsCache: SetsCache;

    public getCache(setId: string): CardSet {
        try {
            const fetchedSet = this._setsCache[setId];
            if (fetchedSet) {
                return fetchedSet;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    public setCache(setId: string, setData: CardSet): void {
        this._setsCache[setId] = setData;
    }
}