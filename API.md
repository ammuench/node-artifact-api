# API Guide
A quick and handy guide to the `node-artifact-api`

## Cards

* **getCard(cardId: string, searchSets?: string[], clearCache: boolean = false): Promise\<ArtifactCard\>**
  * Will fetch from in-memory cache of most recent card data, only refreshing if new card request is past the cache expire time
  * `searchSets` is an optionally supplied array of set ID strings that will override the hard-coded array set.  This can be used to speed up searches by narrowing them down to a smaller group of sets, or expanding searches to new sets if the module is every out of date.  If your card ID exists outside of supplied sets, it will return an invalid ID error
  * `clearCache` is an optionally supplied boolean (defaults to false) that clears the currently cached card and set data.  By default cache is stored in memory according to [Valve's API Guidelines](https://github.com/ValveSoftware/ArtifactDeckCode#card-set-api)
  * Returns `ArtifactCard` object, info for a singular Artifact card:
  ```typescript
    interface ArtifactCard {
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

    interface TextObj {
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

    interface ImageObj {
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

    interface Reference {
        card_id: number;
        ref_type: string;
        count?: number;
    }
  ```

## Decks

* **decodeDeck(deckId: string): ArtifactDeck**
  * Takes encoded deckId from the deckbuilder website, or Artifact client
  * Returns `ArtifactDeck` object, containing a list of `heroes` (provided as `id` and `turn`), `cards` (provided as `id` and `count`) and the deck name.
  * Will return empty arrays for `heroes` and `cards` if deck code is invalid. `name` will return as "Invalid Code".
  ```typescript
    interface ArtifactDeck {
        cards: DeckCard[];
        heroes: DeckHero[];
        name: string;
    }

    interface DeckCard {
        count: number;
        id: number;
    }

    interface DeckHero {
        id: number;
        turn: number;
    }
  ```

* **encodeDeck(deckId: ArtifactDeck): string**
  * Takes valid `ArtifactDeck` Object according to the interface above
  * Returns encoded deck string
  * Will return "Invalid Deck Object" if invalid deck is provided.


## Sets

* **getSet(setId: string, clearCache: boolean = false): Promise\<CardSetResponse\>**
  * Will fetch from in-memory cache of most recent set data, only refreshing if new set request is past the cache expire time
  * `clearCache` is an optionally supplied boolean (defaults to false) that clears the currently cached set data.  By default cache is stored in memory according to [Valve's API Guidelines](https://github.com/ValveSoftware/ArtifactDeckCode#card-set-api)
  * Returns `CardSetResponse` object, containing version info and list of cards in set
  ```typescript
    interface CardSetResponse {
        card_set: CardSet;
    }

    interface CardSet {
        version: number;
        set_info: {
            set_id: number;
            pack_item_def: number;
            name: TextObj;
        };
        card_list: ArtifactCard[];
    }

    interface ArtifactCard {
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
  ```