import { ArtifactDeck, Card} from './decks'

export class ArtifactDeckEncoder {
    private version=  2
    private EncodedPrefix=  "ADC"
    private MaxBytesForVarUint32 =  5; // why it is there? idk
    private knHeaderSize=  3

    constructor() {

    }
    /**
     * Exprects AritfactDeck object returns a Artifact deck code
     * Signature cards for heroes SHOULD NOT be included in "cards"
     * @param { ArtifactDeck } deckContents Artifact deck object
     * @returns {string} Returns artifact deck code as a string
     */
    public encodeDeck(deckContents: ArtifactDeck) {
        if (!deckContents) {
            throw new Error("Error encoding deck")
        }
        const bytes = this.encodeBytes(deckContents)
        if (!bytes) {
            throw new Error("Error encoding deck")
        }
        const deck_code = this.encodeBytesToString(bytes);
        return deck_code;
    }
    /**
     *  Converts AritfactDeck object into array of bytes
     * @param { ArtifactDeck } deckContents Artifact deck object
     * @returns {Array<Number>} Array of bytes when error occured
     */
    private encodeBytes(deckContents: ArtifactDeck) {
        
        if (!deckContents['heroes'] || !deckContents['cards']) throw new Error("Error encoding deck");
        this.sortDeckByID(deckContents)
        
        const countHeroes = deckContents.heroes.length
        const allCards = [...deckContents['heroes'], ...deckContents['cards']]

        let bytes: Array<number> = [];
        const version = this.version << 4 | this.extractNBitsWithCarry(countHeroes, 3)
        if (!this.addByte(bytes, version)) throw new Error("Error encoding deck");

        //the checksum which will be updated at the end
        let nDummyChecksum = 0;
        const nChecksumByte = bytes.length;
        if (!this.addByte(bytes, nDummyChecksum)) throw new Error("Error encoding deck");

        // write the name size
        let nameLen = 0;
        let name
        if (deckContents['name']) {
            name = deckContents['name']
            let trimLen = name.length;
            while (trimLen > 63) {
                let amountToTrim = Math.floor((trimLen - 63) / 4);
                amountToTrim = (amountToTrim > 1) ? amountToTrim : 1;
                name = name.substring(0, name.length - amountToTrim);
                trimLen = name.length;
            }
            nameLen = name.length;
        }

        if (!this.addByte(bytes, nameLen)) throw new Error("Error encoding deck");
        if (!this.addRemainingNumberToBuffer(countHeroes, 3, bytes)) throw new Error("Error encoding deck");

        let prevCardId = 0;
        for (let unCurrHero = 0; unCurrHero < countHeroes; unCurrHero++) {
            // type any - check if there can be a class a DeckHero or something
            let card: any = allCards[unCurrHero];
            if (card['turn'] == 0)
                throw new Error("Error encoding deck");
            if (!this.addCardToBuffer(card['turn'], card['id'] - prevCardId, bytes))
                throw new Error("Error encoding deck");
            prevCardId = card['id'];
        }
		//reset our card offset
		prevCardId = 0;
		//now all of the cards
		for( let nCurrCard = countHeroes; nCurrCard < allCards.length; nCurrCard++ )
		{
			//see how many cards we can group together
			let card:any = allCards[nCurrCard];
			if( card['count'] == 0 )
				throw new Error("Error encoding deck");
			if( card['id'] <= 0 )
				throw new Error("Error encoding deck");
			//record this set of cards, and advance
			if( !this.addCardToBuffer( card['count'], card['id'] - prevCardId, bytes ) )
				throw new Error("Error encoding deck");
			prevCardId = card['id'];
		}
        // save off the pre string bytes for the checksum
        const preStringByteCount = bytes.length;
        //write the string
        {
            const nameBytes = this.unpack(name);
            for (let nameByte of nameBytes) {
                if (!this.addByte(bytes, nameByte)) throw new Error("Error encoding deck");
            }
        }
        let unFullChecksum = this.computeChecksum(bytes, preStringByteCount - this.knHeaderSize);
        let unSmallChecksum = (unFullChecksum & 0x0FF);
        bytes[nChecksumByte] = unSmallChecksum;
        return bytes;
    }
    private encodeBytesToString(bytes:Array<number>) {
        let byteCount = bytes.length;
        //if we have an empty buffer, just return
        if (byteCount == 0) throw new Error("Error encoding deck");
        const packedAndEncoded = this.packAndEncode(bytes)
        let deck_string = this.EncodedPrefix + packedAndEncoded;

        deck_string = deck_string.replace(/\//g, '-')
        deck_string = deck_string.replace(/=/g, '_')
        return deck_string;
    }


    private sortDeckByID(deck: ArtifactDeck): void {
        function sortByID(a: Card, b: Card) {
            return a.id <= b.id ? -1 : 1
        }
    
        deck['heroes'].sort(sortByID)
        deck['cards'].sort(sortByID)
    }
    
    private extractNBitsWithCarry(value: number, numBits: number) {
        const unLimitBit = 1 << numBits;
        let unResult = (value & (unLimitBit - 1));
        if (value >= unLimitBit) {
            unResult |= unLimitBit;
        }
        return unResult;
    }
    
    private addByte(bytes: Array<number>, byte: number) {
        if (byte > 255)
            throw new Error("Error encoding deck");
        bytes.push(byte);
        return true;
    }
    
    private addRemainingNumberToBuffer(unValue: number, unAlreadyWrittenBits: number, bytes: Array<number>) {
        unValue >>= unAlreadyWrittenBits;
        let unNumBytes = 0;
        while (unValue > 0) {
            const unNextByte = this.extractNBitsWithCarry(unValue, 7);
            unValue >>= 7;
            if (!this.addByte(bytes, unNextByte))
                throw new Error("Error encoding deck");
            unNumBytes++;
        }
        return true;
    }
    
    private addCardToBuffer(unCount:number, unValue:number, bytes: Array<number>) {
        //this shouldn't ever be the case
        if (unCount == 0) throw new Error("Error encoding deck");
        let countBytesStart = bytes.length;
        //determine our count. We can only store 2 bits, and we know the value is at least one, so we can encode values 1-5. However, we set both bits to indicate an 
        //extended count encoding
        let knFirstByteMaxCount = 0x03;
        let bExtendedCount = (unCount - 1) >= knFirstByteMaxCount;
        //determine our first byte, which contains our count, a continue flag, and the first few bits of our value
        let unFirstByteCount = bExtendedCount ? knFirstByteMaxCount : /*( uint8 )*/(unCount - 1);
        let unFirstByte = (unFirstByteCount << 6);
        unFirstByte |= this.extractNBitsWithCarry(unValue, 5);
        if (!this.addByte(bytes, unFirstByte))
            throw new Error("Error encoding deck");
    
        //now continue writing out the rest of the number with a carry flag
        if (!this.addRemainingNumberToBuffer(unValue, 5, bytes))
            throw new Error("Error encoding deck");
        //now if we overflowed on the count, encode the remaining count
        if (bExtendedCount) {
            if (!this.addRemainingNumberToBuffer(unCount, 0, bytes))
                throw new Error("Error encoding deck");
        }
        let countBytesEnd = bytes.length;
        if (countBytesEnd - countBytesStart > 11) {
            //something went horribly wrong
            throw new Error("Error encoding deck");
        }
        return true;
    }
    
    private unpack(str: String) {
        const binArr = []
        for (let i = 0; i < str.length; i++) {
            binArr.push(str.charCodeAt(i))
        }
        return binArr
    }


    private packAndEncode(binArr:Array<number>) {
            const buff = Buffer.from(binArr)
            const encoded = buff.toString('base64')
            return encoded
    }
    
    private computeChecksum(bytes:Array<number>, unNumBytes:number) {
        let unChecksum = 0;
        for (let unAddCheck = this.knHeaderSize; unAddCheck < unNumBytes + this.knHeaderSize; unAddCheck++) {
            let byte = bytes[unAddCheck];
            unChecksum += byte;
        }
        return unChecksum;
    }
    

}

