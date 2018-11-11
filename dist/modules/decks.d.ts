export declare class CArtifactDeckDecoder {
    $s_nCurrentVersion: number;
    private $sm_rgchEncodedPrefix;
    private $deckBytes;
    ParseDeck($strDeckCode: string): string | false | {
        'heroes': any[];
        'cards': any[];
        'name': string;
    };
    RawDeckBytes($strDeckCode: string): any;
    private DecodeDeckString;
    private _unpackArray;
    private ReadBitsChunk;
    private ReadVarEncodedUint32;
    private ReadSerializedCard;
    private ParseDeckInternal;
}
