# بوت تيليجرام لـ DeepSeek Harness 🤖

بوت تيليجرام يتيح لك التفاعل مع DeepSeek Harness مباشرة من تيليجرام.

## المميزات

- 💬 الدردشة مع DeepSeek AI عبر تيليجرام
- 🔄 الحفاظ على سجل المحادثة لكل مستخدم
- 🤖 التبديل بين نماذج الذكاء الاصطناعي المختلفة
- 🆕 بدء محادثات جديدة في أي وقت
- ⚡ سرعة استجابة عالية

## الأوامر

| الأمر | الوصف |
|--------|-------|
| `/start` | بدء البوت وإعادة تعيين الجلسة |
| `/help` | عرض معلومات المساعدة |
| `/newchat` | مسح المحادثة والبدء من جديد |
| `/model` | عرض نموذج الذكاء الاصطناعي الحالي |
| `/models` | عرض قائمة النماذج المتاحة |
| `/setmodel <model_id>` | تغيير نموذج الذكاء الاصطناعي |

## النماذج المتاحة

- `deepseek-chat` - DeepSeek V3 (افتراضي)
- `deepseek-reasoner` - DeepSeek R1 (استدلال)
- `gpt-4o` - OpenAI GPT-4
- `claude-3-5-sonnet` - Anthropic Claude 3.5

## المتطلبات

- Node.js 20 أو أعلى
- رمز بوت تيليجرام (من [@BotFather](https://t.me/BotFather))
- مفتاح DeepSeek API (اختياري، للتخزين الاحتياطي)

## التشغيل المحلي

### 1. التثبيت

```bash
git clone <your-repo-url>
cd telegram-dsh-bot
npm install
```

### 2. إعداد المتغيرات البيئية

```bash
cp .env.example .env
```

عدّل `.env` dengan بياناتك:

```env
TELEGRAM_BOT_TOKEN=رمز_البوت_الخاص_بك
DEEP_SEEK_API_KEY=مفتاح_API_الخاص_بك
DSH_MODEL=deepseek-chat
```

### 3. التشغيل

```bash
npm start
```

## النشر على Render.com 🚀

### المتغيرات البيئية على Render

| المتغير | مطلوب | الوصف |
|----------|--------|--------|
| `TELEGRAM_BOT_TOKEN` | ✅ | رمز بوت تيليجرام من @BotFather |
| `DEEP_SEEK_API_KEY` | ✅ | مفتاح DeepSeek API |
| `DSH_MODEL` | ❌ | اسم النموذج (افتراضي: deepseek-chat) |
| `SESSIONS_DIR` | ❌ | مسار تخزين الجلسات |
| `NODE_ENV` | ❌ | اجعله `production` |

### خطوات النشر

1. ارفع المشروع على GitHub
2. اذهب إلى [render.com](https://render.com)
3. أنشئ Web Service جديد
4. اربط مستودع GitHub الخاص بك
5. أضف المتغيرات البيئية:
   - `TELEGRAM_BOT_TOKEN`
   - `DEEP_SEEK_API_KEY`
   - `DSH_MODEL` (اختياري)
6. انشر!

## هيكل المشروع

```
telegram-dsh-bot/
├── src/
│   └── index.js          # كود البوت الرئيسي
├── sessions/             # سجل المحادثات (يتم إنشاؤه تلقائياً)
├── Dockerfile            # إعدادات Docker
├── render.yaml           # مخطط Render.com
├── .env.example          # قالب المتغيرات البيئية
└── package.json          # التبعيات
```

## كيف يعمل

1. تستلم الرسائل من تيليجرام
2. يحافظ البوت على سجل المحادثة لكل مستخدم في ملفات JSON
3. لكل رسالة، يقوم البوت بـ:
   - تحميل سجل المحادثة للمستخدم
   - إرسال المحادثة الكاملة إلى DSH (أو DeepSeek API كاحتياطي)
   - إرجاع استجابة الذكاء الاصطناعي للمستخدم
4. يتم حفظ سجل المحادثة للسياق في الرسائل المستقبلية

## ملاحظات

- يستخدم البوت DeepSeek API كاحتياطي عندما لا يكون DSH متاحاً
- للحصول على أفضل النتائج، ثبّت DSH عالمياً (`npm install -g @deepseek-ai/dsh`)
- يتم تخزين الجلسات محلياً في ملفات JSON
- لكل مستخدم محادثة مستقلة خاصة به

## الترخيص

MIT