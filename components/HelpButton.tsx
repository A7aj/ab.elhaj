import React from 'react';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { CloseIcon } from './icons/CloseIcon';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <HelpCircleIcon className="w-7 h-7 text-sky-500" />
            دليل الاستخدام الشامل
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 text-slate-700 dark:text-slate-300 space-y-8 leading-relaxed font-[Tajawal,sans-serif]">
          
          {/* Section 1: Concept */}
          <section className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-xl border border-sky-100 dark:border-sky-800">
            <h3 className="text-lg font-bold text-sky-700 dark:text-sky-400 mb-2">💡 فكرة البرنامج</h3>
            <p className="text-sm md:text-base">
              هذا التطبيق ليس مجرد محول صوت إلى نص، بل هو <strong>محطة عمل متكاملة لإنتاج ملفات الترجمة (Subtitles)</strong>. يعتمد على نموذج الذكاء الاصطناعي <strong>Gemini 2.5 Flash</strong> لفهم الكلام العربي (واللهجات العامية) بدقة عالية، مع الحفاظ على التشكيل وعلامات الترقيم، وتقسيم النص زمنياً ليتطابق مع الصوت أو الفيديو.
            </p>
          </section>

          {/* Section 2: Editor Workflow */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              🛠️ كيفية استخدام المحرر الذكي
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <span className="font-bold text-green-600 dark:text-green-400 block mb-1">تقسيم الجمل (Split)</span>
                <p className="text-sm">
                  ضع المؤشر في أي مكان داخل النص واضغط <kbd className="bg-white dark:bg-slate-600 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-500 font-mono text-xs">Enter</kbd>.
                  سيقوم البرنامج بقسم السطر إلى سطرين، مع إعادة حساب التوقيت تلقائياً (السطر الأول يأخذ النصف الأول من الوقت، والثاني يأخذ الباقي).
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <span className="font-bold text-red-600 dark:text-red-400 block mb-1">دمج الجمل (Merge)</span>
                <p className="text-sm">
                  قف في بداية أي سطر واضغط <kbd className="bg-white dark:bg-slate-600 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-500 font-mono text-xs">Backspace</kbd>.
                  سيتم دمج هذا السطر مع السطر السابق له، وسيتم دمج التوقيت الخاص بهما ليصبحا قطعة واحدة متصلة.
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg md:col-span-2">
                <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">التنقل والاستماع</span>
                <p className="text-sm">
                  يمكنك الضغط على <strong>التوقيت الأزرق</strong> بجوار أي جملة لتشغيل المقطع الصوتي الخاص بها فوراً. هذا يساعدك على المراجعة والتصحيح السريع.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Toolbar Buttons Explanation */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              🎛️ شرح شريط الأدوات والأزرار (بالتفصيل)
            </h3>
            
            <div className="space-y-4">
              
              {/* Group 1: Playback */}
              <div className="flex gap-4 items-start">
                <div className="flex gap-1 min-w-[80px] justify-center">
                   <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full h-8 w-8 flex items-center justify-center">▶</div>
                   <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full h-8 w-8 flex items-center justify-center">⏪</div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">التحكم في التشغيل</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    أزرار التشغيل والإيقاف، بالإضافة لأزرار <strong>تقديم 5 ثواني</strong> أو <strong>تأخير 5 ثواني</strong> للمساعدة في تدارك ما فاتك.
                  </p>
                </div>
              </div>

              {/* Group 2: Sync */}
              <div className="flex gap-4 items-start">
                <div className="min-w-[80px] flex justify-center">
                   <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full h-8 w-8 flex items-center justify-center">🔄</div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">ضبط التزامن (Sync)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    إذا لاحظت أن النص يظهر <strong>قبل</strong> الصوت أو <strong>بعده</strong>، اضغط على هذا الزر.
                    ستظهر قائمة لتقديم أو تأخير النص بالكامل (مثلاً: +0.5 ثانية لتأخير النص، -0.5 ثانية لتقديمه). هذا يحل مشكلة انزياح التوقيت.
                  </p>
                </div>
              </div>

              {/* Group 3: History */}
              <div className="flex gap-4 items-start">
                <div className="min-w-[80px] flex justify-center gap-1">
                   <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded h-8 w-8 flex items-center justify-center">↩️</div>
                   <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded h-8 w-8 flex items-center justify-center">↪️</div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">التراجع والإعادة (Undo/Redo)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    لا تقلق من ارتكاب الأخطاء! يمكنك التراجع عن أي تعديل (دمج، تقسيم، تغيير نص، تغيير تزامن) بالضغط على سهم التراجع أو الاختصار <kbd>Ctrl+Z</kbd>.
                  </p>
                </div>
              </div>

               {/* Group 4: Exports */}
               <div className="flex gap-4 items-start">
                <div className="min-w-[80px] flex justify-center flex-wrap gap-1">
                   <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded border border-green-200">SRT</span>
                   <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 rounded border border-indigo-200">EN</span>
                   <span className="text-[10px] bg-violet-100 text-violet-800 px-1 rounded border border-violet-200 font-bold">T</span>
                   <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded border border-blue-200">VTT</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">أزرار التصدير والترجمة (Export & Translation)</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
                    <li><strong>SRT:</strong> الصيغة الأشهر للترجمة، مدعومة في يوتيوب وبرامج الفيديو.</li>
                    <li><strong>VTT:</strong> صيغة (WebVTT) المفضلة للويب والمتصفحات.</li>
                    <li><strong>TXT:</strong> نص عادي بدون توقيتات (للقراءة فقط).</li>
                    <li><strong>EN (الإنجليزية):</strong> ترجمة النص إلى الإنجليزية مع حفظ التوقيت.</li>
                    <li><strong>T (قائمة لغات الترجمة):</strong> قائمة منسدلة تحتوي على أهم 12 لغة عالمية، وبجانب كل لغة مربع اختيار (Checkbox). يمكنك تحديد أي عدد من اللغات التي تريدها (مثلاً 5 لغات).</li>
                    <li><strong>حزمة ZIP (المحددة أو الكل):</strong> زر ديناميكي في أعلى القائمة؛ إذا حددت لغات معينة سيتحول إلى "اللغات المحددة - ZIP" ويترجم اللغات المختارة فقط ويحزمها بملف ZIP واحد، وإذا لم تحدد لغات يترجم كافة اللغات الـ 12 دفعة واحدة!</li>
                  </ul>
                </div>
              </div>

              {/* Group 5: LOD */}
              <div className="flex gap-4 items-start">
                <div className="min-w-[80px] flex justify-center">
                   <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-1 rounded border border-amber-200 font-bold">LOD</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">زر الاستيراد (LOD)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    تعني (Load On Demand). يتيح لك هذا الزر <strong>رفع ملف SRT خارجي</strong> من جهازك إلى البرنامج للتعديل عليه.
                    مفيد إذا كان لديك ملف ترجمة قديم وتريد إصلاح توقيته أو نصوصه باستخدام أدوات هذا البرنامج.
                  </p>
                </div>
              </div>

              {/* Group 6: Diacritics */}
              <div className="flex gap-4 items-start">
                <div className="min-w-[80px] flex justify-center">
                   <span className="text-xs">☑ بالتشكيل</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">خيار "بالتشكيل"</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    عند تفعيله (افتراضي)، سيظهر النص وعلامات التشكيل (الضمة، الفتحة، الخ). عند إلغاء تفعيله، سيتم تصدير النصوص بدون تشكيل (نص صامت)، وهو المفضل أحياناً في الترجمات السريعة لسهولة القراءة.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* Section 4: Settings */}
          <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">⚙️ إعدادات ما قبل التفريغ</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li>
                <strong>عدد الكلمات في السطر:</strong> يحدد كم كلمة تظهر في الشاشة في وقت واحد. القيمة المثالية لليوتيوب هي (8-12) كلمة.
              </li>
              <li>
                <strong>فترة الصمت القصوى:</strong> تحدد متى يعتبر البرنامج أن الجملة انتهت وبدأت جملة جديدة.
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
};