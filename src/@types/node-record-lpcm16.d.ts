export interface RecordingOptions {
    sampleRate?: number;
    channels?: number;
    compress?: boolean;
    threshold?: number;
    thresholdStart?: number | null;
    thresholdEnd?: number | null;
    silence?: string;
    recorder?: string;
    endOnSilence?: boolean;
    audioType?: string;
}

export class Recording {
    private options: RecordingOptions;
    private cmd: string;
    private args: string[];
    private cmdOptions: any;
    private process: any;
    private _stream: any;

    constructor(options?: RecordingOptions);
    
    private start(): Recording;
    stop(): void;
    pause(): void;
    resume(): void;
    isPaused(): boolean;
    stream(): any;
}

declare function record(options?: RecordingOptions): Recording;

export const record = (...args: RecordingOptions[]) => new Recording(...args);
