// import fetch from 'node-fetch';

const qunpack = require('qunpack');

// export class DeckApi {
//     private API_ROOT = 'https://playartifact.com/d/';

//     public async getDeck(deckId: string): Promise<any> {
//         try {
//             const deckUrl = `${this.API_ROOT}${deckId}`;
//             const deck = await fetch(deckUrl);
//             return deck.json();
//         } catch (error) {
//             console.log(error);
//             throw Error(`Error while fetching deck: ${JSON.stringify(error)}`);
//         }
//     }
// }

/* tslint:disable */
// Basic Deck decoder
export class CArtifactDeckDecoder {
    public $s_nCurrentVersion = 2;
    private $sm_rgchEncodedPrefix = "ADC";

    private $deckBytes: any;

    //returns array("heroes" => array(id, turn), "cards" => array(id, count), "name" => name)
    public ParseDeck($strDeckCode: string) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        if (!this.$deckBytes) {
            return false;
        }

        let $deck = this.ParseDeckInternal($strDeckCode);
        return $deck;
    }

    public RawDeckBytes($strDeckCode: string) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        return this.$deckBytes;
    }


    private DecodeDeckString($strDeckCode: string) {
        // Check for prefix
        console.log($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix);
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            return false;
        }
        // strip prefix from deck code
        let $strNoPrefix = $strDeckCode.substr(this.$sm_rgchEncodedPrefix.length, $strDeckCode.length);
        // deck strings are base64 but with url compatible strings, put the URL special chars back
        $strNoPrefix = $strNoPrefix.replace(/\-/g, '/');
        $strNoPrefix = $strNoPrefix.replace(/\_/g, '=');
        const decodedBytes = new Buffer($strNoPrefix, 'base64');
        return this._unpackArray(decodedBytes);
    }

    private _unpackArray(strBuffer: Buffer): any[] {
        const unpackedArray: any[] = [];
        for (let i = 0, len = strBuffer.length; i < len; i++) {
            const unpack = qunpack.unpack('C*', strBuffer, i);
            unpackedArray.push(...unpack);
        }
        return unpackedArray;
    }

    //reads out a var-int encoded block of bits, returns true if another chunk should follow
    private ReadBitsChunk($nChunk: any, $nNumBits: any, $nCurrShift: any, $nOutBits: any) {
        const $nContinueBit = (1 << $nNumBits);
        const $nNewBits = $nChunk & ($nContinueBit - 1);
        $nOutBits = $nOutBits || ($nNewBits << $nCurrShift);

        return ($nChunk & $nContinueBit) != 0;
    }

    private ReadVarEncodedUint32($nBaseValue: any, $nBaseBits: any, $data: any, $indexStart: any, $indexEnd: any, $outValue: any) {
        $outValue = 0;

        let $nDeltaShift = 0;
        if (($nBaseBits == 0) || this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue)) {
            $nDeltaShift += $nBaseBits;

            while (1) {
                //do we have more room?
                if ($indexStart > $indexEnd) {
                    return false;
                }
                //read the bits from this next byte and see if we are done
                let $nNextByte = $data[$indexStart++];
                if (!this.ReadBitsChunk($nNextByte, 7, $nDeltaShift, $outValue)) {
                    break;
                }

                $nDeltaShift += 7;
            }
        }

        return true;
    }


    //handles decoding a card that was serialized
    private ReadSerializedCard($data: any, $indexStart: any, $indexEnd: any, $nPrevCardBase: any, $nOutCount: any, $nOutCardID: any) {
        //end of the memory block?
        if ($indexStart > $indexEnd) {
            return false;
        }

        //header contains the count (2 bits), a continue flag, and 5 bits of offset data. If we have 11 for the count bits we have the count
        //encoded after the offset
        let $nHeader = $data[$indexStart++];
        let $bHasExtendedCount = (($nHeader >> 6) == 0x03);

        //read in the delta, which has 5 bits in the header, then additional bytes while the value is set
        let $nCardDelta = 0;
        if (!this.ReadVarEncodedUint32($nHeader, 5, $data, $indexStart, $indexEnd, $nCardDelta))
            return false;

        $nOutCardID = $nPrevCardBase + $nCardDelta;

        //now parse the count if we have an extended count
        if ($bHasExtendedCount) {
            if (!this.ReadVarEncodedUint32(0, 0, $data, $indexStart, $indexEnd, $nOutCount))
                return false;
        }
        else {
            //the count is just the upper two bits + 1 (since we don't encode zero)
            $nOutCount = ($nHeader >> 6) + 1;
        }

        //update our previous card before we do the remap, since it was encoded without the remap
        $nPrevCardBase = $nOutCardID;
        return true;
    }

    private ParseDeckInternal($strDeckCode: string) {
        let $nCurrentByteIndex = 0; // Switched to 0 index
        let $nTotalBytes = this.$deckBytes.length;

        //check version num
        // $nCurrentByteIndex = $nCurrentByteIndex++;
        let $nVersionAndHeroes = this.$deckBytes[$nCurrentByteIndex++];
        let $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            return `false1`;
        }
        //do checksum check
        // $nCurrentByteIndex = $nCurrentByteIndex++;
        let $nChecksum = this.$deckBytes[$nCurrentByteIndex++];

        let $nStringLength = 0;
        if ($version > 1) {
            // $nCurrentByteIndex = $nCurrentByteIndex++;
            $nStringLength = this.$deckBytes[$nCurrentByteIndex++];
        }
        let $nTotalCardBytes = $nTotalBytes - $nStringLength;

        //grab the string size
        let $nComputedChecksum = 0;
        for (let $i = $nCurrentByteIndex; $i < $nTotalCardBytes; $i++) {
            $nComputedChecksum += this.$deckBytes[$i];
        }

        let $masked = ($nComputedChecksum & 0xFF);
        if ($nChecksum != $masked) {
            return `false2`;
        }



        //read in our hero count (part of the bits are in the version, but we can overflow bits here
        let $nNumHeroes = 0; // Todo setup to track changes
        if (!this.ReadVarEncodedUint32($nVersionAndHeroes, 3, this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nNumHeroes)) {
            return `false3`;
        }

        //now read in the heroes
        let $heroes: any[] = [];
        let $nPrevCardBase = 0; // TOD setup to track changes
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            let $nHeroTurn = 0;
            let $nHeroCardID = 0;
            if (!this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nPrevCardBase, $nHeroTurn, $nHeroCardID)) {
                return false;
            }

            $heroes.push({ "id": $nHeroCardID, "turn": $nHeroTurn });
        }


        let $cards: any[] = [];
        $nPrevCardBase = 0;
        while ($nCurrentByteIndex <= $nTotalCardBytes) {
            let $nCardCount = 0;
            let $nCardID = 0;
            if (!this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalBytes, $nPrevCardBase, $nCardCount, $nCardID)) {
                return false;
            }

            $cards.push({ "id": $nCardID, "count": $nCardCount });
            $nCurrentByteIndex++;
        }

        let $name = '';
        if ($nCurrentByteIndex <= $nTotalBytes) {
            const $bytes = this.$deckBytes.slice(-1 * $nStringLength);
            let $nameArray = $bytes.map((byte: number) => {
                return String.fromCharCode(byte);
            });
            $name = $nameArray.join('');
            // replace strip_tags with an HTML sanitizer or escaper as needed.
            // $name = strip_tags($name);  TODO maybe ad this in?
        }
        return { 'heroes': $heroes, 'cards': $cards, 'name': $name };
    }
}
/* tslint:enable */
