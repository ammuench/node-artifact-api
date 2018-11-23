const qunpack = require('qunpack');
const locutus_pack = require('locutus/php/misc/pack');
const locutus_base64_encoded = require('locutus/php/url/base64_encode');

export interface ArtifactDeck {
    cards: DeckCard[];
    heroes: DeckHero[];
    name: string;
}

export interface DeckCard {
    count: number;
    id: number;
}

export interface DeckHero {
    id: number;
    turn: number;
}

export class DeckApi {
    private deckDecoder: ArtifactDeckDecoder;

    constructor() {
        this.deckDecoder = new ArtifactDeckDecoder();
    }

    public getDeck(deckId: string): ArtifactDeck {
        try {
            const deck: ArtifactDeck = this.deckDecoder.ParseDeck(deckId);
            return deck;
        } catch (e) {
            return {
                cards: [],
                heroes: [],
                name: 'Invalid Code',
            };
        }
    }
}

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

/**
 * Converted PHP Decoder Provided by Valve
 * Can be used to get raw deck bytes or raw deck JSON
 *
 * @export
 * @class ArtifactDeckEncoder
 */
export class ArtifactDeckEncoder {
    /* tslint:disable */

    public $s_nCurrentVersion = 2;
	private $sm_rgchEncodedPrefix = "ADC";
	private $sm_nMaxBytesForVarUint32 = 5;
    private $knHeaderSize = 3;
    
    private $deckBytes: any;

    
    public EncodeDeck( $deckContents : object ): ArtifactDeck {
		if (!$deckContents) {
            throw new Error('Error : false deck contents');
        }

		let $bytes = this.EncodeBytes( $deckContents );
		if( !$bytes ) {
            throw new Error('Error Encoding Deck');
        }
        
        let $deck_code = this.EncodeBytesToString( $bytes );
		return $deck_code;
    }
    private EncodeBytes( $deckContents : object) {
		if( !$deckContents || !$deckContents.hasOwnProperty('heroes') || !$deckContents.hasOwnProperty('cards') ) {
            return false;
        }

        $deckContents['heroes'].sort(this.SortCardsById);
        $deckContents['cards'].sort(this.SortCardsById);
        
		let $countHeroes = $deckContents['heroes'].length;
		let $allCards = $deckContents['heroes'].concat($deckContents['cards']);
		let $bytes = [];
		//our version and hero count
		let $version = this.$s_nCurrentVersion << 4 | this.ExtractNBitsWithCarry( $countHeroes, 3 );
		if( this.AddByte( $bytes, $version ) )
			return false;
		//the checksum which will be updated at the end
		let $nDummyChecksum = 0;
		let $nChecksumByte = $bytes.length;
		if( !this.AddByte( $bytes, $nDummyChecksum ) )
			return false;
		// write the name size
        let $nameLen = 0;
        let $name = "";
		if( $deckContents.hasOwnProperty('name') ) {
            // replace strip_tags() with your own HTML santizer or escaper.
            // Not sure if this will do exactly the same as strip_tags().
			$name = $deckContents['name'].replace(/(<([^>]+)>)/ig,"");
			let $trimLen = $name.length;
			while( $trimLen > 63 )
			{
				let $amountToTrim = Math.floor( ($trimLen - 63) / 4 );
				$amountToTrim = ($amountToTrim > 1) ? $amountToTrim : 1;
                $name = $name.substr(0, $name.length - $amountToTrim);
				$trimLen = $name.length;
			}
			$nameLen = $name.length;
		}
		if( !this.AddByte( $bytes, $nameLen ) )
			return false;
		if( !this.AddRemainingNumberToBuffer( $countHeroes, 3, $bytes ) )
			return false;
		let $prevCardId = 0;
		for(let $unCurrHero = 0; $unCurrHero < $countHeroes; $unCurrHero++ )
		{
			let $card = $allCards[ $unCurrHero ];
			if( $card['turn'] == 0 )
				return false;
			if( !this.AddCardToBuffer( $card['turn'], $card['id'] - $prevCardId, $bytes ) )
				return false;
			$prevCardId = $card['id'];
		}
		//reset our card offset
		$prevCardId = 0;
		//now all of the cards
		for(let $nCurrCard = $countHeroes; $nCurrCard < $allCards.length; $nCurrCard++ )
		{
			//see how many cards we can group together
			let $card = $allCards[$nCurrCard];
			if( $card['count'] == 0 )
				return false;
			if( $card['id'] <= 0 )
				return false;
			//record this set of cards, and advance
			if( !this.AddCardToBuffer( $card['count'], $card['id'] - $prevCardId, $bytes ) )
				return false;
			$prevCardId = $card['id'];
		}
		// save off the pre string bytes for the checksum
		let $preStringByteCount = $bytes.length;
		//write the string
		{
            const $nameBuffer = new Buffer($name, 'base64');
			let $nameBytes = qunpack.unpack("C*", $nameBuffer);
			for (let $nameByte of $nameBytes)
			{
				if( !this.AddByte( $bytes, $nameByte ) )
					return false;
			}
		}
		let $unFullChecksum = this.ComputeChecksum( $bytes, $preStringByteCount - this.$knHeaderSize );
		let $unSmallChecksum = ( $unFullChecksum & 0x0FF );
		$bytes[ $nChecksumByte ] = $unSmallChecksum;
		return $bytes;
    }
    private EncodeBytesToString( $bytes : any) {
		let $byteCount = $bytes.length;
		//if we have an empty buffer, just return
		if ( $byteCount == 0 )
            return false;
            
		let $packed = locutus_pack( "C*", ...$bytes );
		let $encoded = locutus_base64_encoded( $packed );
        let $deck_string = this.$sm_rgchEncodedPrefix . $encoded;
        
        $deck_string = $deck_string.replace(/\-/g, '/');
        $deck_string = $deck_string.replace(/\_/g, '=');
        return $deck_string;
    }

    
	private SortCardsById( $a : object, $b : object)
	{
		return ( $a['id'] <= $b['id'] ) ? -1 : 1;
    }
    
    private ExtractNBitsWithCarry( $value : any, $numBits : any) {
		let $unLimitBit = 1 << $numBits;
		let $unResult = ( $value & ( $unLimitBit - 1 ) );
		if( $value >= $unLimitBit )
		{
			$unResult |= $unLimitBit;
		}
		return $unResult;
	}
	private  AddByte( $bytes, $byte )
	{
		if( $byte > 255 )
			return false;
        
        $bytes.push($byte);
		return true;
	}
	//utility to write the rest of a number into a buffer. This will first strip the specified N bits off, and then write a series of bytes of the structure of 1 overflow bit and 7 data bits
	private AddRemainingNumberToBuffer( $unValue, $unAlreadyWrittenBits, $bytes )
	{
		$unValue >>= $unAlreadyWrittenBits;
		let $unNumBytes = 0;
		while ( $unValue > 0 )
		{
			let $unNextByte = this.ExtractNBitsWithCarry( $unValue, 7 );
			$unValue >>= 7;
			if( !this.AddByte( $bytes, $unNextByte ) )
				return false;
			$unNumBytes++;
		}
		return true;
	}
	private AddCardToBuffer( $unCount, $unValue, $bytes )
	{
		//this shouldn't ever be the case
		if( $unCount == 0 )
			return false;
		let $countBytesStart = $bytes.length;
		//determine our count. We can only store 2 bits, and we know the value is at least one, so we can encode values 1-5. However, we set both bits to indicate an 
		//extended count encoding
		let $knFirstByteMaxCount = 0x03;
		let $bExtendedCount = ( $unCount - 1 ) >= $knFirstByteMaxCount;
		//determine our first byte, which contains our count, a continue flag, and the first few bits of our value
		let $unFirstByteCount = $bExtendedCount ? $knFirstByteMaxCount : /*( uint8 )*/( $unCount - 1 );
		let $unFirstByte = ( $unFirstByteCount << 6 );
		$unFirstByte |= this.ExtractNBitsWithCarry( $unValue, 5 );
		if( !this.AddByte( $bytes, $unFirstByte ) )
			return false;
		
		//now continue writing out the rest of the number with a carry flag
		if( !this.AddRemainingNumberToBuffer( $unValue, 5, $bytes ) )
			return false;
		//now if we overflowed on the count, encode the remaining count
		if ( $bExtendedCount )
		{
			if( !this.AddRemainingNumberToBuffer( $unCount, 0, $bytes ) )
				return false;
		}
		let $countBytesEnd = $bytes.length;
		if( $countBytesEnd - $countBytesStart > 11 )
		{
			//something went horribly wrong
			return false;
		}
		return true;
	}
	private ComputeChecksum( $bytes, $unNumBytes )
	{
		let $unChecksum = 0;
		for (let $unAddCheck = this.$knHeaderSize; $unAddCheck < $unNumBytes + this.$knHeaderSize; $unAddCheck++ )
		{
			let $byte = $bytes[$unAddCheck];
			$unChecksum += $byte;
		}
		return $unChecksum;
	}
    /* tslint:enable */
}