/* =====================================================
   HOME MANAGER — i18n.js
   Three languages: English (like the landing page),
   Uzbek and Russian. The first visit picks the phone's
   language; the EN / UZ / RU switch changes it anywhere.

   In HTML:  data-i18n="key"         → text
             data-i18n-ph="key"      → placeholder
             data-i18n-aria="key"    → aria-label
===================================================== */

(function () {
  "use strict";

  const LANGS = ["en", "uz", "ru"];

  const DICT = {
    en: {
      "brand": "Home Manager",
      "conn.online": "Connected",
      "conn.connecting": "Connecting…",
      "conn.offline": "No internet — everything will be sent when it's back",

      "reg.title": "Create your account",
      "reg.lead": "It's saved on this phone. Next you'll choose whether you're a parent or a child.",
      "reg.invited": "You've been invited to a family. Create an account to join it.",
      "reg.submit": "Create account",
      "reg.haveAccount": "Already have an account on this phone?",
      "reg.toLogin": "Log in",
      "f.name": "Your name",
      "f.namePh": "e.g. Aziza",
      "f.pin": "PIN code",
      "f.pinHint": "4 digits. You'll use it to log in on this phone.",
      "f.pin2": "Repeat the PIN",
      "err.name": "Enter your name.",
      "err.pin": "The PIN must be exactly 4 digits.",
      "err.pin2": "The PINs don't match.",

      "login.title": "Log in",
      "login.lead": "Choose your name and enter your PIN.",
      "login.submit": "Log in",
      "login.new": "New on this phone?",
      "login.toReg": "Create an account",
      "login.empty": "There are no accounts on this phone yet.",
      "err.pickAccount": "Choose your name.",
      "err.wrongPin": "Wrong PIN. Try again.",

      "role.title": "Who are you?",
      "role.lead": "You choose once. Parents and children see different screens.",
      "role.hello": "Hi, {name}!",
      "role.parentTitle": "I'm a parent",
      "role.parentText": "Send instructions to your children with one tap and see their answers.",
      "role.childTitle": "I'm a child",
      "role.childText": "Get instructions from your parents and answer with one tap.",
      "role.parent": "Parent",
      "role.child": "Child",
      "role.none": "Role not chosen",

      "fam.createTitle": "Create your family",
      "fam.createLead": "Your children will join it from their own phones.",
      "fam.name": "Family name",
      "fam.namePh": "e.g. The Karimovs",
      "fam.create": "Create family",
      "fam.or": "or",
      "fam.haveCode": "I have a family code",
      "fam.joinParentLead": "Did another parent already create the family? Enter the code from their invite.",
      "fam.joinTitle": "Join your family",
      "fam.joinLead": "Ask your parent for the invite link, or type the family code.",
      "fam.code": "Family code",
      "fam.join": "Join family",
      "fam.inviteTitle": "Invite your children",
      "fam.inviteLead": "Send this link to your child's phone. When they open it, they join your family.",
      "fam.share": "Send the link",
      "fam.copy": "Copy link",
      "fam.copied": "Link copied",
      "fam.copyFailed": "Couldn't copy the link. Use “Send the link” instead.",
      "fam.continue": "Continue",
      "fam.later": "You can invite more people later from the Family tab.",
      "err.familyName": "Enter a family name.",
      "err.code": "The code has 16 letters and digits, like ABCD-EFGH-JKLM-NPQR.",
      "share.text": "Join our family in Home Manager. Open this link on your phone:",

      "tab.send": "Send",
      "tab.history": "History",
      "tab.family": "Family",
      "tab.home": "Home",
      "tab.me": "Me",

      "p.to": "Send to",
      "p.everyone": "All children",
      "p.noChildren": "No children in the family yet.",
      "p.invite": "Invite",
      "p.urgent": "Urgent",
      "p.urgentHint": "The next instruction goes out with a loud alert",
      "p.buttons": "Instructions",
      "p.edit": "Edit",
      "p.editDone": "Done",
      "p.editHint": "Tap a button to change or remove it.",
      "p.newButton": "New button",
      "p.restore": "Bring back the ready-made buttons",
      "p.restored": "Ready-made buttons are back",
      "p.ownPh": "Or type your own",
      "p.sendOwn": "Send",
      "p.sent": "Sent: {who}",
      "p.recent": "Latest",
      "p.showAll": "Show all",
      "p.nothingSent": "Tap a button above. Your child sees it right away.",
      "p.resend": "Send again",
      "p.gotIt": "Got it",
      "p.byYou": "You",
      "p.historyEmpty": "Nothing here yet. Sent instructions and messages from your children will appear here.",
      "p.answer": "{name}: {answer}",

      "st.sending": "Sending…",
      "st.sent": "Sent",
      "st.seen": "Seen",
      "st.ok": "OK",
      "st.done": "Done",
      "st.help": "Needs help",
      "st.lost": "Not delivered",

      "c.from": "From {name}",
      "c.parent": "Parent",
      "c.reply.ok": "OK",
      "c.reply.done": "Done",
      "c.reply.help": "Need help",
      "c.more": "Also waiting for your answer",
      "c.allClear": "No new instructions",
      "c.allClearText": "When your parent sends one, it appears here with a sound.",
      "c.toParents": "Message your parents",
      "c.waitingParent": "Waiting for your parent",
      "c.waitingParentText": "You're in the family with code {code}. Your parent shows up here once they open the app.",
      "c.answered": "Your answer: {answer}",
      "c.noAnswer": "No answer",
      "c.historyEmpty": "No instructions yet.",
      "c.sentMsg": "Sent to your parents",
      "c.replied": "Answer sent",

      "set.family": "Family",
      "set.code": "Family code",
      "set.members": "Members",
      "set.you": "you",
      "set.language": "Language",
      "set.connection": "Connection",
      "set.notifications": "Notifications",
      "set.notifOn": "On",
      "set.notifTurnOn": "Turn on",
      "set.notifBlocked": "Blocked in browser settings",
      "set.notifUnsupported": "Not available in this browser",
      "set.sound": "Sound",
      "set.testSound": "Test",
      "set.install": "To open Home Manager like a regular app, choose “Add to Home screen” in your browser menu.",
      "set.logout": "Log out",
      "set.leave": "Leave the family",
      "set.leaveConfirm": "Leave the family? This phone will stop getting its instructions. You can come back with the family code.",
      "set.cancel": "Cancel",

      "snd.enable": "Tap here to turn on the sound",

      "ed.newTitle": "New button",
      "ed.editTitle": "Edit button",
      "ed.text": "What should it say?",
      "ed.textPh": "e.g. Feed the cat",
      "ed.icon": "Icon",
      "ed.color": "Color",
      "ed.save": "Save",
      "ed.delete": "Delete button",
      "ed.hide": "Remove button",
      "ed.saved": "Button saved",
      "ed.deleted": "Button removed",
      "err.text": "Write the instruction.",
      "err.notSent": "Couldn't send. Try again.",

      "color.pine": "Green",
      "color.gold": "Yellow",
      "color.ember": "Orange",
      "color.sky": "Blue",
      "color.plum": "Purple",
      "color.slate": "Grey",

      "time.now": "just now",
      "time.min": "{n} min ago",
      "time.hour": "{n} h ago",
      "time.yesterday": "yesterday, {time}",

      "preset.p.eat": "Come and eat",
      "preset.p.homework": "Do your homework",
      "preset.p.sleep": "Time for bed",
      "preset.p.home": "Come home",
      "preset.p.call": "Call me",
      "preset.p.room": "Tidy your room",
      "preset.p.phone": "Put the phone down",
      "preset.p.teeth": "Brush your teeth",
      "preset.p.come": "Come to me",
      "preset.p.ready": "Get ready, we're leaving",
      "preset.c.pickup": "Pick me up",
      "preset.c.athome": "I'm home",
      "preset.c.callme": "Call me",
      "preset.c.allgood": "All good",
      "preset.c.hungry": "I'm hungry",
      "preset.c.help": "I need help",
    },

    uz: {
      "brand": "Home Manager",
      "conn.online": "Ulangan",
      "conn.connecting": "Ulanmoqda…",
      "conn.offline": "Internet yoʻq — ulanish tiklangach, hammasi yuboriladi",

      "reg.title": "Hisob yarating",
      "reg.lead": "Hisob shu telefonda saqlanadi. Keyingi qadamda kimligingizni tanlaysiz: ota-ona yoki farzand.",
      "reg.invited": "Sizni oilaga taklif qilishdi. Qoʻshilish uchun hisob yarating.",
      "reg.submit": "Hisob yaratish",
      "reg.haveAccount": "Bu telefonda hisobingiz bormi?",
      "reg.toLogin": "Kirish",
      "f.name": "Ismingiz",
      "f.namePh": "Masalan, Aziza",
      "f.pin": "PIN-kod",
      "f.pinHint": "4 ta raqam. Shu telefonda kirish uchun kerak boʻladi.",
      "f.pin2": "PIN-kodni takrorlang",
      "err.name": "Ismingizni kiriting.",
      "err.pin": "PIN-kod aynan 4 ta raqamdan iborat boʻlishi kerak.",
      "err.pin2": "PIN-kodlar mos kelmadi.",

      "login.title": "Kirish",
      "login.lead": "Ismingizni tanlang va PIN-kodni kiriting.",
      "login.submit": "Kirish",
      "login.new": "Bu telefonda birinchi martami?",
      "login.toReg": "Hisob yaratish",
      "login.empty": "Bu telefonda hali hisob yoʻq.",
      "err.pickAccount": "Ismingizni tanlang.",
      "err.wrongPin": "PIN-kod notoʻgʻri. Qayta urinib koʻring.",

      "role.title": "Siz kimsiz?",
      "role.lead": "Bir marta tanlanadi. Ota-ona va farzandning ekranlari har xil.",
      "role.hello": "Salom, {name}!",
      "role.parentTitle": "Men ota-onaman",
      "role.parentText": "Farzandlaringizga bir bosish bilan koʻrsatma yuboring va javoblarini koʻring.",
      "role.childTitle": "Men farzandman",
      "role.childText": "Ota-onangizdan koʻrsatma oling va bir bosish bilan javob bering.",
      "role.parent": "Ota-ona",
      "role.child": "Farzand",
      "role.none": "Rol tanlanmagan",

      "fam.createTitle": "Oilangizni yarating",
      "fam.createLead": "Farzandlaringiz unga oʻz telefonlaridan qoʻshiladi.",
      "fam.name": "Oila nomi",
      "fam.namePh": "Masalan, Karimovlar",
      "fam.create": "Oila yaratish",
      "fam.or": "yoki",
      "fam.haveCode": "Menda oila kodi bor",
      "fam.joinParentLead": "Oilani boshqa ota-ona yaratganmi? Taklifdagi kodni kiriting.",
      "fam.joinTitle": "Oilangizga qoʻshiling",
      "fam.joinLead": "Ota-onangizdan taklif havolasini soʻrang yoki oila kodini kiriting.",
      "fam.code": "Oila kodi",
      "fam.join": "Oilaga qoʻshilish",
      "fam.inviteTitle": "Farzandlaringizni taklif qiling",
      "fam.inviteLead": "Bu havolani farzandingiz telefoniga yuboring. U ochishi bilan oilangizga qoʻshiladi.",
      "fam.share": "Havolani yuborish",
      "fam.copy": "Havolani nusxalash",
      "fam.copied": "Havola nusxalandi",
      "fam.copyFailed": "Havolani nusxalab boʻlmadi. «Havolani yuborish» tugmasidan foydalaning.",
      "fam.continue": "Davom etish",
      "fam.later": "Keyinroq «Oila» boʻlimidan ham taklif qilish mumkin.",
      "err.familyName": "Oila nomini kiriting.",
      "err.code": "Kod 16 ta harf va raqamdan iborat, masalan ABCD-EFGH-JKLM-NPQR.",
      "share.text": "Home Manager ilovasida oilamizga qoʻshil. Bu havolani telefoningda och:",

      "tab.send": "Yuborish",
      "tab.history": "Tarix",
      "tab.family": "Oila",
      "tab.home": "Asosiy",
      "tab.me": "Profil",

      "p.to": "Kimga",
      "p.everyone": "Barcha farzandlarga",
      "p.noChildren": "Oilada hali farzand yoʻq.",
      "p.invite": "Taklif qilish",
      "p.urgent": "Shoshilinch",
      "p.urgentHint": "Keyingi koʻrsatma baland signal bilan boradi",
      "p.buttons": "Koʻrsatmalar",
      "p.edit": "Tahrirlash",
      "p.editDone": "Tayyor",
      "p.editHint": "Oʻzgartirish yoki olib tashlash uchun tugmani bosing.",
      "p.newButton": "Yangi tugma",
      "p.restore": "Tayyor tugmalarni qaytarish",
      "p.restored": "Tayyor tugmalar qaytarildi",
      "p.ownPh": "Yoki oʻzingiz yozing",
      "p.sendOwn": "Yuborish",
      "p.sent": "Yuborildi: {who}",
      "p.recent": "Soʻnggi koʻrsatmalar",
      "p.showAll": "Hammasi",
      "p.nothingSent": "Yuqoridagi tugmalardan birini bosing — farzandingiz darhol koʻradi.",
      "p.resend": "Qayta yuborish",
      "p.gotIt": "Tushunarli",
      "p.byYou": "Siz",
      "p.historyEmpty": "Hozircha boʻsh. Yuborilgan koʻrsatmalar va farzandlardan kelgan xabarlar shu yerda chiqadi.",
      "p.answer": "{name}: {answer}",

      "st.sending": "Yuborilmoqda…",
      "st.sent": "Yuborildi",
      "st.seen": "Koʻrdi",
      "st.ok": "Xoʻp",
      "st.done": "Bajardi",
      "st.help": "Yordam kerak",
      "st.lost": "Yetib bormadi",

      "c.from": "{name} yubordi",
      "c.parent": "Ota-ona",
      "c.reply.ok": "Xoʻp",
      "c.reply.done": "Bajardim",
      "c.reply.help": "Yordam kerak",
      "c.more": "Javob kutayotgan koʻrsatmalar",
      "c.allClear": "Yangi koʻrsatma yoʻq",
      "c.allClearText": "Ota-onangiz koʻrsatma yuborsa, u shu yerda ovozli signal bilan chiqadi.",
      "c.toParents": "Ota-onangizga yozing",
      "c.waitingParent": "Ota-onangiz kutilmoqda",
      "c.waitingParentText": "Siz {code} kodli oiladasiz. Ota-onangiz ilovani ochishi bilan shu yerda koʻrinadi.",
      "c.answered": "Javobingiz: {answer}",
      "c.noAnswer": "Javob berilmagan",
      "c.historyEmpty": "Hali koʻrsatma yoʻq.",
      "c.sentMsg": "Ota-onangizga yuborildi",
      "c.replied": "Javob yuborildi",

      "set.family": "Oila",
      "set.code": "Oila kodi",
      "set.members": "Oila a’zolari",
      "set.you": "siz",
      "set.language": "Til",
      "set.connection": "Aloqa",
      "set.notifications": "Bildirishnomalar",
      "set.notifOn": "Yoqilgan",
      "set.notifTurnOn": "Yoqish",
      "set.notifBlocked": "Brauzer sozlamalarida bloklangan",
      "set.notifUnsupported": "Bu brauzerda mavjud emas",
      "set.sound": "Ovoz",
      "set.testSound": "Tekshirish",
      "set.install": "Home Manager ilovasini oddiy ilova kabi ochish uchun brauzer menyusidan «Bosh ekranga qoʻshish» bandini tanlang.",
      "set.logout": "Hisobdan chiqish",
      "set.leave": "Oiladan chiqish",
      "set.leaveConfirm": "Oiladan chiqasizmi? Bu telefon endi oila koʻrsatmalarini olmaydi. Oila kodi bilan qaytish mumkin.",
      "set.cancel": "Bekor qilish",

      "snd.enable": "Ovozni yoqish uchun shu yerni bosing",

      "ed.newTitle": "Yangi tugma",
      "ed.editTitle": "Tugmani tahrirlash",
      "ed.text": "Unda nima yozilsin?",
      "ed.textPh": "Masalan: «Mushukka ovqat ber»",
      "ed.icon": "Belgi",
      "ed.color": "Rang",
      "ed.save": "Saqlash",
      "ed.delete": "Tugmani oʻchirish",
      "ed.hide": "Tugmani olib tashlash",
      "ed.saved": "Tugma saqlandi",
      "ed.deleted": "Tugma olib tashlandi",
      "err.text": "Koʻrsatmani yozing.",
      "err.notSent": "Yuborib boʻlmadi. Qayta urinib koʻring.",

      "color.pine": "Yashil",
      "color.gold": "Sariq",
      "color.ember": "Toʻq sariq",
      "color.sky": "Moviy",
      "color.plum": "Binafsha",
      "color.slate": "Kulrang",

      "time.now": "hozirgina",
      "time.min": "{n} daqiqa oldin",
      "time.hour": "{n} soat oldin",
      "time.yesterday": "kecha, {time}",

      "preset.p.eat": "Ovqatga kel",
      "preset.p.homework": "Darsingni qil",
      "preset.p.sleep": "Uxlash vaqti",
      "preset.p.home": "Uyga kel",
      "preset.p.call": "Menga qoʻngʻiroq qil",
      "preset.p.room": "Xonangni yigʻishtir",
      "preset.p.phone": "Telefonni qoʻy",
      "preset.p.teeth": "Tishingni yuv",
      "preset.p.come": "Yonimga kel",
      "preset.p.ready": "Tayyorlan, chiqyapmiz",
      "preset.c.pickup": "Meni olib keting",
      "preset.c.athome": "Uydaman",
      "preset.c.callme": "Qoʻngʻiroq qiling",
      "preset.c.allgood": "Hammasi joyida",
      "preset.c.hungry": "Qornim och",
      "preset.c.help": "Yordam kerak",
    },

    ru: {
      "brand": "Home Manager",
      "conn.online": "Подключено",
      "conn.connecting": "Подключение…",
      "conn.offline": "Нет интернета — всё отправится, когда он появится",

      "reg.title": "Создайте аккаунт",
      "reg.lead": "Аккаунт хранится на этом телефоне. Дальше выберете, кто вы: родитель или ребёнок.",
      "reg.invited": "Вас пригласили в семью. Создайте аккаунт, чтобы присоединиться.",
      "reg.submit": "Создать аккаунт",
      "reg.haveAccount": "Уже есть аккаунт на этом телефоне?",
      "reg.toLogin": "Войти",
      "f.name": "Ваше имя",
      "f.namePh": "Например, Азиза",
      "f.pin": "PIN-код",
      "f.pinHint": "4 цифры. Понадобится для входа на этом телефоне.",
      "f.pin2": "Повторите PIN-код",
      "err.name": "Введите имя.",
      "err.pin": "PIN-код — ровно 4 цифры.",
      "err.pin2": "PIN-коды не совпадают.",

      "login.title": "Вход",
      "login.lead": "Выберите своё имя и введите PIN-код.",
      "login.submit": "Войти",
      "login.new": "Впервые на этом телефоне?",
      "login.toReg": "Создать аккаунт",
      "login.empty": "На этом телефоне пока нет аккаунтов.",
      "err.pickAccount": "Выберите своё имя.",
      "err.wrongPin": "Неверный PIN-код. Попробуйте ещё раз.",

      "role.title": "Кто вы?",
      "role.lead": "Выбирается один раз. У родителя и ребёнка разные экраны.",
      "role.hello": "Привет, {name}!",
      "role.parentTitle": "Я родитель",
      "role.parentText": "Отправляйте детям указания одним нажатием и получайте их ответы.",
      "role.childTitle": "Я ребёнок",
      "role.childText": "Получайте указания от родителей и отвечайте одним нажатием.",
      "role.parent": "Родитель",
      "role.child": "Ребёнок",
      "role.none": "Роль не выбрана",

      "fam.createTitle": "Создайте семью",
      "fam.createLead": "Дети присоединятся к ней со своих телефонов.",
      "fam.name": "Название семьи",
      "fam.namePh": "Например, Каримовы",
      "fam.create": "Создать семью",
      "fam.or": "или",
      "fam.haveCode": "У меня есть код семьи",
      "fam.joinParentLead": "Семью уже создал другой родитель? Введите код из приглашения.",
      "fam.joinTitle": "Присоединитесь к семье",
      "fam.joinLead": "Попросите у родителя ссылку-приглашение или введите код семьи.",
      "fam.code": "Код семьи",
      "fam.join": "Присоединиться",
      "fam.inviteTitle": "Пригласите детей",
      "fam.inviteLead": "Отправьте эту ссылку на телефон ребёнка. Открыв её, он сразу окажется в вашей семье.",
      "fam.share": "Отправить ссылку",
      "fam.copy": "Скопировать ссылку",
      "fam.copied": "Ссылка скопирована",
      "fam.copyFailed": "Не удалось скопировать ссылку. Воспользуйтесь кнопкой «Отправить ссылку».",
      "fam.continue": "Продолжить",
      "fam.later": "Пригласить можно и позже, во вкладке «Семья».",
      "err.familyName": "Введите название семьи.",
      "err.code": "В коде 16 букв и цифр, например ABCD-EFGH-JKLM-NPQR.",
      "share.text": "Присоединяйся к нашей семье в Home Manager. Открой эту ссылку на телефоне:",

      "tab.send": "Отправить",
      "tab.history": "История",
      "tab.family": "Семья",
      "tab.home": "Главная",
      "tab.me": "Профиль",

      "p.to": "Кому",
      "p.everyone": "Всем детям",
      "p.noChildren": "В семье пока нет детей.",
      "p.invite": "Пригласить",
      "p.urgent": "Срочно",
      "p.urgentHint": "Следующее указание придёт с громким сигналом",
      "p.buttons": "Указания",
      "p.edit": "Изменить",
      "p.editDone": "Готово",
      "p.editHint": "Нажмите на кнопку, чтобы изменить или убрать её.",
      "p.newButton": "Новая кнопка",
      "p.restore": "Вернуть готовые кнопки",
      "p.restored": "Готовые кнопки вернулись",
      "p.ownPh": "Или напишите своё",
      "p.sendOwn": "Отправить",
      "p.sent": "Отправлено: {who}",
      "p.recent": "Последние",
      "p.showAll": "Показать все",
      "p.nothingSent": "Нажмите кнопку выше. Ребёнок сразу это увидит.",
      "p.resend": "Отправить ещё раз",
      "p.gotIt": "Понятно",
      "p.byYou": "Вы",
      "p.historyEmpty": "Пока пусто. Здесь появятся отправленные указания и сообщения от детей.",
      "p.answer": "{name}: {answer}",

      "st.sending": "Отправляется…",
      "st.sent": "Отправлено",
      "st.seen": "Прочитано",
      "st.ok": "Хорошо",
      "st.done": "Готово",
      "st.help": "Нужна помощь",
      "st.lost": "Не доставлено",

      "c.from": "От: {name}",
      "c.parent": "Родитель",
      "c.reply.ok": "Хорошо",
      "c.reply.done": "Готово",
      "c.reply.help": "Нужна помощь",
      "c.more": "Ещё ждут ответа",
      "c.allClear": "Новых указаний нет",
      "c.allClearText": "Когда родитель что-то отправит, это появится здесь со звуком.",
      "c.toParents": "Написать родителям",
      "c.waitingParent": "Ждём родителя",
      "c.waitingParentText": "Вы в семье с кодом {code}. Родитель появится здесь, когда откроет приложение.",
      "c.answered": "Ваш ответ: {answer}",
      "c.noAnswer": "Без ответа",
      "c.historyEmpty": "Указаний пока нет.",
      "c.sentMsg": "Отправлено родителям",
      "c.replied": "Ответ отправлен",

      "set.family": "Семья",
      "set.code": "Код семьи",
      "set.members": "Участники",
      "set.you": "вы",
      "set.language": "Язык",
      "set.connection": "Связь",
      "set.notifications": "Уведомления",
      "set.notifOn": "Включены",
      "set.notifTurnOn": "Включить",
      "set.notifBlocked": "Запрещены в настройках браузера",
      "set.notifUnsupported": "Недоступны в этом браузере",
      "set.sound": "Звук",
      "set.testSound": "Проверить",
      "set.install": "Чтобы открывать Home Manager как обычное приложение, выберите в меню браузера «Добавить на главный экран».",
      "set.logout": "Выйти из аккаунта",
      "set.leave": "Выйти из семьи",
      "set.leaveConfirm": "Выйти из семьи? Этот телефон перестанет получать её указания. Вернуться можно по коду семьи.",
      "set.cancel": "Отмена",

      "snd.enable": "Нажмите здесь, чтобы включить звук",

      "ed.newTitle": "Новая кнопка",
      "ed.editTitle": "Изменить кнопку",
      "ed.text": "Что на ней написать?",
      "ed.textPh": "Например: «Покорми кошку»",
      "ed.icon": "Значок",
      "ed.color": "Цвет",
      "ed.save": "Сохранить",
      "ed.delete": "Удалить кнопку",
      "ed.hide": "Убрать кнопку",
      "ed.saved": "Кнопка сохранена",
      "ed.deleted": "Кнопка убрана",
      "err.text": "Напишите указание.",
      "err.notSent": "Не удалось отправить. Попробуйте ещё раз.",

      "color.pine": "Зелёный",
      "color.gold": "Жёлтый",
      "color.ember": "Оранжевый",
      "color.sky": "Голубой",
      "color.plum": "Фиолетовый",
      "color.slate": "Серый",

      "time.now": "только что",
      "time.min": "{n} мин назад",
      "time.hour": "{n} ч назад",
      "time.yesterday": "вчера, {time}",

      "preset.p.eat": "Иди кушать",
      "preset.p.homework": "Делай уроки",
      "preset.p.sleep": "Пора спать",
      "preset.p.home": "Иди домой",
      "preset.p.call": "Позвони мне",
      "preset.p.room": "Убери в комнате",
      "preset.p.phone": "Отложи телефон",
      "preset.p.teeth": "Почисти зубы",
      "preset.p.come": "Подойди ко мне",
      "preset.p.ready": "Собирайся, выходим",
      "preset.c.pickup": "Забери меня",
      "preset.c.athome": "Я дома",
      "preset.c.callme": "Позвони мне",
      "preset.c.allgood": "Всё хорошо",
      "preset.c.hungry": "Хочу есть",
      "preset.c.help": "Мне нужна помощь",
    },
  };

  const listeners = [];
  let current = pickInitial();

  function pickInitial() {
    const saved = window.HMStore ? HMStore.lang() : "";
    if (LANGS.indexOf(saved) !== -1) return saved;
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
    for (const l of prefs) {
      const short = String(l).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(short) !== -1) return short;
    }
    return "en";
  }

  function has(key) {
    return Object.prototype.hasOwnProperty.call(DICT[current], key) || Object.prototype.hasOwnProperty.call(DICT.en, key);
  }

  function t(key, vars) {
    let s = DICT[current][key];
    if (s === undefined) s = DICT.en[key];
    if (s === undefined) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
    return s;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    scope.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.documentElement.lang = current;
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1 || lang === current) return;
    current = lang;
    if (window.HMStore) HMStore.setLang(lang);
    apply();
    renderSwitches();
    listeners.forEach((fn) => fn(lang));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  /* ---------- EN / UZ / RU switch: <div data-lang-switch></div> ---------- */

  function renderSwitches() {
    document.querySelectorAll("[data-lang-switch]").forEach((box) => {
      box.querySelectorAll("button").forEach((b) => {
        const on = b.getAttribute("data-lang") === current;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
    });
  }

  function mountSwitches() {
    document.querySelectorAll("[data-lang-switch]").forEach((box) => {
      if (box.childElementCount) return;
      box.classList.add("lang-switch");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "Language / Til / Язык");
      LANGS.forEach((lang) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = lang.toUpperCase();
        b.setAttribute("data-lang", lang);
        b.addEventListener("click", () => setLang(lang));
        box.appendChild(b);
      });
    });
    renderSwitches();
  }

  window.HMI18n = {
    LANGS: LANGS,
    t: t,
    has: has,
    lang: function () { return current; },
    setLang: setLang,
    apply: apply,
    onChange: onChange,
    mountSwitches: mountSwitches,
  };
})();
