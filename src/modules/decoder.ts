/*

WARNING!  THERE BE DRAGONS UP AHEAD.
I spent a fair chunk of time remapping PHP functions and figuring out bitwise stuff to translate
Valve's decoder source into a JS compatible version.  It's very messy, has a bulk TSLint disable
and now that it's working I'm going to avoid touching it unless there are future changes that
break the work I've done.  As long as it works, I'm happy with it :D

If you're going to dig through it, I suggest using Valve's original PHP code from here:
https://github.com/ValveSoftware/ArtifactDeckCode/blob/master/PHP/deck_decoder.php

It's likely much easier to follow and understand without all of my disassembling and reassembling.

                         ^\    ^
                        / \\  / \
                       /.  \\/   \      |\___/|
    *----*           / / |  \\    \  __/  O  O\
    |   /          /  /  |   \\    \_\/  \     \
   / /\/         /   /   |    \\   _\/    '@___@
  /  /         /    /    |     \\ _\/       |U
  |  |       /     /     |      \\\/        |
  \  |     /_     /      |       \\  )   \ _|_
  \   \       ~-./_ _    |    .- ; (  \_ _ _,\'
  ~    ~.           .-~-.|.-*      _        {-,
   \      ~-. _ .-~                 \      /\'
    \                   }            {   .*
     ~.                 '-/        /.-~----.
       ~- _             /        >..----.\\\
           ~ - - - - ^}_ _ _ _ _ _ _.-\\\

*/
const qunpack = require('qunpack');
import { Buffer } from 'buffer';

import { ArtifactDeck } from './decks';

/**
 * Converted PHP Decoder Provided by Valve
 * Can be used to get raw deck bytes or raw deck JSON
 *
 * @export
 * @class ArtifactDeckDecoder
 */
export class ArtifactDeckDecoder {
    /* tslint:disable */
    public $s_nCurrentVersion = 2;
    private $sm_rgchEncodedPrefix = "ADC";

    private $deckBytes: any;

    //returns array("heroes" => array(id, turn), "cards" => array(id, count), "name" => name)
    public ParseDeck($strDeckCode: string): ArtifactDeck {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        if (!this.$deckBytes) {
            throw new Error('Error Parsing Deck');
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
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            throw new Error('Error Parsing Deck');
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
    private ReadBitsChunk($nChunk: number, $nNumBits: any, $nCurrShift: any, $nOutBits: any) {
        const $nContinueBit = (1 << $nNumBits);
        const $nNewBits = $nChunk & ($nContinueBit - 1);
        $nOutBits |= ($nNewBits << $nCurrShift);

        return { didPass: ($nChunk & $nContinueBit) != 0, outVal: $nOutBits };
    }

    private ReadVarEncodedUint32($nBaseValue: any, $nBaseBits: any, $data: any, $indexStart: any, $indexEnd: any, $outValue: any) {
        $outValue = 0;
        let $nDeltaShift = 0;
        let chunk = this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue);
        $outValue = chunk.outVal;

        if (($nBaseBits == 0) || chunk.didPass) {
            $nDeltaShift += $nBaseBits;

            while (1) {
                //do we have more room?
                if ($indexStart > $indexEnd) {
                    throw new Error('Error Parsing Deck');
                }
                //read the bits from this next byte and see if we are done
                let $nNextByte = $data[$indexStart++];
                chunk = this.ReadBitsChunk($nNextByte, 7, $nDeltaShift, $outValue);

                if (!chunk.didPass) {
                    break;
                }

                $outValue = chunk.outVal;

                $nDeltaShift += 7;
            }
        }

        return { didPass: true, chunk, index: $indexStart };
    }


    //handles decoding a card that was serialized
    private ReadSerializedCard($data: any, $indexStart: any, $indexEnd: any, $nPrevCardBase: any, $nOutCount: any, $nOutCardID: any) {
        //end of the memory block?
        if ($indexStart > $indexEnd) {
            return { didIncrement: false, didPass: false };
        }


        //header contains the count (2 bits), a continue flag, and 5 bits of offset data. If we have 11 for the count bits we have the count
        //encoded after the offset
        let $nHeader = $data[$indexStart++];
        let newIndex = $indexStart;
        let $bHasExtendedCount = (($nHeader >> 6) == 0x03);

        //read in the delta, which has 5 bits in the header, then additional bytes while the value is set
        let $nCardDelta = 0;
        const varEnc1: any = this.ReadVarEncodedUint32($nHeader, 5, $data, newIndex, $indexEnd, $nCardDelta);
        newIndex = varEnc1.index;
        if (!varEnc1) {
            return { didIncrement: true, didPass: false, index: newIndex };
        } else {
            $nCardDelta = varEnc1.chunk.outVal;
        }

        $nOutCardID = $nPrevCardBase + $nCardDelta;

        //now parse the count if we have an extended count
        if ($bHasExtendedCount) {
            const varEnc2: any = this.ReadVarEncodedUint32(0, 0, $data, newIndex, $indexEnd, $nOutCount);
            newIndex = varEnc2.index
            if (!varEnc2) {
                return { didIncrement: true, didPass: false, index: newIndex };
            } else {
                $nOutCount = varEnc2.chunk.outVal;
            }
        } else {
            //the count is just the upper two bits + 1 (since we don't encode zero)
            $nOutCount = ($nHeader >> 6) + 1;
        }

        //update our previous card before we do the remap, since it was encoded without the remap
        $nPrevCardBase = $nOutCardID;
        const output = {
            outCard: $nOutCardID,
            outCount: $nOutCount,
            prevCard: $nPrevCardBase,
        }
        return { didPass: true, didIncrement: true, output, index: newIndex };
    }

    private ParseDeckInternal($strDeckCode: string) {
        let $nCurrentByteIndex = 0; // Switched to 0 index
        let $nTotalBytes = this.$deckBytes.length;

        //check version num
        // $nCurrentByteIndex = $nCurrentByteIndex++;
        let $nVersionAndHeroes = this.$deckBytes[$nCurrentByteIndex++];
        let $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            throw new Error('Error Parsing Deck');
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
            throw new Error('Error Parsing Deck');
        }



        //read in our hero count (part of the bits are in the version, but we can overflow bits here
        let $nNumHeroes = 0; // Todo setup to track changes
        const heroNumRead32: any = this.ReadVarEncodedUint32($nVersionAndHeroes, 3, this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nNumHeroes);
        if (!heroNumRead32) {
            throw new Error('Error Parsing Deck');
        } else {
            $nNumHeroes = heroNumRead32.chunk.outVal;
            $nCurrentByteIndex = heroNumRead32.index;
        }

        //now read in the heroes
        let $heroes: any[] = [];
        let $nPrevCardBase = 0; // TOD setup to track changes
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            let $nHeroTurn = 0;
            let $nHeroCardID = 0;
            const readSerializedOne = this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nPrevCardBase, $nHeroTurn, $nHeroCardID);
            if (!readSerializedOne.didPass) {
                break;
            } else if (readSerializedOne.didIncrement) {
                $nCurrentByteIndex = readSerializedOne.index;
                $nHeroCardID = readSerializedOne.output.outCard;
                $nHeroTurn = readSerializedOne.output.outCount;
                $nPrevCardBase = readSerializedOne.output.prevCard;
            }

            $heroes.push({ "id": $nHeroCardID, "turn": $nHeroTurn });
        }

        let $cards: any[] = [];
        $nPrevCardBase = 0;
        while ($nCurrentByteIndex < $nTotalCardBytes) {
            let $nCardCount = 0;
            let $nCardID = 0;
            const readSerializedTwo = this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalBytes, $nPrevCardBase, $nCardCount, $nCardID);
            if (!readSerializedTwo.didPass) {
                break;
            } else if (readSerializedTwo.didIncrement) {
                $nCurrentByteIndex = readSerializedTwo.index;
                $nCardCount = readSerializedTwo.output.outCount;
                $nCardID = readSerializedTwo.output.outCard;
                $nPrevCardBase = readSerializedTwo.output.prevCard;
                $cards.push({ "id": $nCardID, "count": $nCardCount });
            }
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
    /* tslint:enable */
}
