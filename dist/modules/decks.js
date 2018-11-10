"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atob = require('atob');
const qunpack = require('qunpack');
class CArtifactDeckDecoder {
    constructor() {
        this.$s_nCurrentVersion = 2;
        this.$sm_rgchEncodedPrefix = 'ADC';
    }
    ParseDeck($strDeckCode) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        if (!$deckBytes) {
            console.log(`false 34`);
            return false;
        }
        const $deck = this.ParseDeckInternal($strDeckCode, $deckBytes);
        return $deck;
    }
    RawDeckBytes($strDeckCode) {
        const $deckBytes = this.DecodeDeckString($strDeckCode);
        return $deckBytes;
    }
    DecodeDeckString($strDeckCode) {
        console.log($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix);
        if ($strDeckCode.substr(0, this.$sm_rgchEncodedPrefix.length) != this.$sm_rgchEncodedPrefix) {
            console.log(`false 49`);
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
        $nOutBits |= ($nNewBits << $nCurrShift);
        return ($nChunk & $nContinueBit) != 0;
    }
    ReadVarEncodedUint32($nBaseValue, $nBaseBits, $data, $indexStart, $indexEnd, $outValue) {
        console.log(`ReadVarEncodedUint32: ${$indexStart}, ${$indexEnd}`);
        $outValue = 0;
        let $nDeltaShift = 0;
        if (($nBaseBits == 0) || this.ReadBitsChunk($nBaseValue, $nBaseBits, $nDeltaShift, $outValue)) {
            $nDeltaShift += $nBaseBits;
            while (1) {
                if ($indexStart > $indexEnd) {
                    console.log(`false 88`);
                    return false;
                }
                const $nNextByte = $data[$indexStart++];
                if (!this.ReadBitsChunk($nNextByte, 7, $nDeltaShift, $outValue)) {
                    break;
                }
                $nDeltaShift += 7;
            }
        }
        return true;
    }
    ReadSerializedCard($data, $indexStart, $indexEnd, $nPrevCardBase, $nOutCount, $nOutCardID) {
        console.log(`ReadSerializedCardIN ${$nOutCount}, ${$nOutCardID}`);
        if ($indexStart > $indexEnd) {
            console.log(`false 106`);
            return false;
        }
        this.$nCurrentByteIndex++;
        const $nHeader = $data[this.$nCurrentByteIndex];
        const $bHasExtendedCount = (($nHeader >> 6) == 0x03);
        const $nCardDelta = 0;
        if (!this.ReadVarEncodedUint32($nHeader, 5, $data, $indexStart, $indexEnd, $nCardDelta)) {
            console.log(`false 116`);
            return false;
        }
        $nOutCardID = this.$nPrevCardBase + $nCardDelta;
        if ($bHasExtendedCount) {
            if (!this.ReadVarEncodedUint32(0, 0, $data, $indexStart, $indexEnd, $nOutCount)) {
                console.log(`false 123`);
                return false;
            }
        }
        else {
            $nOutCount = ($nHeader >> 6) + 1;
        }
        this.$nPrevCardBase = $nOutCardID;
        console.log(`ReadSerializedCard ${$nOutCount}, ${$nOutCardID}`);
        return true;
    }
    ParseDeckInternal($strDeckCode, $deckBytes) {
        this.$nCurrentByteIndex = 0;
        const $nTotalBytes = $deckBytes.length;
        const $nVersionAndHeroes = $deckBytes[this.$nCurrentByteIndex++];
        const $version = $nVersionAndHeroes >> 4;
        if (this.$s_nCurrentVersion != $version && $version != 1) {
            console.log(`false 141`);
            return false;
        }
        const $nChecksum = $deckBytes[this.$nCurrentByteIndex++];
        let $nStringLength = 0;
        if ($version > 1) {
            $nStringLength = $deckBytes[this.$nCurrentByteIndex++];
        }
        this.$nTotalCardBytes = $nTotalBytes - $nStringLength;
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
        let $nNumHeroes = 0;
        if (!this.ReadVarEncodedUint32($nVersionAndHeroes, 3, $deckBytes, this.$nCurrentByteIndex, this.$nTotalCardBytes, $nNumHeroes)) {
            console.log(`false 165`);
            return false;
        }
        console.log(`NUMHEROES: ${$nVersionAndHeroes}, ${$nNumHeroes}`);
        const $heroes = [];
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
        const $cards = [];
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
            let $nameArray = $bytes.map((byte) => {
                return String.fromCharCode(byte);
            });
            $name = $nameArray.join('');
        }
        return { 'heroes': $heroes, 'cards': $cards, 'name': $name };
    }
}
exports.CArtifactDeckDecoder = CArtifactDeckDecoder;
;
