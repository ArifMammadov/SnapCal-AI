export type SupportedLanguage = 'en' | 'ru' | 'uz' | 'kk' | 'az' | 'tr' | 'ar'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ru', 'uz', 'kk', 'az', 'tr', 'ar']

export function normalizeLanguage(lang?: string | null): SupportedLanguage {
  if (!lang) return 'en'
  const code = lang.toLowerCase().split('-')[0] as SupportedLanguage
  if (SUPPORTED_LANGUAGES.includes(code)) return code
  if (['ru', 'uk', 'be'].includes(code)) return 'ru'
  return 'en'
}

const apiMessages = {
  user_not_found: {
    en: 'User not found. Please log in again.',
    ru: 'Пользователь не найден. Войдите снова.',
    uz: 'Foydalanuvchi topilmadi. Iltimos, qayta kiring.',
    kk: 'Пайдаланушы табылмады. Қайта кіріңіз.',
    az: 'İstifadəçi tapılmadı. Yenidən daxil olun.',
    tr: 'Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.',
    ar: 'المستخدم غير موجود. يرجى تسجيل الدخول مرة أخرى.',
  },
  daily_text_limit: {
    en: 'Free daily text message limit reached. Upgrade to SnapCal Pro for unlimited chat.',
    ru: 'Бесплатный лимит текстовых сообщений на сегодня исчерпан. Оформите подписку SnapCal Pro для безлимитного общения.',
    uz: 'Bugun bepul matn xabarlarining limiti tugadi. Cheksiz suhbat uchun SnapCal Pro obunasini rasmiylashtiring.',
    kk: 'Бүгінгі тегін мәтіндік хабарламалар лимиті аяқталды. Шексіз чат үшін SnapCal Pro жазылысын рәсімдеңіз.',
    az: 'Günlük pulsuz mətn mesajı limiti bitdi. Limitsiz söhbət üçün SnapCal Pro abunəliyi əldə edin.',
    tr: 'Ücretsiz günlük metin mesajı limitine ulaşıldı. Sınırsız sohbet için SnapCal Pro aboneliği satın alın.',
    ar: 'تم الوصول إلى الحد الأقصى المجاني للرسائل النصية اليوم. قم بالترقية إلى SnapCal Pro للدردشة غير المحدودة.',
  },
  ai_unavailable: {
    en: 'AI Coach is temporarily unavailable. Please try again later.',
    ru: 'AI-коуч временно недоступен. Попробуйте позже.',
    uz: 'AI-koach vaqtincha mavjud emas. Keyinroq urinib koʻring.',
    kk: 'AI-коуч уақытша қолжетімсіз. Кейінірек қайта байқап көріңіз.',
    az: 'AI-koach müvəqqəti olaraq əlçatan deyil. Zəhmət olmasa, sonra yenidən cəhd edin.',
    tr: 'AI Koç geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    ar: 'مدرب الذكاء الاصطناعي غير متاح مؤقتًا. يرجى المحاولة مرة أخرى لاحقًا.',
  },
  fallback_error: {
    en: 'Sorry, I could not process your request right now. Please try again in a moment.',
    ru: 'Извините, сейчас не удалось обработать запрос. Попробуйте ещё раз через минуту.',
    uz: 'Kechirasiz, hozir soʻrovingizni qayta ishlab boʻlmadi. Bir daqiqadan keyin urinib koʻring.',
    kk: 'Кешіріңіз, қазір сіздің сұранысыңызды өңдеу мүмкін болмады. Бір минуттан кейін қайта көріп көріңіз.',
    az: 'Üzr istəyirik, hazırda sorğunuzu emal edə bilmədim. Bir dəqiqə sonra yenidən cəhd edin.',
    tr: 'Üzgünüm, şu anda isteğinizi işleyemedim. Lütfen biraz sonra tekrar deneyin.',
    ar: 'عذرًا، لم أتمكن من معالجة طلبك الآن. يرجى المحاولة مرة أخرى بعد قليل.',
  },
  photo_analysis_unavailable: {
    en: 'AI vision service is temporarily unavailable. Please try again later.',
    ru: 'Сервис компьютерного зрения временно недоступен. Попробуйте позже.',
    uz: 'AI tasvir xizmati vaqtincha mavjud emas. Keyinroq urinib koʻring.',
    kk: 'AI көру қызметі уақытша қолжетімсіз. Кейінірек қайта байқап көріңіз.',
    az: 'AI vision xidməti müvəqqəti olaraq əlçatan deyil. Zəhmət olmasa, sonra yenidən cəhd edin.',
    tr: 'AI görme hizmeti geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    ar: 'خدمة الرؤية الذكية غير متاحة مؤقتًا. يرجى المحاولة لاحقًا.',
  },
  photo_analysis_failed: {
    en: 'Could not start photo analysis. Please try again.',
    ru: 'Не удалось запустить анализ фото. Попробуйте ещё раз.',
    uz: 'Rasm tahlili boshlanmadi. Qayta urinib koʻring.',
    kk: 'Сурет талдауын бастау мүмкін болмады. Қайта байқап көріңіз.',
    az: 'Şəkil təhlili başladıla bilmədi. Zəhmət olmasa, yenidən cəhd edin.',
    tr: 'Fotoğraf analizi başlatılamadı. Lütfen tekrar deneyin.',
    ar: 'تعذر بدء تحليل الصورة. يرجى المحاولة مرة أخرى.',
  },
  upgrade_to_pro: {
    en: 'Upgrade to Pro',
    ru: 'Оформить Pro',
    uz: 'Pro ga o‘tish',
    kk: 'Pro-ға ауысу',
    az: 'Pro-ya keçin',
    tr: 'Pro’ya Yükselt',
    ar: 'الترقية إلى Pro',
  },
}

export function t(key: keyof typeof apiMessages, lang: SupportedLanguage): string {
  return apiMessages[key]?.[lang] || apiMessages[key]?.['en'] || key
}

const welcomeMessages: Record<SupportedLanguage, (name: string, goalText: string, targetPart: string) => string> = {
  en: (name, goalText, targetPart) =>
    `Welcome to SnapCal, ${name}! 👋

I'm your personal AI coach. You can snap photos of food to get calories and macros, chat with me, and learn more about health and nutrition.

I've already calculated a personalized plan for you (${goalText}). You can view it on the Home screen under «Plan Overview». ${targetPart}

To support your health and make progress toward your goal, choose an activity program in the Expert section.

So I can do my job correctly, please tell me if you have any allergies to foods?`,
  ru: (name, goalText, targetPart) =>
    `Добро пожаловать в SnapCal, ${name}! 👋

Я ваш персональный AI-коуч. Можно фотографировать еду и узнавать калории и макросы, общаться со мной и узнавать новое в направлении здоровья и питания.

Я уже рассчитал для вас персональный план (${goalText}). Его можно посмотреть на главной странице в разделе «Обзор плана». ${targetPart}

Для поддержки здоровья и эффективного продвижения к вашей цели в программе Эксперт выберите программу для активности.

Чтобы я делал свою работу корректно, скажите, есть ли у вас аллергия на какие-либо продукты?`,
  uz: (name, goalText, targetPart) =>
    `SnapCal-ga xush kelibsiz, ${name}! 👋

Men sizning shaxsiy AI-koachingizman. Oziq-ovqat suratlarini tushirib, kaloriya va makrosini bilishingiz, menga savollar berishingiz va salomatlik va ozuqalar haqida yangi narsalarni oʻrganishingiz mumkin.

Men siz uchun shaxsiy reja ishlab chiqdim (${goalText}). Bosh sahifadagi «Reja koʻrinishi» boʻlimidan koʻrishingiz mumkin. ${targetPart}

Salomatligingizni qoʻllab-quvvatlash va maqsadingizga samarali yetish uchun Ekspert dasturida faollik dasturini tanlang.

Ishimni toʻgʻri bajarishim uchun, iltimos, qandaydir oziq-ovqatga allergiyangiz bor-yoʻqligini ayting.`,
  kk: (name, goalText, targetPart) =>
    `SnapCal-ға қош келдіңіз, ${name}! 👋

Мен сіздің жеке AI-коучыңызбын. Тағам суреттерін түсіріп, калория мен макронутриенттерді білуге, маған сұрақтар қоюға және денсаулық пен тамақтану туралы жаңа нәрселер үйренуге болады.

Мен сіз үшін жеке жоспар жасадым (${goalText}). Басты беттегі «Жоспар шолуы» бөлімінен көруге болады. ${targetPart}

Денсаулығыңызды қолдау және мақсатыңызға тиімді өрлеу үшін Эксперт бағдарламасында белсенділік бағдарламасын таңдаңыз.

Жұмысымды дұрыс орындауым үшін, сізде қандай да бір тағамға аллергия бар-жоғын айтыңыз.`,
  az: (name, goalText, targetPart) =>
    `SnapCal-a xoş gəlmisiniz, ${name}! 👋

Mən sizin şəxsi AI-koçunuzam. Qida şəkillərini çəkib kalori və makros almaq, mənimlə söhbət etmək və sağlamlıq və qidalanma haqqında yeni şeylər öyrənmək olar.

Mən sizin üçün şəxsi plan hazırladım (${goalText}). Əsas səhifədəki «Plan Baxışı» bölməsindən görə bilərsiniz. ${targetPart}

Sağlamlığınızı dəstəkləmək və məqsədinizə səmərəli irəliləmək üçün Ekspert proqramında fəaliyyət proqramı seçin.

İşimi düzgün etməyim üçün, zəhmət olmasa, hansısa qidaya allergiyanız olub-olmadığını deyin.`,
  tr: (name, goalText, targetPart) =>
    `SnapCal'a hoş geldiniz, ${name}! 👋

Ben kişisel AI koçunuzum. Yemek fotoğrafları çekip kalori ve makro besinleri öğrenebilir, benimle sohbet edebilir ve sağlık/beslenme hakkında yeni şeyler keşfedebilirsiniz.

Sizin için kişiselleştirilmiş bir plan hazırladım (${goalText}). Ana ekrandaki «Plan Özeti» bölümünden görüntüleyebilirsiniz. ${targetPart}

Sağlığınızı desteklemek ve hedefinize etkili bir şekilde ilerlemek için Uzman programı içinden bir aktivite programı seçin.

İşimi doğru yapabilmem için lütfen herhangi bir gıdaya alerjiniz olup olmadığını söyleyin.`,
  ar: (name, goalText, targetPart) =>
    `أهلاً بك في SnapCal، ${name}! 👋

أنا مدربك الشخصي بالذكاء الاصطناعي. يمكنك تصوير الطعام لمعرفة السعرات والمغذيات، والدردشة معي، وتعلم المزيد عن الصحة والتغذية.

لقد أعددت خطة شخصية لك (${goalText}). يمكنك مشاهدتها في الشاشة الرئيسية ضمن «نظرة عامة على الخطة». ${targetPart}

لدعم صحتك والتقدم الفعّال نحو هدفك، اختر برنامج نشاط في قسم الخبير.

لأتمكن من عملي بشكل صحيح، هل لديك حساسية من أي طعام؟`,
}

export function getWelcomeMessage(lang: SupportedLanguage, name: string, goalText: string, targetPart: string): string {
  return welcomeMessages[lang]?.(name, goalText, targetPart) || welcomeMessages['en'](name, goalText, targetPart)
}

const goalLabels: Record<string, Record<SupportedLanguage, string>> = {
  FAT_LOSS: {
    en: 'weight loss',
    ru: 'похудение',
    uz: 'vazn yoʻqotish',
    kk: 'салмақ жоғалту',
    az: 'çəki itkisi',
    tr: 'kilo verme',
    ar: 'فقدان الوزن',
  },
  MUSCLE_GAIN: {
    en: 'muscle gain',
    ru: 'набор массы',
    uz: 'massa yig‘ish',
    kk: 'масса жинау',
    az: 'əzələ yığmaq',
    tr: 'kas kazanma',
    ar: 'اكتساب العضلات',
  },
  MAINTENANCE: {
    en: 'maintenance',
    ru: 'поддержание формы',
    uz: 'formani saqlash',
    kk: 'форманы сақтау',
    az: 'formanı saxlamaq',
    tr: 'form koruma',
    ar: 'الحفاظ على اللياقة',
  },
  HEALTH: {
    en: 'health improvement',
    ru: 'улучшение здоровья',
    uz: 'salomatlikni yaxshilash',
    kk: 'денсаулықты жақсарту',
    az: 'sağlamlığın yaxşılaşdırılması',
    tr: 'sağlık iyileştirme',
    ar: 'تحسين الصحة',
  },
}

export function getGoalLabel(goal: string | null | undefined, lang: SupportedLanguage): string {
  return goalLabels[goal ?? '']?.[lang] || goalLabels['HEALTH']?.[lang] || 'health'
}
