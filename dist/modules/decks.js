"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const qunpack = require('qunpack');
class DeckApi {
    constructor() {
        this.deckDecoder = new ArtifactDeckDecoder();
    }
    getDeck(deckId) {
        try {
            const deck = this.deckDecoder.ParseDeck(deckId);
            return deck;
        }
        catch (e) {
            return {
                cards: [],
                heroes: [],
                name: 'Invalid Code',
            };
        }
    }
}
exports.DeckApi = DeckApi;
class ArtifactDeckDecoder {
    constructor() {
        this.$s_nCurrentVersion = 2;
        this.$sm_rgchEncodedPrefix = "ADC";
    }
    ParseDeck($strDeckCode) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        if (!this.$deckBytes) {
            throw new Error('Error Parsing Deck');
        }
        let $deck = this.ParseDeckInternal($strDeckCode);
        return $deck;
    }
    RawDeckBytes($strDeckCode) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        return this.$deckBytes;
    }
    DecodeDeckString($strDeckCode) {
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            throw new Error('Error Parsing Deck');
        }
        let $strNoPrefix = $strDeckCode.substr(this.$sm_rgchEncodedPrefix.length, $strDeckCode.length);
        $strNoPrefix = $strNoPrefix.replace(/\-/g, '/');
        $strNoPrefix = $strNoPrefix.replace(/\_/g, '=');
        const decodedBytes = new Buffer($strNoPrefix, 'base64');
        return this._unpackArray(decodedBytes);
    }
    _unpackArray(strBuffer) {
        const unpackedArray = [];
        for (let i = 0, len = strBuffer.length; i < len; i++) {
            const unpack = qunpack.unpack('C*', strBuffer, i);
            unpackedArray.push(...unpack);
        }
        return unpackedArray;
    }
    ReadBitsChunk($nChunk, $nNumBits, $nCurrShift, $nOutBits) {
        const $nContinueBit = (1 << $nNumBits);
        const $nNewBits = $nChunk & ($nContinueBit - 1);
        $nOutBits |= ($nNewBits << $nCurrShift);
        return { didPass: ($nChunk & $nContinueBit) != 0, outVal: $nOutBits };
    }
    ReadVarEncodedUint32($nBaseValue, $nBaseBits, $data, $indexStart, $indexEnd, $outValue) {
        $outValue = 0;
        let $nDeltaShift = 0;
        let chunk = this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue);
        $outValue = chunk.outVal;
        if (($nBaseBits == 0) || chunk.didPass) {
            $nDeltaShift += $nBaseBits;
            while (1) {
                if ($indexStart > $indexEnd) {
                    throw new Error('Error Parsing Deck');
                }
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
    ReadSerializedCard($data, $indexStart, $indexEnd, $nPrevCardBase, $nOutCount, $nOutCardID) {
        if ($indexStart > $indexEnd) {
            return { didIncrement: false, didPass: false };
        }
        let $nHeader = $data[$indexStart++];
        let newIndex = $indexStart;
        let $bHasExtendedCount = (($nHeader >> 6) == 0x03);
        let $nCardDelta = 0;
        const varEnc1 = this.ReadVarEncodedUint32($nHeader, 5, $data, newIndex, $indexEnd, $nCardDelta);
        newIndex = varEnc1.index;
        if (!varEnc1) {
            return { didIncrement: true, didPass: false, index: newIndex };
        }
        else {
            $nCardDelta = varEnc1.chunk.outVal;
        }
        $nOutCardID = $nPrevCardBase + $nCardDelta;
        if ($bHasExtendedCount) {
            const varEnc2 = this.ReadVarEncodedUint32(0, 0, $data, newIndex, $indexEnd, $nOutCount);
            newIndex = varEnc2.index;
            if (!varEnc2) {
                return { didIncrement: true, didPass: false, index: newIndex };
            }
            else {
                $nOutCount = varEnc2.chunk.outVal;
            }
        }
        else {
            $nOutCount = ($nHeader >> 6) + 1;
        }
        $nPrevCardBase = $nOutCardID;
        const output = {
            outCard: $nOutCardID,
            outCount: $nOutCount,
            prevCard: $nPrevCardBase,
        };
        return { didPass: true, didIncrement: true, output, index: newIndex };
    }
    ParseDeckInternal($strDeckCode) {
        let $nCurrentByteIndex = 0;
        let $nTotalBytes = this.$deckBytes.length;
        let $nVersionAndHeroes = this.$deckBytes[$nCurrentByteIndex++];
        let $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            throw new Error('Error Parsing Deck');
        }
        let $nChecksum = this.$deckBytes[$nCurrentByteIndex++];
        let $nStringLength = 0;
        if ($version > 1) {
            $nStringLength = this.$deckBytes[$nCurrentByteIndex++];
        }
        let $nTotalCardBytes = $nTotalBytes - $nStringLength;
        let $nComputedChecksum = 0;
        for (let $i = $nCurrentByteIndex; $i < $nTotalCardBytes; $i++) {
            $nComputedChecksum += this.$deckBytes[$i];
        }
        let $masked = ($nComputedChecksum & 0xFF);
        if ($nChecksum != $masked) {
            throw new Error('Error Parsing Deck');
        }
        let $nNumHeroes = 0;
        const heroNumRead32 = this.ReadVarEncodedUint32($nVersionAndHeroes, 3, this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nNumHeroes);
        if (!heroNumRead32) {
            throw new Error('Error Parsing Deck');
        }
        else {
            $nNumHeroes = heroNumRead32.chunk.outVal;
            $nCurrentByteIndex = heroNumRead32.index;
        }
        let $heroes = [];
        let $nPrevCardBase = 0;
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            let $nHeroTurn = 0;
            let $nHeroCardID = 0;
            const readSerializedOne = this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nPrevCardBase, $nHeroTurn, $nHeroCardID);
            if (!readSerializedOne.didPass) {
                break;
            }
            else if (readSerializedOne.didIncrement) {
                $nCurrentByteIndex = readSerializedOne.index;
                $nHeroCardID = readSerializedOne.output.outCard;
                $nHeroTurn = readSerializedOne.output.outCount;
                $nPrevCardBase = readSerializedOne.output.prevCard;
            }
            $heroes.push({ "id": $nHeroCardID, "turn": $nHeroTurn });
        }
        let $cards = [];
        $nPrevCardBase = 0;
        while ($nCurrentByteIndex < $nTotalCardBytes) {
            let $nCardCount = 0;
            let $nCardID = 0;
            const readSerializedTwo = this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalBytes, $nPrevCardBase, $nCardCount, $nCardID);
            if (!readSerializedTwo.didPass) {
                break;
            }
            else if (readSerializedTwo.didIncrement) {
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
            let $nameArray = $bytes.map((byte) => {
                return String.fromCharCode(byte);
            });
            $name = $nameArray.join('');
        }
        return { 'heroes': $heroes, 'cards': $cards, 'name': $name };
    }
}
exports.ArtifactDeckDecoder = ArtifactDeckDecoder;
