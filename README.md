# Node Artifact Api
This is a node wrapper for the [official Valve Artifact API](https://github.com/ValveSoftware/ArtifactDeckCode), with Typescript support

**Installation**

Install with NPM

```bash
npm i --save node-artifact-api
```

import singular methods, or full api as object

```javascript
import { getDeck, getSet } from 'node-artifact-api';

// OR

import * as ArtifactApi from 'node-artifact-api';
```

then use any of the methods below.

Project written in Typescript and has types support out of the box.

## Features

Features are pretty basic right now:

* Fetching card set by ID
* Decoding deck codes

More is coming soon, especially once the Beta is released on the 19th and I can play with the client directly for more test data.

[For a full API Guide, click here](https://github.com/ammuench/node-artifact-api/blob/master/API.md)

## Feature Roadmap
The following is a list of features planned for release with this API in the coming weeks:

* Individual Card Fetching (Not Started)
* System for passing a "caching" middleware (Not Started)
* ~~Deck Decoding~~ (**Done in v0.2.0!**)
* Deck Encoding (Not Started)

## Contributors
Feel free to open a PR or log an issue if you would work on this repo.  

Thank you to the following people for contributing so far!

* [seanmadi](https://github.com/seanmadi)