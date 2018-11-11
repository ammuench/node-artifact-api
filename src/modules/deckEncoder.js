class CArtifactDeckEncoder {
    static encodeDeck (deckContents) {
        if (!deckContents) throw Error("no deck contents passed");

        let bytes = this.encodeBytes(deckContents);
        
        
        if (!bytes) return false;
        let deckCode = this.encodeBytesToString(bytes);
        
        
        return deckCode;
    }

    static encodeBytes(deckContents) {      
        if (!this.isSet(deckContents) || !this.isSet(deckContents.heroes) || !this.isSet(deckContents.cards)) {
            throw Error("deck content, heroes, or cards not a set");
        }


        deckContents.heroes.sort(this.sortByCardId);
        deckContents.cards.sort(this.sortByCardId);

        let countHeroes = deckContents.heroes;
        let allCards = countHeroes.concat(deckContents.cards);

        let bytes = [];
        let version = this.currentVersion << 4 | this.extractNBitsWithCarry(countHeroes, 3);
        if (!this.addByte(bytes, version)) return false;

        let dummyChecksum = 0;
        let checkSumByte = bytes.length;
        if (!this.addByte(bytes, dummyChecksum)) return false;

        let nameLen = 0;
        //let name = "";
        if (this.isSet(deckContents.name)) {
            var name = deckContents.name.replace(/<(?:.|\n)*?>/gm, '');//may need to init name on this line instead of 36. need again in line 112
            let trimLength = name.length;

            while (trimLength > 63) {
                let amountToTrim = Math.floor((trimLength - 63) / 4);
                amountToTrim = amountToTrim > 1 ? amountToTrim : 1;
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
            let card = allCards[currHero]
            if (card.turn == 0) return false;

            if (!this.addCardToBuffer(card.turn, card.id - prevCardId, bytes, unCheckSum)) return false;
            prevCardId = card.id;
        }

        let preStringByteCount = bytes.length;
        let nameBytes = Buffer.from(name).values();
        for (let nameByte of nameBytes) {
            if (!this.addByte(bytes, nameByte)) return false;
        }

        let unFullChecksum = this.computeChecksum(bytes, preStringByteCount - this.headerSize);
        let unSmallChecksum = (unFullChecksum & 0x0FF);

        bytes[checkSumByte] = unSmallChecksum;
        return bytes;


    }
    
    static encodeBytesToString(bytes) {
        let byteCount = bytes.length;

        if (byteCount == 0) return false;

        let packed = Buffer(bytes, 'binary');
        let encoded = Buffer.from(packed).toString('base64');
        let deckString = this.encodedPrefix + encoded;

        deckString = deckString.replace(/\//g, "_");
        deckString = deckString.replace(/_/g, "=");

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