import fetch from 'node-fetch';

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
class CArtifactDeckDecoder {
    public $s_nCurrentVersion = 2;
    private $sm_rgchEncodedPrefix = 'ADC';
    // returns array('heroes' => array(id, turn), 'cards' => array(id, count), 'name' => name)
    public ParseDeck($strDeckCode: string) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        if (!$deckBytes) {
            return false;
        }
        const $deck = this.ParseDeckInternal($strDeckCode, $deckBytes);
        return $deck;
    }
    public RawDeckBytes($strDeckCode: string) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        return $deckBytes;
    }

    private DecodeDeckString($strDeckCode: string) {
        // Check for prefix
        if (substr($strDeckCode, 0, strlen(this.$sm_rgchEncodedPrefix)) != this.$sm_rgchEncodedPrefix) {
            return false;
        }
        // strip prefix from deck code
        let $strNoPrefix = substr($strDeckCode, strlen(this.$sm_rgchEncodedPrefix));
        // deck strings are base64 but with url compatible strings, put the URL special chars back
        const $search = array('-', '_');
        const $replace = array('/', '=');
        $strNoPrefix = str_replace($search, $replace, $strNoPrefix);
        const $decoded = base64_decode($strNoPrefix);
        return JSON.parse('C*', $decoded);  // TODO: investigate if JSON.parse and unpack are equivalent
    }

    //reads out a var-int encoded block of bits, returns true if another chunk should follow
    private ReadBitsChunk($nChunk: any, $nNumBits: any, $nCurrShift: any, $nOutBits: any) {
        const $nContinueBit = (1 << $nNumBits);
        const $nNewBits = $nChunk & ($nContinueBit - 1);
        $nOutBits |= ($nNewBits << $nCurrShift);
        return ($nChunk & $nContinueBit) != 0;
    }
    private ReadVarEncodedUint32($nBaseValue: any, $nBaseBits: any, $data: any, $indexStart: any, $indexEnd: any, $outValue: any) {
        $outValue = 0;
        let $nDeltaShift = 0;
        if (($nBaseBits == 0) || this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue)) {
            $nDeltaShift += $nBaseBits;
            while (1) {
                // do we have more room?
                if ($indexStart > $indexEnd) {
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
        // end of the memory block?
        if ($indexStart > $indexEnd) {
            return false;
        }
        // header contains the count (2 bits), a continue flag, and 5 bits of offset data. If we have 11 for the count bits we have the count
        // encoded after the offset
        const $nHeader = $data[$indexStart++];
        const $bHasExtendedCount = (($nHeader >> 6) == 0x03);
        // read in the delta, which has 5 bits in the header, then additional bytes while the value is set
        const $nCardDelta = 0;
        if (!this.ReadVarEncodedUint32($nHeader, 5, $data, $indexStart, $indexEnd, $nCardDelta)) {
            return false;
        }
        this.$nOutCardID = $nPrevCardBase + $nCardDelta;
        // now parse the count if we have an extended count
        if ($bHasExtendedCount) {
            if (!this.ReadVarEncodedUint32(0, 0, $data, $indexStart, $indexEnd, $nOutCount)) {
                return false;
            }
        } else {
            // the count is just the upper two bits + 1 (since we don't encode zero)
            const $nOutCount = ($nHeader >> 6) + 1;
        }
        // update our previous card before we do the remap, since it was encoded without the remap
        this.$nPrevCardBase = $nOutCardID;
        return true;
    }
    private ParseDeckInternal($strDeckCode: any, $deckBytes: any) {
        let $nCurrentByteIndex = 1;
        const $nTotalBytes = count($deckBytes);
        // check version num
        const $nVersionAndHeroes = $deckBytes[$nCurrentByteIndex++];
        const $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1)
            return false;
        // do checksum check
        const $nChecksum = $deckBytes[$nCurrentByteIndex++];
        let $nStringLength = 0;
        if ($version > 1) {
            $nStringLength = $deckBytes[$nCurrentByteIndex++];
        }
        const $nTotalCardBytes = $nTotalBytes - $nStringLength;
        // grab the string size
        {
            let $nComputedChecksum = 0;
            for (let $i = $nCurrentByteIndex; $i <= $nTotalCardBytes; $i++) {
                $nComputedChecksum += $deckBytes[$i];
            }
            const $masked = ($nComputedChecksum & 0xFF);
            if ($nChecksum != $masked) {
                return false;
            }
        }
        // read in our hero count (part of the bits are in the version, but we can overflow bits here
        const $nNumHeroes = 0;
        if (!this.ReadVarEncodedUint32($nVersionAndHeroes, 3, $deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nNumHeroes)) {
            return false;
        }
        // now read in the heroes
        const $heroes: any[] = [];
        const $nPrevCardBase = 0;
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            const $nHeroTurn = 0;
            const $nHeroCardID = 0;
            if (!this.ReadSerializedCard($deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nPrevCardBase, $nHeroTurn, $nHeroCardID)) {
                return false;
            }
            array_push($heroes, array('id' => $nHeroCardID, 'turn' => $nHeroTurn));
        }
        const $cards: any[] = [];
        const $nPrevCardBase = 0;
        while ($nCurrentByteIndex <= $nTotalCardBytes) {
            const $nCardCount = 0;
            const $nCardID = 0;
            if (!this.ReadSerializedCard($deckBytes, $nCurrentByteIndex, $nTotalBytes, $nPrevCardBase, $nCardCount, $nCardID)) {
                return false;
            }
            array_push($cards, array('id' => $nCardID, 'count' => $nCardCount));
        }
        const $name = '';
        if ($nCurrentByteIndex <= $nTotalBytes) {
            const $bytes = array_slice($deckBytes, -1 * $nStringLength);
            let $name = implode(array_map('chr', $bytes));
            // replace strip_tags with an HTML sanitizer or escaper as needed.
            $name = strip_tags($name);
        }
        return array('heroes' => $heroes, 'cards' => $cards, 'name' => $name);
    }
};
/* tslint:enable */
