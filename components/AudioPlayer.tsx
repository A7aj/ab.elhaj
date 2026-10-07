import React, { useEffect, useState, useRef } from 'react';
import { Type } from "@google/genai";
import JSZip from 'jszip';
import { getGeminiClient, GEMINI_TEXT_MODEL, GEMINI_FALLBACK_MODEL } from '../utils/gemini';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { SkipBackIcon } from './icons/SkipBackIcon';
import { SkipForwardIcon } from './icons/SkipForwardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { UploadIcon } from './icons/UploadIcon';
import { formatToSRT, formatToVTT, formatToTXT } from '../utils/formatters';
import type { TranscriptionSegment, ActivityLogEntry } from '../types';

interface AudioPlayerProps {
  file: File | null;
  transcription: TranscriptionSegment[] | null;
  onTimeUpdate: (currentTime: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onHelp: () => void;
  onOpenLog?: () => void;
  logCount?: number;
  onAddLog?: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  includeDiacritics: boolean;
  onToggleDiacritics: (value: boolean) => void;
  onImportSRT: (file: File) => void;
  isExternalSrtLoaded?: boolean;
  isAddingHarakat?: boolean;
  onAddHarakat?: () => void;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  label: string;
  flag: string;
  isRTL: boolean;
}

export const TRANSLATION_LANGUAGES: LanguageOption[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', label: 'AR - العربية', flag: '🇸🇦', isRTL: true },
  { code: 'en', name: 'English', nativeName: 'الإنجليزية', label: 'EN - الإنجليزية', flag: '🇬🇧', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'الفرنسية', label: 'FR - الفرنسية', flag: '🇫🇷', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'الإسبانية', label: 'ES - الإسبانية', flag: '🇪🇸', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'الألمانية', label: 'DE - الألمانية', flag: '🇩🇪', isRTL: false },
  { code: 'tr', name: 'Turkish', nativeName: 'التركية', label: 'TR - التركية', flag: '🇹🇷', isRTL: false },
  { code: 'ur', name: 'Urdu', nativeName: 'الأوردو', label: 'UR - الأوردو', flag: '🇵🇰', isRTL: true },
  { code: 'hi', name: 'Hindi', nativeName: 'الهندية', label: 'HI - الهندية', flag: '🇮🇳', isRTL: false },
  { code: 'ru', name: 'Russian', nativeName: 'الروسية', label: 'RU - الروسية', flag: '🇷🇺', isRTL: false },
  { code: 'bn', name: 'Bengali', nativeName: 'البنغالية', label: 'BN - البنغالية', flag: '🇧🇩', isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'الإيطالية', label: 'IT - الإيطالية', flag: '🇮🇹', isRTL: false },
  { code: 'id', name: 'Indonesian', nativeName: 'الإندونيسية', label: 'ID - الإندونيسية', flag: '🇮🇩', isRTL: false },
];

interface AllTranslationProgress {
  current: number;
  total: number;
  currentLang: string;
  isCustomSelection: boolean;
  status: 'translating' | 'zipping' | 'done' | 'error';
  errorMsg?: string;
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  file, 
  transcription, 
  onTimeUpdate, 
  audioRef,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onHelp,
  onOpenLog,
  logCount = 0,
  onAddLog,
  includeDiacritics,
  onToggleDiacritics,
  onImportSRT,
  isExternalSrtLoaded,
  isAddingHarakat,
  onAddHarakat
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTRDropdownOpen, setIsTRDropdownOpen] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [selectedLangCodes, setSelectedLangCodes] = useState<string[]>([]);
  const [allProgress, setAllProgress] = useState<AllTranslationProgress | null>(null);
  const cancelAllRef = useRef(false);

  const trDropdownRef = useRef<HTMLDivElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.5, 1, 1.25, 1.5, 2];

  const toggleLanguageSelection = (code: string) => {
    setSelectedLangCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleSelectAllLanguages = () => {
    if (selectedLangCodes.length === TRANSLATION_LANGUAGES.length) {
      setSelectedLangCodes([]);
    } else {
      setSelectedLangCodes(TRANSLATION_LANGUAGES.map(l => l.code));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trDropdownRef.current && !trDropdownRef.current.contains(event.target as Node)) {
        setIsTRDropdownOpen(false);
      }
    };
    if (isTRDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTRDropdownOpen]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [file]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
      if (audioRef.current && audioUrl) {
          audioRef.current.currentTime += seconds;
      }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      setCurrentTime(curr);
      onTimeUpdate(curr);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Sync external pause/play events
  useEffect(() => {
      const audioEl = audioRef.current;
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);

      if(audioEl) {
          audioEl.addEventListener('pause', handlePause);
          audioEl.addEventListener('play', handlePlay);
          audioEl.addEventListener('ended', handlePause);
      }
      return () => {
          if(audioEl) {
              audioEl.removeEventListener('pause', handlePause);
              audioEl.removeEventListener('play', handlePlay);
              audioEl.removeEventListener('ended', handlePause);
          }
      }
  }, [audioRef, audioUrl]);

  const handleDownloadSRT = () => {
    if (!transcription) return;
    const srtContent = formatToSRT(transcription, includeDiacritics);
    const fileName = file?.name ? `${file.name.replace(/\.[^/.]+$/, "")}.srt` : 'transcription.srt';
    downloadFile(srtContent, fileName, 'text/plain');
    onAddLog?.({
      type: 'success',
      title: 'تم تصدير وتنزيل ملف الترجمة (SRT)',
      details: `اسم الملف: "${fileName}" | عدد المقاطع: ${transcription.length} | التشكيل: ${includeDiacritics ? 'مفعّل' : 'غير مفعّل'}`
    });
  };

  // Helper for translating segments to any target language
  const translateSegments = async (
    segments: TranscriptionSegment[],
    lang: LanguageOption
  ): Promise<TranscriptionSegment[]> => {
    const ai = getGeminiClient();

    const segmentsPayload = segments.map((s, i) => ({
      id: i,
      text: s.text
    }));

    const prompt = `
Role: Expert Subtitler & Professional Master Translator.
Task: Translate the given subtitles into ${lang.name} (${lang.nativeName}) with natural flow, perfect semantic distribution, and exact segment-by-segment timing alignment.

OBJECTIVE:
Translate the meaning fluently and contextually into natural, idiomatic, high-quality ${lang.name}.
You MUST distribute this translation across the provided IDs to match the exact semantic timing of the original audio/subtitles.

INSTRUCTIONS:
1. Understand the full context of the dialogue/speech.
2. Translate into natural, accurate ${lang.name}. If the text is already in ${lang.name}, preserve and refine it cleanly.
3. Distribute the translation across the exact same IDs (from 0 to ${segmentsPayload.length - 1}).
4. Do NOT combine everything into one ID or leave segments blank if text exists.
5. Return a valid JSON array of objects with "id" and "text" for each segment.

Input Data:
${JSON.stringify(segmentsPayload)}
    `;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            text: { type: Type.STRING }
          },
          required: ["id", "text"]
        }
      }
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config
      });
    } catch (firstErr: any) {
      console.warn(`Primary model ${GEMINI_TEXT_MODEL} failed, trying fallback ${GEMINI_FALLBACK_MODEL}`, firstErr);
      response = await ai.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents: prompt,
        config
      });
    }

    const responseData = JSON.parse(response.text || '[]');
    if (!Array.isArray(responseData)) {
      throw new Error("Response is not an array");
    }

    const translationMap = new Map(responseData.map((item: any) => [item.id, item.text]));

    return segments.map((seg, i) => {
      let translatedText = translationMap.get(i);
      if (translatedText === undefined || translatedText === null) {
        translatedText = "";
      }
      return {
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: translatedText
      };
    });
  };

  const handleDownloadEnglishSRT = async () => {
    if (!transcription) return;
    
    setIsTranslating(true);
    try {
        const enLang = TRANSLATION_LANGUAGES.find(l => l.code === 'en') || {
          code: 'en',
          name: 'English',
          nativeName: 'الإنجليزية',
          label: 'EN - الإنجليزية',
          flag: '🇬🇧',
          isRTL: false
        };

        const englishSegments = await translateSegments(transcription, enLang);
        const srtContent = formatToSRT(englishSegments, false, false);
        const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "transcription";
        downloadFile(srtContent, `${baseName}_en.srt`, 'text/plain');

    } catch (e: any) {
        console.error("Translation failed", e);
        const errMsg = e?.message?.includes?.("PERMISSION_DENIED") || e?.status === 403
          ? "لم يتم التحقق من صلاحية مفتاح API أو تم رفض الإذن. يرجى التحقق من إعداد مفتاح Gemini API."
          : "فشلت عملية الترجمة. يرجى المحاولة مرة أخرى أو التحقق من الاتصال.";
        alert(errMsg);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleTranslateAndDownloadSRT = async (lang: LanguageOption) => {
    if (!transcription) return;
    
    setTranslatingLang(lang.code);
    setIsTRDropdownOpen(false);

    try {
        const translatedSegments = await translateSegments(transcription, lang);
        const srtContent = formatToSRT(translatedSegments, lang.isRTL ? includeDiacritics : false, lang.isRTL);
        const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "transcription";
        downloadFile(srtContent, `${baseName}_${lang.code}.srt`, 'text/plain');

    } catch (e: any) {
        console.error("Translation failed", e);
        const errMsg = e?.message?.includes?.("PERMISSION_DENIED") || e?.status === 403
          ? `تم رفض الإذن أثناء الترجمة إلى ${lang.nativeName}. يرجى التحقق من إعداد مفتاح Gemini API.`
          : `فشلت عملية الترجمة إلى ${lang.nativeName}. يرجى المحاولة مرة أخرى.`;
        alert(errMsg);
    } finally {
        setTranslatingLang(null);
    }
  };

  // Translate selected languages (or all languages if none explicitly selected) and package them into a single ZIP file
  const handleTranslateAllAndDownloadZip = async () => {
    if (!transcription || transcription.length === 0) return;
    setIsTRDropdownOpen(false);
    setTranslatingLang('all');
    cancelAllRef.current = false;

    // Use selected languages, or fallback to all if none selected
    const isCustomSelection = selectedLangCodes.length > 0;
    const targetLanguages = isCustomSelection
      ? TRANSLATION_LANGUAGES.filter(l => selectedLangCodes.includes(l.code))
      : TRANSLATION_LANGUAGES;

    const total = targetLanguages.length;
    setAllProgress({
      current: 0,
      total,
      currentLang: targetLanguages[0].nativeName,
      isCustomSelection,
      status: 'translating'
    });

    try {
      const zip = new JSZip();
      const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "transcription";

      let completedCount = 0;
      const results: { lang: LanguageOption; srt: string }[] = [];
      const queue = [...targetLanguages];

      // Concurrency worker (2 simultaneous requests for speed and safe rate limiting)
      const CONCURRENCY = 2;
      const worker = async () => {
        while (queue.length > 0 && !cancelAllRef.current) {
          const lang = queue.shift();
          if (!lang) break;

          setAllProgress({
            current: completedCount,
            total,
            currentLang: lang.nativeName,
            isCustomSelection,
            status: 'translating'
          });

          try {
            const translatedSegments = await translateSegments(transcription, lang);
            const srtContent = formatToSRT(
              translatedSegments,
              lang.isRTL ? includeDiacritics : false,
              lang.isRTL
            );
            results.push({ lang, srt: srtContent });
          } catch (err) {
            console.error(`Error translating to ${lang.name}:`, err);
            // If individual translation fails, provide clean base SRT so zip is complete
            const fallbackSRT = formatToSRT(
              transcription,
              lang.isRTL ? includeDiacritics : false,
              lang.isRTL
            );
            results.push({ lang, srt: fallbackSRT });
          }

          completedCount++;
          if (!cancelAllRef.current) {
            setAllProgress({
              current: completedCount,
              total,
              currentLang: lang.nativeName,
              isCustomSelection,
              status: 'translating'
            });
          }
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker());
      await Promise.all(workers);

      if (cancelAllRef.current) {
        setAllProgress(null);
        return;
      }

      setAllProgress({
        current: total,
        total,
        currentLang: 'جاري إنشاء ملف ZIP...',
        isCustomSelection,
        status: 'zipping'
      });

      // Add each language's SRT file to the ZIP
      results.forEach(({ lang, srt }) => {
        zip.file(`${baseName}_${lang.code}.srt`, srt);
      });

      // Add informative README manifest in the ZIP
      const manifest = `ملفات الترجمة (Subtitles Archive)
=====================================
اسم الملف الصوتي الأصلي: ${baseName}
نوع التصدير: ${isCustomSelection ? `لغات محددة (${results.length})` : `جميع اللغات (${results.length})`}
عدد لغات الترجمة: ${results.length}

قائمة اللغات والملفات المرفقة في هذا الأرشيف:
${results.map(r => `• [${r.lang.code.toUpperCase()}] ${r.lang.nativeName} (${r.lang.name}): ${baseName}_${r.lang.code}.srt`).join('\n')}

تم التوليد والتصدير بواسطة محول الصوت إلى نص بالذكاء الاصطناعي.
`;
      zip.file("README_LANGUAGES.txt", manifest);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const zipFileName = isCustomSelection && targetLanguages.length < TRANSLATION_LANGUAGES.length
        ? `${baseName}_selected_languages.zip`
        : `${baseName}_all_languages.zip`;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAllProgress({
        current: total,
        total,
        currentLang: 'تم الانتهاء بنجاح!',
        isCustomSelection,
        status: 'done'
      });

      setTimeout(() => {
        setAllProgress(null);
      }, 3500);

    } catch (error: any) {
      console.error("Failed to generate zip of all translations", error);
      setAllProgress({
        current: 0,
        total,
        currentLang: '',
        isCustomSelection,
        status: 'error',
        errorMsg: error?.message || 'فشلت عملية إنشاء ملف ZIP. يرجى المحاولة مرة أخرى.'
      });
      setTimeout(() => {
        setAllProgress(null);
      }, 4000);
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleCancelAllTranslation = () => {
    cancelAllRef.current = true;
    setAllProgress(null);
    setTranslatingLang(null);
  };

  const handleDownloadVTT = () => {
    if (!transcription) return;
    const vttContent = formatToVTT(transcription, includeDiacritics);
    downloadFile(vttContent, 'transcription.vtt', 'text/vtt');
  };

  const handleDownloadTXT = () => {
    if (!transcription) return;
    const txtContent = formatToTXT(transcription, includeDiacritics);
    downloadFile(txtContent, 'transcription.txt', 'text/plain');
  };

  const triggerLOD = () => {
    if (srtInputRef.current) {
      srtInputRef.current.click();
    }
  };

  const handleLODChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportSRT(e.target.files[0]);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const hasAudio = !!audioUrl;

  return (
    <>
      {/* Floating Progress Notification for "All" / Selected ZIP translation */}
      {allProgress && (
        <div className="fixed bottom-16 right-4 md:right-8 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-violet-300 dark:border-violet-700 rounded-xl shadow-2xl p-3.5 max-w-sm w-80 text-right animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {allProgress.status === 'translating' && (
                <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              {allProgress.status === 'zipping' && (
                <span className="text-base animate-bounce">📦</span>
              )}
              {allProgress.status === 'done' && (
                <span className="text-emerald-500 font-bold text-sm">✓</span>
              )}
              {allProgress.status === 'error' && (
                <span className="text-rose-500 font-bold text-sm">✕</span>
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {allProgress.status === 'translating' && `${allProgress.isCustomSelection ? 'حزمة اللغات المحددة' : 'حزمة كل اللغات'} (${allProgress.current}/${allProgress.total})`}
                {allProgress.status === 'zipping' && 'جاري ضغط الملفات في ZIP...'}
                {allProgress.status === 'done' && 'تم تحميل ملف ZIP بنجاح! 🎉'}
                {allProgress.status === 'error' && 'حدث خطأ أثناء الترجمة'}
              </span>
            </div>
            {allProgress.status === 'translating' && (
              <button
                onClick={handleCancelAllTranslation}
                className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors px-1"
                title="إلغاء العملية"
              >
                إلغاء
              </button>
            )}
          </div>

          {allProgress.status === 'translating' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[190px]">جاري معالجة: <strong className="text-violet-600 dark:text-violet-400">{allProgress.currentLang}</strong></span>
                <span className="font-mono">{Math.round((allProgress.current / allProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.round((allProgress.current / allProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {allProgress.status === 'done' && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              تم تجهيز وتحميل ملف ZIP ويحتوي على {allProgress.total} ملف SRT منفصل للغات {allProgress.isCustomSelection ? 'المحددة' : 'المطلوبة'}!
            </p>
          )}

          {allProgress.status === 'error' && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              {allProgress.errorMsg || 'فشلت العملية، يرجى المحاولة مرة أخرى.'}
            </p>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-2 select-none">
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="hidden"
        />
        
        {/* 1. Undo/Redo Group */}
        <div className="flex items-center gap-1 order-2 md:order-1">
            <button 
              onClick={onUndo} 
              disabled={!canUndo}
              className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="تراجع"
            >
                <UndoIcon className="w-3 h-3" />
            </button>
            <button 
               onClick={onRedo} 
               disabled={!canRedo}
               className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
               title="إعادة"
            >
                <RedoIcon className="w-3 h-3" />
            </button>
        </div>

        {/* 2. Playback Controls Group */}
        <div className={`flex items-center gap-2 order-2 md:order-2 ${!hasAudio ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <button 
              onClick={() => skip(-5)} 
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="رجوع 5 ثواني"
            >
                <SkipBackIcon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-7 h-7 bg-sky-600 hover:bg-sky-700 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md"
              aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            >
              {isPlaying ? <PauseIcon className="w-3 h-3" /> : <PlayIcon className="w-3 h-3 ml-0.5" />}
            </button>

            <button 
              onClick={() => skip(5)} 
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="تقديم 5 ثواني"
            >
                <SkipForwardIcon className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={() => {
                const currentIndex = playbackRates.indexOf(playbackRate);
                const nextIndex = (currentIndex + 1) % playbackRates.length;
                setPlaybackRate(playbackRates[nextIndex]);
              }}
              className="w-8 h-5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
              disabled={!hasAudio}
              title={`سرعة التشغيل: ${playbackRate}x`}
            >
              {`${playbackRate.toFixed(2).replace(/\.00|0$/g, '')}x`}
            </button>
        </div>

        {/* 3. Progress Bar Group */}
        <div className={`flex-grow flex items-center gap-2 w-full order-1 md:order-3 px-2 ${!hasAudio ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 w-7 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600 hover:h-2 transition-all"
          />
          <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 w-7">{formatTime(duration)}</span>
        </div>

        {/* 4. Actions Group (Export + Diacritics + Help) */}
        <div className="flex items-center gap-1 order-2 md:order-4 border-r-0 md:border-r border-slate-200 dark:border-slate-700 pr-0 md:pr-2 mr-0 md:mr-1">
           {/* Export Buttons */}
           <button 
              onClick={handleDownloadSRT} 
              disabled={!transcription}
              className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-green-200 dark:border-green-800/50"
           >
              <DownloadIcon className="w-2.5 h-2.5" />
              SRT
            </button>
            
            <button 
              onClick={handleDownloadEnglishSRT} 
              disabled={!transcription || isTranslating}
              className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-indigo-200 dark:border-indigo-800/50"
              title="تحميل ترجمة إنجليزية (معنوية)"
           >
              {isTranslating ? (
                  <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                  <DownloadIcon className="w-2.5 h-2.5" />
              )}
              EN
            </button>

            {/* T / Translate Button with upward dropdown */}
            <div className="relative inline-block" ref={trDropdownRef}>
              <button 
                onClick={() => setIsTRDropdownOpen(prev => !prev)}
                disabled={!transcription || !!translatingLang}
                className="flex items-center gap-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-violet-200 dark:border-violet-800/50"
                title="ترجمة وتحميل ملفات SRT (اختيار لغة أو حزمة ZIP للغات المحددة)"
              >
                {translatingLang ? (
                    <div className="w-2 h-2 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <DownloadIcon className="w-2.5 h-2.5" />
                )}
                <span>{translatingLang ? 'T...' : 'T'}</span>
                {selectedLangCodes.length > 0 && (
                  <span className="bg-violet-600 text-white text-[7px] min-w-3 h-3 px-0.5 rounded-full flex items-center justify-center font-mono font-bold leading-none">
                    {selectedLangCodes.length}
                  </span>
                )}
                <span className="text-[7px] leading-none opacity-70">▲</span>
              </button>

              {isTRDropdownOpen && (
                <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[210px] max-h-[360px] overflow-y-auto bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 text-right animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {/* Sticky Header with Selection controls & Dynamic ZIP action */}
                  <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between px-2.5 py-1 text-[8px] font-bold text-slate-400 dark:text-slate-500 select-none">
                      <span>اختر لغات الترجمة</span>
                      <button
                        type="button"
                        onClick={toggleSelectAllLanguages}
                        className="text-[8px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold cursor-pointer underline"
                      >
                        {selectedLangCodes.length === TRANSLATION_LANGUAGES.length
                          ? 'إلغاء التحديد'
                          : selectedLangCodes.length > 0
                          ? 'تحديد الكل'
                          : 'تحديد الكل'}
                      </button>
                    </div>

                    {/* Dynamic ZIP button: "All" if 0 selected, "اللغات المحددة (X)" if X selected */}
                    <button
                      onClick={handleTranslateAllAndDownloadZip}
                      disabled={!transcription || !!translatingLang}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 transition-colors border-y border-amber-200/70 dark:border-amber-800/60 text-right group"
                      title={
                        selectedLangCodes.length > 0
                          ? `ترجمة وتحميل اللغات المحددة (${selectedLangCodes.length}) في ملف ZIP`
                          : 'ترجمة وتحميل جميع اللغات الـ 12 في ملف ZIP'
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">📦</span>
                        <span>
                          {selectedLangCodes.length > 0
                            ? `اللغات المحددة (${selectedLangCodes.length}) - ZIP`
                            : 'All - جميع اللغات (ZIP)'}
                        </span>
                      </span>
                      <span className="text-[8px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">
                        {selectedLangCodes.length > 0 ? selectedLangCodes.length : TRANSLATION_LANGUAGES.length}
                      </span>
                    </button>
                  </div>

                  {/* Languages list with individual checkboxes */}
                  <div className="py-1">
                    {TRANSLATION_LANGUAGES.map((lang) => {
                      const isSelected = selectedLangCodes.includes(lang.code);
                      return (
                        <div
                          key={lang.code}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] transition-colors ${
                            isSelected
                              ? 'bg-violet-50/70 dark:bg-violet-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {/* Checkbox + Flag + Label */}
                          <label
                            className="flex items-center gap-1.5 cursor-pointer flex-grow select-none py-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleLanguageSelection(lang.code)}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500 cursor-pointer accent-violet-600"
                            />
                            <span className="text-xs">{lang.flag}</span>
                            <span className={`font-medium ${isSelected ? 'text-violet-700 dark:text-violet-300 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                              {lang.label}
                            </span>
                          </label>

                          {/* Individual language download button */}
                          <button
                            onClick={() => handleTranslateAndDownloadSRT(lang)}
                            disabled={!transcription || !!translatingLang}
                            className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded transition-colors"
                            title={`تحميل ملف SRT لهذه اللغة منفردة (${lang.nativeName})`}
                          >
                            {translatingLang === lang.code ? (
                              <div className="w-2.5 h-2.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <DownloadIcon className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleDownloadVTT} 
              disabled={!transcription}
              className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-blue-200 dark:border-blue-800/50"
            >
              <DownloadIcon className="w-2.5 h-2.5" />
              VTT
            </button>

             {/* LOD Button */}
             <input 
              type="file" 
              ref={srtInputRef} 
              onChange={handleLODChange} 
              accept=".srt" 
              className="hidden" 
            />
            <button 
              onClick={triggerLOD} 
              className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200 dark:border-amber-800/50"
              title="تحميل ملف SRT للتعديل"
           >
              <UploadIcon className="w-2 h-2" />
              LOD
            </button>
            
            <button 
              onClick={handleDownloadTXT} 
              disabled={!transcription}
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-600"
            >
              <FileTextIcon className="w-2 h-2" />
              TXT
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            
            {/* Diacritics Checkbox */}
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeDiacritics}
                onChange={(e) => onToggleDiacritics(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-[8px] font-medium text-slate-600 dark:text-slate-300">بالتشكيل</span>
            </label>

            <button
              onClick={onAddHarakat}
              disabled={!isExternalSrtLoaded || isAddingHarakat}
              className="flex flex-row flex-nowrap items-center whitespace-nowrap gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-[9px] font-bold py-1 px-1.5 rounded-sm hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-purple-200 dark:border-purple-800/50"
              title="إضافة الحركات وعلامات الترقيم"
            >
              {isAddingHarakat ? (
                  <div className="w-2 h-2 border-2 border-purple-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              ) : null}
              <span>+ حركات</span>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* زر السجل - بجوار زر مساعدة */}
            <button 
               onClick={onOpenLog}
               className="relative p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               title="السجل"
               aria-label="السجل"
            >
                <HistoryIcon className="w-3.5 h-3.5" />
                {(logCount ?? 0) > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-sky-500 rounded-full" />
                )}
            </button>

            <button 
               onClick={onHelp}
               className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               title="مساعدة"
               aria-label="مساعدة"
            >
                <HelpCircleIcon className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>
    </>
  );
};