
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Download, 
  Play, 
  Image as ImageIcon, 
  Type, 
  ArrowLeft,
  Sparkles,
  Save,
  Trash2,
  Home,
  PenTool,
  Folder as FolderIcon,
  FolderPlus,
  RefreshCw,
  LogOut,
  Clock,
  ThumbsUp,
  AlertCircle,
  Smile,
  MoreVertical,
  ArrowRightLeft,
  Volume2,
  User,
  Key,
  X,
  FileText,
  FileSpreadsheet,
  Printer,
  Heart
} from 'lucide-react';
import { Card, Settings, ViewState, Folder } from './types';
import { generateFlashcardsFromList } from './services/geminiService';
import DrawingCanvas from './components/DrawingCanvas';

// --- Constants ---
const REVIEW_INTERVALS = {
  AGAIN: 10,
  HARD: 15,
  GOOD: 1440,
  EASY: 2880
};

const THAI_FOLDER_ID = 'thai_alphabet_folder';
const BASIC_THAI_1_FOLDER_ID = 'basic_thai_1_folder';

// --- Helper Functions ---
const detectLanguage = (text: string): string => {
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th-TH';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja-JP';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR';
  if (/[\u4E00-\u9FA5]/.test(text)) return 'zh-CN';
  return 'en-US';
};

const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const lang = detectLanguage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes(lang.split('-')[0]));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
};

const cleanHTML = (html: string) => {
    if (!html) return '';
    let decoded = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    decoded = decoded.replace(/<b>/gi, '<b class="text-moe-primary">');
    decoded = decoded.replace(/<strong>/gi, '<b class="text-moe-primary">');
    return decoded;
};

const stripHTML = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const getGreeting = (name: string, dueCount: number) => {
  const hour = new Date().getHours();
  let timeGreeting = '';
  if (hour < 5) timeGreeting = '这么晚了还在努力吗？';
  else if (hour < 11) timeGreeting = '早安！';
  else if (hour < 14) timeGreeting = '午安，';
  else if (hour < 19) timeGreeting = '下午好！';
  else timeGreeting = '晚上好，';
  if (dueCount > 10) return `${timeGreeting} 我们积压了 ${dueCount} 个卡片，一起加油消灭它们吧！`;
  if (dueCount > 0) return `${timeGreeting} 只有 ${dueCount} 个卡片需要复习，很快就能搞定！`;
  return `${timeGreeting} 现在没有复习任务，去休息一下或者制作新卡片吧？`;
};

// --- Seed Data Utility ---
// FIXED: Removed the redeclared version at the end of the file.
const seedInitialData = (existingCards: Card[], existingFolders: Folder[]): { cards: Card[], folders: Folder[] } => {
    let newCards = [...existingCards];
    let newFolders = [...existingFolders];

    // 1. Seed Thai Alphabet Folder (Custom formatting)
    if (!newFolders.some(f => f.id === THAI_FOLDER_ID)) {
        const thaiFolder: Folder = { id: THAI_FOLDER_ID, name: '泰语字母', createdAt: Date.now() };
        newFolders.push(thaiFolder);

        const consonants = [
            { char: 'ก', type: '中辅音', name: 'gaw', word: 'ไก่', wordPhonetic: 'gài', mean: '鸡' },
            { char: 'ข', type: '高辅音', name: 'käw', word: 'ไข่', wordPhonetic: 'kài', mean: '蛋' },
            { char: 'ค', type: '低辅音', name: 'kaw', word: 'ควาย', wordPhonetic: 'kwaai', mean: '水牛' },
            { char: 'ฆ', type: '低辅音', name: 'kaw', word: 'ระฆัง', wordPhonetic: 'rá-kang', mean: '钟' },
            { char: 'ง', type: '低辅音', name: 'ngaw', word: 'งู', wordPhonetic: 'nguu', mean: '蛇' },
            { char: 'จ', type: '中辅音', name: 'jaw', word: 'จาน', wordPhonetic: 'jaan', mean: '盘子' },
            { char: 'ฉ', type: '高辅音', name: 'chaw', word: 'ฉิ่ง', wordPhonetic: 'ching', mean: '小镲' },
            { char: 'ช', type: '低辅音', name: 'chaw', word: 'ช้าง', wordPhonetic: 'cháng', mean: '大象' },
            { char: 'ซ', type: '低辅音', name: 'saw', word: 'โซ่', wordPhonetic: 'sôo', mean: '锁链' },
            { char: 'ฌ', type: '低辅音', name: 'chaw', word: 'เฌอ', wordPhonetic: 'cher', mean: '树' },
            { char: 'ญ', type: '低辅音', name: 'yaw', word: 'หญิง', wordPhonetic: 'ying', mean: '女人' },
            { char: 'ฎ', type: '中辅音', name: 'daw', word: 'ชฎา', wordPhonetic: 'chá-daa', mean: '尖顶冠' },
            { char: 'ฏ', type: '中辅音', name: 'dtaw', word: 'ปฏัก', wordPhonetic: 'på-dtak', mean: '刺棒' },
            { char: 'ฐ', type: '高辅音', name: 'täw', word: 'ฐาน', wordPhonetic: 'täan', mean: '基座' },
            { char: 'ฑ', type: '高辅音', name: 'taw', word: 'มณโฑ', wordPhonetic: 'mon-too', mean: '曼多陀里' },
            { char: 'ฒ', type: '低辅音', name: 'taw', word: 'ผู้เฒ่า', wordPhonetic: 'pûu-tâo', mean: '老人' },
            { char: 'ณ', type: '低辅音', name: 'naw', word: 'เณร', wordPhonetic: 'neen', mean: '小沙弥' },
            { char: 'ด', type: '中辅音', name: 'daw', word: 'เด็ก', wordPhonetic: 'dèk', mean: '小孩' },
            { char: 'ต', type: '中辅音', name: 'dtaw', word: 'เต่า', wordPhonetic: 'dtào', mean: '乌龟' },
            { char: 'ถ', type: '高辅音', name: 'täw', word: 'ถุง', wordPhonetic: 'tǔng', mean: '袋子' },
            { char: 'ท', type: '低辅音', name: 'taw', word: 'ทหาร', wordPhonetic: 'tá-hǎan', mean: '士兵' },
            { char: 'ธ', type: '低辅音', name: 'taw', word: 'ธง', wordPhonetic: 'tong', mean: '旗帜' },
            { char: 'น', type: '低辅音', name: 'naw', word: 'หนู', wordPhonetic: 'nǔu', mean: '老鼠' },
            { char: 'บ', type: '中辅音', name: 'baw', word: 'ใบไม้', wordPhonetic: 'bai-mái', mean: '树叶' },
            { char: 'ป', type: '中辅音', name: 'bpaw', word: 'ปลา', wordPhonetic: 'bplaa', mean: '鱼' },
            { char: 'ผ', type: '高辅音', name: 'paw', word: 'ผึ้ง', wordPhonetic: 'pûng', mean: '蜜蜂' },
            { char: 'ฝ', type: '高辅音', name: 'fäw', word: 'ฝา', wordPhonetic: 'fǎa', mean: '盖子' },
            { char: 'พ', type: '低辅音', name: 'paw', word: 'พาน', wordPhonetic: 'paan', mean: '托盘' },
            { char: 'ฟ', type: '低辅音', name: 'faw', word: 'ฟัน', wordPhonetic: 'fan', mean: '牙齿' },
            { char: 'ภ', type: '低辅音', name: 'paw', word: 'สำเภา', wordPhonetic: 'sǎm-pao', mean: '帆船' },
            { char: 'ม', type: '低辅音', name: 'maw', word: 'ม้า', wordPhonetic: 'máa', mean: '马' },
            { char: 'ย', type: '低辅音', name: 'yaw', word: 'ยักษ์', wordPhonetic: 'yák', mean: '巨魔' },
            { char: 'ร', type: '低辅音', name: 'raw', word: 'เรือ', wordPhonetic: 'rua', mean: '船' },
            { char: 'ล', type: '低辅音', name: 'law', word: 'ลิง', wordPhonetic: 'ling', mean: '猴子' },
            { char: 'ว', type: '低辅音', name: 'waw', word: 'แหวน', wordPhonetic: 'wǎan', mean: '戒指' },
            { char: 'ศ', type: '高辅音', name: 'säw', word: 'ศาลา', wordPhonetic: 'sǎa-laa', mean: '凉亭' },
            { char: 'ษ', type: '高辅音', name: 'säw', word: 'ฤๅษี', wordPhonetic: 'ruu-sǐi', mean: '隐士' },
            { char: 'ส', type: '高辅音', name: 'säw', word: 'เสือ', wordPhonetic: 'sǔa', mean: '老虎' },
            { char: 'ห', type: '高辅音', name: 'haw', word: 'หีบ', wordPhonetic: 'hìip', mean: '箱子' },
            { char: 'ฬ', type: '低辅音', name: 'law', word: 'จุฬา', wordPhonetic: 'ju-laa', mean: '风筝' },
            { char: 'อ', type: '中辅音', name: 'aw', word: 'อ่าง', wordPhonetic: 'àang', mean: '盆' },
            { char: 'ฮ', type: '低辅音', name: 'haw', word: 'นกฮูก', wordPhonetic: ' nók-ngûuk', mean: '猫头鹰' }
        ];

        const vowels = [
            { char: 'อะ', len: '短', desc: 'Alaska', phonetic: 'a' },
            { char: 'อา', len: '长', desc: 'Ah', phonetic: 'a:' },
            { char: 'อิ', len: '短', desc: 'Kit', phonetic: 'i' },
            { char: 'อี', len: '长', desc: 'Eagle', phonetic: 'i:' },
            { char: 'อึ', len: '短', desc: 'Eu!', phonetic: 'ɯ' },
            { char: 'อือ', len: '长', desc: 'Euuh!', phonetic: 'ɯ:' },
            { char: 'อุ', len: '短', desc: 'Boot (short)', phonetic: 'u' },
            { char: 'อู', len: '长', desc: 'Boot', phonetic: 'u:' },
            { char: 'เอะ', len: '短', desc: 'Pet', phonetic: 'e' },
            { char: 'เอ', len: '长', desc: 'Aid', phonetic: 'e:' },
            { char: 'แอะ', len: '短', desc: 'ae', phonetic: 'ɛ' },
            { char: 'แอ', len: '长', desc: 'Athlete', phonetic: 'ɛ:' },
            { char: 'โอะ', len: '短', desc: 'Oh (short)', phonetic: 'o' },
            { char: 'โอ', len: '长', desc: 'Oh', phonetic: 'o:' },
            { char: 'เอาะ', len: '短', desc: 'Aw (short)', phonetic: 'ɔ' },
            { char: 'ออ', len: '长', desc: 'Law', phonetic: 'ɔ:' },
            { char: 'เออะ', len: '短', desc: 'Er (short)', phonetic: 'ɤ' },
            { char: 'เออ', len: '长', desc: 'Earth', phonetic: 'ɤ:' },
            { char: 'เอียะ', len: '短', desc: 'ia (short)', phonetic: 'ia' },
            { char: 'เอีย', len: '长', desc: 'Piano', phonetic: 'ia:' },
            { char: 'อำ', len: '特殊', desc: 'am', phonetic: 'am' },
            { char: 'ไอ', len: '特殊', desc: 'I', phonetic: 'ai' },
            { char: 'เอา', len: '特殊', desc: 'ao', phonetic: 'ao' }
        ];

        const alphabetCards: Card[] = [
            ...consonants.map(c => ({
                id: `thai_con_${c.char}`,
                frontType: 'text' as const,
                frontContent: c.char,
                backType: 'text' as const,
                backContent: `${c.type}: ${c.name}\n\n代表单词: <b>${c.word}</b> (${c.wordPhonetic})\n含义: ${c.mean}`,
                phonetic: c.name,
                folderId: THAI_FOLDER_ID,
                tags: ['thai', 'consonant'],
                createdAt: Date.now(),
                nextReviewTime: 0,
                interval: 0,
                repetition: 0,
                easeFactor: 2.5
            })),
            ...vowels.map(v => ({
                id: `thai_vow_${v.char}`,
                frontType: 'text' as const,
                frontContent: v.char,
                backType: 'text' as const,
                backContent: `${v.len}元音: ${v.phonetic}\n参考音: ${v.desc}`,
                phonetic: v.phonetic,
                folderId: THAI_FOLDER_ID,
                tags: ['thai', 'vowel'],
                createdAt: Date.now(),
                nextReviewTime: 0,
                interval: 0,
                repetition: 0,
                easeFactor: 2.5
            }))
        ];
        newCards.push(...alphabetCards);
    }

    // 2. Seed Basic Thai 1 Folder (AI-Import standard format)
    if (!newFolders.some(f => f.id === BASIC_THAI_1_FOLDER_ID)) {
        const basicThaiFolder: Folder = { id: BASIC_THAI_1_FOLDER_ID, name: '基础泰语1', createdAt: Date.now() };
        newFolders.push(basicThaiFolder);

        // Standard high-quality word list
        const basicThaiData = [
          { front: "กระเป๋า", back: "拎包，袋子", phonetic: "/kra'păw/", example: "ฉันชอบ<b>กระเป๋า</b>ใบนี้ มันน่ารักมากเลย!", exampleTranslation: "我喜欢这个包，它太可爱了！" },
          { front: "กลับ", back: "回", phonetic: "/klàp/", example: "เขากำลังจะ<b>กลับ</b>บ้าน", exampleTranslation: "他正要回家。" },
          { front: "กวางโจว", back: "广州", phonetic: "/kwaaŋ coow/", example: "ฉันอยากไปเที่ยว<b>กวางโจว</b>", exampleTranslation: "我想去广州旅游。" },
          { front: "กวางตุ้ง", back: "广东", phonetic: "/kwaaŋ tûŋ/", example: "อาหาร<b>กวางตุ้ง</b>อร่อยมาก", exampleTranslation: "粤菜（广东菜）非常好吃。" },
          { front: "กวางสี", phonetic: "/kwaaŋ sǐi/", back: "广西", example: "มณฑล<b>กวางสี</b>มีธรรมชาติที่สวยงาม", exampleTranslation: "广西壮族自治区有美丽的自然风光。" },
          { front: "กะ", phonetic: "/kà/", back: "估计，和", example: "พรุ่งนี้<b>กะ</b>ว่าจะไปหาเพื่อน", exampleTranslation: "打算明天去找朋友。" },
          { front: "กะปิ", phonetic: "/kà pì/", back: "虾酱", example: "คนไทยชอบกินข้าวคลุก<b>กะปิ</b>", exampleTranslation: "泰国人喜欢吃虾酱拌饭。" },
          { front: "กะเพรา", phonetic: "/kà phraw/", back: "金不换，罗勒", example: "ฉันสั่งผัด<b>กะเพรา</b>ไก่", exampleTranslation: "我点了罗勒炒鸡肉。" },
          { front: "กับข้าว", phonetic: "/kàp khâaw/", back: "饭菜，菜", example: "แม่กำลังทำ<b>กับข้าว</b>อยู่ในครัว", exampleTranslation: "妈妈正在厨房里做饭菜。" },
          { front: "กันยายน", phonetic: "/kan yaa yon/", back: "九月份", example: "เดือน<b>กันยายน</b>อากาศเริ่มเย็นลง", exampleTranslation: "九月份天气开始变凉。" },
          { front: "กา", phonetic: "/kaa/", back: "乌鸦", example: "<b>กา</b>สีดำบินอยู่บนฟ้า", exampleTranslation: "黑色的乌鸦在天上飞。" },
          { front: "กาแฟ", phonetic: "/kaa fee/", back: "咖啡", example: "คุณดื่ม<b>กาแฟ</b>ไหมคะ?", exampleTranslation: "你要喝咖啡吗？" },
          { front: "การบ้าน", phonetic: "/kaan bâan/", back: "作业", example: "นักเรียนต้องทำ<b>การบ้าน</b>ทุกวัน", exampleTranslation: "学生必须每天做作业。" },
          { front: "กิน/ทาน", phonetic: "/kin / thaan/", back: "吃", example: "ไป<b>กิน</b>ข้าวด้วยกันเถอะ", exampleTranslation: "一起去吃饭吧。" },
          { front: "กุ้ง", phonetic: "/kûŋ/", back: "虾", example: "ต้มยำ<b>กุ้ง</b>เป็นอาหารที่มีชื่อเสียง", exampleTranslation: "冬阴功（酸辣虾汤）是很出名的菜。" },
          { front: "เกาหลี", phonetic: "/kaw lǐi/", back: "韩国", example: "น้องสาวชอบดูซีรีส์<b>เกาหลี</b>", exampleTranslation: "妹妹喜欢看韩剧。" },
          { front: "เก่า", phonetic: "/kàw/", back: "旧的", example: "หนังสือเล่มนี้<b>เก่า</b>มากแล้ว", exampleTranslation: "这本书已经很旧了。" },
          { front: "เก้า", phonetic: "/kâaw/", back: "九", example: "ฉันมีแมว<b>เก้า</b>ตัว", exampleTranslation: "我有九只猫。" },
          { front: "เก้าอี้", phonetic: "/kâaw îi/", back: "椅子", example: "กรุณานั่งลงบน<b>เก้าอี้</b>", exampleTranslation: "请坐在椅子上。" },
          { front: "เกาะ", phonetic: "/kò/", back: "岛", example: "ภูเก็ตเป็น<b>เกาะ</b>ที่ใหญ่ที่สุดในไทย", exampleTranslation: "普吉岛是泰国最大的岛。" },
          { front: "เกือบ", phonetic: "/kɯ̀ap/", back: "将近，几乎", example: "เขาทำงาน<b>เกือบ</b>เสร็จแล้ว", exampleTranslation: "他几乎快完成工作了。" },
          { front: "แกะ", phonetic: "/kè/", back: "绵羊", example: "ขน<b>แกะ</b>นุ่มมาก", exampleTranslation: "绵羊毛非常柔软。" },
          { front: "แก่", phonetic: "/kèe/", back: "老的，给", example: "ชาย<b>แก่</b>คนนั้นเดินช้าๆ", exampleTranslation: "那位老先生走得很慢。" },
          { front: "โกโก้", phonetic: "/koo kôo/", back: "可可", example: "ฉันชอบดื่ม<b>โกโก้</b>ร้อน", exampleTranslation: "我喜欢喝热可可。" },
          { front: "ไก่", phonetic: "/kày/", back: "鸡", example: "<b>ไก่</b>ขัน在ตอนเช้า", exampleTranslation: "鸡在早晨鸣叫。" },
          { front: "ขอ", phonetic: "/khɔ̌ɔ/", back: "请求", example: "<b>ขอ</b>โทษที่มาสายครับ", exampleTranslation: "抱歉来晚了。" },
          { front: "ขอโทษ", phonetic: "/khɔ̌ɔ thôot/", back: "对不起", example: "ฉัน<b>ขอโทษ</b>ที่ทำให้คุณรอนาน", exampleTranslation: "对不起让你等了这么久。" },
          { front: "ขอให้", phonetic: "/khɔ̌ɔ hây/", back: "希望，祝愿", example: "<b>ขอให้</b>มีความสุขมากๆ นะ", exampleTranslation: "祝你非常幸福。" },
          { front: "ขอบคุณ", phonetic: "/khɔ̀ɔp khun/", back: "谢谢", example: "<b>ขอบคุณ</b>สำหรับความช่วยเหลือ", exampleTranslation: "谢谢你的帮助。" },
          { front: "ของ", phonetic: "/khɔ̌ɔŋ/", back: "的", example: "นี่คือกระเป๋า<b>ของ</b>ฉัน", exampleTranslation: "这是我的包。" },
          { front: "ขา", phonetic: "/khǎa/", back: "腿", example: "เขาเจ็บ<b>ขา</b>เพราะตกจากที่สูง", exampleTranslation: "他因为从高处摔下来而腿疼。" },
          { front: "ข้าว", phonetic: "/khâaw/", back: "饭", example: "กิน<b>ข้าว</b>หรือยัง?", exampleTranslation: "吃饭了吗？" },
          { front: "ขู่", phonetic: "/khùu/", back: "威胁", example: "อย่ามา<b>ขู่</b>ฉันนะ!", exampleTranslation: "别来威胁我！" },
          { front: "เขา", phonetic: "/khǎw/", back: "他，她", example: "<b>เขา</b>เป็นเพื่อนสนิทของฉัน", exampleTranslation: "他/她是我的好朋友。" },
          { front: "เข้า", phonetic: "/khâw/", back: "进，进入", example: "กรุณา<b>เข้า</b>มาข้างใน", exampleTranslation: "请进到里面来。" },
          { front: "เข้าใจ", phonetic: "/khâw cay/", back: "明白", example: "คุณ<b>เข้าใจ</b>ที่ฉันพูดไหม?", exampleTranslation: "你明白我说的吗？" },
          { front: "เขียน", phonetic: "/khǐan/", back: "写", example: "เขาชอบ<b>เขียน</b>จดหมาย", exampleTranslation: "他喜欢写信。" },
          { front: "ไข่ไก่", phonetic: "/khày kày/", back: "鸡蛋", example: "ฉันอยากซื้อ<b>ไข่ไก่</b>หนึ่งแพ็ค", exampleTranslation: "我想买一盒鸡蛋。" },
          { front: "คน", phonetic: "/khon/", back: "人，个", example: "มี<b>คน</b>รออยู่ข้างนอก", exampleTranslation: "外面有人在等。" },
          { front: "ครอบครัว", phonetic: "/khrɔ̂ɔp khrua/", back: "家庭", example: "ฉันรัก<b>ครอบครัว</b>ของฉันมาก", exampleTranslation: "我很爱我的家庭。" },
          { front: "ครู", phonetic: "/khruu/", back: "老师", example: "<b>ครู</b>สอนภาษาไทยใจดีมาก", exampleTranslation: "泰语老师非常仁慈。" },
          { front: "ความระลึกถึง", phonetic: "/khwaam ra lʉ́k thʉ̌ŋ/", back: "思念", example: "ส่ง<b>ความระลึกถึง</b>ไปให้คุณ", exampleTranslation: "送去对你的思念。" },
          { front: "คำ", phonetic: "/kham/", back: "字，词", example: "<b>คำ</b>นี้ออกเสียงยังไง?", exampleTranslation: "这个词怎么发音？" },
          { front: "คิดว่า", phonetic: "/khít wâa/", back: "估计，想", example: "ฉัน<b>คิดว่า</b>พรุ่งนี้ฝนจะตก", exampleTranslation: "我想明天会下雨。" },
          { front: "คุณ", phonetic: "/khun/", back: "你", example: "<b>คุณ</b>สบายดีไหม?", exampleTranslation: "你好吗？" },
          { front: "คู่", phonetic: "/khûu/", back: "对，双", example: "รองเท้า<b>คู่</b>นี้สวยจัง", exampleTranslation: "这双鞋真漂亮。" },
          { front: "ใคร", phonetic: "/khray/", back: "谁", example: "<b>ใคร</b>เคาะประตู?", exampleTranslation: "谁在敲门？" },
          { front: "งั้นๆ", phonetic: "/ŋán ŋán/", back: "就那样", example: "รสชาติอาหารก็<b>งั้นๆ</b> แหละ", exampleTranslation: "食物的味道也就那样吧。" },
          { front: "งา", phonetic: "/ŋaa/", back: "芝麻", example: "ฉันชอบกินขนมใส่<b>งา</b>", exampleTranslation: "我喜欢吃加了芝麻的点心。" },
          { front: "เงาะ", phonetic: "/ŋɔ́/", back: "红毛丹", example: "<b>เงาะ</b>มีรสชาติหวานฉ่ำ", exampleTranslation: "红毛丹味道甜美多汁。" },
          { front: "เงิน", phonetic: "/ŋɯn/", back: "钱", example: "เขาเก็บ<b>เงิน</b>เพื่อซื้อรถใหม่", exampleTranslation: "他攒钱为了买新车。" },
          { front: "จด", phonetic: "/còt/", back: "记录", example: "帮助<b>จด</b>เบอร์โทรให้หน่อย", exampleTranslation: "请帮我记下电话号码。" },
          { front: "จดหมาย", phonetic: "/còt mǎay/", back: "信件", example: "ได้รับ<b>จดหมาย</b>จากเพื่อนเก่า", exampleTranslation: "收到了老朋友的信。" },
          { front: "จะ", phonetic: "/cà/", back: "将要", example: "พรุ่งนี้ฉัน<b>จะ</b>ไปหาคุณ", exampleTranslation: "明天我要去找你。" },
          { front: "จาก", phonetic: "/càak/", back: "来自", example: "เขามาจากเมือง<b>จีน</b>", exampleTranslation: "他来自中国。" },
          { front: "จำ", phonetic: "/cam/", back: "记", example: "ฉัน<b>จำ</b>ชื่อคุณไม่ได้", exampleTranslation: "我不记得你的名字。" },
          { front: "จีน", phonetic: "/ciin/", back: "中国", example: "ฉันชอบเรียนภาษา<b>จีน</b>", exampleTranslation: "我喜欢学习中文。" },
          { front: "จึง", phonetic: "/cʉŋ/", back: "所以，因此", example: "เขาป่วย<b>จึง</b>ไม่ได้มาเรียน", exampleTranslation: "他病了，所以没来上课。" },
          { front: "ใจ", phonetic: "/cay/", back: "心", example: "คุณเป็นคนมีน้ำ<b>ใจ</b>มาก", exampleTranslation: "你是一个很有爱心（热心）的人。" },
          { front: "ช่วย", phonetic: "/chûay/", back: "帮助，帮忙", example: "<b>ช่วย</b>เปิดหน้าต่างให้หน่อย", exampleTranslation: "请帮忙开下窗户。" },
          { front: "ชอบ", phonetic: "/chɔ̂ɔp/", back: "喜欢", example: "ฉัน<b>ชอบ</b>กินทุเรียน", exampleTranslation: "我喜欢吃榴莲。" },
          { front: "ชั่ว", phonetic: "/chûa/", back: "恶，坏", example: "เขาเป็นคน<b>ชั่ว</b>", exampleTranslation: "他是个坏人。" },
          { front: "ช้า", phonetic: "/cháa/", back: "迟，慢", example: "รถไฟมา<b>ช้า</b>ไปสิบนาที", exampleTranslation: "火车晚点了十分钟。" },
          { front: "ชื่อ", phonetic: "/chʉ̂ʉ/", back: "名字，名叫", example: "คุณ<b>ชื่อ</b>อะไรครับ?", exampleTranslation: "你叫什么名字？" },
          { front: "ชื่อเล่น", phonetic: "/chʉ̂ʉ lên/", back: "小名", example: "<b>ชื่อเล่น</b>ของฉันคือโบว์", exampleTranslation: "我的小名叫Bow。" },
          { front: "เช่นเดียวกัน", phonetic: "/chêen diaw kan/", back: "同样", example: "ยินดีที่ได้รู้จัก<b>เช่นเดียวกัน</b>ครับ", exampleTranslation: "我也很高兴认识你。" },
          { front: "เชียงใหม่", phonetic: "/chiaŋ mǎy/", back: "清迈", example: "ไปเที่ยว<b>เชียงใหม่</b>ตอนหน้าหนาวสนุกมาก", exampleTranslation: "冬天去清迈旅游很好玩。" },
          { front: "เชื่อ", phonetic: "/chʉ̂a/", back: "相信", example: "ฉันไม่<b>เชื่อ</b>ที่คุณพูด", exampleTranslation: "我不相信你说的。" },
          { front: "เชื่อใจ", phonetic: "/chʉ̂a cay/", back: "相信，信任", example: "คุณสามารถ<b>เชื่อใจ</b>ฉันได้", exampleTranslation: "你可以信任我。" },
          { front: "ใช่", phonetic: "/chây/", back: "是的", example: "<b>ใช่</b>แล้ว นี่คือสิ่งที่ฉันต้องการ", exampleTranslation: "是的，这就是我想要的。" },
          { front: "ใช้", phonetic: "/cháy/", back: "使用，用", example: "ฉัน<b>ใช้</b>คอมพิวเตอร์ทำงาน", exampleTranslation: "我用电脑工作。" },
          { front: "ซัก", phonetic: "/sák/", back: "洗（衣服等）", example: "แม่กำลัง<b>ซัก</b>ผ้า", exampleTranslation: "妈妈正在洗衣服。" },
          { front: "ซาลาเปา", phonetic: "/saa laa paw/", back: "包子", example: "<b>ซาลาเปา</b>ร้อนๆ อร่อยมาก", exampleTranslation: "热腾腾的包子很好吃。" },
          { front: "ซื้อ", phonetic: "/sʉ́ʉ/", back: "买", example: "ไป<b>ซื้อ</b>ของที่ตลาดกันไหม?", exampleTranslation: "一起去市场买东西吗？" },
          { front: "เซี่ยงไฮ้", phonetic: "/sîaŋ hâay/", back: "上海", example: "<b>เซี่ยงไฮ้</b>เป็นเมืองที่ทันสมัยมาก", exampleTranslation: "上海是个非常现代化的城市。" },
          { front: "ญี่ปุ่น", phonetic: "/yîi pùn/", back: "日本", example: "อยากไปดูซากุระที่<b>ญี่ปุ่น</b>", exampleTranslation: "想去日本看樱花。" },
          { front: "ด้วย", phonetic: "/dûay/", back: "也，以", example: "ฉันไปด้วย<b>ด้วย</b>คนนะ", exampleTranslation: "我也一起去。" },
          { front: "ดำ", phonetic: "/dam/", back: "黑", example: "แมวตัวสี<b>ดำ</b>น่ารักมาก", exampleTranslation: "那只黑色的猫很可爱。" },
          { front: "ดิฉัน / ฉัน", phonetic: "/dì chǎn / chǎn/", back: "我", example: "<b>ฉัน</b>รักคุณ", exampleTranslation: "我爱你。" },
          { front: "ดินสอ", phonetic: "/din sɔ̌ɔ/", back: "铅笔", example: "ขอยืม<b>ดินสอ</b>หน่อยได้ไหม?", exampleTranslation: "可以借一下铅笔吗？" },
          { front: "ดี", phonetic: "/dii/", back: "好", example: "วันนี้อากาศ<b>ดี</b>มาก", exampleTranslation: "今天天气很好。" },
          { front: "ดีใจ/ยินดี", phonetic: "/dii cay / yin dii/", back: "高兴", example: "ฉัน<b>ดีใจ</b>มากที่ได้พบคุณ", exampleTranslation: "我很高兴见到你。" },
          { front: "ดุ", phonetic: "/dù/", back: "凶", example: "สุนัขตัวนี้<b>ดุ</b>มาก", exampleTranslation: "这条狗非常凶。" },
          { front: "ดู", phonetic: "/duu/", back: "看", example: "ไป<b>ดู</b>หนังกันเถอะ", exampleTranslation: "去望（看）电影吧。" },
          { front: "เดา", phonetic: "/daw/", back: "猜测", example: "ลอง<b>เดา</b>สิว่าฉันซื้ออะไรมา", exampleTranslation: "猜猜看我买了什么。" },
          { front: "เดิน", phonetic: "/dɤɤn/", back: "走", example: "เรามา<b>เดิน</b>เล่นที่สวนกัน", exampleTranslation: "我们来公园散步吧。" },
          { front: "เดินทาง", phonetic: "/dɤɤn thaaŋ/", back: "出行，旅游", example: "ขอให้<b>เดินทาง</b>โดยสวัสดิภาพ", exampleTranslation: "祝旅途平安。" },
          { front: "เดี๋ยวนี้", phonetic: "/diaw níi/", back: "一会儿，立刻", example: "กรุณาทำ<b>เดี๋ยวนี้</b>เลย", exampleTranslation: "请现在就做。" },
          { front: "เดือนหน้า", phonetic: "/dɯan nâa/", back: "下个月", example: "<b>เดือนหน้า</b>จะมีงานเทศกาล", exampleTranslation: "下个月会有节日活动。" },
          { front: "โดยปลอดภัย", phonetic: "/dooy plɔ̀ɔt phay/", back: "平安的", example: "ขอให้ถึงที่หมาย<b>โดยปลอดภัย</b>", exampleTranslation: "愿 you 平安到达目的地。" },
          { front: "ได้", phonetic: "/dâay/", back: "得到，可以", example: "คุณพูดภาษาไทย<b>ได้</b>ไหม?", exampleTranslation: "你会说泰语吗？" },
          { front: "ได้ยิน", phonetic: "/dâay yin/", back: "听见", example: "ฉัน<b>ได้ยิน</b>เสียงนกร้อง", exampleTranslation: "我听见鸟鸣声。" },
          { front: "ตลาด", phonetic: "/ta làat/", back: "市场", example: "แม่ไป<b>ตลาด</b>แต่เช้า", exampleTranslation: "妈妈大清早去市场。" },
          { front: "ต้อง", phonetic: "/tɔ̂ŋ/", back: "必须", example: "คุณ<b>ต้อง</b>กินยาตามหมอสั่ง", exampleTranslation: "你必须按医生吩咐吃药。" },
          { front: "ตะปู", phonetic: "/tà puu/", back: "钉子", example: "ช่างใช้<b>ตะปู</b>ตอกไม้", exampleTranslation: "木匠用钉子钉木头。" },
          { front: "ตั้งแต่", phonetic: "/tâŋ tɛ̀ɛ/", back: "自从", example: "ฉันอยู่ที่นี่<b>ตั้งแต่</b>ปีที่แล้ว", exampleTranslation: "我从去年开始住在这里。" },
          { front: "ตั้งใจ", phonetic: "/tâŋ cay/", back: "决心，专心", example: "เขา<b>ตั้งใจ</b>เรียนมาก", exampleTranslation: "他学习很专心。" },
          { front: "ตัว", phonetic: "/tua/", back: "只，个，身体", example: "แมวตัวนี้มีสีขาวทั้ง<b>ตัว</b>", exampleTranslation: "这只猫全身都是白色的。" },
          { front: "ตั๋ว", phonetic: "/tǔa/", back: "票", example: "ซื้อ<b>ตั๋ว</b>หนังออนไลน์สะดวกดี", exampleTranslation: "在线买电影票挺方便的。" },
          { front: "ตา", phonetic: "/taa/", back: "眼睛/外祖父", example: "<b>ตา</b>ของฉันอาศัยอยู่ต่างจังหวัด", exampleTranslation: "我的外公住在外省。" },
          { front: "ต่าง", phonetic: "/tàaŋ/", back: "都，不同，外国", example: "นักเรียน<b>ต่าง</b>มาโรงเรียนพร้อมกัน", exampleTranslation: "学生们都（各自）准时来到学校。" },
          { front: "ต่างๆ", phonetic: "/tàaŋ tàaŋ/", back: "各个，各种", example: "มีผลไม้<b>ต่างๆ</b> ในตะกร้า", exampleTranslation: "篮子里有各种各样的水果。" },
          { front: "ตำ", phonetic: "/tam/", back: "捣", example: "ป้ากำลัง<b>ตำ</b>ส้มตำ", exampleTranslation: "大婶正在捣青木瓜沙拉。" },
          { front: "ตี", phonetic: "/tii/", back: "打", example: "อย่า<b>ตี</b>สุนัขนะ", exampleTranslation: "别打狗。" },
          { front: "เตะ", phonetic: "/tè/", back: "踢", example: "เขาชอบเล่น<b>เตะ</b>ฟุตบอล", exampleTranslation: "他喜欢踢足球。" },
          { front: "เตา", phonetic: "/taw/", back: "炉灶", example: "แม่วางหม้อบน<b>เตา</b>", exampleTranslation: "妈妈把锅放在炉子上。" },
          { front: "แต่", phonetic: "/tɛ̀ɛ/", back: "但", example: "เขาฉลาด<b>แต่</b>ขี้เกียจ", exampleTranslation: "他聪明但懒惰。" },
          { front: "แตงกวา", phonetic: "/tɛɛŋ kwaa/", back: "黄瓜", example: "ฉันชอบกิน<b>แตงกวา</b>จิ้มน้ำพริก", exampleTranslation: "我喜欢用黄瓜蘸辣酱吃。" },
          { front: "โต๊ะ", phonetic: "/tó/", back: "桌子", example: "หนังสืออยู่บน<b>โต๊ะ</b>", exampleTranslation: "书在桌子上。" },
          { front: "ถ้า", phonetic: "/thâa/", back: "如果", example: "<b>ถ้า</b>ฝนไม่ตก เราจะไปเที่ยว", exampleTranslation: "如果不下雨，我们就去旅游。" },
          { front: "ถู", phonetic: "/thǔu/", back: "擦，拖", example: "เขากำลัง<b>ถู</b>พื้นบ้าน", exampleTranslation: "他正在拖地板。" },
          { front: "ถึง", phonetic: "/thʉ̌ŋ/", back: "到", example: "เรา去<b>ถึง</b>บ้านตอนค่ำ", exampleTranslation: "我们傍晚到达家。" },
          { front: "ถือ", phonetic: "/thʉ̌ʉ/", back: "提，拿", example: "คุณช่วย<b>ถือ</b>ของหน่อยได้ไหม?", exampleTranslation: "你能帮我拿一下东西吗？" },
          { front: "ทบทวน", phonetic: "/thóp thuan/", back: "复习", example: "นักเรียนควร<b>ทบทวน</b>บทเรียนเสมอ", exampleTranslation: "学生应当经常复习功课。" },
          { front: "ท่าน", phonetic: "/thâan/", back: "您", example: "<b>ท่าน</b>ต้องการอะไรเพิ่มไหมครับ?", exampleTranslation: "您还需要加点什么吗？" },
          { front: "ทำ", phonetic: "/tham/", back: "做", example: "วันนี้คุณ<b>ทำ</b>อะไร?", exampleTranslation: "今天你做什么？" },
          { front: "ทำงาน", phonetic: "/tham ŋaan/", back: "工作", example: "พ่อ去<b>ทำงาน</b>ที่ออฟฟิศ", exampleTranslation: "爸爸去办公室工作。" },
          { front: "ทำไม", phonetic: "/tham may/", back: "为什么", example: "<b>ทำไม</b>คุณไม่กินข้าว?", exampleTranslation: "你为什么不吃饭？" },
          { front: "ทีวี", phonetic: "/thii wii/", back: "电视", example: "ดู<b>ทีวี</b>มากเกินไปไม่ดีต่อสายตา", exampleTranslation: "看太多电视对视力不好。" },
          { front: "ที่", phonetic: "/thîi/", back: "在/地方/序号", example: "เขาอยู่ที่<b>ที่</b>นั่น", exampleTranslation: "他在那个地方。" },
          { front: "ที่นี่", phonetic: "/thîi nîi/", back: "这里", example: "ยินดีต้อนรับสู่<b>ที่นี่</b>", exampleTranslation: "欢迎来到这里。" },
          { front: "ทุก", phonetic: "/thúk/", back: "每", example: "ฉันออกกำลังกาย<b>ทุก</b>วัน", exampleTranslation: "我每天锻炼。" },
          { front: "เทอม", phonetic: "/thɤɤm/", back: "学期", example: "<b>เทอม</b>นี้ฉันเรียนหนักมาก", exampleTranslation: "这学期我学得很卖力。" },
          { front: "เท่าไร", phonetic: "/thâw ray/", back: "多少", example: "เสื้อตัวนี้ราคา<b>เท่าไร</b>?", exampleTranslation: "这件衣服多少钱？" },
          { front: "เที่ยว", phonetic: "/thîaw/", back: "旅行", example: "สุดสัปดาห์นี้จะไป<b>เที่ยว</b>ไหน?", exampleTranslation: "这周末要去哪里旅游？" },
          { front: "ธุระ", phonetic: "/thú rá/", back: "事情，杂事", example: "ฉันมี<b>ธุระ</b>ต้องไปทำ", exampleTranslation: "我有事情要去办。" },
          { front: "เธอ", phonetic: "/thɤɤ/", back: "她/你", example: "ฉันชอบ<b>เธอ</b>นะ", exampleTranslation: "我喜欢你/她哦。" },
          { front: "น้องชาย", phonetic: "/nɔ́อŋ chaay/", back: "弟弟", example: "<b>น้องชาย</b>ของฉันเรียนเก่งมาก", exampleTranslation: "我的弟弟学习很棒。" },
          { front: "น้องสาว", phonetic: "/nɔ́อŋ sǎaw/", back: "妹妹", example: "<b>น้องสาว</b>กำลังนอนหลับ", exampleTranslation: "妹妹正在睡觉。" },
          { front: "นักศึกษา", phonetic: "/nák sʉ̀k sǎa/", back: "大学生", example: "พี่สาวเป็น<b>นักศึกษา</b>มหาวิทยาลัย", exampleTranslation: "姐姐是大学生。" },
          { front: "นั่น/นั้น", phonetic: "/nân / nán/", back: "那", example: "<b>นั่น</b>คืออะไร?", exampleTranslation: "那是什么？" },
          { front: "นาฬิกา", phonetic: "/naa lí kaa/", back: "钟表", example: "<b>นาฬิกา</b>เรือนนี้ราคาแพงมาก", exampleTranslation: "这块表价格非常贵。" },
          { front: "น้า", phonetic: "/náa/", back: "弟/姨", example: "<b>น้า</b>มาเยี่ยมพวกเราที่บ้าน", exampleTranslation: "小姨/舅舅来家里看望我们。" },
          { front: "นาน", phonetic: "/naan/", back: "久", example: "รอนาน<b>นาน</b>แล้วนะ", exampleTranslation: "等了好久了哦。" },
          { front: "นามสกุล", phonetic: "/naam sà kun/", back: "姓", example: "<b>นามสกุล</b>ของคุณเขียนยังไง?", exampleTranslation: "你的姓怎么写？" },
          { front: "น้ำ", phonetic: "/nám/", back: "水", example: "ขอดื่ม<b>น้ำ</b>หน่อยครับ", exampleTranslation: "请让我喝点水。" },
          { front: "น้ำชา", phonetic: "/nám chaa/", back: "茶", example: "ดื่ม<b>น้ำชา</b>ร้อนๆ ช่วยให้ผ่อนคลาย", exampleTranslation: "喝热茶有助于放松。" },
          { front: "น้ำปลา", phonetic: "/nám plaa/", back: "鱼露", example: "ใส่น้ำ<b>ปลา</b>เพิ่มในส้มตำ", exampleTranslation: "在青木瓜沙拉里多加点鱼露。" },
          { front: "นี่/นี้", phonetic: "/nîi / níi/", back: "这", example: "<b>นี่</b>คือปากกาของฉัน", exampleTranslation: "这是我的钢笔。" },
          { front: "เนื้อ", phonetic: "/nɯ́a/", back: "肉/牛肉", example: "ฉันไม่กิน<b>เนื้อ</b>วัว", exampleTranslation: "我不吃牛肉。" },
          { front: "แน่ใจ", phonetic: "/nɛ̂ɛ cay/", back: "肯定，确定", example: "คุณ<b>แน่ใจ</b>ไหมว่าพูดจริง?", exampleTranslation: "你确定你说的是真的吗？" },
          { front: "แน่นอน", phonetic: "/nɛ̂ɛ nɔɔn/", back: "当然", example: "ฉันจะ去帮助คุณ<b>แน่นอน</b>", exampleTranslation: "我肯定会去帮你。" },
          { front: "โน่น/โน้น", phonetic: "/nôon / nóon/", back: "那（更远）", example: "โรงพยาบาลอยู่ทาง<b>โน้น</b>", exampleTranslation: "医院在那边。" },
          { front: "ใน", phonetic: "/nay/", back: "在...里面", example: "มีเงินอยู่<b>ใน</b>กระเป๋า", exampleTranslation: "钱包里有钱。" },
          { front: "บัว", phonetic: "/bua/", back: "荷花", example: "ดอก<b>บัว</b>สวยงามมาก", exampleTranslation: "荷花非常漂亮。" },
          { front: "บ้าง/มั่ง", phonetic: "/bâaŋ / mâŋ/", back: "一些", example: "มีใครอยู่<b>บ้าง</b>ไหม?", exampleTranslation: "还有谁在吗？" },
          { front: "บางคน", phonetic: "/baaŋ khon/", back: "有些人", example: "<b>บางคน</b>ไม่ชอบกินเผ็ด", exampleTranslation: "有些人不喜欢吃辣。" },
          { front: "บาท", phonetic: "/bàat/", back: "泰铢", example: "ราคาห้าสิบ<b>บาท</b>", exampleTranslation: "价格50泰铢。" },
          { front: "บ้าน", phonetic: "/bâan/", back: "家", example: "ฉันกำลังจะกลับ<b>บ้าน</b>", exampleTranslation: "我正要回家。" },
          { front: "เบา", phonetic: "/baw/", back: "轻", example: "กระเป๋าใบนี้<b>เบา</b>มาก", exampleTranslation: "这个包非常轻。" },
          { front: "เบื่อ", phonetic: "/bɯ̀a/", back: "厌烦", example: "ฉัน<b>เบื่อ</b>การรอคอย", exampleTranslation: "我厌烦等待。" },
          { front: "ใบชา", phonetic: "/bay chaa/", back: "茶叶", example: "<b>ใบชา</b>นี้มาจากเชียงราย", exampleTranslation: "这些茶叶来自清莱。" },
          { front: "ใบไม้", phonetic: "/bay máay/", back: "树叶", example: "<b>ใบไม้</b>ร่วงในฤดูใบไม้ร่วง", exampleTranslation: "树叶在秋天飘落。" },
          { front: "ประเทศ", phonetic: "/pra thêet/", back: "国家", example: "ประเทศไทยเป็น<b>ประเทศ</b>ที่สวยงาม", exampleTranslation: "泰国是一个美丽的国家。" },
          { front: "ปักกิ่ง", phonetic: "/pàk kìŋ/", back: "北京", example: "ฉันอยากไปเที่ยว<b>ปักกิ่ง</b>", exampleTranslation: "我想去北京旅游。" },
          { front: "ปา", phonetic: "/paa/", back: "投，掷", example: "อย่า<b>ปา</b>หินเล่น", exampleTranslation: "别乱投石头玩。" },
          { front: "ป่า", phonetic: "/pàa/", back: "树林", example: "สัตว์ป่าอาศัยอยู่ใน<b>ป่า</b>", exampleTranslation: "野生动物住在森林里。" },
          { front: "ป้า", phonetic: "/pâa/", back: "伯母", example: "<b>ป้า</b>ทำขนมอร่อยมาก", exampleTranslation: "大婶做的点心很好吃。" },
          { front: "ปากกา", phonetic: "/pàak kaa/", back: "钢笔", example: "ฉันทำ<b>ปากกา</b>หาย", exampleTranslation: "我把钢笔弄丢了。" },
          { front: "ปี", phonetic: "/pii/", back: "年", example: "ฉันเรียนภาษาไทยมาหนึ่ง<b>ปี</b>แล้ว", exampleTranslation: "我学泰语已经一年了。" },
          { front: "ปีหน้า", phonetic: "/pii nâa/", back: "明年", example: "<b>ปีหน้า</b>ฉันจะไปเรียนที่ต่างประเทศ", exampleTranslation: "明年我要去国外留学。" },
          { front: "ปี่", phonetic: "/pìi/", back: "笛子", example: "เป่า<b>ปี่</b>มีเสียงไพเราะ", exampleTranslation: "吹笛子的声音很悦耳。" },
          { front: "ปู", phonetic: "/puu/", back: "螃蟹", example: "ต้มยำ<b>ปู</b>อร่อยมาก", exampleTranslation: "冬阴功螃蟹汤很好吃。" },
          { front: "ปู่", phonetic: "/pùu/", back: "祖父", example: "<b>ปู่</b>ของฉันใจดีมาก", exampleTranslation: "我的爷爷非常仁慈。" },
          { front: "เป็น", phonetic: "/pen/", back: "是，会", example: "เขา<b>เป็น</b>คนไทย", exampleTranslation: "他是泰国人。" },
          { front: "เป็นห่วง", phonetic: "/pen hùaŋ/", back: "担心", example: "ฉัน<b>เป็นห่วง</b>คุณมากนะ", exampleTranslation: "我很担心你哦。" },
          { front: "เป่า", phonetic: "/pàw/", back: "吹", example: "อย่า<b>เป่า</b>อาหารแรงนัก", exampleTranslation: "别使劲吹食物。" },
          { front: "เปิด", phonetic: "/pɤ̀ɤt/", back: "开", example: "กรุณา<b>เปิด</b>ประตูให้หน่อย", exampleTranslation: "请开下门。" },
          { front: "ไป", phonetic: "/pay/", back: "去", example: "เรา去<b>ไป</b>เที่ยวกันเถอะ", exampleTranslation: "我们去旅游吧。" },
          { front: "ผม", phonetic: "/phǒm/", back: "头发/我(男用)", example: "<b>ผม</b>ชอบดื่มชา", exampleTranslation: "我喜欢喝茶。" },
          { front: "ผลไม้", phonetic: "/phǒn lá máay/", back: "水果", example: "กิน<b>ผลไม้</b>มีประโยชน์ต่อร่างกาย", exampleTranslation: "吃水果对身体有益。" },
          { front: "ผัด", phonetic: "/phàt/", back: "炒", example: "<b>ผัด</b>ไทยเป็นอาหารยอดนิยม", exampleTranslation: "泰式炒粉是热门食物。" },
          { front: "ผัวเมีย", phonetic: "/phǔa mia/", back: "夫妻", example: "<b>ผัวเมีย</b>คู่นี้รักกันมาก", exampleTranslation: "这对夫妻非常相爱。" },
          { front: "ผ้า", phonetic: "/phâa/", back: "布，衣服", example: "แม่ซื้อ<b>ผ้า</b>มาตัดชุด", exampleTranslation: "妈妈买了布来缝衣服。" },
          { front: "ผู้ชาย", phonetic: "/phûu chaay/", back: "男性", example: "<b>ผู้ชาย</b>คนนั้นคือใคร?", exampleTranslation: "那个男人是谁？" },
          { front: "ผู้หญิง", phonetic: "/phûu yǐŋ/", back: "女性", example: "<b>ผู้หญิง</b>ไทยสวยงามมาก", exampleTranslation: "泰国女性非常漂亮。" },
          { front: "แผนที่", phonetic: "/phɛ̌ɛn thîi/", back: "地图", example: "ดู<b>แผนที่</b>เพื่อหาทางไปโรงพยาบาล", exampleTranslation: "看地图找去医院的路。" },
          { front: "ไผ่", phonetic: "/phày/", back: "竹子", example: "หมีแพนด้ากิน<b>ไผ่</b>", exampleTranslation: "熊猫吃竹子。" },
          { front: "ฝรั่ง", phonetic: "/fà ràŋ/", back: "西方人/番石榴", example: "มี<b>ฝรั่ง</b>มาเที่ยวเมืองไทยเยอะ", exampleTranslation: "有很多西方人来泰国旅游。" },
          { front: "ฝา", phonetic: "/fǎa/", back: "盖子", example: "อย่าลืมปิด<b>ฝา</b>ขวด", exampleTranslation: "别忘了关瓶盖。" },
          { front: "ฝาก", phonetic: "/fàak/", back: "托付，存放", example: "ฉันขอ<b>ฝาก</b>ของไว้หน่อยได้ไหม?", exampleTranslation: "我能寄放一下东西吗？" },
          { front: "พยายาม", phonetic: "/phá yaa yaam/", back: "努力", example: "ฉันจะ<b>พยายาม</b>เรียนภาษาไทยให้ดี", exampleTranslation: "我会努力学好泰语。" },
          { front: "พรุ่งนี้", phonetic: "/phrûŋ níi/", back: "明天", example: "<b>พรุ่งนี้</b>เจอกันนะ", exampleTranslation: "明天见。" },
          { front: "พ่อ", phonetic: "/phɔ̂อ/", back: "爸爸", example: "<b>พ่อ</b>รักลูกทุกคน", exampleTranslation: "爸爸爱每一个孩子。" },
          { front: "พี่", phonetic: "/phîi/", back: "哥哥/姐姐", example: "<b>พี่</b>สอนการบ้านให้น้อง", exampleTranslation: "哥哥/姐姐教弟弟妹妹写作业。" },
          { front: "เพื่อ", phonetic: "/phʉ̂a/", back: "为了", example: "ฉันทำทุกอย่าง<b>เพื่อ</b>ครอบครัว", exampleTranslation: "我为家庭做一切。" },
          { front: "เพื่อน", phonetic: "/phʉ̂an/", back: "朋友", example: "เขาเป็น<b>เพื่อน</b>ร่วมงานของฉัน", exampleTranslation: "他是我的同事（朋友）。" },
          { front: "แพะ", phonetic: "/phɛ́/", back: "山羊", example: "<b>แพะ</b>กินหญ้าที่ทุ่งนา", exampleTranslation: "山羊在田野里吃草。" },
          { front: "ฟัง", phonetic: "/faŋ/", back: "听", example: "ฉันชอบ<b>ฟัง</b>เพลง", exampleTranslation: "我喜欢听歌。" },
          { front: "ฟ้า", phonetic: "/fáa/", back: "天空/蓝色", example: "ท้อง<b>ฟ้า</b>วันนี้สดใสมาก", exampleTranslation: "今天天空非常晴朗。" },
          { front: "ไฟฟ้า", phonetic: "/fay fáa/", back: "电", example: "<b>ไฟฟ้า</b>ดับเมื่อคืนนี้", exampleTranslation: "昨晚停电了。" },
          { front: "ภาษา", phonetic: "/phaa sǎa/", back: "语言", example: "ภาษา<b>ภาษา</b>ไทยสนุกดี", exampleTranslation: "泰语挺好玩的。" },
          { front: "ภาษาไทย", phonetic: "/phaa sǎa thay/", back: "泰语", example: "ฉันเรียน<b>ภาษาไทย</b>ทุกวัน", exampleTranslation: "我每天学泰语。" },
          { front: "มหาวิทยาลัย", phonetic: "/má hǎa wít tha yaa lay/", back: "大学", example: "พี่สาวเรียนที่<b>มหาวิทยาลัย</b>", exampleTranslation: "姐姐在大学上学。" },
          { front: "มะเขือ", phonetic: "/má khʉ̌a/", back: "茄子", example: "แกงเผ็ดใส่<b>มะเขือ</b>เปราะ", exampleTranslation: "红咖喱里加了小茄子。" },
          { front: "มะเขือเทศ", phonetic: "/má khʉ̌a thêet/", back: "西红柿", example: "<b>มะเขือเทศ</b>มีวิตามินซีสูง", exampleTranslation: "西红柿维C含量高。" },
          { front: "มะละกอ", phonetic: "/má lá kɔอ/", back: "木瓜", example: "ส้มตำทำจาก<b>มะละกอ</b>ดิบ", exampleTranslation: "青木瓜沙拉是用生木瓜做的。" },
          { front: "มันฝรั่ง", phonetic: "/man fà ràŋ/", back: "土豆", example: "ฉันชอบกิน<b>มันฝรั่ง</b>ทอด", exampleTranslation: "我喜欢吃炸土豆（薯条）。" },
          { front: "มัว", phonetic: "/mua/", back: "浑浊，模糊", example: "น้ำในคลองเริ่ม<b>มัว</b>แล้ว", exampleTranslation: "运河里的水开始浑浊了。" },
          { front: "มา", phonetic: "/maa/", back: "来", example: "กรุณา<b>มา</b>ที่นี่เดี๋ยวนี้", exampleTranslation: "请立刻来这里。" },
          { front: "ม้า", phonetic: "/máa/", back: "马", example: "เขาชอบขี่<b>ม้า</b>", exampleTranslation: "他喜欢骑马。" },
          { front: "มาก", phonetic: "/mâak/", back: "很", example: "อาหารจานนี้อร่อย<b>มาก</b>", exampleTranslation: "这道菜非常好吃。" },
          { front: "มิน่าเล่า", phonetic: "/mí nâa lâw/", back: "怪不得", example: "<b>มิน่าเล่า</b>เขาถึงไม่มา", exampleTranslation: "怪不得他没来。" },
          { front: "มี", phonetic: "/mii/", back: "有", example: "ฉัน<b>มี</b>แมวสามตัว", exampleTranslation: "我有三只猫。" },
          { front: "มือ", phonetic: "/mʉʉ/", back: "手", example: "ล้าง<b>มือ</b>ก่อนกินข้าว", exampleTranslation: "饭前洗手。" },
          { front: "เมื่อ", phonetic: "/mʉ̂a/", back: "当...时候", example: "<b>เมื่อ</b>วานนี้ฝนตกหนัก", exampleTranslation: "昨天雨下得很大。" },
          { front: "เมื่อเช้า", phonetic: "/mʉ̂a cháaw/", back: "今天早上", example: "ฉันกินโจ๊ก<b>เมื่อเช้า</b>", exampleTranslation: "我今天早上吃了粥。" },
          { front: "เมื่อตะกี้", phonetic: "/mʉ̂a tà kîi/", back: "刚才", example: "<b>เมื่อตะกี้</b>ใครโทรมา?", exampleTranslation: "刚才谁打电话来？" },
          { front: "เมื่อไร", phonetic: "/mʉ̂a ray/", back: "什么时候", example: "คุณจะไป<b>เมื่อไร</b>?", exampleTranslation: "你什么时候走？" },
          { front: "เมื่อวาน", phonetic: "/mʉ̂a waan/", back: "昨天", example: "ฉันไปหาเพื่อน<b>เมื่อวาน</b>", exampleTranslation: "我昨天去找朋友了。" },
          { front: "เมือง", phonetic: "/mɯaŋ/", back: "城市，国家", example: "กรุงเทพฯ เป็น<b>เมือง</b>ที่วุ่นวาย", exampleTranslation: "曼谷是个繁忙的城市。" },
          { front: "เมืองจีน", phonetic: "/mɯaŋ ciin/", back: "中国", example: "ฉันอยากไปเที่ยว<b>เมืองจีน</b>", exampleTranslation: "我想去中国旅游。" },
          { front: "เมืองไทย", phonetic: "/mɯaŋ thay/", back: "泰国", example: "ยินดีต้อนรับสู่<b>เมืองไทย</b>", exampleTranslation: "欢迎来到泰国。" },
          { front: "แม่", phonetic: "/mɛ̂ɛ/", back: "妈妈", example: "<b>แม่</b>ทำกับข้าวอร่อยที่สุด", exampleTranslation: "妈妈做的饭最好吃。" },
          { front: "ไม่", phonetic: "/mây/", back: "不", example: "ฉัน<b>ไม่</b>ชอบกินเผ็ด", exampleTranslation: "我不喜欢吃辣。" },
          { front: "ไม่ใช่", phonetic: "/mây chây/", back: "不是", example: "นี่<b>ไม่ใช่</b>ของฉัน", exampleTranslation: "这不是我的。" },
          { front: "ยังไง / อย่างไร", phonetic: "/yaŋ ŋay / yàaŋ ray/", back: "怎样", example: "ไปที่นั่นได้<b>ยังไง</b>?", exampleTranslation: "怎么去那里？" },
          { front: "ย่า", phonetic: "/yâa/", back: "祖母", example: "<b>ย่า</b>เล่านิทานให้ฟัง", exampleTranslation: "奶奶讲故事给我听。" },
          { front: "เยอะแยะ", phonetic: "/yə́ yɛ́/", back: "多", example: "มีของกิน<b>เยอะแยะ</b>เลย", exampleTranslation: "有很多吃的哦。" },
          { front: "รอ", phonetic: "/rɔɔ/", back: "等候", example: "ฉันจะ<b>รอ</b>คุณที่นี่", exampleTranslation: "我会在这里等你。" },
          { front: "รัก", phonetic: "/rák/", back: "爱", example: "ฉัน<b>รัก</b>คุณ", exampleTranslation: "我爱你。" },
          { front: "ราคา", phonetic: "/raa khaa/", back: "价格", example: "ผลไม้นี้<b>ราคา</b>ถูกมาก", exampleTranslation: "这些水果价格很便宜。" },
          { front: "ราดหน้าเส้นใหญ่", phonetic: "/râat nâa sên yày/", back: "湿炒河粉", example: "ฉันสั่ง<b>ราดหน้าเส้นใหญ่</b>ทะเล", exampleTranslation: "我点了海鲜湿炒大宽粉。" },
          { front: "รู้", phonetic: "/rúu/", back: "知道", example: "ฉัน<b>รู้</b>ว่าคุณเป็นใคร", exampleTranslation: "我知道你是谁。" },
          { front: "รู้สึก", phonetic: "/rúu sʉ̀k/", back: "感觉", example: "วันนี้ฉัน<b>รู้สึก</b>ไม่ค่อยสบาย", exampleTranslation: "今天我感觉不太舒服。" },
          { front: "เรา", phonetic: "/raw/", back: "我们", example: "<b>เรา</b>เป็นเพื่อนกัน", exampleTranslation: "我们是朋友。" },
          { front: "เรียกว่า", phonetic: "/rîak wâa/", back: "称作", example: "สิ่งนี้<b>เรียกว่า</b>อะไร?", exampleTranslation: "这个叫什么？" },
          { front: "เรียน", phonetic: "/rian/", back: "学习", example: "เขาชอบ<b>เรียน</b>ภาษาไทย", exampleTranslation: "他喜欢学习泰语。" },
          { front: "เรือ", phonetic: "/rɯa/", back: "船", example: "เรานั่ง<b>เรือ</b>ข้ามฟาก", exampleTranslation: "我们坐渡船过河。" },
          { front: "เรื่อยๆ", phonetic: "/rɯ̂ay rɯ̂ay/", back: "就那样，一直", example: "ชีวิตช่วงนี้ก็เป็นไป<b>เรื่อยๆ</b>", exampleTranslation: "这段时间生活也就那样过着。" },
          { front: "โรงเรียน", phonetic: "/rooŋ rian/", back: "学校", example: "ลูกไป<b>โรงเรียน</b>แต่เช้า", exampleTranslation: "孩子一大早去学校。" },
          { front: "โรงหนัง", phonetic: "/rooŋ nǎŋ/", back: "电影院", example: "คนเยอะมากที่<b>โรงหนัง</b>", exampleTranslation: "电影院人很多。" },
          { front: "โรงอาหาร", phonetic: "/rooŋ aa hǎan/", back: "食堂", example: "ไปกินข้าวที่<b>โรงอาหาร</b>กัน", exampleTranslation: "去食堂吃饭吧。" },
          { front: "ล่ะ", phonetic: "/là/", back: "呢", example: "คุณ<b>ล่ะ</b> สบายดีไหม?", exampleTranslation: "你呢？还好吗？" },
          { front: "ลำไย", phonetic: "/lam yay/", back: "龙眼", example: "<b>ลำไย</b>มีรสชาติหวาน", exampleTranslation: "龙眼味道很甜。" },
          { front: "ลืม", phonetic: "/lʉʉm/", back: "忘记", example: "อย่า<b>ลืม</b>ทำการบ้านนะ", exampleTranslation: "别忘了做作业哦。" },
          { front: "เลีย", phonetic: "/lia/", back: "舔", example: "สุนัขชอบ<b>เลีย</b>มือเจ้าของ", exampleTranslation: "狗喜欢舔主人的手。" },
          { front: "แล้ว", phonetic: "/lɛ́ɛw/", back: "那么/了", example: "กินข้าว<b>แล้ว</b>", exampleTranslation: "已经吃过饭了。" },
          { front: "และ", phonetic: "/lɛ́/", back: "和", example: "ฉัน<b>และ</b>คุณเป็นเพื่อนกัน", exampleTranslation: "我和你是朋友。" },
          { front: "วันนี้", phonetic: "/wan níi/", back: "今天", example: "<b>วันนี้</b>อากาศร้อนจัง", exampleTranslation: "今天天气真热。" },
          { front: "วัว", phonetic: "/wua/", back: "黄牛", example: "<b>วัว</b>กินหญ้าที่ทุ่งนา", exampleTranslation: "黄牛在田野里吃草。" },
          { front: "วิชา", phonetic: "/wí chaa/", back: "课程", example: "ฉันชอบเรียน<b>วิชา</b>ภาษาไทย", exampleTranslation: "我喜欢学泰语课。" },
          { front: "เวลา", phonetic: "/wee laa/", back: "时间", example: "ตอนนี้<b>เวลา</b>เท่าไร?", exampleTranslation: "现在几点时间？" },
          { front: "เวียดนาม", phonetic: "/wîat naam/", back: "越南", example: "ฉันเคยไปเที่ยว<b>เวียดนาม</b>", exampleTranslation: "我曾经去越南旅游。" },
          { front: "ส่ง", phonetic: "/sòŋ/", back: "递，送", example: "ช่วย<b>ส่ง</b>น้ำให้หน่อย", exampleTranslation: "请帮忙递下水。" },
          { front: "สบาย", phonetic: "/sà baay/", back: "舒适", example: "วันนี้รู้สึก<b>สบาย</b>มาก", exampleTranslation: "今天感觉很舒服。" },
          { front: "สมุด", phonetic: "/sà mùt/", back: "本子", example: "เขียนคำศัพท์ลงใน<b>สมุด</b>", exampleTranslation: "在本子上写下单词。" },
          { front: "สวัสดิ์", phonetic: "/sà wàt/", back: "你好（短形式）", example: "<b>สวัสดิ์</b>ดีครับคุณครู", exampleTranslation: "老师好。" },
          { front: "ส่วน", phonetic: "/sùan/", back: "至于，部分", example: "<b>ส่วน</b>ฉันจะไปพรุ่งนี้", exampleTranslation: "至于我，我明天走。" },
          { front: "สอบ", phonetic: "/sɔ̀ɔp/", back: "考试", example: "นักเรียนกำลัง<b>สอบ</b>", exampleTranslation: "学生正在考试。" },
          { front: "สอน", phonetic: "/sɔ̌ɔn/", back: "教", example: "คุณครู<b>สอน</b>ภาษาไทย", exampleTranslation: "老师教泰语。" },
          { front: "สัปดาห์หน้า", phonetic: "/sàp daa nâa/", back: "下周", example: "เราจะเจอกัน<b>สัปดาห์หน้า</b>", exampleTranslation: "我们下周见。" },
          { front: "สาลี่", phonetic: "/sǎa lîi/", back: "雪梨", example: "<b>สาลี่</b>มีรสหวานกรอบ", exampleTranslation: "雪梨味道甜而脆。" },
          { front: "สาม", phonetic: "/sǎam/", back: "三", example: "ฉันมีแมว<b>สาม</b>ตัว", exampleTranslation: "我有三只猫。" },
          { front: "สี", phonetic: "/sǐi/", back: "颜色", example: "คุณชอบ<b>สี</b>อะไร?", exampleTranslation: "你喜欢什么颜色？" },
          { front: "สี่", phonetic: "/sìi/", back: "四", example: "มีเก้าอี้<b>สี่</b>ตัว", exampleTranslation: "有四把椅子。" },
          { front: "สีเทา", phonetic: "/sǐi thaw/", back: "褐色/灰色", example: "แมวตัวนี้มี<b>สีเทา</b>", exampleTranslation: "这只猫是灰色的。" },
          { front: "เสฉวน", phonetic: "/sěe chǔan/", back: "四川", example: "อาหาร<b>เสฉวน</b>เผ็ดมาก", exampleTranslation: "川菜非常辣。" },
          { front: "เสีย", phonetic: "/sǐa/", back: "浪费，损坏", example: "อย่า<b>เสีย</b>เวลาคุยเล่น", exampleTranslation: "别浪费时间闲聊。" },
          { front: "เสือ", phonetic: "/sɯ̌a/", back: "老虎", example: "<b>เสือ</b>เป็นสัตว์ดุร้าย", exampleTranslation: "老虎是凶猛的动物。" },
          { front: "เสื้อผ้า", phonetic: "/sɯ̂a phâa/", back: "衣服", example: "ฉันต้องซัก<b>เสื้อผ้า</b>", exampleTranslation: "我得洗衣服。" },
          { front: "ใส่", phonetic: "/sày/", back: "穿，戴，放", example: "กรุณา<b>ใส่</b>หน้ากากอนามัย", exampleTranslation: "请戴上口罩。" },
          { front: "หน่อย", phonetic: "/nɔ̀ɔy/", back: "一下", example: "帮助เปิดประตูให้<b>หน่อย</b>", exampleTranslation: "请帮下忙开门。" },
          { front: "หนัง", phonetic: "/nǎŋ/", back: "电影", example: "ฉันชอบดู<b>หนัง</b>รัก", exampleTranslation: "我喜欢看爱情电影。" },
          { front: "หนังสือ", phonetic: "/nǎŋ sʉ̌ʉ/", back: "书", example: "อ่าน<b>หนังสือ</b>ก่อนนอน", exampleTranslation: "睡前看书。" },
          { front: "หนู", phonetic: "/nǔu/", back: "我(女性自称)/你/老鼠", example: "<b>หนู</b>อยากไปเที่ยว", exampleTranslation: "我想去旅游（女性自称）。" },
          { front: "หมู", phonetic: "/mǔu/", back: "猪", example: "แกงเผ็ด<b>หมู</b>อร่อยมาก", exampleTranslation: "红咖喱猪肉很好吃。" },
          { front: "หยิบ", phonetic: "/yìp/", back: "拿", example: "ช่วย<b>หยิบ</b>ปากกาให้หน่อย", exampleTranslation: "请帮忙拿一下钢笔。" },
          { front: "หรือ", phonetic: "/rʉ̌ʉ/", back: "或者", example: "คุณจะเอาชา<b>หรือ</b>กาแฟ?", exampleTranslation: "你要茶还是咖啡？" },
          { front: "หอ", phonetic: "/hอ/", back: "楼，宿舍", example: "ฉันพักอยู่ที่<b>หอ</b>ในมหาวิทยาลัย", exampleTranslation: "我住在大学里的宿舍。" },
          { front: "หอพัก", phonetic: "/hอ phák/", back: "宿舍", example: "<b>หอพัก</b>นี้สะอาดมาก", exampleTranslation: "这间宿舍非常干净。" },
          { front: "หอสมุด", phonetic: "/hอ sà mùt/", back: "图书馆", example: "ไปอ่านหนังสือที่<b>หอสมุด</b>กัน", exampleTranslation: "去图书馆看书吧。" },
          { front: "ห้องครัว", phonetic: "/hอŋ khrua/", back: "厨房", example: "แม่กำลังทำกับข้าวใน<b>ห้องครัว</b>", exampleTranslation: "妈妈正在厨房里做饭。" },
          { front: "ห้องเรียน", phonetic: "/hอŋ rian/", back: "教室", example: "นักเรียนทุกคนอยู่ใน<b>ห้องเรียน</b>", exampleTranslation: "所有学生都在教室里。" },
          { front: "หัว", phonetic: "/hǔa/", back: "头", example: "เขาปวด<b>หัว</b>เพราะนอนน้อย", exampleTranslation: "他因为睡得少而头疼。" },
          { front: "หัวเราะ", phonetic: "/hǔa rɔ́/", back: "笑", example: "เด็กๆ <b>หัวเราะ</b>กันอย่างสนุกสนาน", exampleTranslation: "孩子们开心地笑着。" },
          { front: "หา", phonetic: "/hǎa/", back: "找", example: "ฉันกำลัง<b>หา</b>กุญแจรถ", exampleTranslation: "我正在找车钥匙。" },
          { front: "ห้า", phonetic: "/hâa/", back: "五", example: "มีคนมา<b>ห้า</b>คน", exampleTranslation: "来了五个人。" },
          { front: "ห้าง", phonetic: "/hâaŋ/", back: "商场", example: "ไปเดินเล่นที่<b>ห้าง</b>กันไหม?", exampleTranslation: "一起去商场逛逛吗？" },
          { front: "หิว", phonetic: "/hǐw/", back: "饿", example: "ตอนนี้ฉัน<b>หิว</b>มาก", exampleTranslation: "现在我很饿。" },
          { front: "หิวน้ำ", phonetic: "/hǐw nám/", back: "渴", example: "ฉัน<b>หิวน้ำ</b> อยากดื่มอะไรเย็นๆ", exampleTranslation: "我渴了，想喝点凉的。" },
          { front: "หู", phonetic: "/hǔu/", back: "耳朵", example: "<b>หู</b>ของกระต่ายยาวมาก", exampleTranslation: "兔子的耳朵很长。" },
          { front: "แห่ง", phonetic: "/hɛ̀ŋ/", back: "所/个/地方", example: "มหาวิทยาลัย<b>แห่ง</b>นี้ใหญ่มาก", exampleTranslation: "这所大学非常大。" },
          { front: "ไหหลำ", phonetic: "/hǎy lǎm/", back: "海南", example: "เกาะ<b>ไหหลำ</b>เป็นแหล่งท่องเที่ยวที่มีชื่อเสียง", exampleTranslation: "海南岛是著名的旅游胜地。" },
          { front: "ให้", phonetic: "/hây/", back: "给", example: "ฉัน<b>ให้</b>ของขวัญแก่เขา", exampleTranslation: "我送礼物给他。" },
          { front: "ใหม่", phonetic: "/mày/", back: "新的", example: "ฉันซื้อรองเท้าคู่<b>ใหม่</b>", exampleTranslation: "我买了双新鞋。" },
          { front: "ไหน", phonetic: "/nǎy/", back: "哪里", example: "คุณจะไป<b>ไหน</b>?", exampleTranslation: "你要去哪里？" },
          { front: "ไหม", phonetic: "/mǎy/", back: "吗", example: "คุณชอบกินทุเรียน<b>ไหม</b>?", exampleTranslation: "你喜欢吃榴莲吗？" },
          { front: "อย่า", phonetic: "/yàa/", back: "别", example: "<b>อย่า</b>ลืมทำการบ้านนะ", exampleTranslation: "别忘了做作业哦。" },
          { front: "อยาก", phonetic: "/yàak/", back: "想", example: "ฉัน<b>อยาก</b>ไปเที่ยวเมืองไทย", exampleTranslation: "我想去泰国旅游。" },
          { front: "อยู่", phonetic: "/yùu/", back: "在", example: "แมว<b>อยู่</b>บนหลังคา", exampleTranslation: "猫在屋顶上。" },
          { front: "อร่อย", phonetic: "/a rɔ̀y/", back: "美味", example: "อาหารมื้อนี้<b>อร่อย</b>มาก", exampleTranslation: "这顿饭很好吃。" },
          { front: "อะไร", phonetic: "/a ray/", back: "什么", example: "คุณกำลังทำ<b>อะไร</b>?", exampleTranslation: "你在做什么？" },
          { front: "อา", phonetic: "/aa/", back: "叔叔/姑姑", example: "<b>อา</b>มาหาเราที่บ้าน", exampleTranslation: "叔叔/姑姑来家里看我们。" },
          { front: "อากาศ", phonetic: "/aa kàat/", back: "天气", example: "<b>อากาศ</b>วันนี้ดีจัง", exampleTranslation: "今天天气真好。" },
          { front: "อาทิตย์", phonetic: "/aa thิต/", back: "星期", example: "สัปดาห์นี้มีเจ็ดวันในหนึ่ง<b>อาทิตย์</b>", exampleTranslation: "一周里有七天。" },
          { front: "อาหรับ", phonetic: "/aa ràp/", back: "阿拉伯", example: "เขาเรียนภาษา<b>อาหรับ</b>", exampleTranslation: "他学习阿拉伯语。" },
          { front: "อาหาร", phonetic: "/aa hǎan/", back: "食物", example: "<b>อาหาร</b>ไทยมีรสเผ็ด", exampleTranslation: "泰国菜味道辣。" },
          { front: "อ่าน", phonetic: "/àan/", back: "读", example: "คุณชอบ<b>อ่าน</b>หนังสือไหม?", exampleTranslation: "你喜欢读书吗？" },
          { front: "อีก", phonetic: "/ìik/", back: "再", example: "ขอกาแฟ<b>อีก</b>แก้วครับ", exampleTranslation: "请再给我一杯咖啡。" },
          { front: "เอา", phonetic: "/aw/", back: "拿/要", example: "คุณจะ<b>เอา</b>อันไหน?", exampleTranslation: "你要哪一个？" },
          { front: "ไอ", phonetic: "/ay/", back: "咳嗽", example: "เขา<b>ไอ</b>เพราะเป็นหวัด", exampleTranslation: "他因为感冒而咳嗽。" }
        ];

        const basicCards: Card[] = basicThaiData.map((item, idx) => ({
            id: `basic_thai_1_${idx}`,
            frontType: 'text' as const,
            frontContent: item.front,
            backType: 'text' as const,
            backContent: `${item.back}\n\n例句: ${item.example}\n(${item.exampleTranslation})`,
            phonetic: item.phonetic,
            folderId: BASIC_THAI_1_FOLDER_ID,
            tags: ['thai', 'basic'],
            createdAt: Date.now(),
            nextReviewTime: 0,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5
        }));
        newCards.push(...basicCards);
    }

    return { cards: newCards, folders: newFolders };
};

// --- Sub-components for Screens ---

const WelcomeScreen: React.FC<{ onComplete: (settings: Settings) => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-moe-50 text-center relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-moe-200 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-moe-500 rounded-full blur-3xl opacity-20"></div>
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-5xl shadow-xl shadow-moe-100 mb-8 border border-white z-10">
        <div className="w-24 h-24 bg-moe-100 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-inner ring-4 ring-white">🐱</div>
        <h1 className="text-2xl font-bold text-moe-text mb-2">欢迎回家!</h1>
        <p className="text-gray-400 mb-8 text-sm">我是你的学习伴侣，让我们一起搭建温馨的学习角落吧。</p>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-2">怎么称呼你呢？</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：Momo" className="w-full bg-moe-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-moe-200 outline-none text-moe-text transition-all" />
          </div>
        </div>
        <button disabled={!name} onClick={() => onComplete({ userName: name })} className="w-full mt-8 bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg disabled:opacity-50 transition-all active:scale-95">开始旅程</button>
      </div>
    </div>
  );
};

const SettingsScreen: React.FC<{
  settings: Settings;
  stats: { total: number; learned: number; due: number };
  onUpdateSettings: (s: Settings) => void;
  onBack: () => void;
}> = ({ settings, stats, onUpdateSettings, onBack }) => {
  const [name, setName] = useState(settings.userName);
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    onUpdateSettings({ ...settings, userName: name });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };
  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100 bg-white z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><X size={24} className="text-moe-text" /></button>
        <h2 className="text-xl font-bold text-moe-text">设置 & 统计</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-moe-50 p-4 rounded-3xl flex flex-col items-center justify-center text-center"><span className="text-2xl font-bold text-moe-text">{stats.total}</span><span className="text-xs text-gray-400 mt-1 font-bold">总卡片</span></div>
          <div className="bg-[#e2f0cb] p-4 rounded-3xl flex flex-col items-center justify-center text-center"><span className="text-2xl font-bold text-green-600">{stats.learned}</span><span className="text-xs text-green-600/70 mt-1 font-bold">已掌握</span></div>
          <div className="bg-[#ffe4e1] p-4 rounded-3xl flex flex-col items-center justify-center text-center"><span className="text-2xl font-bold text-moe-primary">{stats.due}</span><span className="text-xs text-moe-primary/70 mt-1 font-bold">待复习</span></div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-moe-text text-lg flex items-center gap-2"><User size={20} className="text-moe-primary"/> 个人信息</h3>
          <div className="bg-moe-50/50 p-4 rounded-2xl">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">昵称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-moe-200 border border-gray-100" />
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-gray-100">
        <button onClick={handleSave} className="w-full bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95">{isSaved ? <span className="flex items-center gap-2 animate-in"><ThumbsUp size={20}/> 已保存</span> : "保存修改"}</button>
      </div>
    </div>
  );
};

const HomeScreen: React.FC<{ 
  user: string, 
  totalCards: number,
  dueCount: number,
  folders: Folder[],
  currentFolderId: string,
  onSwitchFolder: (id: string) => void,
  onCreateFolder: (name: string) => void,
  onNavigate: (view: ViewState) => void,
  onOpenSettings: () => void
}> = ({ user, totalCards, dueCount, folders, currentFolderId, onSwitchFolder, onCreateFolder, onNavigate, onOpenSettings }) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };
  const currentFolderName = folders.find(f => f.id === currentFolderId)?.name || '未知';
  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-moe-50 pb-safe">
      <div className="p-4 md:p-8 w-full max-w-5xl mx-auto md:min-h-screen flex flex-col justify-center">
        <div className="flex justify-between items-start mb-6 md:mb-8">
          <div className="flex items-start gap-4 flex-1">
             <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md text-3xl flex-shrink-0 border-2 border-moe-50 z-10 relative">🐱<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div></div>
             <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm relative -mt-2 animate-in fade-in slide-in-from-left-2 duration-500 max-w-xl">
                <h1 className="text-xl font-bold text-moe-text mb-1">嗨, {user}!</h1>
                <p className="text-gray-500 text-sm leading-relaxed">{getGreeting(user, dueCount)}</p>
             </div>
          </div>
          <button onClick={onOpenSettings} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-moe-primary transition-colors hover:rotate-90 duration-300 ml-4"><SettingsIcon size={24} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-stretch">
          <div className="md:col-span-5 flex flex-col gap-3 md:gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {folders.map(folder => (
                <button key={folder.id} onClick={() => onSwitchFolder(folder.id)} className={`flex-shrink-0 flex items-center px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${currentFolderId === folder.id ? 'bg-moe-text text-white shadow-md' : 'bg-white/60 text-gray-500 hover:bg-white'}`}>{folder.name}</button>
              ))}
              <button onClick={() => setIsCreatingFolder(true)} className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 md:px-3 md:py-2 rounded-xl bg-moe-100 text-moe-primary hover:bg-moe-200 transition-colors"><FolderPlus size={18} /></button>
            </div>
            <div onClick={() => onNavigate(ViewState.FOLDER_DETAIL)} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-moe-100/50 relative overflow-hidden group cursor-pointer active:scale-95 transition-all h-full min-h-[200px] md:min-h-[280px] flex flex-col justify-end border-2 border-white hover:border-moe-100">
              <div className="absolute -right-8 -top-8 w-48 h-48 bg-moe-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="absolute right-8 top-8 opacity-90 group-hover:scale-105 transition-transform duration-300"><div className="text-8xl">📁</div></div>
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2"><FolderIcon size={16} className="text-moe-primary"/>{currentFolderName}</p>
                <div className="flex items-baseline gap-3"><span className="text-5xl md:text-7xl font-bold text-moe-text tracking-tight">{dueCount}</span><span className="text-gray-400 text-lg md:text-xl font-bold">/ {totalCards} 张</span></div>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-moe-50 rounded-lg text-xs font-bold text-moe-primary group-hover:bg-moe-100 transition-colors">点击管理卡片</div>
              </div>
            </div>
          </div>
          <div className="md:col-span-7 flex flex-col gap-3 md:gap-4">
             <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button onClick={() => setShowCreateMenu(true)} className="bg-[#ffe4e1] rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 h-36 md:h-48 flex flex-col items-center justify-center gap-2 md:gap-4 text-moe-text hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform"><Plus size={32} className="text-[#ff9a9e] scale-75 md:scale-100"/></div>
                  <span className="font-bold text-base md:text-lg relative z-10">新建闪卡</span>
                </button>
                <button onClick={() => onNavigate(ViewState.IMPORT)} className="bg-[#e2f0cb] rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 h-36 md:h-48 flex flex-col items-center justify-center gap-2 md:gap-4 text-moe-text hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm relative z-10 group-hover:scale-110 transition-transform"><Sparkles size={32} className="text-[#88d8b0] scale-75 md:scale-100"/></div>
                  <span className="font-bold text-base md:text-lg relative z-10">AI 导入</span>
                </button>
             </div>
             <button onClick={() => onNavigate(ViewState.REVIEW)} className="bg-[#c7ceea] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 h-32 md:h-40 flex items-center justify-between text-moe-text hover:shadow-lg transition-all active:scale-95 group relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className="flex flex-col text-left justify-center h-full relative z-10"><span className="font-bold text-2xl md:text-3xl mb-1 md:mb-2">开始复习</span><span className="text-sm md:text-base opacity-70 font-medium">{dueCount > 0 ? `还有 ${dueCount} 个单词等着你哦` : "复习完成！要再来一组吗？"}</span></div>
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white/60 rounded-full flex items-center justify-center shadow-sm relative z-10 group-hover:rotate-12 transition-transform hover:bg-white"><Play size={36} className="text-[#96a5d9] ml-1 scale-75 md:scale-100" fill="currentColor" /></div>
              </button>
          </div>
        </div>
      </div>
      {showCreateMenu && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-4xl shadow-2xl w-3/4 max-sm border border-moe-100">
            <h3 className="text-xl font-bold text-center mb-6 text-moe-text">你想怎么制作卡片？</h3>
            <div className="space-y-4">
              <button onClick={() => { setShowCreateMenu(false); onNavigate(ViewState.CREATE); }} className="w-full bg-moe-50 hover:bg-moe-100 p-4 rounded-3xl flex items-center gap-4 transition-colors group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-moe-primary shadow-sm group-hover:scale-110 transition-transform"><Type size={24} /></div><div className="text-left"><div className="font-bold text-moe-text text-lg">文本卡片</div><div className="text-xs text-gray-400">输入文字和定义</div></div></button>
              <button onClick={() => { setShowCreateMenu(false); onNavigate(ViewState.CREATE_DRAW); }} className="w-full bg-moe-50 hover:bg-moe-100 p-4 rounded-3xl flex items-center gap-4 transition-colors group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-moe-primary shadow-sm group-hover:scale-110 transition-transform"><PenTool size={24} /></div><div className="text-left"><div className="font-bold text-moe-text text-lg">手写卡片</div><div className="text-xs text-gray-400">自由写字和涂鸦</div></div></button>
               <button onClick={() => setShowCreateMenu(false)} className="w-full mt-4 py-3 rounded-2xl text-gray-400 text-sm font-bold hover:bg-gray-50">还是算了吧</button>
            </div>
          </div>
        </div>
      )}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-moe-text">新建文件夹</h3>
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="例如：英语单词" className="w-full bg-moe-50 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-moe-primary" />
            <div className="flex gap-2"><button onClick={() => setIsCreatingFolder(false)} className="flex-1 py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">取消</button><button onClick={handleCreateFolder} className="flex-1 py-3 bg-moe-text text-white rounded-xl font-bold shadow-md">创建</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const FolderDetailScreen: React.FC<{
    folder: Folder, allFolders: Folder[], cards: Card[], onBack: () => void, onDeleteCard: (id: string) => void, onMoveCard: (id: string, folderId: string) => void
}> = ({ folder, allFolders, cards, onBack, onDeleteCard, onMoveCard }) => {
    const [movingCardId, setMovingCardId] = useState<string | null>(null);
    const [showExport, setShowExport] = useState(false);
    const parseCardContent = (card: Card) => {
      let word = card.frontType === 'text' ? card.frontContent : '[Image]';
      let phonetic = card.phonetic || '';
      let meaning = ''; let example = ''; let translation = '';
      if (card.backType === 'text') {
        const content = card.backContent;
        const parts = content.split('\n\n例句: ');
        if (parts.length > 1) {
           meaning = stripHTML(parts[0]);
           const examplePart = parts[1];
           const exParts = examplePart.split('\n(');
           if (exParts.length > 1) { example = stripHTML(exParts[0]); translation = exParts[1].replace(')', ''); } 
           else { example = stripHTML(examplePart); }
        } else { meaning = stripHTML(content); }
      } else { meaning = '[Image]'; }
      return { word, phonetic, meaning, example, translation };
    };
    const handleExport = (format: 'txt' | 'csv' | 'pdf') => {
      if (cards.length === 0) return;
      const data = cards.map(parseCardContent);
      if (format === 'csv') {
        const header = "\uFEFFWord,Phonetic,Meaning,Example,Example Translation\n";
        const rows = data.map(d => `"${d.word.replace(/"/g, '""')}","${d.phonetic.replace(/"/g, '""')}","${d.meaning.replace(/"/g, '""')}","${d.example.replace(/"/g, '""')}","${d.translation.replace(/"/g, '""')}"`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `moe_cards_${folder.name}.csv`; link.click();
      } else if (format === 'txt') {
        const rows = data.map(d => `${d.word}\t${d.phonetic}\t${d.meaning}\t${d.example}\t${d.translation}`).join('\n');
        const blob = new Blob([rows], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `moe_cards_${folder.name}.txt`; link.click();
      } else if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const rowsHtml = data.map(d => `<div class="card"><div class="col-left"><div class="word">${d.word}</div>${d.phonetic ? `<div class="phonetic">${d.phonetic}</div>` : ''}</div><div class="col-right"><div class="meaning">${d.meaning}</div>${d.example ? `<div class="example"><div class="en">${d.example}</div><div class="cn">${d.translation}</div></div>` : ''}</div></div>`).join('');
          printWindow.document.write(`<html><head><title>${folder.name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Noto+Sans+SC:wght@400;700&display=swap');body { font-family: 'Quicksand', 'Noto Sans SC', sans-serif; padding: 40px; color: #4a4a4a; }.card { display: flex; border: 2px solid #ffe4e1; border-radius: 20px; margin-bottom: 20px; page-break-inside: avoid; overflow: hidden; }.col-left { flex: 1; padding: 24px; background: #fff9fc; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-right: 2px solid #ffe4e1; }.col-right { flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: center; }.word { font-size: 24px; font-weight: bold; color: #ff9a9e; }.phonetic { color: #888; font-size: 14px; background: rgba(255, 228, 225, 0.5); padding: 4px 12px; border-radius: 12px; margin-top: 8px; }.meaning { font-weight: bold; font-size: 16px; margin-bottom: 12px; }.example { font-size: 14px; color: #666; background: #fafafa; padding: 12px; border-radius: 12px; border-left: 3px solid #ffb7b2; }.example .cn { color: #999; font-size: 13px; margin-top: 4px; }</style></head><body><h1>${folder.name}</h1>${rowsHtml}<script>window.print();</script></body></html>`);
          printWindow.document.close();
        }
      }
      setShowExport(false);
    };
    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white z-10">
                <div className="flex items-center gap-4">
                  <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={24} className="text-moe-text" /></button>
                  <div><h2 className="text-xl font-bold text-moe-text">{folder.name}</h2><p className="text-xs text-gray-400">{cards.length} 张卡片</p></div>
                </div>
                <button onClick={() => setShowExport(true)} className="px-4 py-2 bg-moe-50 text-moe-primary rounded-xl font-bold text-sm flex items-center gap-2"><Download size={16} /> 导出</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cards.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-gray-400"><div className="text-4xl mb-2">📦</div><p>这个文件夹是空的</p></div>) : (cards.map(card => (
                        <div key={card.id} className="bg-moe-50 rounded-2xl p-4 flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-4"><div className="font-bold text-moe-text truncate">{card.frontType === 'image' ? '[图片]' : card.frontContent}</div><div className="text-sm text-gray-500 truncate mt-1">{card.backType === 'image' ? '[图片]' : stripHTML(card.backContent)}</div></div>
                            <div className="flex gap-2">
                                <button onClick={() => setMovingCardId(card.id)} className="p-2 bg-white rounded-xl text-moe-primary shadow-sm hover:bg-moe-100"><ArrowRightLeft size={16} /></button>
                                <button onClick={() => { if(window.confirm('确定要删除这张卡片吗？')) onDeleteCard(card.id); }} className="p-2 bg-white rounded-xl text-red-400 shadow-sm hover:bg-red-50"><Trash2 size={16} /></button>
                            </div>
                        </div>
                )))}
            </div>
            {showExport && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in">
                  <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
                      <h3 className="text-lg font-bold mb-6 text-moe-text text-center">选择导出格式</h3>
                      <div className="space-y-3">
                        <button onClick={() => handleExport('txt')} className="w-full p-4 rounded-2xl bg-moe-50 flex items-center gap-3"><div className="bg-white p-2 rounded-lg text-moe-primary"><FileText size={20}/></div><div className="text-left"><div className="font-bold text-moe-text">TXT 文本</div><div className="text-xs text-gray-400">适合 Anki 导入</div></div></button>
                        <button onClick={() => handleExport('csv')} className="w-full p-4 rounded-2xl bg-moe-50 flex items-center gap-3"><div className="bg-white p-2 rounded-lg text-green-500"><FileSpreadsheet size={20}/></div><div className="text-left"><div className="font-bold text-moe-text">CSV 表格</div><div className="text-xs text-gray-400">适合 Excel 编辑</div></div></button>
                        <button onClick={() => handleExport('pdf')} className="w-full p-4 rounded-2xl bg-moe-50 flex items-center gap-3"><div className="bg-white p-2 rounded-lg text-red-400"><Printer size={20}/></div><div className="text-left"><div className="font-bold text-moe-text">PDF 打印</div><div className="text-xs text-gray-400">精美排版，适合阅读</div></div></button>
                      </div>
                      <button onClick={() => setShowExport(false)} className="w-full mt-6 py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">取消</button>
                  </div>
              </div>
            )}
            {movingCardId && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-3/4 max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-moe-text">移动到文件夹</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                            {allFolders.map(f => (
                                <button key={f.id} onClick={() => { onMoveCard(movingCardId, f.id); setMovingCardId(null); }} className={`w-full p-3 rounded-xl text-left font-bold text-sm ${f.id === folder.id ? 'bg-moe-text text-white' : 'bg-moe-50 text-moe-text'}`}>{f.name}</button>
                            ))}
                        </div>
                        <button onClick={() => setMovingCardId(null)} className="w-full py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">取消</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateCardScreen: React.FC<{ 
  initialMode: 'text' | 'image', folders: Folder[], initialFolderId: string, onBack: () => void, onSave: (card: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>) => void 
}> = ({ initialMode, folders, initialFolderId, onBack, onSave }) => {
  const [frontType, setFrontType] = useState<'text' | 'image'>(initialMode);
  const [backType, setBackType] = useState<'text' | 'image'>(initialMode);
  const [frontContent, setFrontContent] = useState('');
  const [backContent, setBackContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const handleSave = () => {
    if (!frontContent.trim() || !backContent.trim()) { alert("请填写卡片的正面和背面哦！"); return; }
    onSave({ frontType, frontContent, backType, backContent, folderId: selectedFolderId, tags: [] });
    setFrontContent(''); setBackContent(''); setCanvasVersion(v => v + 1);
  };
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={24} className="text-moe-text" /></button>
        <h2 className="text-xl font-bold text-moe-text">制作新卡片</h2>
      </div>
      <div className="px-6 pt-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">保存到文件夹</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {folders.map(f => (
            <button key={f.id} onClick={() => setSelectedFolderId(f.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${selectedFolderId === f.id ? 'bg-moe-100 border-moe-primary text-moe-text' : 'border-gray-200 text-gray-400'}`}>{f.name}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-400">正面 (问题)</span><div className="bg-moe-50 p-1 rounded-lg flex gap-1"><button onClick={() => setFrontType('text')} className={`p-1.5 rounded-md ${frontType === 'text' ? 'bg-white text-moe-primary shadow-sm' : 'text-gray-400'}`}><Type size={16} /></button><button onClick={() => setFrontType('image')} className={`p-1.5 rounded-md ${frontType === 'image' ? 'bg-white text-moe-primary shadow-sm' : 'text-gray-400'}`}><ImageIcon size={16} /></button></div></div>
          {frontType === 'text' ? (<textarea value={frontContent} onChange={(e) => setFrontContent(e.target.value)} placeholder="请输入问题..." className="w-full h-40 bg-moe-50 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg text-center" />) : (<DrawingCanvas key={`front-${canvasVersion}`} onSave={setFrontContent} />)}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-400">背面 (答案)</span><div className="bg-moe-50 p-1 rounded-lg flex gap-1"><button onClick={() => setBackType('text')} className={`p-1.5 rounded-md ${backType === 'text' ? 'bg-white text-moe-primary shadow-sm' : 'text-gray-400'}`}><Type size={16} /></button><button onClick={() => setBackType('image')} className={`p-1.5 rounded-md ${backType === 'image' ? 'bg-white text-moe-primary shadow-sm' : 'text-gray-400'}`}><ImageIcon size={16} /></button></div></div>
          {backType === 'text' ? (<textarea value={backContent} onChange={(e) => setBackContent(e.target.value)} placeholder="请输入答案..." className="w-full h-40 bg-moe-50 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg text-center" />) : (<DrawingCanvas key={`back-${canvasVersion}`} onSave={setBackContent} />)}
        </div>
      </div>
      <div className="p-6 border-t border-gray-100"><button onClick={handleSave} disabled={!frontContent || !backContent} className="w-full bg-moe-text text-white font-bold py-4 rounded-3xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"><Save size={20} />保存 & 下一张</button></div>
    </div>
  );
};

const ImportScreen: React.FC<{ 
  folders: Folder[], initialFolderId: string, onBack: () => void, onSaveBatch: (cards: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>[]) => void 
}> = ({ folders, initialFolderId, onBack, onSaveBatch }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewCards, setPreviewCards] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const handleAIProcess = async () => {
    if (!inputText.trim()) return; setIsLoading(true);
    const words = inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    try { const results = await generateFlashcardsFromList(words); setPreviewCards(results); } 
    catch (error) { alert("AI 出错了: " + error); } finally { setIsLoading(false); }
  };
  const confirmImport = () => {
    const cards = previewCards.map(p => ({
      frontType: 'text' as const, frontContent: p.front, backType: 'text' as const,
      backContent: `${p.back}\n\n例句: ${p.example}\n(${p.exampleTranslation})`,
      phonetic: p.phonetic, folderId: selectedFolderId, tags: ['imported']
    }));
    onSaveBatch(cards); onBack();
  };
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={24} className="text-moe-text" /></button>
        <h2 className="text-xl font-bold text-moe-text">AI 批量导入</h2>
      </div>
      <div className="px-6 pt-4">
        <label className="text-xs font-bold text-gray-400 block">保存到文件夹</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {folders.map(f => (<button key={f.id} onClick={() => setSelectedFolderId(f.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${selectedFolderId === f.id ? 'bg-moe-100 border-moe-primary text-moe-text' : 'border-gray-200'}`}>{f.name}</button>))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {!previewCards.length ? (
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="例如：Apple, Sky, Happiness" className="w-full h-64 bg-white border border-moe-200 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-moe-200 resize-none text-lg shadow-sm" />
        ) : (
          <div className="space-y-4">
            {previewCards.map((card, idx) => (
              <div key={idx} className="bg-moe-50 p-4 rounded-2xl border border-white shadow-sm">
                <div className="flex justify-between"><div className="font-bold text-moe-primary text-lg">{card.front}</div><div className="text-gray-400 font-mono text-sm">[{card.phonetic}]</div></div>
                <div className="text-gray-600 mt-1">{card.back}</div>
                <div className="text-xs text-gray-400 mt-2" dangerouslySetInnerHTML={{ __html: cleanHTML(card.example) }} />
                <div className="text-xs text-gray-400">{card.exampleTranslation}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 border-t border-gray-100">
        {!previewCards.length ? (
          <button onClick={handleAIProcess} disabled={isLoading || !inputText} className="w-full bg-moe-primary text-white font-bold py-4 rounded-3xl disabled:opacity-50 transition-all active:scale-95">{isLoading ? "思考中..." : "生成闪卡"}</button>
        ) : (
           <div className="flex gap-4"><button onClick={() => setPreviewCards([])} className="flex-1 bg-gray-100 font-bold py-4 rounded-3xl">重置</button><button onClick={confirmImport} className="flex-2 w-full bg-moe-text text-white font-bold py-4 rounded-3xl">全部添加</button></div>
        )}
      </div>
    </div>
  );
};

const ReviewScreen: React.FC<{ cards: Card[], onBack: () => void, onReviewResult: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy' | 'delete') => void }> = ({ cards, onBack, onReviewResult }) => {
  const [reviewQueue, setReviewQueue] = useState<Card[]>(cards);
  const [isFlipped, setIsFlipped] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const isFinished = reviewQueue.length === 0;
  const currentCard = reviewQueue[0];
  
  useEffect(() => { 
    if (currentCard && currentCard.frontType === 'text' && !isFinished) { 
      // Disable auto-play on the front specifically for the Thai Alphabet folder
      if (currentCard.folderId === THAI_FOLDER_ID) return;
      
      const timer = setTimeout(() => speakText(currentCard.frontContent), 500); 
      return () => clearTimeout(timer); 
    } 
  }, [currentCard, isFinished]);

  if (cards.length === 0 && reviewQueue.length === 0) return (<div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in"><div className="text-6xl mb-4">✨</div><h2 className="text-xl font-bold text-moe-text">全部完成!</h2><button onClick={onBack} className="px-6 py-3 bg-moe-200 text-white rounded-2xl font-bold mt-4">返回主页</button></div>);
  if (isFinished) return (<div className="flex flex-col items-center justify-center h-full p-6 text-center bg-moe-50 animate-in"><div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl mb-6 shadow-sm border-4 border-moe-200">🎉</div><h2 className="text-2xl font-bold text-moe-text">本次复习完成!</h2><button onClick={onBack} className="w-full max-w-xs py-4 bg-moe-text text-white rounded-3xl font-bold mt-4 shadow-lg active:scale-95">返回主页</button></div>);
  
  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy' | 'delete') => {
    if (rating === 'again' || rating === 'delete') setSwipeDirection('left'); else setSwipeDirection('right');
    setTimeout(() => { onReviewResult(currentCard.id, rating); setReviewQueue(prev => prev.slice(1)); setIsFlipped(false); setSwipeDirection(null); }, 300);
  };

  return (
    <div className="flex flex-col h-full bg-moe-50 relative overflow-hidden">
       <div className="p-4 flex items-center justify-between z-10"><button onClick={onBack} className="p-2 rounded-full bg-white/50"><ArrowLeft size={24} className="text-moe-text" /></button><div className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-sm text-xs text-moe-text font-bold">加油！还有 {reviewQueue.length} 张</div><button onClick={() => handleRate('delete')} className="p-2 rounded-full bg-white text-gray-400"><Trash2 size={20} /></button></div>
      <div className="flex-1 flex items-center justify-center p-6 perspective-1000 z-10">
        <div onClick={() => !swipeDirection && setIsFlipped(!isFlipped)} className={`w-full max-w-sm aspect-[3/4] relative transform-style-3d card-transition ${isFlipped ? 'rotate-y-180' : ''} ${swipeDirection === 'left' ? 'swipe-left' : swipeDirection === 'right' ? 'swipe-right' : ''}`}>
          <div className="absolute inset-0 bg-white rounded-4xl shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden border-4 border-white">
            <span className="absolute top-8 left-8 text-[10px] font-bold text-moe-200 uppercase bg-moe-50 px-2 py-1 rounded">Question</span>
            {currentCard.frontType === 'text' ? (<><div className="text-5xl md:text-6xl text-center font-bold text-moe-text mb-4 break-words">{currentCard.frontContent}</div><button onClick={(e) => { e.stopPropagation(); speakText(currentCard.frontContent); }} className="p-3 bg-moe-50 text-moe-primary rounded-full"><Volume2 size={24} /></button></>) : (<img src={currentCard.frontContent} className="max-w-full max-h-full object-contain rounded-2xl" />)}
          </div>
          <div className="absolute inset-0 bg-white rounded-4xl shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 border-[6px] border-moe-100">
             <span className="absolute top-8 left-8 text-[10px] font-bold text-moe-300 uppercase bg-moe-50 px-2 py-1 rounded">Answer</span>
             {currentCard.backType === 'text' ? (
                 <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar">
                    {currentCard.phonetic && (<div className="text-lg text-gray-400 font-mono mb-4 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">[{currentCard.phonetic}]</div>)}
                    <div className="text-xl text-center font-medium text-moe-text whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: cleanHTML(currentCard.backContent) }} />
                 </div>
             ) : (<img src={currentCard.backContent} className="max-w-full max-h-full object-contain rounded-2xl" />)}
          </div>
        </div>
      </div>
      <div className={`p-6 pb-10 grid grid-cols-4 gap-3 max-w-sm mx-auto transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={() => handleRate('again')} className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-red-100"><span className="text-xs font-bold text-red-400">不认识</span></button>
          <button onClick={() => handleRate('hard')} className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-orange-100"><span className="text-xs font-bold text-orange-400">困难</span></button>
          <button onClick={() => handleRate('good')} className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-blue-100"><span className="text-xs font-bold text-blue-400">良好</span></button>
          <button onClick={() => handleRate('easy')} className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-green-100"><span className="text-xs font-bold text-green-400">简单</span></button>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<string>(ViewState.WELCOME);
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([{ id: 'default', name: '默认文件夹', createdAt: Date.now() }]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('default');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('moe_settings');
    const savedCards = localStorage.getItem('moe_cards');
    const savedFolders = localStorage.getItem('moe_folders');
    
    let initialFolders = savedFolders ? JSON.parse(savedFolders) : [{ id: 'default', name: '默认文件夹', createdAt: Date.now() }];
    let initialCards = savedCards ? JSON.parse(savedCards) : [];

    // Seed Thai Alphabet and Basic Thai 1 if missing
    const { cards: seededCards, folders: seededFolders } = seedInitialData(initialCards, initialFolders);
    
    setFolders(seededFolders);
    setCards(seededCards);

    if (savedSettings) { try { setSettings(JSON.parse(savedSettings)); setView(ViewState.HOME); } catch (e) { localStorage.removeItem('moe_settings'); } }
  }, []);

  useEffect(() => { localStorage.setItem('moe_cards', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('moe_folders', JSON.stringify(folders)); }, [folders]);

  const handleWelcomeComplete = (newSettings: Settings) => { setSettings(newSettings); localStorage.setItem('moe_settings', JSON.stringify(newSettings)); setView(ViewState.HOME); };
  const handleUpdateSettings = (newSettings: Settings) => { setSettings(newSettings); localStorage.setItem('moe_settings', JSON.stringify(newSettings)); };
  const handleCreateFolder = (name: string) => { const newFolder = { id: Date.now().toString(), name, createdAt: Date.now() }; setFolders([...folders, newFolder]); setCurrentFolderId(newFolder.id); };
  const addCard = (cardData: any) => { setCards(prev => [{ ...cardData, id: Date.now().toString(), createdAt: Date.now(), nextReviewTime: 0, interval: 0, repetition: 0, easeFactor: 2.5 }, ...prev]); };
  const addBatchCards = (batch: any[]) => { const newCards = batch.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now(), nextReviewTime: 0, interval: 0, repetition: 0, easeFactor: 2.5 })); setCards(prev => [...newCards, ...prev]); };
  const handleReviewResult = (cardId: string, rating: string) => {
      if (rating === 'delete') { setCards(prev => prev.filter(c => c.id !== cardId)); return; }
      setCards(prev => prev.map(card => {
          if (card.id !== cardId) return card;
          let newInterval = 0; let newRepetition = card.repetition; let newEaseFactor = card.easeFactor;
          if (rating === 'again') { newInterval = REVIEW_INTERVALS.AGAIN; newRepetition = 0; }
          else if (card.repetition === 0) { if (rating === 'hard') newInterval = REVIEW_INTERVALS.HARD; else if (rating === 'good') newInterval = REVIEW_INTERVALS.GOOD; else newInterval = REVIEW_INTERVALS.EASY; newRepetition = 1; }
          else { if (rating === 'hard') { newInterval = card.interval * 1.2; newEaseFactor = Math.max(1.3, newEaseFactor - 0.15); } else if (rating === 'good') { newInterval = card.interval * 2.5; } else { newInterval = card.interval * 1.3 * newEaseFactor; newEaseFactor += 0.15; } newRepetition += 1; }
          return { ...card, interval: newInterval, repetition: newRepetition, easeFactor: newEaseFactor, nextReviewTime: Date.now() + (newInterval * 60 * 1000) };
      }));
  };

  if (!settings || view === ViewState.WELCOME) return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  const folderCards = cards.filter(c => c.folderId === currentFolderId);
  const dueCards = folderCards.filter(c => c.nextReviewTime <= Date.now()).sort((a,b) => a.nextReviewTime - b.nextReviewTime);
  const currentFolder = folders.find(f => f.id === currentFolderId);

  return (
    <div className="w-full h-[100dvh] bg-moe-50 overflow-hidden relative font-sans text-moe-text">
      {view === ViewState.HOME && (<HomeScreen user={settings.userName} totalCards={folderCards.length} dueCount={dueCards.length} folders={folders} currentFolderId={currentFolderId} onSwitchFolder={setCurrentFolderId} onCreateFolder={handleCreateFolder} onNavigate={setView} onOpenSettings={() => setShowSettings(true)} />)}
      {(view === ViewState.CREATE || view === ViewState.CREATE_DRAW) && (<CreateCardScreen initialMode={view === ViewState.CREATE_DRAW ? 'image' : 'text'} folders={folders} initialFolderId={currentFolderId} onBack={() => setView(ViewState.HOME)} onSave={addCard} />)}
      {view === ViewState.IMPORT && (<ImportScreen folders={folders} initialFolderId={currentFolderId} onBack={() => setView(ViewState.HOME)} onSaveBatch={addBatchCards} />)}
      {view === ViewState.REVIEW && (<ReviewScreen cards={dueCards} onBack={() => setView(ViewState.HOME)} onReviewResult={handleReviewResult as any} />)}
      {view === ViewState.FOLDER_DETAIL && currentFolder && (<FolderDetailScreen folder={currentFolder} allFolders={folders} cards={folderCards} onBack={() => setView(ViewState.HOME)} onDeleteCard={id => setCards(prev => prev.filter(c => c.id !== id))} onMoveCard={(id, fid) => setCards(prev => prev.map(c => c.id === id ? { ...c, folderId: fid } : c))} />)}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto" onClick={() => setShowSettings(false)} />
           <div className="bg-white w-full h-[90vh] md:h-auto md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col animate-in"><SettingsScreen settings={settings} stats={{ total: cards.length, learned: cards.filter(c => c.repetition > 0).length, due: cards.filter(c => c.nextReviewTime <= Date.now()).length }} onUpdateSettings={handleUpdateSettings} onBack={() => setShowSettings(false)} /></div>
        </div>
      )}
    </div>
  );
};

export default App;
