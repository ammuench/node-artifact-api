"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const qunpack = require('qunpack');
class CArtifactDeckDecoder {
    constructor() {
        this.$s_nCurrentVersion = 2;
        this.$sm_rgchEncodedPrefix = "ADC";
    }
    ParseDeck($strDeckCode) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        if (!this.$deckBytes) {
            return false;
        }
        let $deck = this.ParseDeckInternal($strDeckCode);
        return $deck;
    }
    RawDeckBytes($strDeckCode) {
        this.$deckBytes = this.DecodeDeckString($strDeckCode);
        return this.$deckBytes;
    }
    DecodeDeckString($strDeckCode) {
        console.log($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix);
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            return false;
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
        $nOutBits = $nOutBits || ($nNewBits << $nCurrShift);
        return ($nChunk & $nContinueBit) != 0;
    }
    ReadVarEncodedUint32($nBaseValue, $nBaseBits, $data, $indexStart, $indexEnd, $outValue) {
        $outValue = 0;
        let $nDeltaShift = 0;
        if (($nBaseBits == 0) || this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue)) {
            $nDeltaShift += $nBaseBits;
            while (1) {
                if ($indexStart > $indexEnd) {
                    return false;
                }
                let $nNextByte = $data[$indexStart++];
                if (!this.ReadBitsChunk($nNextByte, 7, $nDeltaShift, $outValue)) {
                    break;
                }
                $nDeltaShift += 7;
            }
        }
        return true;
    }
    ReadSerializedCard($data, $indexStart, $indexEnd, $nPrevCardBase, $nOutCount, $nOutCardID) {
        if ($indexStart > $indexEnd) {
            return false;
        }
        let $nHeader = $data[$indexStart++];
        let $bHasExtendedCount = (($nHeader >> 6) == 0x03);
        let $nCardDelta = 0;
        if (!this.ReadVarEncodedUint32($nHeader, 5, $data, $indexStart, $indexEnd, $nCardDelta))
            return false;
        $nOutCardID = $nPrevCardBase + $nCardDelta;
        if ($bHasExtendedCount) {
            if (!this.ReadVarEncodedUint32(0, 0, $data, $indexStart, $indexEnd, $nOutCount))
                return false;
        }
        else {
            $nOutCount = ($nHeader >> 6) + 1;
        }
        $nPrevCardBase = $nOutCardID;
        return true;
    }
    ParseDeckInternal($strDeckCode) {
        let $nCurrentByteIndex = 0;
        let $nTotalBytes = this.$deckBytes.length;
        let $nVersionAndHeroes = this.$deckBytes[$nCurrentByteIndex++];
        let $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            return `false1`;
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
            return `false2`;
        }
        let $nNumHeroes = 0;
        if (!this.ReadVarEncodedUint32($nVersionAndHeroes, 3, this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nNumHeroes)) {
            return `false3`;
        }
        let $heroes = [];
        let $nPrevCardBase = 0;
        for (let $nCurrHero = 0; $nCurrHero < $nNumHeroes; $nCurrHero++) {
            let $nHeroTurn = 0;
            let $nHeroCardID = 0;
            if (!this.ReadSerializedCard(this.$deckBytes, $nCurrentByteIndex, $nTotalCardBytes, $nPrevCardBase, $nHeroTurn, $nHeroCardID)) {
                return false;
            }
            $heroes.push({ "id": $nHeroCardID, "turn": $nHeroTurn });
        }
        let $cards = [];
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
            let $nameArray = $bytes.map((byte) => {
                return String.fromCharCode(byte);
            });
            $name = $nameArray.join('');
        }
        return { 'heroes': $heroes, 'cards': $cards, 'name': $name };
    }
}
exports.CArtifactDeckDecoder = CArtifactDeckDecoder;
