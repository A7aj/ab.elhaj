import React, { useState, useCallback, useRef } from 'react';
import { Type } from "@google/genai";
import { getGeminiClient, GEMINI_TEXT_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_MODELS_CASCADE } from './utils/gemini';
import type { TranscriptionSegment, TranscriptionOptions, ActivityLogEntry } from './types';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { OptionsPanel } from './components/OptionsPanel';
import { TranscriptionView } from './components/TranscriptionView';
import { Loader } from './components/Loader';
import { Alert } from './components/Alert';
import { HelpModal } from './components/HelpButton';
import { ActivityLogModal } from './components/ActivityLogModal';
import { AudioPlayer } from './components/AudioPlayer';
import { parseSRT, timeToMs, msToTime } from './utils/formatters';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TranscriptionOptions>({
    wordsPerLine: 4,
    maxSilence: 0.2,
  });
  
  // UI State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [includeDiacritics, setIncludeDiacritics] = useState(true);

  const addLog = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    setLogs(prev => [
      ...prev,
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp
      }
    ]);
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // State for transcription and history
  const [transcription, setTranscription] = useState<TranscriptionSegment[] | null>(null);
  const [history, setHistory] = useState<TranscriptionSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isExternalSrtLoaded, setIsExternalSrtLoaded] = useState<boolean>(false);
  const [isAddingHarakat, setIsAddingHarakat] = useState<boolean>(false);

  const handleFileChange = (file: File | null) => {
    setAudioFile(file);
    setError(null);
    setCurrentTime(0);
    if (file) {
      addLog({
        type: 'info',
        title: 'تم استيراد / سحب الملف الصوتي',
        details: `اسم الملف: "${file.name}" | الحجم: ${(file.size / (1024 * 1024)).toFixed(2)} ميغابايت | النوع: ${file.type || 'صوت'}`
      });
    }
  };

  const handleOptionsChange = (newOptions: Partial<TranscriptionOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeekRequest = (time: number) => {
      if (audioRef.current && audioFile) {
          audioRef.current.currentTime = time;
          audioRef.current.play();
      }
  };

  // Centralized update function that handles history
  const handleUpdateTranscription = (newTranscription: TranscriptionSegment[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTranscription);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTranscription(newTranscription);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTranscription(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTranscription(history[newIndex]);
    }
  };

  const handleImportSRT = async (file: File) => {
    addLog({
      type: 'info',
      title: 'تم استيراد ملف ترجمة خارجي (SRT)',
      details: `اسم الملف: "${file.name}" | الحجم: ${(file.size / 1024).toFixed(2)} كيلوبايت`
    });
    try {
      const text = await file.text();
      const segments = parseSRT(text);
      if (segments.length > 0) {
        setTranscription(segments);
        setHistory([segments]);
        setHistoryIndex(0);
        setError(null);
        setIsExternalSrtLoaded(true);
        addLog({
          type: 'success',
          title: 'نجاح استيراد ملف الترجمة الخارجي (SRT)',
          details: `تم استخراج ${segments.length} مقطع زمني بنجاح وهو متاح للمعاينة والتعديل.`
        });
      } else {
        setError("لم يتم العثور على نصوص صالحة في ملف SRT.");
        addLog({
          type: 'error',
          title: 'فشل استيراد ملف SRT',
          details: 'لم يتم العثور على أسطر وتوقيتات صالحة في الملف المرفوع.'
        });
      }
    } catch (e: any) {
      console.error(e);
      setError("فشل في قراءة ملف SRT.");
      addLog({
        type: 'error',
        title: 'خطأ أثناء قراءة ملف SRT',
        details: e?.message || 'خطأ غير متوقع'
      });
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as base64 string."));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

    // Fix for mobile devices that report generic MIME types
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'mp3') mimeType = 'audio/mp3';
      else if (extension === 'wav') mimeType = 'audio/wav';
      else if (extension === 'm4a') mimeType = 'audio/x-m4a';
      else if (extension === 'ogg') mimeType = 'audio/ogg';
      else if (extension === 'aac') mimeType = 'audio/aac';
      else if (extension === 'flac') mimeType = 'audio/flac';
    }

    return {
      inlineData: {
        mimeType: mimeType || 'audio/mp3', // Fallback to mp3 if all else fails
        data: base64EncodedData
      }
    };
  };

  const handleAddHarakat = async () => {
    if (!transcription) return;
    setIsAddingHarakat(true);
    addLog({
      type: 'info',
      title: 'بدء عملية إضافة الحركات والتشكيل وعلامات الترقيم',
      details: `إجمالي المقاطع المطلوب تشكيلها: ${transcription.length} مقطع`
    });

    try {
      const ai = getGeminiClient();
      const segmentsPayload = transcription.map((s, i) => ({
        id: i,
        text: s.text
      }));

      const prompt = `
      قم بإضافة الحركات والتشكيلات الإعرابية وعلامات الترقيم (مثل التعجب والاستفهام) للنصوص التالية.
      يجب أن لا تغير أي كلمة أو المعنى أو الترتيب أبدا، فقط أضف الحركات وعلامات الترقيم المطلوبة.
      
      البيانات:
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

      let response: any = null;
      for (let i = 0; i < GEMINI_MODELS_CASCADE.length; i++) {
        const modelName = GEMINI_MODELS_CASCADE[i];
        const isPrimary = i === 0;
        const attemptLabel = isPrimary ? `الأساسي (${modelName})` : `البديل (${modelName})`;

        addLog({
          type: 'model',
          title: `محاولة تشغيل النموذج لتشكيل النص: ${attemptLabel}`,
          details: `جاري تشكيل النصوص وضبط علامات الترقيم...`,
          modelName
        });

        const startModelTime = Date.now();
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });
          const durationMs = Date.now() - startModelTime;
          addLog({
            type: 'success',
            title: `نجح النموذج ${attemptLabel} في إضافة التشكيل`,
            details: `تم استلام النصوص المشكولة في ${(durationMs / 1000).toFixed(2)} ثانية.`,
            modelName,
            durationMs
          });
          break;
        } catch (firstErr: any) {
          const durationMs = Date.now() - startModelTime;
          const hasNext = i < GEMINI_MODELS_CASCADE.length - 1;
          const nextModel = hasNext ? GEMINI_MODELS_CASCADE[i + 1] : null;

          if (hasNext) {
            console.warn(`Model ${modelName} failed for harakat, trying fallback ${nextModel}`, firstErr);
            addLog({
              type: 'warning',
              title: `فشل النموذج ${attemptLabel}`,
              details: `السبب: ${firstErr?.message || 'تعذر الاتصال'}. الانتقال التلقائي للنموذج التالي (${nextModel})...`,
              modelName,
              durationMs
            });
          } else {
            addLog({
              type: 'error',
              title: `فشلت كافة النماذج في إضافة الحركات`,
              details: `السبب: ${firstErr?.message || 'خطأ غير متوقع'}.`,
              modelName,
              durationMs
            });
            throw firstErr;
          }
        }
      }

      const responseData = JSON.parse(response?.text || '[]');
      if (!Array.isArray(responseData)) {
         throw new Error("Response is not an array");
      }

      const translationMap = new Map(responseData.map((item: any) => [item.id, item.text]));

      const newTranscription = transcription.map((seg, i) => {
          const newText = translationMap.get(i);
          return {
              ...seg,
              text: newText !== undefined && newText !== null ? newText : seg.text
          };
      });

      handleUpdateTranscription(newTranscription);
      addLog({
        type: 'success',
        title: 'تم تشكيل وتحديث كافة المقاطع بنجاح',
        details: `أصبحت المقاطع مشكولة بالكامل (${newTranscription.length} مقطع).`
      });
    } catch (e: any) {
      console.error(e);
      const msg = e?.message?.includes?.("PERMISSION_DENIED") || e?.status === 403
        ? "تم رفض الإذن أثناء إضافة الحركات. يرجى التأكد من صلاحية مفتاح Gemini API."
        : "فشلت عملية إضافة الحركات. يرجى المحاولة مرة أخرى.";
      setError(msg);
      addLog({
        type: 'error',
        title: 'فشل في تطبيق الحركات',
        details: msg
      });
    } finally {
      setIsAddingHarakat(false);
    }
  };

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) {
      setError("الرجاء تحديد ملف صوتي أولاً.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTranscription(null);
    setHistory([]);
    setHistoryIndex(-1);
    setIsExternalSrtLoaded(false);

    addLog({
      type: 'info',
      title: 'بدء عملية التفريغ الصوتي وتوليد ملف الترجمة',
      details: `الملف الصوتي: "${audioFile.name}" (${(audioFile.size / (1024 * 1024)).toFixed(2)} MB) | الحد الأقصى للكلمات في السطر: ${options.wordsPerLine}`
    });

    try {
      const ai = getGeminiClient();
      const audioPart = await fileToGenerativePart(audioFile);

      const prompt = `
        مهمتك هي تفريغ الصوت وتنسيقه كملف ترجمة احترافي (SRT).

        **القاعدة الذهبية (صارمة جداً):**
        تنسيق الوقت يجب أن يكون حصراً: **HH:MM:SS,mmm**
        - HH: الساعات (خانتين، يجب كتابتها حتى لو كانت أصفار)
        - MM: الدقائق (خانتين)
        - SS: الثواني (خانتين)
        - ,: الفاصلة (وليس النقطتين :)
        - mmm: الميلي ثانية (3 خانات)

        **المتطلبات الأساسية:**
        1. اللغة: العربية الفصحى مع التشكيل الكامل.
        2. **تقسيم المقاطع (هام جداً):** يجب تقسيم النص إلى مقاطع قصيرة جداً. لا يسمح أبداً بتجاوز **${options.wordsPerLine}** كلمات في المقطع الواحد. إذا كانت الجملة طويلة، قسمها إلى عدة مقاطع زمنية متتالية.
        3. الدقة: التزم بما يقال حرفياً.
      `;

      const config = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startTime: {
                  type: Type.STRING,
                  description: 'وقت البدء بصيغة HH:MM:SS,mmm مثال 00:00:01,000'
                },
                endTime: {
                  type: Type.STRING,
                  description: 'وقت الانتهاء بصيغة HH:MM:SS,mmm مثال 00:00:05,000'
                },
                text: {
                  type: Type.STRING,
                  description: 'النص المفرغ'
                }
              },
              required: ['startTime', 'endTime', 'text']
            }
          }
      };

      let response: any = null;

      for (let i = 0; i < GEMINI_MODELS_CASCADE.length; i++) {
        const modelName = GEMINI_MODELS_CASCADE[i];
        const isPrimary = i === 0;
        const attemptLabel = isPrimary ? `الأساسي (${modelName})` : `البديل (${modelName})`;

        addLog({
          type: 'model',
          title: `محاولة تشغيل النموذج ${attemptLabel}`,
          details: `جاري إرسال المقطع الصوتي وتحليله لاستخراج التوقيتات الدقيقة والنصوص بالتشكيل... (المحاولة ${i + 1} من ${GEMINI_MODELS_CASCADE.length})`,
          modelName
        });

        const startModelTime = Date.now();
        try {
          response = await ai.models.generateContent({
            model: modelName, 
            contents: { parts: [audioPart, { text: prompt }] },
            config
          });
          const durationMs = Date.now() - startModelTime;

          addLog({
            type: 'success',
            title: `نجح النموذج ${attemptLabel}`,
            details: `تمت معالجة الصوت واستلام نصوص وتوقيتات الترجمة بنجاح في ${(durationMs / 1000).toFixed(2)} ثانية.`,
            modelName,
            durationMs
          });
          break;
        } catch (firstErr: any) {
          const durationMs = Date.now() - startModelTime;
          const hasNext = i < GEMINI_MODELS_CASCADE.length - 1;
          const nextModel = hasNext ? GEMINI_MODELS_CASCADE[i + 1] : null;

          if (hasNext) {
            console.warn(`Model ${modelName} failed, trying fallback ${nextModel}`, firstErr);
            addLog({
              type: 'warning',
              title: `فشل النموذج ${attemptLabel}`,
              details: `السبب: ${firstErr?.message || 'خطأ في الاتصال بالنموذج'}. جاري الانتقال تلقائياً للنموذج التالي (${nextModel})...`,
              modelName,
              durationMs
            });
          } else {
            console.error(`All fallback models failed`, firstErr);
            addLog({
              type: 'error',
              title: `فشل النموذج الأخير (${modelName})`,
              details: `السبب: ${firstErr?.message || 'فشلت كافة محاولات النماذج المتاحة'}.`,
              modelName,
              durationMs
            });
            throw firstErr;
          }
        }
      }
      
      const jsonResponse = JSON.parse(response?.text || '[]');

      if (Array.isArray(jsonResponse)) {
        // 1. Client-side splitting fallback: If AI failed to respect word count, we split it here.
        const splitSegments = (segments: TranscriptionSegment[]): TranscriptionSegment[] => {
          const result: TranscriptionSegment[] = [];
          const maxWords = options.wordsPerLine;

          for (const segment of segments) {
            const words = segment.text.trim().split(/\s+/);
            if (words.length <= maxWords) {
              result.push(segment);
              continue;
            }

            // Split long segment into multiple smaller ones
            const startMs = timeToMs(segment.startTime);
            const endMs = timeToMs(segment.endTime);
            const totalDuration = endMs - startMs;
            const totalChars = segment.text.length;

            let currentStartMs = startMs;
            for (let i = 0; i < words.length; i += maxWords) {
              const chunkWords = words.slice(i, i + maxWords);
              const chunkText = chunkWords.join(' ');
              
              // Calculate duration based on character length ratio
              const ratio = chunkText.length / totalChars;
              const chunkDuration = totalDuration * ratio;
              const currentEndMs = (i + maxWords >= words.length) ? endMs : currentStartMs + chunkDuration;

              result.push({
                startTime: msToTime(currentStartMs),
                endTime: msToTime(currentEndMs),
                text: chunkText
              });
              currentStartMs = currentEndMs;
            }
          }
          return result;
        };

        const initialProcessed = splitSegments(jsonResponse);

        // 2. Post-processing: Force format normalization AND Continuous Flow
        const adjustedTranscription = initialProcessed.map((segment: TranscriptionSegment, index: number, array: TranscriptionSegment[]) => {
          
          const startMs = timeToMs(segment.startTime);
          let endMs = timeToMs(segment.endTime); // Initial guess from AI
          
          // STRICT GAP FILLING LOGIC:
          // If this is NOT the last segment, force the End Time to be exactly the Start Time of the next segment.
          // This ensures the text stays on screen during silence, as requested.
          if (index < array.length - 1) {
            const nextSegment = array[index + 1];
            const nextStartMs = timeToMs(nextSegment.startTime);
            
            // Safety check: ensure next segment doesn't start BEFORE this one (overlap error)
            // But mostly, extend current End to next Start.
            if (nextStartMs > startMs) {
                endMs = nextStartMs;
            }
          }

          return {
            ...segment,
            startTime: msToTime(startMs), // Ensures 00:00:00,000 format
            endTime: msToTime(endMs)
          };
        });
        
        setTranscription(adjustedTranscription);
        setHistory([adjustedTranscription]);
        setHistoryIndex(0);

        addLog({
          type: 'info',
          title: 'معالجة التوقيت الزمني وانسيابية العرض (Continuous Flow)',
          details: `تم تنظيم المقاطع وسد الفجوات الصوتية لـ ${adjustedTranscription.length} مقطع زمني بنجاح.`
        });

        addLog({
          type: 'success',
          title: 'اكتمال التفريغ - صدر ملف الترجمة (SRT) بنجاح',
          details: `أصبح ملف الـ SRT مكتملاً (${adjustedTranscription.length} مقطع) وجاهزاً للمعاينة، التعديل، والتحميل المباشر.`
        });

      } else {
        console.error("Received non-array response from API:", jsonResponse);
        setError("فشل تحليل استجابة النموذج. التنسيق غير متوقع.");
        setTranscription([]);
        addLog({
          type: 'error',
          title: 'فشل تحليل استجابة النموذج',
          details: 'الاستجابة المستلمة ليست بتنسيق مصفوفة مقاطع صالحة.'
        });
      }

    } catch (err: any) {
      console.error(err);
      const msg = err?.message?.includes?.("PERMISSION_DENIED") || err?.status === 403
        ? "تم رفض الإذن (Permission Denied). يرجى التأكد من صلاحية مفتاح Gemini API وتفعيله."
        : "حدث خطأ أثناء معالجة الملف. قد يكون نوع الملف غير مدعوم أو حدث خطأ في الشبكة.";
      setError(msg);
      addLog({
        type: 'error',
        title: 'خطأ أثناء المعالجة والتفريغ',
        details: msg
      });
    } finally {
      setIsLoading(false);
    }
  }, [audioFile, options, addLog]);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300 font-[Tajawal,sans-serif]">
      <Header />
      
      <main className="container mx-auto px-4 py-6 mb-28">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">1. إعدادات التفريغ</h2>
              <OptionsPanel options={options} onChange={handleOptionsChange} />
            </div>
            <div className="space-y-6">
               <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">2. رفع الملف الصوتي</h2>
              <FileUpload onFileChange={handleFileChange} />
            </div>
          </div>
          
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleTranscribe}
              disabled={!audioFile || isLoading}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md text-base transition-all duration-300 transform hover:scale-105 flex items-center justify-center shadow-md disabled:shadow-none"
            >
              {isLoading ? 'جاري التفريغ...' : 'ابدأ التفريغ الصوتي'}
            </button>
          </div>

          {error && <div className="mt-6"><Alert message={error} type="error" /></div>}
          
          <div className="mt-8">
            {isLoading && <Loader />}
            
            {transcription && (
              <TranscriptionView 
                transcription={transcription} 
                onUpdate={handleUpdateTranscription}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                currentTime={currentTime}
                onSeek={handleSeekRequest}
              />
            )}
          </div>
        </div>
      </main>
      
      {/* Audio Player Footer - Always visible, controls state depends on audioFile/transcription */}
      <AudioPlayer 
        file={audioFile} 
        audioRef={audioRef}
        transcription={transcription}
        onTimeUpdate={handleTimeUpdate}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onHelp={() => setIsHelpOpen(true)}
        onOpenLog={() => setIsLogOpen(true)}
        logCount={logs.length}
        onAddLog={addLog}
        includeDiacritics={includeDiacritics}
        onToggleDiacritics={setIncludeDiacritics}
        onImportSRT={handleImportSRT}
        isExternalSrtLoaded={isExternalSrtLoaded}
        isAddingHarakat={isAddingHarakat}
        onAddHarakat={handleAddHarakat}
      />
      
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ActivityLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} logs={logs} onClearLogs={handleClearLogs} />
    </div>
  );
};

export default App;