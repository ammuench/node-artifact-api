// import fetch from 'node-fetch';

const atob = require('atob');
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
    private $sm_rgchEncodedPrefix = 'ADC';
    private $nOutCardID: any;
    private $nPrevCardBase: any;
    private $nTotalCardBytes: any;
    private $nCurrentByteIndex: any;

    // returns array('heroes' => array(id, turn), 'cards' => array(id, count), 'name' => name)
    public ParseDeck($strDeckCode: string) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        // console.log(`deckbytes: ${JSON.stringify($deckBytes)}`)
        if (!$deckBytes) {
            console.log(`false 34`);
            return false;
        }
        const $deck = this.ParseDeckInternal($strDeckCode, $deckBytes);
        return $deck;
    }
    public RawDeckBytes($strDeckCode: string) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        return $deckBytes;
    }

    public DecodeDeckString($strDeckCode: string) {
        // Check for prefix
        console.log($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix);
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            console.log(`false 49`);
            return false;
        }
        // strip prefix from deck code
        let $strNoPrefix = $strDeckCode.substr(this.$sm_rgchEncodedPrefix.length, $strDeckCode.length);
        // console.log($strNoPrefix);
        // deck strings are base64 but with url compatible strings, put the URL special chars back
        $strNoPrefix = $strNoPrefix.replace(/\-/g, '/');
        $strNoPrefix = $strNoPrefix.replace(/\_/g, '=');
        const decodedBytes = new Buffer($strNoPrefix, 'base64');
        // console.log(decodedBytes.toString());
        // console.log(JSON.stringify(this._unpackArray(decodedBytes)));
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
        $nOutBits |= ($nNewBits << $nCurrShift);
        return ($nChunk & $nContinueBit) != 0;
    }
    private ReadVarEncodedUint32($nBaseValue: any, $nBaseBits: any, $data: any, $indexStart: any, $indexEnd: any, $outValue: any) {
        console.log(`ReadVarEncodedUint32: ${$indexStart}, ${$indexEnd}`)
        $outValue = 0;
        let $nDeltaShift = 0;
        if (($nBaseBits == 0) || this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue)) {
            $nDeltaShift += $nBaseBits;
            while (1) {
                // do we have more room?
                if ($indexStart > $indexEnd) {
                    console.log(`false 88`)
                    return false;
                }
                // read the bits from this next byte and see if we are done
                const $nNextByte = $data[$indexStart++];
                if (!this.ReadBitsChunk($nNextByte, 7, $nDeltaShift, $outValue)) {
                    break;
                }
                $nDeltaShift += 7;
            }
        }
        return true;
    }

    // handles decoding a card that was serialized
    private ReadSerializedCard($data: any, $indexStart: any, $indexEnd: any, $nPrevCardBase: any, $nOutCount: any, $nOutCardID: any) {
        console.log(`ReadSerializedCardIN ${$nOutCount}, ${$nOutCardID}`);
        // end of the memory block?
        if ($indexStart > $indexEnd) {
            console.log(`false 106`);
            return false;
        }
        // header contains the count (2 bits), a continue flag, and 5 bits of offset data. If we have 11 for the count bits we have the count
        // encoded after the offset
        this.$nCurrentByteIndex++;
        const $nHeader = $data[this.$nCurrentByteIndex];
        const $bHasExtendedCount = (($nHeader >> 6) == 0x03);
        // read in the delta, which has 5 bits in the header, then additional bytes while the value is set
        const $nCardDelta = 0;
        if (!this.ReadVarEncodedUint32($nHeader, 5, $data, $indexStart, $indexEnd, $nCardDelta)) {
            console.log(`false 116`);
            return false;
        }
        $nOutCardID = this.$nPrevCardBase + $nCardDelta;
        // now parse the count if we have an extended count
        if ($bHasExtendedCount) {
            if (!this.ReadVarEncodedUint32(0, 0, $data, $indexStart, $indexEnd, $nOutCount)) {
                console.log(`false 123`);
                return false;
            }
        } else {
            // the count is just the upper two bits + 1 (since we don't encode zero)
            $nOutCount = ($nHeader >> 6) + 1;
        }
        // update our previous card before we do the remap, since it was encoded without the remap
        this.$nPrevCardBase = $nOutCardID;
        console.log(`ReadSerializedCard ${$nOutCount}, ${$nOutCardID}`);
        return true;
    }
    private ParseDeckInternal($strDeckCode: any, $deckBytes: any) {
        this.$nCurrentByteIndex = 0;
        const $nTotalBytes = $deckBytes.length;
        // check version num
        const $nVersionAndHeroes = $deckBytes[this.$nCurrentByteIndex++];
        const $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            console.log(`false 141`);
            return false;
        }// do checksum check
        const $nChecksum = $deckBytes[this.$nCurrentByteIndex++];
        let $nStringLength = 0;
        if ($version > 1) {
            $nStringLength = $deckBytes[this.$nCurrentByteIndex++];
        }
        this.$nTotalCardBytes = $nTotalBytes - $nStringLength;
        // grab the string size
        {
            let $nComputedChecksum = 0;
            for (let $i = this.$nCurrentByteIndex; $i < this.$nTotalCardBytes; $i++) {
                $nComputedChecksum += $deckBytes[$i];
            }
            const $masked = ($nComputedChecksum & 0xFF);
            if ($nChecksum != $masked) {
                console.log(`false 158`);
                return false;
            }
        }
        // read in our hero count (part of the bits are in the version, but we can overflow bits here
        let $nNumHeroes = 0;
        if (!this.ReadVarEncodedUint32($nVersionAndHeroes, 3, $deckBytes, this.$nCurrentByteIndex, this.$nTotalCardBytes, $nNumHeroes)) {
            console.log(`false 165`);
            return false;
        }
        console.log(`NUMHEROES: ${$nVersionAndHeroes}, ${$nNumHeroes}`)
        // now read in the heroes
        const $heroes: any[] = [];
        this.$nPrevCardBase = 0;
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            console.log($nNumHeroes);
            let $nHeroTurn = 0;
            let $nHeroCardID = 0;
            if (!this.ReadSerializedCard($deckBytes, this.$nCurrentByteIndex, this.$nTotalCardBytes, this.$nPrevCardBase, $nHeroTurn, $nHeroCardID)) {
                console.log(`false 175`);
                return false;
            }
            $heroes.push({ 'id': $nHeroCardID, 'turn': $nHeroTurn });
        }
        const $cards: any[] = [];
        this.$nPrevCardBase = 0;
        while (this.$nCurrentByteIndex <= this.$nTotalCardBytes) {
            const $nCardCount = 0;
            const $nCardID = 0;
            if (!this.ReadSerializedCard($deckBytes, this.$nCurrentByteIndex, this.$nTotalCardBytes, this.$nPrevCardBase, $nCardCount, $nCardID)) {
                console.log(`false 186`);
                return false;
            }
            $cards.push({ 'id': $nCardID, 'count': $nCardCount });
        }
        let $name = '';
        if (this.$nCurrentByteIndex <= $nTotalBytes) {
            const $bytes = $deckBytes.slice(-1 * $nStringLength);
            let $nameArray = $bytes.map((byte: number) => {
                return String.fromCharCode(byte);
            });
            $name = $nameArray.join('');
            // replace strip_tags with an HTML sanitizer or escaper as needed.
            // $name = strip_tags($name);
        }
        return { 'heroes': $heroes, 'cards': $cards, 'name': $name };
    }
};
/* tslint:enable */
