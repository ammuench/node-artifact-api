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