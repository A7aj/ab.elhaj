
export interface TranscriptionOptions {
  wordsPerLine: number;
  maxSilence: number;
}

export interface TranscriptionSegment {
  startTime: string;
  endTime: string;
  text: string;
}

export type LogEntryType = 'info' | 'model' | 'success' | 'warning' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  title: string;
  details?: string;
  type: LogEntryType;
  modelName?: string;
  durationMs?: number;
}
