import React, { useEffect, useState } from 'react';
import type { TranscriptionSegment } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { SetStartIcon } from './icons/SetStartIcon';
import { SetEndIcon } from './icons/SetEndIcon';
import { timeToMs, msToTime } from '../utils/formatters';

interface TranscriptionViewProps {
  transcription: TranscriptionSegment[];
  onUpdate: (newTranscription: TranscriptionSegment[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ 
  transcription, 
  onUpdate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentTime = 0,
  onSeek
}) => {
  const [focusRequest, setFocusRequest] = useState<{ index: number, position: number } | null>(null);

  useEffect(() => {
    if (focusRequest) {
      const element = document.getElementById(`textarea-${focusRequest.index}`) as HTMLTextAreaElement;
      if (element) {
        element.focus();
        element.setSelectionRange(focusRequest.position, focusRequest.position);
      }
      setFocusRequest(null);
    }
  }, [transcription, focusRequest]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) {
            e.preventDefault();
            onRedo();
          }
        } else {
          if (canUndo) {
             e.preventDefault();
             onUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
         if (canRedo) {
            e.preventDefault();
            onRedo();
         }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [canUndo, canRedo, onUndo, onRedo]);
  
  const handleTextChange = (index: number, newText: string) => {
    const updated = [...transcription];
    updated[index] = { ...updated[index], text: newText };
    onUpdate(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const textarea = e.currentTarget;

    // Enter to Split
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;
      
      if (cursorPosition === 0 || cursorPosition === text.length) {
        return;
      }

      const segment = transcription[index];
      const part1Text = text.slice(0, cursorPosition).trim();
      const part2Text = text.slice(cursorPosition).trim();

      const startMs = timeToMs(segment.startTime);
      const endMs = timeToMs(segment.endTime);
      const duration = endMs - startMs;
      
      const safeDuration = duration > 0 ? duration : 0;
      
      const splitRatio = part1Text.length / text.length;
      const splitTimeMs = Math.floor(startMs + (safeDuration * splitRatio));
      
      // Use standard formatter directly
      const splitTimeStr = msToTime(splitTimeMs);

      // Re-format original start/end times to ensure consistency across all segments
      const newSegment1: TranscriptionSegment = {
        startTime: msToTime(startMs), 
        endTime: splitTimeStr,
        text: part1Text
      };

      const newSegment2: TranscriptionSegment = {
        startTime: splitTimeStr,
        endTime: msToTime(endMs),
        text: part2Text
      };

      const updated = [...transcription];
      updated.splice(index, 1, newSegment1, newSegment2);
      
      onUpdate(updated);
      setFocusRequest({ index: index + 1, position: 0 });
    }

    // Backspace to Merge
    if (e.key === 'Backspace' && !e.shiftKey) {
        if (textarea.selectionStart === 0 && textarea.selectionEnd === 0 && index > 0) {
            e.preventDefault();
            const prevIndex = index - 1;
            const prevSegment = transcription[prevIndex];
            const currSegment = transcription[index];

            const needsSpace = prevSegment.text.trim().length > 0 && currSegment.text.trim().length > 0;
            const separator = needsSpace ? " " : "";

            const mergedText = prevSegment.text + separator + currSegment.text;
            const newCursorPos = prevSegment.text.length + separator.length;

            // Re-format times to ensure consistency
            const newSegment: TranscriptionSegment = {
                startTime: msToTime(timeToMs(prevSegment.startTime)),
                endTime: msToTime(timeToMs(currSegment.endTime)),
                text: mergedText
            };

            const updated = [...transcription];
            updated.splice(prevIndex, 2, newSegment); 
            
            onUpdate(updated);
            setFocusRequest({ index: prevIndex, position: newCursorPos });
        }
    }
  };

  const handleTimeClick = (timeStr: string) => {
      if(onSeek) {
          const ms = timeToMs(timeStr);
          onSeek(ms / 1000);
      }
  };

  // --- Logic for Sync Buttons ---

  const handleSetStart = (index: number) => {
      const newTimeStr = msToTime(currentTime * 1000);
      const updated = [...transcription];

      // 1. Update Current Start
      updated[index] = { ...updated[index], startTime: newTimeStr };

      // 2. Update Previous End (if exists) to match
      if (index > 0) {
          updated[index - 1] = { ...updated[index - 1], endTime: newTimeStr };
      }

      onUpdate(updated);
  };

  const handleSetEnd = (index: number) => {
      const newTimeStr = msToTime(currentTime * 1000);
      const updated = [...transcription];

      // 1. Update Current End
      updated[index] = { ...updated[index], endTime: newTimeStr };

      // 2. Update Next Start (if exists) to match
      if (index < updated.length - 1) {
          updated[index + 1] = { ...updated[index + 1], startTime: newTimeStr };
      }

      onUpdate(updated);
  };

  const isSegmentActive = (startTime: string, endTime: string) => {
      const start = timeToMs(startTime) / 1000;
      const end = timeToMs(endTime) / 1000;
      return currentTime >= start && currentTime < end;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">نتائج التفريغ الصوتي</h2>
          <p className="text-xs text-slate-500 mt-1">
            اضغط <b>Enter</b> للتقسيم، <b>Backspace</b> للدمج. اضغط على الوقت لتشغيل الصوت.
          </p>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-[500px] overflow-y-auto">
        {transcription.map((segment, index) => {
          const active = isSegmentActive(segment.startTime, segment.endTime);
          
          return (
            <div 
                key={`${index}-${segment.startTime}`} 
                className={`group mb-3 last:mb-0 p-2 rounded transition-all duration-300 border ${
                    active 
                    ? 'bg-sky-100 dark:bg-sky-900/40 border-sky-400 dark:border-sky-600 ring-1 ring-sky-300 dark:ring-sky-700 shadow-sm' 
                    : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
            >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    {/* Time Controls Group */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        
                        {/* Set Start Button */}
                        <button
                            onClick={() => handleSetStart(index)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
                            title="اجعل الوقت الحالي بداية لهذه الجملة (وينهي السابقة)"
                        >
                            <SetStartIcon className="w-3.5 h-3.5" />
                        </button>

                        <button 
                            onClick={() => handleTimeClick(segment.startTime)}
                            className={`font-mono text-xs px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                                active 
                                ? 'bg-sky-500 text-white' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white'
                            }`}
                            title="تشغيل من هنا"
                        >
                            <PlayIcon className="w-2.5 h-2.5" />
                            {segment.startTime}
                        </button>
                        
                        <span className="text-slate-300 dark:text-slate-600 text-[9px]">➜</span>
                        
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                            {segment.endTime}
                        </span>

                         {/* Set End Button */}
                         <button
                            onClick={() => handleSetEnd(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"
                            title="اجعل الوقت الحالي نهاية لهذه الجملة (ويبدأ التالية)"
                        >
                            <SetEndIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                
                <textarea
                    id={`textarea-${index}`}
                    className={`w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 rounded p-1 ${
                        active ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-800 dark:text-slate-200'
                    }`}
                    value={segment.text}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    rows={Math.max(2, Math.ceil(segment.text.length / 50))} 
                    dir="auto"
                />
            </div>
          );
        })}
      </div>
    </div>
  );
};