import type { TranscriptionSegment } from '../types';

// Regex to match Arabic diacritics
const DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

export const removeDiacritics = (text: string): string => {
  return text.replace(DIACRITICS_REGEX, '');
};

// Helper: Convert milliseconds to HH:MM:SS,mmm (Strict SRT Format)
export const msToTime = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return "00:00:00,000";

  const roundedMs = Math.round(ms);
  
  const hours = Math.floor(roundedMs / 3600000);
  const minutes = Math.floor((roundedMs % 3600000) / 60000);
  const seconds = Math.floor((roundedMs % 60000) / 1000);
  const milliseconds = roundedMs % 1000;

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  const milli = String(milliseconds).padStart(3, '0');
  
  return `${h}:${m}:${s},${milli}`;
};

// Helper: Convert time string to Milliseconds
// Robust parser that can handle "00:00:199" (bad format) and "00:00:00,199" (good format)
export const timeToMs = (timeStr: string): number => {
  if (!timeStr) return 0;

  const parts = timeStr.trim().split(/[:,.]+/);
  
  let h = 0, m = 0, s = 0, ms = 0;

  switch (parts.length) {
    case 4: // HH:MM:SS,mmm
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
      s = parseInt(parts[2], 10) || 0;
      ms = parseInt(parts[3].padEnd(3, '0').slice(0, 3), 10) || 0;
      break;
    case 3: // Assume MM:SS,mmm as it's most common for subtitles
      m = parseInt(parts[0], 10) || 0;
      s = parseInt(parts[1], 10) || 0;
      ms = parseInt(parts[2].padEnd(3, '0').slice(0, 3), 10) || 0;
      break;
    case 2: // Assume MM:SS
      m = parseInt(parts[0], 10) || 0;
      s = parseInt(parts[1], 10) || 0;
      break;
    default:
      console.warn(`Could not parse time string: "${timeStr}"`);
      return 0;
  }

  return (h * 3600000) + (m * 60000) + (s * 1000) + ms;
};

export const formatToSRT = (transcription: TranscriptionSegment[], includeDiacritics: boolean = true, isRTL: boolean = true): string => {
  return transcription.map((segment, index) => {
    // Ensure formatting is perfect during export
    const startMs = timeToMs(segment.startTime);
    const endMs = timeToMs(segment.endTime);
    const startTime = msToTime(startMs);
    const endTime = msToTime(endMs);
    
    let text = segment.text;
    if (!includeDiacritics) {
      text = removeDiacritics(text);
    }

    const content = isRTL ? `\u202B${text}\u202C` : text;
    return `${index + 1}\n${startTime} --> ${endTime}\n${content}\n`;
  }).join('\n');
};

export const formatToVTT = (transcription: TranscriptionSegment[], includeDiacritics: boolean = true): string => {
  const header = 'WEBVTT\n\n';
  const body = transcription.map(segment => {
    const startMs = timeToMs(segment.startTime);
    const endMs = timeToMs(segment.endTime);
    // VTT uses dots instead of commas
    const startTime = msToTime(startMs).replace(',', '.');
    const endTime = msToTime(endMs).replace(',', '.');

    let text = segment.text;
    if (!includeDiacritics) {
      text = removeDiacritics(text);
    }

    return `${startTime} --> ${endTime} align:right\n\u202B${text}\u202C\n`;
  }).join('\n');
  return header + body;
};

export const formatToTXT = (transcription: TranscriptionSegment[], includeDiacritics: boolean = true): string => {
  return transcription.map(segment => {
    let text = segment.text;
    if (!includeDiacritics) {
      text = removeDiacritics(text);
    }
    return `\u202B${text}\u202C`;
  }).join('\n');
};

export const parseSRT = (content: string): TranscriptionSegment[] => {
  const segments: TranscriptionSegment[] = [];
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const blocks = normalizedContent.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length >= 2) {
      let timeLineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
          timeLineIndex = i;
          break;
        }
      }

      if (timeLineIndex !== -1) {
        const timeLine = lines[timeLineIndex];
        // Looser regex for parsing to accept variety of input SRTs
        const timeMatch = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
        
        if (timeMatch) {
          const text = lines.slice(timeLineIndex + 1).join(' ').trim();
          const cleanText = text.replace(/<[^>]*>/g, '');
          
          if (cleanText) {
             // Standardize time immediately upon import
             const startMs = timeToMs(timeMatch[1]);
             const endMs = timeToMs(timeMatch[2]);

            segments.push({
              startTime: msToTime(startMs),
              endTime: msToTime(endMs),
              text: cleanText
            });
          }
        }
      }
    }
  }
  return segments;
};