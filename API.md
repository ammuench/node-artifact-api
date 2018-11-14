# API Guide
A quick and handy guide to the `node-artifact-api`

## Decks

* **decodeDeck(deckId: string): ArtifactDeck**
  * Takes encoded deckId from the deckbuilder website, or Artifact client
  * Returns `ArtifactDeck` object, containing a list of `heroes` (provided as `id` and `turn`), `cards` (provided as `id` and `count`) and the deck name.
  * Will return empty arrays for `heroes` and `cards` if deck code is invalid.  `name` will return as "Invalid Code".

## Sets

* **getSet(setId: string): Promise\<CardSetResponse\>**
  * Returns `CardSetResponse` object, containing version info and list of cards in set