# Node Artifact Api
This is a node wrapper for the [official Valve Artifact API](https://github.com/ValveSoftware/ArtifactDeckCode), with Typescript support

**Installation**

Install with NPM

```bash
npm i --save node-artifact-api
```

import singular methods, or full api as object

```javascript
import { getSet } from 'node-artifact-api';

// OR

import * as ArtifactApi from 'node-artifact-api';
```

then use any of the methods below.

Project written in typescript and has type support out of the box.


## Methods
List of methods:

* **getSet(setId: string): Promise\<CardSetResponse\>**
  * Returns CardSetResponse object, containing version info and list of cards in set

## Feature Roadmap
The following is a list of features planned for release with this API in the coming weeks:

* Individual Card Fetching (Not Started)
* System for passing a "caching" middleware (Not Started)
* Deck Decoding (Started, [work currently here](https://github.com/ammuench/node-artifact-api/tree/spike/phpwat))
  * Currently working on porting of PHP decoding logic into Javascript.  Roughly 50% done.
* Deck Encoding (Not Started)

## Contributors
Feel free to open a PR or log an issue if you would work on this repo.  

Thank you to the following people for contributing so far!

* [seanmadi](https://github.com/seanmadi)