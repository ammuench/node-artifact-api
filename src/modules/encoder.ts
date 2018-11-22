import {ArtifactDeck,Card} from './decks'
import { stringify } from 'querystring';

function sortDeckByID(deck:ArtifactDeck):void {
    function sortByID(a:Card,b:Card) {
        return a.id <= b.id ? -1 : 1
    }

    deck['heroes'].sort(sortByID)
    deck['cards'].sort(sortByID)
}

function extractNBitsWithCarry(value:number, numBits:number) {
    const unLimitBit = 1 << numBits;
	let unResult = ( value & ( unLimitBit - 1 ) );
	if( value >= unLimitBit )
	{
		unResult |= unLimitBit;
	}
	return unResult;
}

function addByte( bytes:Array<number>, byte:number ) {
		if( byte > 255 )
			return false;
		bytes.push( byte );
		return true;
}

 function addRemainingNumberToBuffer( unValue:number, unAlreadyWrittenBits:number, bytes:Array<number> )
	{
		unValue >>= unAlreadyWrittenBits;
		let unNumBytes = 0;
		while ( unValue > 0 )
		{
			const unNextByte = extractNBitsWithCarry( unValue, 7 );
			unValue >>= 7;
			if( !addByte( bytes, unNextByte ) )
				return false;
			unNumBytes++;
		}
		return true;
    }
    
    function addCardToBuffer( unCount, unValue, bytes:Array<number> )
	{
		//this shouldn't ever be the case
		if( unCount == 0 ) return false;
		let countBytesStart = bytes.length;
		//determine our count. We can only store 2 bits, and we know the value is at least one, so we can encode values 1-5. However, we set both bits to indicate an 
		//extended count encoding
		let knFirstByteMaxCount = 0x03;
		let bExtendedCount = ( unCount - 1 ) >= knFirstByteMaxCount;
		//determine our first byte, which contains our count, a continue flag, and the first few bits of our value
		let unFirstByteCount = bExtendedCount ? knFirstByteMaxCount : /*( uint8 )*/( unCount - 1 );
		let unFirstByte = ( unFirstByteCount << 6 );
		unFirstByte |= extractNBitsWithCarry( unValue, 5 );
		if( !addByte( bytes, unFirstByte ) )
			return false;
		
		//now continue writing out the rest of the number with a carry flag
		if( !addRemainingNumberToBuffer( unValue, 5, bytes ) )
			return false;
		//now if we overflowed on the count, encode the remaining count
		if ( bExtendedCount )
		{
			if( !addRemainingNumberToBuffer( unCount, 0, bytes ) )
				return false;
		}
		let countBytesEnd = bytes.length;
		if( countBytesEnd - countBytesStart > 11 )
		{
			//something went horribly wrong
			return false;
		}
		return true;
    }
    
function unpack(str:String) {
    const binArr = []
    for (let i = 0; i < str.length;i++) {
        binArr.push(str.charCodeAt(i))
    }
    return binArr
}
function pack(binArr:Array<number>) {
    const strArr = []
    for (let byte of binArr) {
        strArr.push(String.fromCharCode(byte))
    }
    return strArr.join('')
}
function base64_encode(string) {
    const buff = new Buffer(string)
    const base64 = buff.toString('base64')
    return base64
}

function computeChecksum( bytes, unNumBytes )
	{
		let unChecksum = 0;
		for ( let unAddCheck = this.knHeaderSize; unAddCheck < unNumBytes + this.knHeaderSize; unAddCheck++ )
		{
			let byte = bytes[unAddCheck];
			unChecksum += byte;
		}
		return unChecksum;
    }
    


export class ArtifactDeckEncoder {
    static version: 2
    static sm_rgchEncodedPrefix: "ADC"
    static MaxBytesForVarUint32: 5;
    static knHeaderSize: 3
    constructor(){

    }
    //expects array("heroes" => array(id, turn), "cards" => array(id, count), "name" => name)
	//	signature cards for heroes SHOULD NOT be included in "cards"
    static encodeDeck( deckContents:ArtifactDeck ){
        if (!deckContents) {
            return false
        }
        const bytes = this.encodeBytes(deckContents)
        if (!bytes) {
            return false
        }
        const deck_code = this.encodeBytesToString( bytes );
        return deck_code;
    }
    
    static encodeBytes(deckContents:ArtifactDeck) {
        if( !deckContents['heroes'] || !deckContents['cards'] ) return false;
        sortDeckByID(deckContents)
        const countHeroes = deckContents.heroes.length
        const allCards = [...deckContents['heroes'], ...deckContents['cards']]
        
        let bytes:Array<number> = [];
        const version = this.version << 4 | extractNBitsWithCarry(countHeroes,3)
        if( !addByte( bytes, version ) ) return false;
        
        //the checksum which will be updated at the end
        let nDummyChecksum = 0;
        const nChecksumByte = bytes.length;
        if( !addByte( bytes, nDummyChecksum ) )return false;

        // write the name size
		let nameLen = 0;
		if( deckContents['name'] )
		{
            let name = deckContents['name']
			const trimLen = deckContents['name'].trim().length;
			while( trimLen > 63 )
			{
				let amountToTrim = Math.floor( (trimLen - 63) / 4 );
				amountToTrim = (amountToTrim > 1) ? amountToTrim : 1;
				name = name.substring(0, name.length - amountToTrim );
				// trimLen = name.length; // Is it necesserry?
			}
			nameLen = name.length;
        }
        
        if( !addByte( bytes, nameLen ) ) return false;
        if( !addRemainingNumberToBuffer( countHeroes, 3, bytes ) ) return false;
    
        let prevCardId = 0;
		for( let unCurrHero = 0; unCurrHero < countHeroes; unCurrHero++ )
		{
            // type any - check if there can be a class a DeckHero or something
			let card:any = allCards[ unCurrHero ];
			if( card['turn'] == 0 )
				return false;
			if( !addCardToBuffer( card['turn'], card['id'] - prevCardId, bytes ) )
				return false;
			prevCardId = card['id'];
        }
        // save off the pre string bytes for the checksum
		const preStringByteCount = bytes.length;
		//write the string
		{
			const nameBytes = unpack(name);
			for( let nameByte of nameBytes  )
			{
				if( !addByte( bytes, nameByte ) ) return false;
			}
		}
		let unFullChecksum = computeChecksum( bytes, preStringByteCount - this.knHeaderSize );
		let unSmallChecksum = ( unFullChecksum & 0x0FF );
		bytes[ nChecksumByte ] = unSmallChecksum;
		return bytes;
    }
    static encodeBytesToString( bytes )
	{
		let byteCount = bytes.length;
		//if we have an empty buffer, just return
		if ( byteCount == 0 ) return false;
		const packed = pack( bytes );
		const encoded = base64_encode( packed );
		let deck_string = this.sm_rgchEncodedPrefix + encoded;
		
        deck_string.replace('/','-')
        deck_string.replace('=','_')
		return deck_string;
	}
}

