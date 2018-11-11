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

/* tslint:disable */
// Basic Deck encoder
export class CArtifactDeckEncoder {
    static encodeDeck (deckContents) {
        if (!deckContents) throw Error("no deck contents passed");

        let bytes = this.encodeBytes(deckContents);            
        if (!bytes) throw Error("Failed to encode deck");
        let deckCode = this.encodeBytesToString(bytes);
        return deckCode;
    }

    static encodeBytes(deckContents) {      
        if (!this.isSet(deckContents) || !this.isSet(deckContents.heroes) || !this.isSet(deckContents.cards)) {
            throw Error("deck content, heroes, or cards not a set");
        }


        deckContents.heroes.sort(this.sortByCardId);
        deckContents.cards.sort(this.sortByCardId);
        
        let countHeroes = deckContents.heroes.length;
        let allCards = deckContents.heroes.concat(deckContents.cards);

        let bytes = [];
        let version = this.currentVersion << 4 | this.extractNBitsWithCarry(countHeroes, 3);
        if (!this.addByte(bytes, version)) return false;

        let dummyChecksum = 0;
        let checkSumByte = bytes.length;
        if (!this.addByte(bytes, dummyChecksum)) return false;

        let nameLen = 0;
        if (this.isSet(deckContents.name)) {
            var name = deckContents.name.replace(/<(?:.|\n)*?>/gm, '');
            let trimLength = name.length;

            while (trimLength > 63) {
                let amountToTrim = Math.floor((trimLength - 63) / 4);
                amountToTrim = (amountToTrim > 1) ? amountToTrim : 1;
                name = name.substring(0, name.length - amountToTrim);
                trimLength = name.length;
            }
            nameLen = name.length;
        }

        if (!this.addByte(bytes, nameLen)) return false;
        if (!this.addRemainingNumberToBuffer(countHeroes, 3, bytes)) return false;

        let unCheckSum = 0;
        let prevCardId = 0;

        for (let currHero = 0; currHero < countHeroes; currHero++) {
            let card = allCards[currHero];
            if (card.turn === 0) return false;

            if (!this.addCardToBuffer(card.turn, card.id - prevCardId, bytes, unCheckSum)) return false;
            prevCardId = card.id;
        }

        prevCardId = 0;

        for(let currCard = countHeroes; currCard < allCards.length; currCard++){
            let card = allCards[currCard];
            if (card.count === 0) return false;
            if (card.id <= 0) return false;

            if (!this.addCardToBuffer(card.count, card.id - prevCardId, bytes, unCheckSum)) return false;

            prevCardId = card.id;
        }

        let preStringByteCount = bytes.length;
        let nameBytes = Buffer.from(name).values();
        for (let nameByte of nameBytes) {
            if (!this.addByte(bytes, nameByte)) return false;
        }

        let fullChecksum = this.computeChecksum(bytes, preStringByteCount - this.headerSize);
        let smallChecksum = (fullChecksum & 0x0FF);

        bytes[checkSumByte] = smallChecksum;
        return bytes;


    }
    
    static encodeBytesToString(bytes) {
        let byteCount = bytes.length;

        if (byteCount === 0) return false;

        let packed = new Buffer(bytes, 'binary');
        let encoded = new Buffer.from(packed).toString('base64');
        let deckString = this.encodedPrefix + encoded;
        
        deckString = deckString.replace(/\//g, "-");
        deckString = deckString.replace(/=/g, "_");

        return deckString;


    }

    
    static addByte(bytes, byte) {
        if (byte > 255) return false;

        bytes.push(byte);
        return true;
    }
    
    static sortByCardId(a, b) {
        return (a.id <= b.id) ? -1 : 1;
    }
    
    static extractNBitsWithCarry(value, numBits) {
        let unLimitBit = 1 << numBits;
        let unResult = (value & (unLimitBit - 1));
        if(value  >= unLimitBit){
            unResult = unResult | unLimitBit;
        }
        return unResult;
    }
    
    static addRemainingNumberToBuffer(unValue, unAlreadyWrittenBits, bytes){
        unValue = unValue >> unAlreadyWrittenBits;
        let unNumBytes = 0;
        while(unValue > 0){
            let unNextByte = this.extractNBitsWithCarry(unValue, 7);
            unValue = unValue >> 7;
            if(!this.addByte(bytes, unNextByte)) return false;
            unNumBytes++;
        }
        return true;
    }
    
    static addCardToBuffer(unCount, unValue, bytes){
        if(unCount == 0) return false;
        let countBytesStart = bytes.length;

        let knFirstByteMaxCount = 0x03;
        let bExtendedCount = (unCount - 1) >= knFirstByteMaxCount;

        let unFirstByteCount = bExtendedCount ? knFirstByteMaxCount : (unCount - 1);
        let unFirstByte = (unFirstByteCount << 6);
        unFirstByte = unFirstByte | this.extractNBitsWithCarry(unValue, 5);

        if (!this.addByte(bytes, unFirstByte)) return false;

        if (!this.addRemainingNumberToBuffer(unValue, 5, bytes)) return false;

        if (bExtendedCount){
            if(!this.addRemainingNumberToBuffer(unCount, 0, bytes)) return false;
        }

        let countBytesEnd = bytes.length;

        if(countBytesEnd - countBytesStart > 11) return false;

        return true;
    }
    
    static computeChecksum(bytes, unNumBytes){
        let unCheckSum = 0;
        for(let unAddCheck = this.headerSize; unAddCheck < unNumBytes + this.headerSize; unAddCheck++){
            let byte = bytes[unAddCheck];
            unCheckSum+=byte;
        }
        return unCheckSum;
    }
    
    static isSet(){
        //  discuss at: http://locutus.io/php/isset/
        // original by: Kevin van Zonneveld (http://kvz.io)
        // improved by: FremyCompany
        // improved by: Onno Marsman (https://twitter.com/onnomarsman)
        // improved by: Rafał Kukawski (http://blog.kukawski.pl)

        var a = arguments;
        var l = a.length;
        var i = 0;
        var undef;

        if (l === 0) {
            throw new Error('Empty isset');
        };

        while (i !== l) {
            if (a[i] === undef || a[i] === null) {
                return false;
            };
            i++;
        }

        return true;
    }

};

CArtifactDeckEncoder.currentVersion = 2;
CArtifactDeckEncoder.encodedPrefix = "ADC";
CArtifactDeckEncoder.maxBytesForVarUint32 = 5;
CArtifactDeckEncoder.headerSize = 3;

module.exports = CArtifactDeckEncoder;
/* tslint:enable */