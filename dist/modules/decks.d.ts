export declare class CArtifactDeckDecoder {
    $s_nCurrentVersion: number;
    private $sm_rgchEncodedPrefix;
    private $nOutCardID;
    private $nPrevCardBase;
    private $nTotalCardBytes;
    private $nCurrentByteIndex;
    ParseDeck($strDeckCode: string): false | {
        'heroes': any[];
        'cards': any[];
        'name': string;
    };
    RawDeckBytes($strDeckCode: string): false | any[];
    DecodeDeckString($strDeckCode: string): false | any[];
    private _unpackArray;
    private ReadBitsChunk;
    private ReadVarEncodedUint32;
    private ReadSerializedCard;
    private ParseDeckInternal;
}
