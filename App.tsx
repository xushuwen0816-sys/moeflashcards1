

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
const BASIC_THAI_2_FOLDER_ID = 'basic_thai_2_folder';

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

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- Seed Data Utility ---
const seedInitialData = (existingCards: Card[], existingFolders: Folder[]): { cards: Card[], folders: Folder[] } => {
    let newCards = [...existingCards];
    let newFolders = [...existingFolders];

    // 1. Seed Thai Alphabet Folder
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
            { char: 'ฏ', type: '中辅音', name: 'dtaw', word: 'ปฏัก', wordPhonetic: 'pă-dtak', mean: '刺棒' },
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

    // 2. Seed Basic Thai 1 Folder
    if (!newFolders.some(f => f.id === BASIC_THAI_1_FOLDER_ID)) {
        const basicThaiFolder: Folder = { id: BASIC_THAI_1_FOLDER_ID, name: '基础泰语1', createdAt: Date.now() };
        newFolders.push(basicThaiFolder);

        const basicThaiData = [
          { front: "กระเป๋า", back: "拎包，袋子", phonetic: "/kra'păw/", example: "ฉันชอบ<b>กระเป๋า</b>ใบนี้ มันน่ารักมากเลย!", exampleTranslation: "我喜欢这个包，它太可爱了！" },
          { front: "กลับ", back: "回", phonetic: "/klàp/", example: "เขากำลังจะ<b>กลับ</b>บ้าน", exampleTranslation: "他正要回家。" },
          { front: "กวางโจว", back: "广州", phonetic: "/kwaaŋ coow/", example: "ฉันอยากไปเที่ยว<b>กวางโจว</b>", exampleTranslation: "我想去广州旅游。" },
          { front: "กวางตุ้ง", back: "广东", phonetic: "/kwaaŋ tûŋ/", example: "อาหาร<b>กวางตุ้ง</b>อร่อยมาก", exampleTranslation: "粤菜（广东菜）非常好吃。" },
          { front: "กวางสี", phonetic: "/kwaaŋ sǐi/", back: "广西", example: "มณฑล<b>กวางสี</b>มีธรรมชาติที่สวยงาม", exampleTranslation: "广西壮族自治区有美丽的自然风光。" },
          { front: "กะ", phonetic: "/kà/", back: "估计，和", example: "พรุ่งนี้<b>กะ</b>ว่าจะไปหา朋友", exampleTranslation: "打算明天去找朋友。" },
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
          { front: "เก้า", phonetic: "/kâaw/", back: "九", example: "ฉันมี猫<b>เก้า</b>只", exampleTranslation: "我有九只猫。" },
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
          { front: "ของ", phonetic: "/khɔ̌อŋ/", back: "的", example: "นี่คือกระเป๋า<b>ของ</b>ฉัน", exampleTranslation: "这是我的包。" },
          { front: "ขา", phonetic: "/khǎa/", back: "腿", example: "เขาเจ็บ<b>ขา</b>เพราะตกจากที่สูง", exampleTranslation: "他因为从高处摔下来而腿疼。" },
          { front: "ข้าว", phonetic: "/khâaw/", back: "饭", example: "กิน<b>ข้าว</b>或还没?", exampleTranslation: "吃饭了吗？" },
          { front: "ขู่", phonetic: "/khùu/", back: "威胁", example: "อย่ามา<b>ขู่</b>ฉันนะ!", exampleTranslation: "别来威胁我！" },
          { front: "เขา", phonetic: "/khǎw/", back: "他，她", example: "<b>เขา</b>是我的好朋友", exampleTranslation: "他/她是我的好朋友。" },
          { front: "เข้า", phonetic: "/khâw/", back: "进，进入", example: "กรุณา<b>เข้า</b>มาข้าง内", exampleTranslation: "请进到里面来。" },
          { front: "เข้าใจ", phonetic: "/khâw cay/", back: "明白", example: "你<b>เข้าใจ</b>我说的话吗?", exampleTranslation: "你明白我说的吗？" },
          { front: "เขียน", phonetic: "/khǐan/", back: "写", example: "他喜欢<b>เขียน</b>信", exampleTranslation: "他喜欢写信。" },
          { front: "ไข่ไก่", phonetic: "/khày kày/", back: "鸡蛋", example: "ฉันอยากซื้อ<b>ไข่ไก่</b>หนึ่งแพ็ค", exampleTranslation: "我想买一盒鸡蛋。" },
          { front: "คน", phonetic: "/khon/", back: "人，个", example: "有<b>คน</b>等在外面", exampleTranslation: "有人在外面等。" },
          { front: "ครอบครัว", phonetic: "/khrɔ̂ɔp khrua/", back: "家庭", example: "我爱我的<b>ครอบครัว</b>", exampleTranslation: "我爱我的家庭。" },
          { front: "ครู", phonetic: "/khruu/", back: "老师", example: "<b>ครู</b>泰语人很好", exampleTranslation: "泰语老师人很好。" },
          { front: "ความระลึกถึง", phonetic: "/khwaam ra lʉ́k thʉ̌ŋ/", back: "思念", example: "送去<b>ความระลึกถึง</b>", exampleTranslation: "送去思念。" },
          { front: "คำ", phonetic: "/kham/", back: "字，词", example: "这个<b>คำ</b>怎么念?", exampleTranslation: "这个词怎么发音？" },
          { front: "คิดว่า", phonetic: "/khít wâa/", back: "估计，想", example: "ฉัน<b>คิดว่า</b>明天会下雨", exampleTranslation: "我想明天会下雨。" },
          { front: "คุณ", phonetic: "/khun/", back: "你", example: "<b>คุณ</b>好吗?", exampleTranslation: "你好吗？" },
          { front: "คู่", phonetic: "/khûu/", back: "对，双", example: "这<b>คู่</b>鞋子很漂亮", exampleTranslation: "这双鞋子很漂亮。" },
          { front: "ใคร", phonetic: "/khray/", back: "谁", example: "<b>ใคร</b>在敲门?", exampleTranslation: "谁在敲门？" },
          { front: "งั้นๆ", phonetic: "/ŋán ŋán/", back: "就那样", example: "味道也<b>งั้นๆ</b>", exampleTranslation: "味道也就那样吧。" },
          { front: "งา", phonetic: "/ŋaa/", back: "芝麻", example: "喜欢吃带<b>งา</b>的点心", exampleTranslation: "喜欢吃带芝麻的点心。" },
          { front: "เงาะ", phonetic: "/ŋɔ́/", back: "红毛丹", example: "<b>เงาะ</b>很好吃", exampleTranslation: "红毛丹很好吃。" },
          { front: "เงิน", phonetic: "/ŋɯn/", back: "钱", example: "攒<b>เงิน</b>买车", exampleTranslation: "攒钱买车。" },
          { front: "จด", phonetic: "/còt/", back: "记录", example: "请<b>จด</b>下号码", exampleTranslation: "请记下号码。" },
          { front: "จดหมาย", phonetic: "/còt mǎay/", back: "信件", example: "收到<b>จดหมาย</b>", exampleTranslation: "收到信件。" },
          { front: "จะ", phonetic: "/cà/", back: "将要", example: "明天我<b>จะ</b>去找你", exampleTranslation: "明天我要去找你。" },
          { front: "จาก", phonetic: "/càak/", back: "来自", example: "他<b>จาก</b>中国", exampleTranslation: "他来自中国。" },
          { front: "จำ", phonetic: "/cam/", back: "记", example: "ฉัน<b>จำ</b>不住你的名字", exampleTranslation: "我不记得你的名字。" },
          { front: "จีน", phonetic: "/ciin/", back: "中国", example: "我学<b>จีน</b>语", exampleTranslation: "我学汉语。" },
          { front: "จึง", phonetic: "/cʉŋ/", back: "所以，因此", example: "他病了<b>จึง</b>没来", exampleTranslation: "他病了所以没来。" },
          { front: "ใจ", phonetic: "/cay/", back: "心", example: "很有<b>ใจ</b>", exampleTranslation: "很有爱心。" },
          { front: "ช่วย", phonetic: "/chûay/", back: "帮助，帮忙", example: "<b>ช่วย</b>关门", exampleTranslation: "帮忙关门。" },
          { front: "ชอบ", phonetic: "/chɔ̂ɔp/", back: "喜欢", example: "我<b>ชอบ</b>吃榴莲", exampleTranslation: "我喜欢吃榴莲。" },
          { front: "ชั่ว", phonetic: "/chûa/", back: "恶，坏", example: "他是<b>ชั่ว</b>人", exampleTranslation: "他是坏人。" },
          { front: "ช้า", phonetic: "/cháa/", back: "迟，慢", example: "火车很<b>ช้า</b>", exampleTranslation: "火车很慢。" },
          { front: "ชื่อ", phonetic: "/chʉ̂ʉ/", back: "名字，名叫", example: "你<b>ชื่อ</b>什么?", exampleTranslation: "你叫什么名字？" },
          { front: "ชื่อเล่น", phonetic: "/chʉ̂ʉ lên/", back: "小名", example: "我的<b>ชื่อเล่น</b>是Bow", exampleTranslation: "我的小名叫Bow。" },
          { front: "เช่นเดียวกัน", phonetic: "/chêen diaw kan/", back: "同样", example: "很高兴认识你<b>เช่นเดียวกัน</b>", exampleTranslation: "我也很高兴认识你。" },
          { front: "เชียงใหม่", phonetic: "/chiaŋ mǎy/", back: "清迈", example: "去<b>เชียงใหม่</b>玩", exampleTranslation: "去清迈旅游。" },
          { front: "เชื่อ", phonetic: "/chʉ̂a/", back: "相信", example: "不<b>เชื่อ</b>你", exampleTranslation: "不相信你。" },
          { front: "เชื่อใจ", phonetic: "/chʉ̂a cay/", back: "相信，信任", example: "可以<b>เชื่อใจ</b>我", exampleTranslation: "可以信任我。" },
          { front: "ใช่", phonetic: "/chây/", back: "是的", example: "<b>ใช่</b>了", exampleTranslation: "是的。" },
          { front: "ใช้", phonetic: "/cháy/", back: "使用，用", example: "<b>ใช้</b>电脑", exampleTranslation: "用电脑。" },
          { front: "ซัก", phonetic: "/sák/", back: "洗（衣服等）", example: "<b>ซัก</b>衣服", exampleTranslation: "洗衣服。" },
          { front: "ซาลาเปา", phonetic: "/saa laa paw/", back: "包子", example: "吃<b>ซาลาเปา</b>", exampleTranslation: "吃包子。" },
          { front: "ซื้อ", phonetic: "/sʉ́ʉ/", back: "买", example: "去<b>ซื้อ</b>东西", exampleTranslation: "去买东西。" },
          { front: "เซี่ยงไฮ้", phonetic: "/sîaŋ hâay/", back: "上海", example: "去<b>เซี่ยงไฮ้</b>", exampleTranslation: "去上海。" },
          { front: "ญี่ปุ่น", phonetic: "/yîi pùn/", back: "日本", example: "去<b>ญี่ปุ่น</b>", exampleTranslation: "去日本。" },
          { front: "ด้วย", phonetic: "/dûay/", back: "也，以", example: "我也去<b>ด้วย</b>", exampleTranslation: "我也去。" },
          { front: "ดำ", phonetic: "/dam/", back: "黑", example: "颜色很<b>ดำ</b>", exampleTranslation: "颜色很黑。" },
          { front: "ดิฉัน / ฉัน", phonetic: "/dì chǎn / chǎn/", back: "我", example: "<b>ฉัน</b>爱你", exampleTranslation: "我爱你。" },
          { front: "ดินสอ", phonetic: "/din sɔ̌ɔ/", back: "铅笔", example: "用<b>ดินสอ</b>写", exampleTranslation: "用铅笔写。" },
          { front: "ดี", phonetic: "/dii/", back: "好", example: "身体<b>ดี</b>", exampleTranslation: "身体好。" },
          { front: "ดีใจ/ยินดี", phonetic: "/dii cay / yin dii/", back: "高兴", example: "很<b>ดีใจ</b>", exampleTranslation: "很高兴。" },
          { front: "ดุ", phonetic: "/dù/", back: "凶", example: "狗很<b>ดุ</b>", exampleTranslation: "狗很凶。" },
          { front: "ดู", phonetic: "/duu/", back: "看", example: "<b>ดู</b>电视", exampleTranslation: "看电视。" },
          { front: "เดา", phonetic: "/daw/", back: "猜测", example: "试着<b>เดา</b>下", exampleTranslation: "试着猜一下。" },
          { front: "เดิน", phonetic: "/dɤɤn/", back: "走", example: "慢慢<b>เดิน</b>", exampleTranslation: "慢慢走。" },
          { front: "เดินทาง", phonetic: "/dɤɤn thaaŋ/", back: "出行，旅游", example: "祝<b>เดินทาง</b>平安", exampleTranslation: "祝旅途平安。" },
          { front: "เดี๋ยวนี้", phonetic: "/diaw níi/", back: "一会儿，立刻", example: "立刻去<b>เดี๋ยวนี้</b>", exampleTranslation: "立刻现在去。" },
          { front: "เดือนหน้า", phonetic: "/dɯan nâa/", back: "下个月", example: "<b>เดือนหน้า</b>见", exampleTranslation: "下个月见。" },
          { front: "โดยปลอดภัย", phonetic: "/dooy plɔ̀อt phay/", back: "平安的", example: "到达<b>โดยปลอดภัย</b>", exampleTranslation: "平安到达。" },
          { front: "ได้", phonetic: "/dâay/", back: "得到，可以", example: "你说泰语<b>ได้</b>吗?", exampleTranslation: "你会说泰语吗？" },
          { front: "ได้ยิน", phonetic: "/dâay yin/", back: "听见", example: "我<b>ได้ยิน</b>了", exampleTranslation: "我听见了。" },
          { front: "ตลาด", phonetic: "/ta làat/", back: "市场", example: "去<b>ตลาด</b>买菜", exampleTranslation: "去市场买菜。" },
          { front: "ต้อง", phonetic: "/tɔ̂ŋ/", back: "必须", example: "你<b>ต้อง</b>去", exampleTranslation: "你必须去。" },
          { front: "ตะปู", phonetic: "/tà puu/", back: "钉子", example: "用<b>ตะปู</b>", exampleTranslation: "用钉子。" },
          { front: "ตั้งแต่", phonetic: "/tâŋ tɛ̀ɛ/", back: "自从", example: "<b>ตั้งแต่</b>去年", exampleTranslation: "从去年开始。" },
          { front: "ตั้งใจ", phonetic: "/tâŋ cay/", back: "决心，专心", example: "<b>ตั้งใจ</b>学习", exampleTranslation: "用心学习。" },
          { front: "ตัว", phonetic: "/tua/", back: "只，个，身体", example: "一<b>ตัว</b>猫", exampleTranslation: "一只猫。" },
          { front: "ตั๋ว", phonetic: "/tǔa/", back: "票", example: "买<b>ตั๋ว</b>", exampleTranslation: "买票。" },
          { front: "ตา", phonetic: "/taa/", back: "眼睛/外祖父", example: "看他的<b>ตา</b>", exampleTranslation: "看他的眼睛。" },
          { front: "ต่าง", phonetic: "/tàaŋ/", back: "都，不同，外国", example: "不<b>ต่าง</b>", exampleTranslation: "没有不同。" },
          { front: "ต่างๆ", phonetic: "/tàaŋ tàaŋ/", back: "各个，各种", example: "各种<b>ต่างๆ</b>", exampleTranslation: "各种各样。" },
          { front: "ตำ", phonetic: "/tam/", back: "捣", example: "<b>ตำ</b>木瓜", exampleTranslation: "捣木瓜。" },
          { front: "ตี", phonetic: "/tii/", back: "打", example: "别<b>ตี</b>他", exampleTranslation: "别打他。" },
          { front: "เตะ", phonetic: "/tè/", back: "踢", example: "<b>เตะ</b>足球", exampleTranslation: "踢足球。" },
          { front: "เตา", phonetic: "/taw/", back: "炉灶", example: "火<b>เตา</b>", exampleTranslation: "炉火。" },
          { front: "แต่", phonetic: "/tɛ̀ɛ/", back: "但", example: "很美<b>แต่</b>...", exampleTranslation: "很美但是..." },
          { front: "แตงกวา", phonetic: "/tɛɛŋ kwaa/", back: "黄瓜", example: "吃<b>แตงกวา</b>", exampleTranslation: "吃黄瓜。" },
          { front: "โต๊ะ", phonetic: "/tó/", back: "桌子", example: "书在<b>โต๊ะ</b>上", exampleTranslation: "书在桌子上。" },
          { front: "ถ้า", phonetic: "/thâa/", back: "如果", example: "<b>ถ้า</b>明天...", exampleTranslation: "如果明天..." },
          { front: "ถู", phonetic: "/thǔu/", back: "擦，拖", example: "<b>ถู</b>地", exampleTranslation: "拖地。" },
          { front: "ถึง", phonetic: "/thʉ̌ŋ/", back: "到", example: "<b>ถึง</b>家了", exampleTranslation: "到家了。" },
          { front: "ถือ", phonetic: "/thʉ̌ʉ/", back: "提，拿", example: "帮我<b>ถือ</b>下", exampleTranslation: "帮我拿一下。" },
          { front: "ทบทวน", phonetic: "/thóp thuan/", back: "复习", example: "记得<b>ทบทวน</b>", exampleTranslation: "记得复习。" },
          { front: "ท่าน", phonetic: "/thâan/", back: "您", example: "<b>ท่าน</b>想要什么?", exampleTranslation: "您想要什么？" },
          { front: "ทำ", phonetic: "/tham/", back: "做", example: "你<b>ทำ</b>什么?", exampleTranslation: "你做什么？" },
          { front: "ทำงาน", phonetic: "/tham ŋaan/", back: "工作", example: "去<b>ทำงาน</b>", exampleTranslation: "去工作。" },
          { front: "ทำไม", phonetic: "/tham may/", back: "为什么", example: "<b>ทำไม</b>不吃?", exampleTranslation: "为什么不吃？" },
          { front: "ทีวี", phonetic: "/thii wii/", back: "电视", example: "看<b>ทีวี</b>", exampleTranslation: "看电视。" },
          { front: "ที่", phonetic: "/thîi/", back: "在/地方/序号", example: "<b>ที่</b>那里", exampleTranslation: "在那个地方。" },
          { front: "ที่นี่", phonetic: "/thîi nîi/", back: "这里", example: "欢迎来<b>ที่นี่</b>", exampleTranslation: "欢迎来到这里。" },
          { front: "ทุก", phonetic: "/thúk/", back: "每", example: "<b>ทุก</b>天", exampleTranslation: "每天。" },
          { front: "เทอม", phonetic: "/thɤɤm/", back: "学期", example: "这个<b>เทอม</b>", exampleTranslation: "这个学期。" },
          { front: "เท่าไร", phonetic: "/thâw ray/", back: "多少", example: "价格<b>เท่าไร</b>?", exampleTranslation: "价格多少？" },
          { front: "เที่ยว", phonetic: "/thîaw/", back: "旅行", example: "去<b>เที่ยว</b>玩", exampleTranslation: "去旅游。" },
          { front: "ธุระ", phonetic: "/thú rá/", back: "事情，杂事", example: "我有<b>ธุระ</b>", exampleTranslation: "我有事。" },
          { front: "เธอ", phonetic: "/thɤɤ/", back: "她/你", example: "我爱<b>เธอ</b>", exampleTranslation: "我爱你/她。" },
          { front: "น้องชาย", phonetic: "/nɔ́อŋ chaay/", back: "弟弟", example: "我的<b>น้องชาย</b>", exampleTranslation: "我的弟弟。" },
          { front: "น้องสาว", phonetic: "/nɔ́อŋ sǎaw/", back: "妹妹", example: "我的<b>น้องสาว</b>", exampleTranslation: "我的妹妹。" },
          { front: "นักศึกษา", phonetic: "/nák sʉ̀k sǎa/", back: "大学生", example: "他是<b>นักศึกษา</b>", exampleTranslation: "他是大学生。" },
          { front: "นั่น/นั้น", phonetic: "/nân / nán/", back: "那", example: "<b>นั่น</b>是什么?", exampleTranslation: "那是什么？" },
          { front: "นาฬิกา", phonetic: "/naa lí kaa/", back: "钟表", example: "看<b>นาฬิกา</b>", exampleTranslation: "看钟表。" },
          { front: "น้า", phonetic: "/náa/", back: "弟/姨", example: "去见<b>น้า</b>", exampleTranslation: "去见姨妈。" },
          { front: "นาน", phonetic: "/naan/", back: "久", example: "等很<b>นาน</b>", exampleTranslation: "等很久。" },
          { front: "นามสกุล", phonetic: "/naam sà kun/", back: "姓", example: "你<b>นามสกุล</b>什么?", exampleTranslation: "你姓什么？" },
          { front: "น้ำ", phonetic: "/nám/", back: "水", example: "喝<b>น้ำ</b>", exampleTranslation: "喝水。" },
          { front: "น้ำชา", phonetic: "/nám chaa/", back: "茶", example: "喝<b>น้ำชา</b>", exampleTranslation: "喝茶。" },
          { front: "น้ำปลา", phonetic: "/nám plaa/", back: "鱼露", example: "放点<b>น้ำปลา</b>", exampleTranslation: "放点鱼露。" },
          { front: "นี่/นี้", phonetic: "/nîi / níi/", back: "这", example: "<b>นี่</b>是书", exampleTranslation: "这是书。" },
          { front: "เนื้อ", phonetic: "/nɯ́a/", back: "肉/牛肉", example: "吃<b>เนื้อ</b>", exampleTranslation: "吃肉。" },
          { front: "แน่ใจ", phonetic: "/nɛ̂ɛ cay/", back: "肯定，确定", example: "我<b>แน่ใจ</b>", exampleTranslation: "我肯定。" },
          { front: "แน่นอน", phonetic: "/nɛ̂ɛ nɔɔn/", back: "当然", example: "<b>แน่นอน</b>!", exampleTranslation: "当然！" },
          { front: "โน่น/โน้น", phonetic: "/nôon / nóon/", back: "那（更远）", example: "在那<b>โน้น</b>", exampleTranslation: "在那边。" },
          { front: "ใน", phonetic: "/nay/", back: "在...里面", example: "放<b>ใน</b>包里", exampleTranslation: "放在包里。" },
          { front: "บัว", phonetic: "/bua/", back: "荷花", example: "美丽的<b>บัว</b>", exampleTranslation: "美丽的荷花。" },
          { front: "บ้าง/มั่ง", phonetic: "/bâaŋ / mâŋ/", back: "一些", example: "还有谁<b>บ้าง</b>?", exampleTranslation: "还有谁？" },
          { front: "บางคน", phonetic: "/baaŋ khon/", back: "有些人", example: "<b>บางคน</b>不知道", exampleTranslation: "有些人不知道。" },
          { front: "บาท", phonetic: "/bàat/", back: "泰铢", example: "一<b>บาท</b>", exampleTranslation: "一泰铢。" },
          { front: "บ้าน", phonetic: "/bâan/", back: "家", example: "回<b>บ้าน</b>", exampleTranslation: "回家。" },
          { front: "เบา", phonetic: "/baw/", back: "轻", example: "声音很<b>เบา</b>", exampleTranslation: "声音很轻。" },
          { front: "เบื่อ", phonetic: "/bɯ̀a/", back: "厌烦", example: "我很<b>เบื่อ</b>", exampleTranslation: "我很厌烦。" },
          { front: "ใบชา", phonetic: "/bay chaa/", back: "茶叶", example: "泡点<b>ใบชา</b>", exampleTranslation: "泡点茶叶。" },
          { front: "ใบไม้", phonetic: "/bay máay/", back: "树叶", example: "绿色的<b>ใบไม้</b>", exampleTranslation: "绿色的树叶。" },
          { front: "ประเทศ", phonetic: "/pra thêet/", back: "国家", example: "什么<b>ประเทศ</b>?", exampleTranslation: "什么国家？" },
          { front: "ปักกิ่ง", phonetic: "/pàk kìŋ/", back: "北京", example: "在<b>ปักกิ่ง</b>", exampleTranslation: "在北京。" },
          { front: "ปา", phonetic: "/paa/", back: "投，掷", example: "别<b>ปา</b>东西", exampleTranslation: "别扔东西。" },
          { front: "ป่า", phonetic: "/pàa/", back: "树林", example: "在<b>ป่า</b>里", exampleTranslation: "在森林里。" },
          { front: "ป้า", phonetic: "/pâa/", back: "伯母", example: "去见<b>ป้า</b>", exampleTranslation: "去见伯母。" },
          { front: "ปากกา", phonetic: "/pàak kaa/", back: "钢笔", example: "用<b>ปากกา</b>写", exampleTranslation: "用钢笔写。" },
          { front: "ปี", phonetic: "/pii/", back: "年", example: "这一<b>ปี</b>", exampleTranslation: "这一年。" },
          { front: "ปีหน้า", phonetic: "/pii nâa/", back: "明年", example: "<b>ปีหน้า</b>见", exampleTranslation: "明年见。" },
          { front: "ปี่", phonetic: "/pìi/", back: "笛子", example: "吹<b>ปี่</b>", exampleTranslation: "吹笛子。" },
          { front: "ปู", phonetic: "/puu/", back: "螃蟹", example: "吃<b>ปู</b>", exampleTranslation: "吃螃蟹。" },
          { front: "ปู่", phonetic: "/pùu/", back: "祖父", example: "我<b>ปู่</b>", exampleTranslation: "我爷爷。" },
          { front: "เป็น", phonetic: "/pen/", back: "是，会", example: "他<b>เป็น</b>泰国人", exampleTranslation: "他是泰国人。" },
          { front: "เป็นห่วง", phonetic: "/pen hùaŋ/", back: "担心", example: "我很<b>เป็นห่วง</b>你", exampleTranslation: "我很担心你。" },
          { front: "เป่า", phonetic: "/pàw/", back: "吹", example: "<b>เป่า</b>火", exampleTranslation: "吹火。" },
          { front: "เปิด", phonetic: "/pɤ̀ɤt/", back: "开", example: "<b>เปิด</b>门", exampleTranslation: "开门。" },
          { front: "ไป", phonetic: "/pay/", back: "去", example: "<b>ไป</b>哪里?", exampleTranslation: "去哪里？" },
          { front: "ผม", phonetic: "/phǒm/", back: "头发/我(男用)", example: "我的<b>ผม</b>", exampleTranslation: "我的头发。" },
          { front: "ผลไม้", phonetic: "/phǒn lá máay/", back: "水果", example: "吃<b>ผลไม้</b>", exampleTranslation: "吃水果。" },
          { front: "ผัด", phonetic: "/phàt/", back: "炒", example: "<b>ผัด</b>菜", exampleTranslation: "炒菜。" },
          { front: "ผัวเมีย", phonetic: "/phǔa mia/", back: "夫妻", example: "他们是<b>ผัวเมีย</b>", exampleTranslation: "他们是夫妻。" },
          { front: "ผ้า", phonetic: "/phâa/", back: "布，衣服", example: "洗<b>ผ้า</b>", exampleTranslation: "洗衣服。" },
          { front: "ผู้ชาย", phonetic: "/phûu chaay/", back: "男性", example: "他是<b>ผู้ชาย</b>", exampleTranslation: "他是男性。" },
          { front: "ผู้หญิง", phonetic: "/phûu yǐŋ/", back: "女性", example: "她是<b>ผู้หญิง</b>", exampleTranslation: "她是女性。" },
          { front: "แผนที่", phonetic: "/phɛ̌ɛn thîi/", back: "地图", example: "看<b>แผนที่</b>", exampleTranslation: "看地图。" },
          { front: "ไผ่", phonetic: "/phày/", back: "竹子", example: "绿色的<b>ไผ่</b>", exampleTranslation: "绿色的竹子。" },
          { front: "ฝรั่ง", phonetic: "/fà ràŋ/", back: "西方人/番石榴", example: "吃<b>ฝรั่ง</b>", exampleTranslation: "吃番石榴。" },
          { front: "ฝา", phonetic: "/fǎa/", back: "盖子", example: "盖上<b>ฝา</b>", exampleTranslation: "盖上盖子。" },
          { front: "ฝาก", phonetic: "/fàak/", back: "托付，存放", example: "把东西<b>ฝาก</b>在这里", exampleTranslation: "把东西存放在这。" },
          { front: "พยายาม", phonetic: "/phá yaa yaam/", back: "努力", example: "请<b>พยายาม</b>", exampleTranslation: "请努力。" },
          { front: "พรุ่งนี้", phonetic: "/phrûŋ níi/", back: "明天", example: "<b>พรุ่งนี้</b>见", exampleTranslation: "明天见。" },
          { front: "พ่อ", phonetic: "/phɔ̂อ/", back: "爸爸", example: "我的<b>พ่อ</b>", exampleTranslation: "我的爸爸。" },
          { front: "พี่", phonetic: "/phîi/", back: "哥哥/姐姐", example: "我的<b>พี่</b>", exampleTranslation: "我的哥哥/姐姐。" },
          { front: "เพื่อ", phonetic: "/phʉ̂a/", back: "为了", example: "<b>เพื่อ</b>你", exampleTranslation: "为了你。" },
          { front: "เพื่อน", phonetic: "/phʉ̂an/", back: "朋友", example: "他是<b>เพื่อน</b>", exampleTranslation: "他是朋友。" },
          { front: "แพะ", phonetic: "/phɛ́/", back: "山羊", example: "一只<b>แพะ</b>", exampleTranslation: "一只山羊。" },
          { front: "ฟัง", phonetic: "/faŋ/", back: "听", example: "<b>ฟัง</b>音乐", exampleTranslation: "听音乐。" },
          { front: "ฟ้า", phonetic: "/fáa/", back: "天空/蓝色", example: "蓝色的<b>ฟ้า</b>", exampleTranslation: "蓝色的天空。" },
          { front: "ไฟฟ้า", phonetic: "/fay fáa/", back: "电", example: "用<b>ไฟฟ้า</b>", exampleTranslation: "用电。" },
          { front: "ภาษา", phonetic: "/phaa sǎa/", back: "语言", example: "什么<b>ภาษา</b>?", exampleTranslation: "什么语言？" },
          { front: "ภาษาไทย", phonetic: "/phaa sǎa thay/", back: "泰语", example: "说<b>ภาษาไทย</b>", exampleTranslation: "说泰语。" },
          { front: "มหาวิทยาลัย", phonetic: "/má hǎa wít tha yaa lay/", back: "大学", example: "在<b>มหาวิทยาลัย</b>", exampleTranslation: "在大学。" },
          { front: "มะเขือ", phonetic: "/má khʉ̌a/", back: "茄子", example: "吃<b>มะเขือ</b>", exampleTranslation: "吃茄子。" },
          { front: "มะเขือเทศ", phonetic: "/má khʉ̌a thêet/", back: "西红柿", example: "红色的<b>มะเขือเทศ</b>", exampleTranslation: "红色的西红柿。" },
          { front: "มะละกอ", phonetic: "/má lá kɔอ/", back: "木瓜", example: "吃<b>มะละกอ</b>", exampleTranslation: "吃木瓜。" },
          { front: "มันฝรั่ง", phonetic: "/man fà ràŋ/", back: "土豆", example: "吃<b>มันฝรั่ง</b>", exampleTranslation: "吃土豆。" },
          { front: "มัว", phonetic: "/mua/", back: "浑浊，模糊", example: "眼睛<b>มัว</b>", exampleTranslation: "眼睛模糊。" },
          { front: "มา", phonetic: "/maa/", back: "来", example: "<b>มา</b>这里", exampleTranslation: "来这里。" },
          { front: "ม้า", phonetic: "/máa/", back: "马", example: "骑<b>ม้า</b>", exampleTranslation: "骑马。" },
          { front: "มาก", phonetic: "/mâak/", back: "很", example: "好<b>มาก</b>", exampleTranslation: "很好。" },
          { front: "มิน่าเล่า", phonetic: "/mí nâa lâw/", back: "怪不得", example: "<b>มิน่าเล่า</b>...", exampleTranslation: "怪不得..." },
          { front: "มี", phonetic: "/mii/", back: "有", example: "我<b>มี</b>钱", exampleTranslation: "我有钱。" },
          { front: "มือ", phonetic: "/mʉʉ/", back: "手", example: "洗<b>มือ</b>", exampleTranslation: "洗手。" },
          { front: "เมื่อ", phonetic: "/mʉ̂a/", back: "当...时候", example: "<b>เมื่อ</b>我...", exampleTranslation: "当我..." },
          { front: "เมื่อเช้า", phonetic: "/mʉ̂a cháaw/", back: "今天早上", example: "<b>เมื่อเช้า</b>我...", exampleTranslation: "今天早上我..." },
          { front: "เมื่อตะกี้", phonetic: "/mʉ̂a tà kîi/", back: "刚才", example: "<b>เมื่อตะกี้</b>发生了...", exampleTranslation: "刚才发生了..." },
          { front: "เมื่อไร", phonetic: "/mʉ̂a ray/", back: "什么时候", example: "你<b>เมื่อไร</b>去?", exampleTranslation: "你什么时候去？" },
          { front: "เมื่อวาน", phonetic: "/mʉ̂a waan/", back: "昨天", example: "<b>เมื่อวาน</b>...", exampleTranslation: "昨天..." },
          { front: "เมือง", phonetic: "/mɯaŋ/", back: "城市，国家", example: "曼谷<b>เมือง</b>", exampleTranslation: "曼谷城。" },
          { front: "เมืองจีน", phonetic: "/mɯaŋ ciin/", back: "中国", example: "去<b>เมืองจีน</b>", exampleTranslation: "去中国。" },
          { front: "เมืองไทย", phonetic: "/mɯaŋ thay/", back: "泰国", example: "在<b>เมืองไทย</b>", exampleTranslation: "在泰国。" },
          { front: "แม่", phonetic: "/mɛ̂ɛ/", back: "妈妈", example: "我的<b>แม่</b>", exampleTranslation: "我的妈妈。" },
          { front: "ไม่", phonetic: "/mây/", back: "不", example: "<b>ไม่</b>好", exampleTranslation: "不好。" },
          { front: "ไม่ใช่", phonetic: "/mây chây/", back: "不是", example: "<b>ไม่ใช่</b>我", exampleTranslation: "不是我。" },
          { front: "ยังไง / อย่างไร", phonetic: "/yaŋ ŋay / yàaŋ ray/", back: "怎样", example: "<b>ยังไง</b>去?", exampleTranslation: "怎么去？" },
          { front: "ย่า", phonetic: "/yâa/", back: "祖母", example: "我的<b>ย่า</b>", exampleTranslation: "我的祖母。" },
          { front: "เยอะแยะ", phonetic: "/yə́ yɛ́/", back: "多", example: "有很多<b>เยอะแยะ</b>", exampleTranslation: "有很多很多。" },
          { front: "รอ", phonetic: "/rɔɔ/", back: "等候", example: "在<b>รอ</b>你", exampleTranslation: "在等你。" },
          { front: "รัก", phonetic: "/rák/", back: "爱", example: "我<b>รัก</b>你", exampleTranslation: "我爱你。" },
          { front: "ราคา", phonetic: "/raa khaa/", back: "价格", example: "<b>ราคา</b>多少?", exampleTranslation: "价格多少？" },
          { front: "ราดหน้าเส้นใหญ่", phonetic: "/râat nâa sên yày/", back: "湿炒河粉", example: "吃<b>ราดหน้าเส้นใหญ่</b>", exampleTranslation: "吃湿炒河粉。" },
          { front: "รู้", phonetic: "/rúu/", back: "知道", example: "我<b>รู้</b>了", exampleTranslation: "我知道了。" },
          { front: "รู้สึก", phonetic: "/rúu sʉ̀k/", back: "感觉", example: "我<b>รู้สึก</b>...", exampleTranslation: "我感觉..." },
          { front: "เรา", phonetic: "/raw/", back: "我们", example: "<b>เรา</b>去吧", exampleTranslation: "我们去吧。" },
          { front: "เรียกว่า", phonetic: "/rîak wâa/", back: "称作", example: "这个<b>เรียกว่า</b>什么?", exampleTranslation: "这个称作什么？" },
          { front: "เรียน", phonetic: "/rian/", back: "学习", example: "<b>เรียน</b>泰语", exampleTranslation: "学习泰语。" },
          { front: "เรือ", phonetic: "/rɯa/", back: "船", example: "坐<b>เรือ</b>", exampleTranslation: "坐船。" },
          { front: "เรื่อยๆ", phonetic: "/rɯ̂ay rɯ̂ay/", back: "就那样，一直", example: "就这样<b>เรื่อยๆ</b>", exampleTranslation: "就这样一直。" },
          { front: "โรงเรียน", phonetic: "/rooŋ rian/", back: "学校", example: "在<b>โรงเรียน</b>", exampleTranslation: "在学校。" },
          { front: "โรงหนัง", phonetic: "/rooŋ nǎŋ/", back: "电影院", example: "去<b>โรงหนัง</b>", exampleTranslation: "去电影院。" },
          { front: "โรงอาหาร", phonetic: "/rooŋ aa hǎan/", back: "食堂", example: "在<b>โรงอาหาร</b>吃饭", exampleTranslation: "在食堂吃饭。" },
          { front: "ล่ะ", phonetic: "/là/", back: "呢", example: "你<b>ล่ะ</b>?", exampleTranslation: "你呢？" },
          { front: "ลำไย", phonetic: "/lam yay/", back: "龙眼", example: "吃<b>ลำไย</b>", exampleTranslation: "吃龙眼。" },
          { front: "ลืม", phonetic: "/lʉʉm/", back: "忘记", example: "我<b>ลืม</b>了", exampleTranslation: "我忘记了。" },
          { front: "เลีย", phonetic: "/lia/", back: "舔", example: "狗<b>เลีย</b>", exampleTranslation: "狗舔。" },
          { front: "แล้ว", phonetic: "/lɛ́อw/", back: "那么/了", example: "吃<b>แล้ว</b>", exampleTranslation: "吃了。" },
          { front: "และ", phonetic: "/lɛ́/", back: "和", example: "你<b>และ</b>我", exampleTranslation: "你和我。" },
          { front: "วันนี้", phonetic: "/wan níi/", back: "今天", example: "<b>วันนี้</b>天气好", exampleTranslation: "今天天气好。" },
          { front: "วัว", phonetic: "/wua/", back: "黄牛", example: "一头<b>วัว</b>", exampleTranslation: "一头牛。" },
          { front: "วิชา", phonetic: "/wí chaa/", back: "课程", example: "什么<b>วิชา</b>?", exampleTranslation: "什么课程？" },
          { front: "เวลา", phonetic: "/wee laa/", back: "时间", example: "现在什么<b>เวลา</b>?", exampleTranslation: "现在什么时间？" },
          { front: "เวียดนาม", phonetic: "/wîat naam/", back: "越南", example: "去<b>เวียดนาม</b>", exampleTranslation: "去越南。" },
          { front: "ส่ง", phonetic: "/sòŋ/", back: "递，送", example: "<b>ส่ง</b>信", exampleTranslation: "送信。" },
          { front: "สบาย", phonetic: "/sà baay/", back: "舒适", example: "很<b>สบาย</b>", exampleTranslation: "很舒适。" },
          { front: "สมุด", phonetic: "/sà mùt/", back: "本子", example: "用<b>สมุด</b>", exampleTranslation: "用本子。" },
          { front: "สวัสดิ์", phonetic: "/sà wàt/", back: "你好（短形式）", example: "<b>สวัสดิ์</b>!", exampleTranslation: "你好！" },
          { front: "ส่วน", phonetic: "/sùan/", back: "至于，部分", example: "在<b>ส่วน</b>里", exampleTranslation: "在部分里。" },
          { front: "สอบ", phonetic: "/sɔ̀ɔp/", back: "考试", example: "参加<b>สอบ</b>", exampleTranslation: "参加考试。" },
          { front: "สอน", phonetic: "/sɔ̌อn/", back: "教", example: "他<b>สอน</b>我", exampleTranslation: "他教我。" },
          { front: "สัปดาห์หน้า", phonetic: "/sàp daa nâa/", back: "下周", example: "<b>สัปดาห์หน้า</b>见", exampleTranslation: "下周见。" },
          { front: "สาลี่", phonetic: "/sǎa lîi/", back: "雪梨", example: "吃<b>สาลี่</b>", exampleTranslation: "吃雪梨。" },
          { front: "สาม", phonetic: "/sǎam/", back: "三", example: "<b>สาม</b>个", exampleTranslation: "三个。" },
          { front: "สี", phonetic: "/sǐi/", back: "颜色", example: "什么<b>สี</b>?", exampleTranslation: "什么颜色？" },
          { front: "สี่", phonetic: "/sìi/", back: "四", example: "<b>สี่</b>个", exampleTranslation: "四个。" },
          { front: "สีเทา", phonetic: "/sǐi thaw/", back: "褐色/灰色", example: "颜色<b>สีเทา</b>", exampleTranslation: "颜色灰色。" },
          { front: "เสฉวน", phonetic: "/sěe chǔan/", back: "四川", example: "去<b>เสฉวน</b>", exampleTranslation: "去四川。" },
          { front: "เสีย", phonetic: "/sǐa/", back: "浪费，损坏", example: "弄<b>เสีย</b>了", exampleTranslation: "弄坏了。" },
          { front: "เสือ", phonetic: "/sɯ̌a/", back: "老虎", example: "一只<b>เสือ</b>", exampleTranslation: "一只老虎。" },
          { front: "เสื้อผ้า", phonetic: "/sɯ̂a phâa/", back: "衣服", example: "穿<b>เสื้อผ้า</b>", exampleTranslation: "穿衣服。" },
          { front: "ใส่", phonetic: "/sày/", back: "穿，戴，放", example: "<b>ใส่</b>衣服", exampleTranslation: "穿衣服。" },
          { front: "หน่อย", phonetic: "/nɔ̀ɔy/", back: "一下", example: "等<b>หน่อย</b>", exampleTranslation: "等一下。" },
          { front: "หนัง", phonetic: "/nǎŋ/", back: "电影", example: "看<b>หนัง</b>", exampleTranslation: "看电影。" },
          { front: "หนังสือ", phonetic: "/nǎŋ sʉ̌ʉ/", back: "书", example: "看<b>หนังสือ</b>", exampleTranslation: "看书。" },
          { front: "หนู", phonetic: "/nǔu/", back: "我(女性自称)/你/老鼠", example: "<b>หนู</b>去玩", exampleTranslation: "我去玩（女用）。" },
          { front: "หมู", phonetic: "/mǔu/", back: "猪", example: "吃<b>หมู</b>", exampleTranslation: "吃猪肉。" },
          { front: "หยิบ", phonetic: "/yìp/", back: "拿", example: "帮我<b>หยิบ</b>一下", exampleTranslation: "帮我拿一下。" },
          { front: "หรือ", phonetic: "/rʉ̌ʉ/", back: "或者", example: "你<b>หรือ</b>我?", exampleTranslation: "你或者我？" },
          { front: "หอ", phonetic: "/hอ/", back: "楼，宿舍", example: "在<b>หอ</b>里", exampleTranslation: "在宿舍里。" },
          { front: "หอพัก", phonetic: "/hอ phák/", back: "宿舍", example: "在<b>หอพัก</b>", exampleTranslation: "在宿舍。" },
          { front: "หอสมุด", phonetic: "/hอ sà mùt/", back: "图书馆", example: "去<b>หอสมุด</b>", exampleTranslation: "去图书馆。" },
          { front: "ห้องครัว", phonetic: "/hอŋ khrua/", back: "厨房", example: "在<b>ห้องครัว</b>", exampleTranslation: "在厨房。" },
          { front: "ห้องเรียน", phonetic: "/hอŋ rian/", back: "教室", example: "在<b>ห้องเรียน</b>", exampleTranslation: "在教室。" },
          { front: "หัว", phonetic: "/hǔa/", back: "头", example: "疼<b>หัว</b>", exampleTranslation: "头疼。" },
          { front: "หัวเราะ", phonetic: "/hǔa rɔ́/", back: "笑", example: "大声<b>หัวเราะ</b>", exampleTranslation: "大声笑。" },
          { front: "หา", phonetic: "/hǎa/", back: "找", example: "<b>หา</b>东西", exampleTranslation: "找东西。" },
          { front: "ห้า", phonetic: "/hâa/", back: "五", example: "<b>ห้า</b>个", exampleTranslation: "五个。" },
          { front: "ห้าง", phonetic: "/hâaŋ/", back: "商场", example: "去<b>ห้าง</b>", exampleTranslation: "去商场。" },
          { front: "หิว", phonetic: "/hǐw/", back: "饿", example: "很<b>หิว</b>", exampleTranslation: "很饿。" },
          { front: "หิวน้ำ", phonetic: "/hǐw nám/", back: "渴", example: "很<b>หิวน้ำ</b>", exampleTranslation: "很渴。" },
          { front: "หู", phonetic: "/hǔu/", back: "耳朵", example: "摸<b>หู</b>", exampleTranslation: "摸耳朵。" },
          { front: "แห่ง", phonetic: "/hɛ̀ŋ/", back: "所/个/地方", example: "一个<b>แห่ง</b>", exampleTranslation: "一个地方。" },
          { front: "ไหหลำ", phonetic: "/hǎy lǎm/", back: "海南", example: "在<b>ไหหลำ</b>", exampleTranslation: "在海南。" },
          { front: "ให้", phonetic: "/hây/", back: "给", example: "<b>ให้</b>你", exampleTranslation: "给你。" },
          { front: "ใหม่", phonetic: "/mày/", back: "新的", example: "<b>ใหม่</b>鞋", exampleTranslation: "新鞋。" },
          { front: "ไหน", phonetic: "/nǎy/", back: "哪里", example: "去<b>ไหน</b>?", exampleTranslation: "去哪里？" },
          { front: "ไหม", phonetic: "/mǎy/", back: "吗", example: "好<b>ไหม</b>?", exampleTranslation: "好吗？" },
          { front: "อย่า", phonetic: "/yàa/", back: "别", example: "<b>อย่า</b>去", exampleTranslation: "别去。" },
          { front: "อยาก", phonetic: "/yàak/", back: "想", example: "<b>อยาก</b>吃", exampleTranslation: "想吃。" },
          { front: "อยู่", phonetic: "/yùu/", back: "在", example: "<b>อยู่</b>家", exampleTranslation: "在家。" },
          { front: "อร่อย", phonetic: "/a rɔ̀y/", back: "美味", example: "很<b>อร่อย</b>", exampleTranslation: "很美味。" },
          { front: "อะไร", phonetic: "/a ray/", back: "什么", example: "<b>อะไร</b>?", exampleTranslation: "什么？" },
          { front: "อา", phonetic: "/aa/", back: "叔叔/姑姑", example: "见<b>อา</b>", exampleTranslation: "见叔叔。" },
          { front: "อากาศ", phonetic: "/aa kàat/", back: "天气", example: "<b>อากาศ</b>好", exampleTranslation: "天气好。" },
          { front: "อาทิตย์", phonetic: "/aa thิต/", back: "星期", example: "一<b>อาทิตย์</b>", exampleTranslation: "一星期。" },
          { front: "อาหรับ", phonetic: "/aa ràp/", back: "阿拉伯", example: "学<b>อาหรับ</b>语", exampleTranslation: "学阿拉伯语。" },
          { front: "อาหาร", phonetic: "/aa hǎan/", back: "食物", example: "泰<b>อาหาร</b>", exampleTranslation: "泰国菜。" },
          { front: "อ่าน", phonetic: "/àan/", back: "读", example: "<b>อ่าน</b>书", exampleTranslation: "读书。" },
          { front: "อีก", phonetic: "/ìik/", back: "再", example: "<b>อีก</b>一次", exampleTranslation: "再一次。" },
          { front: "เอา", phonetic: "/aw/", back: "拿/要", example: "你要<b>เอา</b>吗?", exampleTranslation: "你要吗？" },
          { front: "ไอ", phonetic: "/ay/", back: "咳嗽", example: "他在<b>ไอ</b>", exampleTranslation: "他在咳嗽。" }
        ];

         // Note: In the actual implementation, I will assume the large data arrays are preserved. 
         // For this XML output, I am including the structure but omitting the huge list to keep the response manageable 
         // unless the user specifically asked to change data.
         // Wait, the prompt implies "These are the existing files", so I should probably return the full file or just the modified parts.
         // However, since I have to return the FULL content of the file in the XML, I will paste the truncated version from the prompt? 
         // No, I must include the full content. I will include the full content provided in the prompt.
         
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
    
    // 3. Seed Basic Thai 2 Folder 
    if (!newFolders.some(f => f.id === BASIC_THAI_2_FOLDER_ID)) {
         const basicThai2Folder: Folder = { id: BASIC_THAI_2_FOLDER_ID, name: '基础泰语2', createdAt: Date.now() };
        newFolders.push(basicThai2Folder);
    
        const rawData2 = [
          ["กีฬา", "运动、体育运动", "/kii-laa/", "เขามักจะเล่น<b>กีฬา</b>ในตอนเย็น", "他经常在傍晚做运动。"],
          ["โป๊ะแตก", "穿帮、破裂、粉碎", "/pó-dtàek/", "ความลับของเขา<b>โป๊ะแตก</b>เสียแล้ว", "他的秘密穿帮了。"],
          ["หมอฟัน", "牙医", "/mɔ̌ɔ-fan/", "ฉันต้องไปหา<b>หมอฟัน</b>พรุ่งนี้", "我明天得去看牙医。"],
          ["ออกแบบ", "设计", "/ɔ̀ɔk-bàep/", "เขา<b>ออกแบบ</b>บ้านได้สวยมาก", "他把房子设计得很漂亮。"],
          ["ใส่เสื้อผ้ากลับด้าน", "衣服穿反了", "/sày sɯ̂a-phâa klàp dâan/", "คุณ<b>ใส่เสื้อผ้ากลับด้าน</b>หรือเปล่า?", "你是不是衣服穿反了？"],
          ["อุปกรณ์", "工具、器材、设备", "/ù-bpà-kɔɔn/", "ห้องนี้มี<b>อุปกรณ์</b>ครบครัน", "这个房间设备齐全。"],
          ["หมึกสี", "彩色墨水", "/mʉ̀k-sǐi/", "เขาใช้<b>หมึกสี</b>วาดรูป", "他用彩色墨水画画。"],
          ["ยกเลิก", "取消", "/yók-lɤ̂rk/", "เที่ยวบินถูก<b>ยกเลิก</b>", "航班被取消了。"],
          ["เครื่องดูดฝุ่น", "吸尘器", "/khrʉ̂ang-dùut-fùn/", "<b>เครื่องดูดฝุ่น</b>เสียงดังมาก", "吸尘器声音很大。"],
          ["กำหนด", "确定时间，规定，指定", "/kà-mòt/", "เราต้องทำตามที่<b>กำหนด</b>ไว้", "我们必须按照规定的做。"],
          ["กระดาษ", "纸，纸张", "/krà-dàat/", "ช่วยหยิบ<b>กระดาษ</b>ให้แผ่นหนึ่ง", "请帮我拿一张纸。"],
          ["เมาส์", "鼠标", "/máo/", "<b>เมาส์</b>อันนี้เสียแล้ว", "这个鼠标坏了。"],
          ["ทรมาน", "受罪，受折磨", "/thɔɔ-rá-maan/", "อาการป่วยทำให้เขา<b>ทรมาน</b>มาก", "病情让他备受折磨。"],
          ["ข่มขืน", "强奸", "/khòm-khʉ̌ʉn/", "การ<b>ข่มขืน</b>เป็นอาชญากรรมร้ายแรง", "强奸是严重的犯罪。"],
          ["แว่นตา", "眼镜", "/wâen-dtaa/", "เขาถอด<b>แว่นตา</b>ออก", "他摘下了眼镜。"],
          ["หมวกแก็ป", "鸭舌帽", "/mùak-káep/", "เขาสวม<b>หมวกแก็ป</b>สีแดง", "他戴着红色的鸭舌帽。"],
          ["ฝาแฝด", "双胞胎", "/fǎa-fàet/", "พวกเธอเป็น<b>ฝาแฝด</b>กัน", "她们是双胞胎。"],
          ["หัวมุม", "拐角处，转角", "/hǔa-mum/", "ร้านกาแฟอยู่ตรง<b>หัวมุม</b>", "咖啡店就在拐角处。"],
          ["พิพิธภัณฑ์", "博物馆", "/phí-phít-thá-phan/", "เราไปเที่ยว<b>พิพิธภัณฑ์</b>สัตว์น้ำ", "我们去参观了水族馆（博物馆）。"],
          ["รายการ", "项目，节目", "/raay-kaan/", "<b>รายการ</b>นี้สนุกมาก", "这个节目很有趣。"],
          ["ระดับ", "水平、程度、等级", "/rá-dàp/", "เขาเรียนอยู่ใน<b>ระดับ</b>สูง", "他在高级水平学习。"],
          ["ระบบ", "系统、程序、体制", "/rá-bòp/", "<b>ระบบ</b>คอมพิวเตอร์ขัดข้อง", "电脑系统出故障了。"],
          ["ขยาย", "扩大，扩展", "/khà-yǎay/", "บริษัทกำลัง<b>ขยาย</b>สาขา", "公司正在扩大分店。"],
          ["การศึกษาภาคบังคับ", "义务教育", "/kaan-sʉ̀k-sǎa phâak-baŋ-kháp/", "ทุกคนต้องเรียน<b>การศึกษาภาคบังคับ</b>", "每个人都必须接受义务教育。"],
          ["ตำบล", "区，镇，乡", "/dtam-bon/", "เขาอาศัยอยู่ใน<b>ตำบล</b>เล็กๆ", "他住在一个小镇上。"],
          ["อนุบาล", "幼儿园", "/à-nú-baan/", "ลูกสาวเรียนอยู่ชั้น<b>อนุบาล</b>", "女儿在上幼儿园。"],
          ["เทศบาล", "市政，地方行政机构", "/thêet-sà-baan/", "เขาทำงานที่<b>เทศบาล</b>", "他在市政厅工作。"],
          ["อุดมศึกษา", "高等教育", "/ù-dom-sʉ̀k-sǎa/", "นักเรียนเตรียมเข้าสู่<b>อุดมศึกษา</b>", "学生们准备进入高等教育阶段。"],
          ["ทางการ", "正式", "/thaang-kaan/", "นี่เป็นประกาศอย่างเป็น<b>ทางการ</b>", "这是正式公告。"],
          ["เรือหางยาว", "长尾船", "/rʉa-hǎang-yaaw/", "เรานั่ง<b>เรือหางยาว</b>ชมคลอง", "我们坐长尾船游览运河。"],
          ["ริมน้ำ", "河边", "/rim-nám/", "บ้านเขาอยู่<b>ริมน้ำ</b>", "他的家在河边。"],
          ["ของที่ระลึก", "纪念品", "/khɔ̌ɔng thîi-rá-lʉ́k/", "ฉันซื้อ<b>ของที่ระลึก</b>จากเมืองไทย", "我买了泰国的纪念品。"],
          ["รองเท้าแตะ", "拖鞋", "/rɔɔng-tháo-dtè/", "ใส่<b>รองเท้าแตะ</b>เดินเล่น", "穿着拖鞋散步。"],
          ["ผ้าถุง", "筒裙", "/phâa-thǔng/", "คุณยายสวม<b>ผ้าถุง</b>สีสวย", "奶奶穿着花色漂亮的筒裙。"],
          ["รัชกาลที่ ๑", "一世王", "/rát-chá-kaan thîi nʉ̀ng/", "ในสมัย<b>รัชกาลที่ ๑</b> กรุงเทพฯ ถูกสร้างขึ้น", "在一世王时期，曼谷被建立起来。"],
          ["ประวัติศาสตร์", "历史", "/prà-wàt-dtì-sàat/", "เราเรียน<b>ประวัติศาสตร์</b>ไทย", "我们学习泰国历史。"],
          ["ผนัง", "墙壁", "/phà-nǎng/", "รูปภาพแขวนอยู่บน<b>ผนัง</b>", "照片挂在墙壁上。"],
          ["ระเบียง", "廊，走廊，阳台", "/rá-biang/", "เขานั่งรับลมตรง<b>ระเบียง</b>", "他坐在阳台上吹风。"],
          ["จิตรกรรมฝาผนัง", "壁画", "/cìt-dtra-kam fǎa-phà-nǎง/", "วัดนี้มี<b>จิตรกรรมฝาผนัง</b>ที่สวยงาม", "这座寺庙有精美的壁画。"],
          ["บรรยาย", "说明，解说，解释", "/ban-yaay/", "มัคคุเทศก์<b>บรรยาย</b>ประวัติวัด", "导游解说着寺庙的历史。"],
          ["ประดิษฐาน", "安置，供奉", "/prà-dìt-thǎan/", "พระพุทธรูป<b>ประดิษฐาน</b>อยู่ในโบสถ์", "佛像供奉在大殿里。"],
          ["ประทับใจ", "感动，印象深刻", "/prà-tháp-cay/", "ฉัน<b>ประทับใจ</b>ในการบริการ", "我对这项服务印象深刻。"],
          ["ลวนลาม", "性骚扰", "/luan-laam/", "เธอถูก<b>ลวนลาม</b>บนรถเมล์", "她在公交车上受到了性骚扰。"],
          ["หล่นลง", "掉落", "/lòn long/", "ใบไม้<b>หล่นลง</b>พื้น", "树叶掉落在地上。"],
          ["สุ่ม", "随机", "/sùm/", "เราใช้การ<b>สุ่ม</b>เพื่อเลือกผู้โชคดี", "我们通过随机抽取来选出幸运者。"],
          ["รางวัล", "奖励，奖品", "/raang-wan/", "เขาได้รับ<b>รางวัล</b>ที่หนึ่ง", "他获得了一等奖。"],
          ["วันถัดไป", "明天（次日）", "/wan thàt-bpai/", "เราจะเจอกันใน<b>วันถัดไป</b>", "我们将在次日见面。"],
          ["ดวงอาทิตย์", "太阳", "/duang aa-thít/", "<b>ดวงอาทิตย์</b>ขึ้นทางทิศตะวันออก", "太阳从东方升起。"],
          ["พระอาทิตย์ขึ้น", "太阳出来", "/phrá aa-thít khʉ̂n/", "เราไปดู<b>พระอาทิตย์ขึ้น</b>กัน", "我们去看日出吧。"],
          ["กรีฑา", "体育运动、比赛", "/krii-thaa/", "มีการแข่งขัน<b>กรีฑา</b>ที่สนาม", "操场上有田径（体育）比赛。"],
          ["สิ่งของ", "事物、东西", "/sìng-khɔ̌ɔng/", "กรุณาเก็บ<b>สิ่งของ</b>ให้เรียบร้อย", "请把东西收好。"],
          ["ประจำปี", "每年，年度", "/prà-cam-bpii/", "งานเลี้ยง<b>ประจำปี</b>จัดขึ้นที่นี่", "年度晚会在这里举行。"],
          ["ลิฟต์", "电梯", "/líp/", "กด<b>ลิฟต์</b>ไปชั้นห้า", "按电梯去五楼。"],
          ["ถ่าน", "电池、炭", "/thàan/", "/thàan/", "<b>ถ่าน</b>ไฟฉายหมดแล้ว", "手电筒电池没电了。"],
          ["เสื้อโค้ท", "外套", "/sɯ̂a-khôot/", "สวม<b>เสื้อโค้ท</b>เพราะอากาศหนาว", "因为天气冷，穿上了外套。"],
          ["ชีวิต", "生活，生命", "/chii-wít/", "เขามีความสุขใน<b>ชีวิต</b>", "他在生活中很幸福。"],
          ["วิชาเอก", "专业", "/wí-chaa èek/", "ฉันเรียน<b>วิชาเอก</b>ภาษาไทย", "我的专业是泰语。"],
          ["รัฐ", "国家，国立", "/rát/", "มหาวิทยาลัยของ<b>รัฐ</b>", "国立大学。"],
          ["รัฐบาล", "政府", "/rát-thà-baan/", "<b>รัฐบาล</b>ประกาศนโยบายใหม่", "政府宣布了新政策。"],
          ["เอกชน", "私人，私立", "/èek-khà-chon/", "เขาทำงานในบริษัท<b>เอกชน</b>", "他在私人公司工作。"],
          ["เอกสาร", "文件", "/èek-khà-sǎan/", "กรุณาเซ็น<b>เอกสาร</b>นี้", "请在这份文件上签字。"],
          ["ทั้งสิ้น", "全部、都", "/tháng-sîn/", "เขามีเงินอยู่<b>ทั้งสิ้น</b>ร้อยบาท", "他总共（全部）只有一百泰铢。"],
          ["ได้แก่", "即、就是（列举）", "/dâay-kàe/", "ผลไม้ไทย<b>ได้แก่</b> ทุเรียน มังคุด", "泰国水果即：榴莲、山竹。"],
          ["เปิดสอน", "开设、设置（课程）", "/bpɤ̀rt sɔ̌ɔn/", "โรงเรียนนี้<b>เปิดสอน</b>หลายภาษา", "这所学校开设了多种语言课程。"],
          ["ปริญญา", "学位", "/bprìn-yaa/", "เขาจบ<b>ปริญญา</b>โท", "他硕士学位毕业。"],
          ["ปริญญาบัตร", "学位证书", "/bprìn-yaa bàt/", "เราจะได้รับ<b>ปริญญาบัตร</b>เดือนหน้า", "我们下个月领学位证书。"],
          ["ปริญญาตรี", "学士学位", "/bprìn-yaa dtrii/", "เขากำลังเรียน<b>ปริญญาตรี</b>", "他正在读学士学位。"],
          ["ปริญญาโท", "硕士学位", "/bprìn-yaa thoo/", "เธอสนใจเรียน<b>ปริญญาโท</b>", "她有兴趣读硕士。"],
          ["ปริญญาเอก", "博士学位", "/bprìn-yaa èek/", "เขาเป็นอาจารย์ระดับ<b>ปริญญาเอก</b>", "他是博士学位的教授。"],
          ["ชนิด", "种、种类", "/chá-nít/", "มีนกหลาย<b>ชนิด</b>ในสวน", "花园里有很多种类的鸟。"],
          ["ต่อคน", "人均", "/dtɔ̀ɔ khon/", "ราคาอาหารห้าร้อยบาท<b>ต่อคน</b>", "餐费人均五百泰铢。"],
          ["ห้องน้ำ/ห้องสุขา", "卫生间", "/hɔ̂ng-nám/", "ขอไป<b>ห้องน้ำ</b>หน่อย", "我想去一下洗手间。"],
          ["เตียง", "床", "/dtriang/", "เขานอนอยู่บน<b>เตียง</b>", "他躺在床上。"],
          ["เตียงคู่", "双人床", "/dtriang khûu/", "เราจองห้องที่มี<b>เตียงคู่</b>", "我们预订了带双人床的房间。"],
          ["ตู้เสื้อผ้า", "衣柜", "/dtûu sɯ̂a-phâa/", "เก็บเสื้อผ้าเข้า<b>ตู้เสื้อผ้า</b>", "把衣服收进衣柜。"],
          ["ตู้เย็น", "冰箱", "/dtûu-yen/", "แช่น้ำไว้ใน<b>ตู้เย็น</b>", "把水冰在冰箱里。"],
          ["โต๊ะหนังสือ", "书桌", "/tó naŋ-sɯ̌ʉ/", "เขานั่งทำการบ้านที่<b>โต๊ะหนังสือ</b>", "他坐在书桌前做作业。"],
          ["ก่อตั้ง", "成立，建立", "/kɔ̀ɔ-tâng/", "บริษัทนี้ถูก<b>ก่อตั้ง</b>เมื่อปีที่แล้ว", "这家公司成立于去年。"],
          ["ก่อไฟ", "生火", "/kɔ̀ɔ-fay/", "พวกเราช่วยกัน<b>ก่อไฟ</b>แคมป์", "我们一起生起营火。"],
          ["สร้าง", "建设，建造", "/sâang/", "เขากำลัง<b>สร้าง</b>บ้านใหม่", "他正在盖新房子。"],
          ["ก่อสร้าง", "建筑，施工", "/kɔ̀ɔ-sâang/", "มีการ<b>ก่อสร้าง</b>ถนนหน้าบ้าน", "家门前的马路正在施工。"],
          ["เน้น", "强调，着重", "/néen/", "ครู<b>เน้น</b>เรื่องการออกเสียง", "老师强调了发音。"],
          ["ชื่อเสียง", "名声，声誉", "/chʉ̂ʉ-sǐang/", "เขามี<b>ชื่อเสียง</b>ระดับโลก", "他有世界级的名声。"],
          ["ชื่อดัง", "名气大", "/chʉ̂ʉ-daŋ/", "นี่เป็นร้านอาหาร<b>ชื่อดัง</b>", "这是一家名气很大的餐厅。"],
          ["การเรียนการสอน", "教学", "/kaan rian kaan sɔ̌ɔn/", "<b>การเรียนการสอน</b>เป็นไปอย่างราบรื่น", "教学工作顺利进行。"],
          ["การวิจัย", "研究", "/kaan wí-cay/", "เขาทำ<b>การวิจัย</b>เรื่องสมุนไพร", "他正在做关于草药的研究。"],
          ["กลุ่ม", "组、群、类", "/klùm/", "เด็กๆ เล่นกันเป็น<b>กลุ่ม</b>", "孩子们成群地玩耍。"],
          ["กลุ่มวิชา", "学科组", "/klùm wí-chaa/", "เขาอยู่ใน<b>กลุ่มวิชา</b>วิทยาศาสตร์", "他在科学学科组。"],
          ["บริหารธุรกิจ", "企业管理", "/bɔɔ-rí-hǎan thú-rá-kìt/", "พี่ชายเรียนคณะ<b>บริหารธุรกิจ</b>", "哥哥在读企业管理学院。"],
          ["วิทยาเขต", "校区", "/wít-thá-yaa-khèet/", "มหาวิทยาลัยมีหลาย<b>วิทยาเขต</b>", "大学有多个校区。"],
          ["นคร", "大城市，都市", "/ná-khɔɔn/", "กรุงเทพมหานครเป็น<b>นคร</b>หลวง", "曼谷是大都市/首都。"],
          ["ล้อมรอบ", "四周，环绕", "/lɔ́ɔm-rɔ̂ɔp/", "บ้าน<b>ล้อมรอบ</b>ด้วยต้นไม้", "房子被树木环绕。"],
          ["กำแพง", "围墙", "/kam-phaeng/", "แมวเดินอยู่บน<b>กำแพง</b>", "猫在围墙上走。"],
          ["เขียวชอุ่ม", "翠绿，郁郁葱葱", "/khǐaw chà-ùm/", "ทุ่งนามีสี<b>เขียวชอุ่ม</b>", "田野里绿油油的（郁郁葱葱）。"],
          ["ภายใน", "在……之内", "/phaay-nay/", "กรุณารออยู่<b>ภายใน</b>ห้อง", "请在房间内等候。"],
          ["ครบรอบ", "满……周年", "/khróp-rɔ̂ɔp/", "สุขสันต์วัน<b>ครบรอบ</b>แต่งงาน", "结婚周年快乐。"],
          ["ภายในประเทศ", "国内", "/phaay-nay prà-thêet/", "ส่งจดหมาย<b>ภายในประเทศ</b>", "寄国内信件。"],
          ["ระหว่างประเทศ", "国际", "/rá-wàang prà-thêet/", "โทรศัพท์<b>ระหว่างประเทศ</b>", "打国际电话。"],
          ["สงบ/เงียบ", "安静", "/sà-ngòp/", "ที่นี่ช่าง<b>สงบ</b>เหลือเกิน", "这里真是安静。"],
          ["ร่มรื่น", "阴凉", "/rôm-rʉ̂n/", "ใต้ต้นไม้ใหญ่ช่าง<b>ร่มรื่น</b>", "大树底下很阴凉舒适。"],
          ["ร่ม", "伞", "/rôm/", "อย่าลืมพก<b>ร่ม</b>ไปด้วยนะ", "别忘了带伞。"],
          ["ธรรมชาติ", "自然，天然", "/tham-má-châat/", "ฉันชอบเที่ยวชม<b>ธรรมชาติ</b>", "我喜欢游览自然景观。"],
          ["สดชื่น", "清新，清爽", "/sòt-chʉ̂n/", "อากาศตอนเช้า<b>สดชื่น</b>มาก", "早晨的空气很清新。"],
          ["แหล่ง", "地方，产地，水源", "/làeng/", "นี่คือ<b>แหล่ง</b>ท่องเที่ยวสำคัญ", "这是重要的旅游胜地。"],
          ["กฎหมาย", "法律", "/kòt-mǎay/", "เราต้องเคารพ<b>กฎหมาย</b>", "我们必须遵守法律。"],
          ["ทนาย", "律师", "/thá-naay/", "เขาทำงานเป็น<b>ทนาย</b>", "他当律师。"],
          ["สภาพแวดล้อม", "环境", "/sà-phâap wâet-lɔ́ɔm/", "<b>สภาพแวดล้อม</b>ที่นี่ดีมาก", "这里的环境非常好。"],
          ["ทันสมัย", "现代的，先进的", "/than-sà-mǎy/", "อาคารนี้<b>ทันสมัย</b>มาก", "这座建筑非常现代。"],
          ["ครบ", "齐全，满额", "/khróp/", "สมาชิกมากัน<b>ครบ</b>หรือยัง?", "成员都到齐（齐全）了吗？"],
          ["โดยทั่วไป", "一般来说，普遍", "/dooy thûa-bpai/", "<b>โดยทั่วไป</b>แล้วเขานิสัยดี", "一般来说他性格挺好的。"],
          ["ฝึก", "锻炼，练习", "/fʉ̀k/", "ต้อง<b>ฝึก</b>บ่อยๆ ถึงจะเก่ง", "必须经常练习（锻炼）才会厉害。"],
          ["ร่างกาย", "身体", "/râang-kaay/", "ออกกำลังกายสม่ำเสมอทำให้<b>ร่างกาย</b>แข็งแรง", "经常锻炼使身体强壮。"],
          ["แข็งแรง", "强壮，健康", "/khǎeng-raeng/", "เขา<b>แข็งแรง</b>มาก", "他非常强壮。"],
          ["หล่อหลอม", "熔炼，锻炼", "/lɔ̀ɔ-lɔ̌ɔm/", "ประสบการณ์<b>หล่อหลอม</b>ให้เขาเข้มแข็ง", "经历（熔炼）锻炼了他变得坚强。"],
          ["กล้าหาญ", "勇敢的", "/klâa-hǎan/", "เขาเป็นทหารที่<b>กล้าหาญ</b>", "他是个勇敢的士兵。"],
          ["อดทน", "耐劳，忍耐", "/òt-thon/", "ต้อง<b>อดทน</b>ต่อความยากลำบาก", "必须忍受（耐劳）困难。"],
          ["ความอดทน", "耐劳，忍耐（名）", "/khwaam òt-thon/", "<b>ความอดทน</b>เป็นสิ่งสำคัญ", "耐心（名）是件很重要的事。"],
          ["ปลูกฝัง", "树立，培养", "/plùuk-fǎng/", "พ่อแม่<b>ปลูกฝัง</b>ให้ลูกเป็นคนดี", "父母培养（树立）孩子成为好人。"],
          ["สามารถ", "能，能够", "/sǎa-mâat/", "เขา<b>สามารถ</b>พูดได้หลายภาษา", "他能说好几种语言。"],
          ["สามัคคี", "团结", "/sǎa-mák-khii/", "เราต้องมีความ<b>สามัคคี</b>", "我们必须团结。"],
          ["ความสามัคคี", "团结（名）", "/khwaam sǎa-mák-khii/", "<b>ความสามัคคี</b>คือพลัง", "团结就是力量。"],
          ["ผล", "效果、成绩", "/phǒn/", "<b>ผล</b>สอบออกมาดีมาก", "考试成绩非常好。"],
          ["น้ำใจ", "心意、精神", "/nám-cay/", "ขอบคุณในความมี<b>น้ำใจ</b>", "谢谢你的好意（精神）。"],
          ["นักกีฬา", "运动员", "/nák kii-laa/", "เขาเป็น<b>นักกีฬา</b>วิ่ง", "他是个跑步运动员。"],
          ["ยุติธรรม", "公平，公正", "/yút-dtì-tham/", "การตัดสินมีความ<b>ยุติธรรม</b>", "裁判非常公平公正。"],
          ["แพ้", "输", "/pháe/", "กีฬาต้องมีทั้ง<b>แพ้</b>และชนะ", "运动会有输也有赢。"],
          ["ชนะ", "赢", "/chá-ná/", "เรา<b>ชนะ</b>การแข่งขัน", "我们赢了比赛。"],
          ["อภัย", "原谅，宽恕", "/à-phay/", "ฉันขอ<b>อภัย</b>ในความผิด", "我请求原谅。"],
          ["ให้อภัย", "原谅，宽恕（动）", "/hây à-phay/", "กรุณา<b>ให้อภัย</b>ฉันด้วย", "请原谅我（动）。"],
          ["กติกา", "规则；规章", "/kà-dtì-kaa/", "ต้องทำตาม<b>กติกา</b>การเล่น", "必须遵守比赛规则。"],
          ["ผิดกติกา", "犯规", "/phìt kà-dtì-kaa/", "เขาเล่น<b>ผิดกติกา</b>", "他比赛犯规了。"],
          ["ตั้งใจ", "打算，立志", "/tâng-cay/", "ฉัน<b>ตั้งใจ</b>จะเรียนให้จบ", "我打算（立志）完成学业。"],
          ["เอาชนะ", "战胜，获胜", "/ao chá-ná/", "เราต้อง<b>เอาชนะ</b>ความกลัว", "我们要战胜恐惧。"],
          ["เอาเปรียบ", "占便宜", "/ao bpriap/", "อย่า<b>เอาเปรียบ</b>ผู้อื่น", "别占别人便宜。"],
          ["คู่ต่อสู้", "对手", "/khûu dtɔ̀ɔ-sûu/", "<b>คู่ต่อสู้</b>ของเขามีฝีมือมาก", "他的对手很有实力。"],
          ["เป้าหมาย", "目标", "/bpâo-mǎay/", "<b>เป้าหมาย</b>ของฉันคือเรียนให้เก่ง", "我的目标是学好。"],
          ["รอบ", "场，局（比赛）", "/rɔ̂ɔp/", "เราเข้ารอบชิง<b>รอบ</b>สุดท้าย", "我们进入了最后一局（场）。"],
          ["ได้ข่าวว่า", "听说，获悉", "/dâay khàaw wâa/", "<b>ได้ข่าวว่า</b>คุณจะย้ายบ้าน", "听说你要搬家。"],
          ["งานกีฬา", "运动会", "/ngaan kii-laa/", "โรงเรียนจัด<b>งานกีฬา</b>ทุกปี", "学校每年举办运动会。"],
          ["น่าดู", "好看", "/nâa duu/", "หนังเรื่องนี้<b>น่าดู</b>มาก", "这部电影非常好看。"],
          ["เข้าร่วม", "参加，参与", "/khâo-rûam/", "ฉันอยาก<b>เข้าร่วม</b>กิจกรรมนี้", "我想参加这个活动。"],
          ["แข่งขัน", "比赛", "/khàeng-khǎn/", "นักกีฬาเริ่มการ<b>แข่งขัน</b>", "运动员开始比赛。"],
          ["ประเภท", "种类", "/brà-phêet/", "การแข่งขันมีหลาย<b>ประเภท</b>", "比赛有很多种类。"],
          ["สุดท้าย", "最后的", "/sùt-tháay/", "นี่คือโอกาส<b>สุดท้าย</b>", "这是最后的机会。"],
          ["ประเภทลู่", "径赛（跑步等）", "/brà-phêet lûu/", "เขาวิ่งใน<b>ประเภทลู่</b>", "他参加的是径赛。"],
          ["ประเภทลาน", "田赛（跳高等）", "/brà-phêet laan/", "เธอแข่งกระโดดไกลใน<b>ประเภทลาน</b>", "她参加了田赛的跳远。"],
          ["แปลก", "奇怪", "/bplàek/", "นี่เป็นเรื่องที่<b>แปลก</b>มาก", "这是件很奇怪的事。"],
          ["ปวด", "痛", "/pùat/", "ฉัน<b>ปวด</b>หัวมาก", "我头很痛。"],
          ["แก้", "消除、解决、修理", "/kâe/", "นี่คือวิธี<b>แก้</b>ปัญหา", "这是解决（消除）问题的方法。"],
          ["ยาแก้หวัด", "感冒药", "/yaa kâe wàt/", "กิน<b>ยาแก้หวัด</b>แล้วไปนอน", "吃了感冒药就去睡觉。"],
          ["ยาแก้ไอ", "咳嗽药", "/yaa kâe ay/", "ฉันต้องการ<b>ยาแก้ไอ</b>", "我需要咳嗽药。"],
          ["ยาแก้ปวดหัว", "头痛药", "/yaa kâe pùat hǔa/", "กิน<b>ยาแก้ปวดหัว</b>สิ", "吃点头痛药吧。"],
          ["มีไข้", "发烧", "/mii khây/", "เขารู้สึกเหมือนจะ<b>มีไข้</b>", "他感觉好像发烧了。"],
          ["องศา", "度", "/ong-sǎa/", "วันนี้อุณหภูมิ 38 <b>องศา</b>", "今天气温38度。"],
          ["พักผ่อน", "休息", "/phák-phɔ̀ɔn/", "คุณควร<b>พักผ่อน</b>มากๆ", "你应该多多休息。"],
          ["ลา", "请假", "/laa/", "เขาขอ<b>ลา</b>หนึ่งวัน", "他请假一天。"],
          ["ลาป่วย", "请病假", "/laa bpùay/", "ฉันโทรมาขอ<b>ลาป่วย</b>", "我打电话来请病假。"],
          ["เพียง", "仅、只", "/phiang/", "เขามีเงิน<b>เพียง</b>เล็กน้อย", "他仅（只）有一点点钱。"],
          ["เยี่ยม", "探望", "/yîam/", "เราไป<b>เยี่ยม</b>เพื่อนที่โรงพยาบาล", "我们去医院探望朋友。"],
          ["ตามสบาย", "随意，别客气", "/taam sà-baay/", "เชิญนั่ง<b>ตามสบาย</b>ครับ", "请随意坐，别客气。"],
          ["ลุกขึ้น", "起来", "/lúk khʉ̂n/", "เขา<b>ลุกขึ้น</b>จากที่นอน", "他从床上起来。"],
          ["ยาน้ำ", "药水", "/yaa nám/", "เด็กๆ กิน<b>ยาน้ำ</b>ง่ายกว่า", "小孩吃药水更容易。"],
          ["น้ำเย็น", "凉水", "/nám yen/", "ขอดื่ม<b>น้ำเย็น</b>หน่อย", "我想喝点凉水。"],
          ["ดื่ม", "喝", "/dʉ̀ʉm/", "คุณชอบ<b>ดื่ม</b>ชาไหม?", "你喜欢喝茶吗？"],
          ["ดื่มน้ำ", "喝水", "/dʉ̀ʉm nám/", "อย่าลืม<b>ดื่มน้ำ</b>เยอะๆ", "别忘了多喝水。"],
          ["ค่อยยังชั่ว", "好转一些", "/khɔ̂y yaŋ chûa/", "อาการของเขา<b>ค่อยยังชั่ว</b>แล้ว", "他的情况好转一些了。"],
          ["หลับ", "睡着", "/làp/", "เขา<b>หลับ</b>ไปอย่างรวดเร็ว", "他很快就睡着了。"],
          ["มึน", "头晕", "/mʉn/", "ฉันรู้สึก<b>มึน</b>หัวนิดหน่อย", "我感觉有点头晕。"],
          ["ทั้ง", "全、整", "/tháng/", "เขาทำงาน<b>ทั้ง</b>วัน", "他干了整整（全）一天。"],
          ["ทั้งตัว", "全身", "/tháng-tua/", "เขามีแผล<b>ทั้งตัว</b>", "他全身都是伤。"],
          ["เมื่อย", "酸痛（身体累）", "/mʉ̂ay/", "นั่งนานๆ แล้วรู้สึก<b>เมื่อย</b>", "坐久了感觉酸痛。"],
          ["คิด", "想", "/khít/", "ฉัน<b>คิด</b>ถึงคุณ", "我想你。"],
          ["คิดว่า", "认为", "/khít wâa/", "ฉัน<b>คิดว่า</b>เขานิสัยดี", "我认为他性格不错。"],
          ["หาย", "痊愈、丢失", "/hǎay/", "ขอให้<b>หาย</b>ไวๆ นะ", "祝你早日痊愈。"],
          ["คนไข้", "病人", "/khon-khây/", "หมอกำลังตรวจ<b>คนไข้</b>", "医生正在给病人检查。"],
          ["อาการ", "症状", "/aa-kaan/", "<b>อาการ</b>ของเขาเริ่มดีขึ้น", "他的症状开始好转。"],
          ["วัด", "测量（也指寺庙）", "/wát/", "พยาบาล<b>วัด</b>ความดันให้", "护士帮我测量了血压。"],
          ["ปรอท", "温度计", "/bprà-ròt/", "ใช้<b>ปรอท</b>วัดไข้", "用温度计测体温。"],
          ["นิดหน่อย", "一点儿", "/nít-nɔ̀y/", "เจ็บ<b>นิดหน่อย</b>ครับ", "有一点儿疼。"],
          ["ฉีดยา", "打针", "/chìit-yaa/", "พยาบาลมา<b>ฉีดยา</b>ให้", "护士来打针了。"],
          ["เข็ม", "针", "/khěm/", "เขาไม่ชอบ<b>เข็ม</b>ฉีดยา", "他不喜欢注射针。"],
          ["ใบสั่งยา", "处方", "/bai-sàng-yaa/", "นี่คือ<b>ใบสั่งยา</b>จากคุณหมอ", "这是医生的处方。"],
          ["รับยา", "拿药、取药", "/ráp-yaa/", "กรุณาไป<b>รับยา</b>ที่ห้องยา", "请去药房取药。"],
          ["แผนกจ่ายยา", "药房", "/phà-nàek càay-yaa/", "<b>แผนกจ่ายยา</b>อยู่ชั้นหนึ่ง", "药房在一楼。"],
          ["ยาเม็ด", "药片", "/yaa mét/", "เขากิน<b>ยาเม็ด</b>ไม่เป็น", "他不会吃药片。"],
          ["เม็ด", "粒、丸（量词）", "/mét/", "กินยาวันละสาม<b>เม็ด</b>", "每天吃三粒药。"],
          ["ช้อน", "勺、匙", "/chɔ́ɔn/", "ใช้<b>ช้อน</b>ตักซุป", "用勺子喝汤。"],
          ["ช้อนชา", "茶匙", "/chɔ́ɔn-chaa/", "กินยาหนึ่ง<b>ช้อนชา</b>", "喝一茶匙药。"],
          ["เกรงใจ", "客气", "/kreeng-cay/", "ไม่ต้อง<b>เกรงใจ</b>ครับ", "别客气。"],
          ["จำเป็น", "必要", "/cam-bpen/", "เงินเป็นสิ่ง<b>จำเป็น</b>", "钱是必要的。"],
          ["การ", "事情（前缀）", "/kaan/", "<b>การ</b>เรียนเป็นเรื่องสำคัญ", "学习（名：事情）很重要。"],
          ["อุบัติเหตุ", "意外、事故", "/ù-bpàt-dtì-hèet/", "เกิด<b>อุบัติเหตุ</b>รถชน", "发生了撞车意外事故。"],
          ["ทำลาย", "破坏", "/tham-laay/", "อย่า<b>ทำลาย</b>สิ่งแวดล้อม", "不要破坏环境。"],
          ["ทำร้าย", "伤害", "/tham-ráay/", "เขาถูก<b>ทำร้าย</b>ร่างกาย", "他身体受到了伤害。"],
          ["ทำลายสถิติ", "打破记录", "/tham-laay sà-thì-dtì/", "เขา<b>ทำลายสถิติ</b>โลก", "他打破了世界记录。"],
          ["เป็น", "是、会、患（病）", "/bpen/", "เขา<b>เป็น</b>หวัด", "他患了感冒（会/是）。"],
          ["แอโรบิก", "有氧操", "/ae-roo-bìk/", "เราไปเต้น<b>แอโรบิก</b>กัน", "我们去跳有氧操吧。"],
          ["สนาม", "广场、操场", "/sà-nǎam/", "เด็กๆ เล่นกันที่<b>สนาม</b>", "孩子们在操场上玩。"],
          ["สนามกีฬากลาง", "体育场，运动场（室外）", "/sà-nǎam kii-laa klaang/", "เราไปวิ่งที่<b>สนามกีฬากลาง</b>", "我们去体育场跑步。"],
          ["สนามฟุตบอล", "足球场", "/sà-nǎam fút-bɔɔn/", "<b>สนามฟุตบอล</b>นี้หญ้าสวยมาก", "这个足球场草长得很好。"],
          ["ยิ่งขึ้น", "更、更加", "/yîng-khʉ̂n/", "พยายามให้<b>ยิ่งขึ้น</b>นะ", "要更加努力哦。"],
          ["ทีม", "队", "/thiim/", "พวกเราเป็น<b>ทีม</b>เดียวกัน", "我们是同一队的。"],
          ["ชาติ", "国家，民族", "/châat/", "เราควรรัก<b>ชาติ</b>", "我们应当爱国。"],
          ["ทีมชาติ", "国家队", "/thiim châat/", "เขาได้ติด<b>ทีมชาติ</b>", "他进了国家队。"],
          ["เซต", "盘、局（比赛用语）", "/sèt/", "การแข่งขันมีห้า<b>เซต</b>", "比赛有五盘。"],
          ["ต่อ", "比、对、继续", "/dtɔ̀ɔ/", "เราชนะสาม<b>ต่อ</b>สอง", "我们三比二赢了。"],
          ["นำ", "领、带、引导、带领", "/nam/", "เขา<b>นำ</b>ทีมไปสู่ชัยชนะ", "他带领队伍走向胜利。"],
          ["ยิงประตู", "射门（进了），破门", "/ying bprà-dtuu/", "เขา<b>ยิงประตู</b>ได้สวยมาก", "他射门得分（进了）很漂亮。"],
          ["ขับเคี่ยว", "争夺，争斗", "/khàp-khîaw/", "ทั้งสองทีม<b>ขับเคี่ยว</b>กันอย่างหนัก", "两队激烈争夺。"],
          ["ดุเดือด", "激烈", "/dù-dʉ̀at/", "การแข่งขันเป็นไปอย่าง<b>ดุเดือด</b>", "比赛进行得很激烈。"],
          ["เสียดาย", "遗憾，可惜", "/sǐa-daay/", "น่า<b>เสียดาย</b>ที่เราแพ้", "很遗憾（可惜）我们输了。"],
          ["โรงยิม/สนามกีฬาในร่ม", "体育馆", "/roong-yim/", "เราไปเล่นแบดมินตันที่<b>โรงยิม</b>", "我们去体育馆打羽毛球。"],
          ["ท่า", "港口、姿势、势头", "/thâa/", "เขาว่ายน้ำได้หลาย<b>ท่า</b>", "他会好几种游泳姿势。"],
          ["เชียร์", "喝彩，加油", "/chia/", "ไปช่วยกัน<b>เชียร์</b>ฟุตบอลนะ", "一起去给足球队加油（喝彩）吧。"],
          ["ฟรีสไตล์", "自由式", "/frii-sà-tdaay/", "เขาแข่งว่ายน้ำท่า<b>ฟรีสไตล์</b>", "他参加自由式游泳比赛。"],
          ["รองชนะเลิศ", "亚军", "/rɔɔng chá-ná-lɤ̂rt/", "เขาได้รับรางวัล<b>รองชนะเลิศ</b>", "他获得了亚军。"],
          ["ผู้ชนะเลิศ/แชมป์", "冠军", "/phûu chá-ná-lɤ̂rt/", "เขาเป็น<b>ผู้ชนะเลิศ</b>", "他是冠军。"],
          ["ชิงชนะเลิศ", "争夺冠军", "/ching chá-ná-lɤ̂rt/", "วันนี้เป็นรอบ<b>ชิงชนะเลิศ</b>", "今天是争夺冠军的决赛。"],
          ["แสดงความยินดี", "祝贺", "/sà-daeng khwaam-yin-dii/", "ขอ<b>แสดงความยินดี</b>ด้วยนะ", "祝贺你。"],
          ["กระต่าย", "兔子", "/krà-dtàay/", "<b>กระต่าย</b>หูยาว", "兔子的耳朵长。"],
          ["เต่า", "乌龟", "/dtào/", "<b>เต่า</b>เดินช้า", "乌龟走得慢。"],
          ["หลงทะนง", "自负，自大", "/lǒng thá-nong/", "อย่า<b>หลงทะนง</b>ในตัวเองเกินไป", "别太自负了。"],
          ["ฝีเท้า", "步伐，跑速", "/fǐi-tháo/", "เขามี<b>ฝีเท้า</b>ที่รวดเร็ว", "他的跑速（步伐）很快。"],
          ["ราวกับ", "好像，相似", "/raaw-kàp/", "เขาวิ่ง<b>ราวกับ</b>ลมพัด", "他跑得好像一阵风。"],
          ["เก่งกาจ", "能干，勇敢，勇猛", "/kèng-kàat/", "เขาเป็นคน<b>เก่งกาจ</b>", "他是位能干（勇猛）的人。"],
          ["อาศัยอยู่", "居住", "/aa-sǎy yùu/", "ฉัน<b>อาศัยอยู่</b>ในกรุงเทพฯ", "我居住在曼谷。"],
          ["กรรมการ", "委员，董事，理事", "/kam-má-kaan/", "<b>กรรมการ</b>ตัดสินว่าเขาชนะ", "裁判员（委员）判定他赢了。"],
          ["ตัดสิน", "判决，裁判，裁决", "/dtàt-sǐn/", "กรรมการเป็นคน<b>ตัดสิน</b>", "裁判是做判决（裁决）的人。"],
          ["ผู้ตัดสิน/กรรมการตัดสิน", "裁判员", "/phûu dtàt-sǐn/", "<b>ผู้ตัดสิน</b>เป่านกหวีด", "裁判员吹响了哨子。"],
          ["คลาน", "爬", "/khlaan/", "เต่า<b>คลาน</b>ไปช้าๆ", "乌龟慢慢地爬。"],
          ["ต้วมเตี้ยม", "笨重，不灵敏，慢吞吞", "/dtûam-dtîam/", "เต่าเดิน<b>ต้วมเตี้ยม</b>", "乌龟走得慢吞吞。"],
          ["แขวะ", "嘲笑", "/khwàe/", "อย่าพูด<b>แขวะ</b>คนอื่น", "别嘲笑别人。"],
          ["กลายเป็น", "变成，成为", "/klaay bpen/", "น้ำ<b>กลายเป็น</b>น้ำแข็ง", "水变成了冰。"],
          ["ขี้โม้", "爱吹牛的，爱说大话的", "/khîi-móo/", "เขาเป็นคน<b>ขี้โม้</b>", "他是个爱吹牛的人。"],
          ["จุดหมายปลายทาง", "终点", "/cùt-mǎay bplaay-thaang/", "เราถึง<b>จุดหมายปลายทาง</b>แล้ว", "我们到达终点了。"],
          ["ต่อให้", "让步，让给；就算（连词）", "/dtɔ̀ɔ hây/", "<b>ต่อให้</b>เขามาช้า เราก็รอ", "就算他来晚了，我们也等。"],
          ["กล้า", "敢", "/klâa/", "เขา<b>กล้า</b>พูดความจริง", "他敢说真话。"],
          ["ท้า", "挑战，挑衅", "/tháa/", "เขา<b>ท้า</b>ฉันแข่งวิ่ง", "他挑战我赛跑。"],
          ["ตลิ่ง", "岸，堤", "/dtà-lìng/", "เรานั่งเล่นริม<b>ตลิ่ง</b>", "我们坐在堤岸边。"],
          ["หมาจิ้งจอก", "狐狸", "/mǎa cîng-cɔ̀ɔk/", "<b>หมาจิ้งจอก</b>เป็นสัตว์เจ้าเล่ห์", "狐狸是狡猾的动物。"],
          ["จุดเริ่มต้น", "起点", "/cùt bprà-thêet-tôn/", "นี่คือ<b>จุดเริ่มต้น</b>ของการแข่งขัน", "这是比赛的起点。"],
          ["ความเร็ว", "速度", "/khwaam-rew/", "รถวิ่งด้วย<b>ความเร็ว</b>สูง", "车子以高速行驶。"],
          ["เต็มฝีเท้า", "尽最大的步伐", "/dtēm fǐi-tháo/", "เขาวิ่ง<b>เต็มฝีเท้า</b>", "他尽最大步子跑。"],
          ["เมื่อ", "当...的时候", "/mɯ̂a/", "<b>เมื่อ</b>ฝนตก ฉันก็อยู่บ้าน", "当（在……的时候）下雨，我就呆在家里。"],
          ["เหลียว", "回头，回眸", "/lǐaw/", "เขา<b>เหลียว</b>มองไปข้างหลัง", "他回头向后看。"],
          ["เงา", "影子", "/ngao/", "ฉันเห็น<b>เงา</b>ของตัวเอง", "我看到了自己的影子。"],
          ["คู่ต่อสู้", "对手，竞争对手", "/khûu dtɔ̀ɔ-sûu/", "เขาเป็น<b>คู่ต่อสู้</b>ที่น่ากลัว", "他是个可怕的对手（竞争对手）。"],
          ["ชะล่าใจ", "麻痹大意", "/chá-lâa-cay/", "อย่า<b>ชะล่าใจ</b>เกินไป", "别太麻痹大意了。"],
          ["นอนเล่น", "躺着歇一歇", "/nɔɔn lên/", "ฉัน<b>นอนเล่น</b>อยู่บนโซฟา", "我躺在沙发上歇一歇。"],
          ["เฉื่อยฉา", "缓慢，迟缓", "/chʉ̀ay-chǎa/", "เขาทำงานอย่าง<b>เฉื่อยฉา</b>", "他工作得很缓慢（迟缓）。"],
          ["ข้า", "我（古代或上对下的称呼）", "/khâa/", "<b>ข้า</b>จะไปหาเจ้า", "我（古）会去找你。"],
          ["พอใจ", "满意", "/phɔɔ-cay/", "ฉัน<b>พอใจ</b>ในผลงาน", "我对作品很满意。"],
          ["เจ้า", "你（对下或亲昵称呼）", "/câo/", "<b>เจ้า</b>เป็นใคร?", "你是（亲昵）谁？"],
          ["หมกมุ่น", "埋头于，沉溺于", "/mòk-mûn/", "เขา<b>หมกมุ่น</b>อยู่กับการอ่าน", "他沉溺于阅读中。"],
          ["แมลงภู่", "蜜蜂、木蜂", "/má-laeng-phûu/", "<b>แมลงภู่</b>ตอมดอกไม้", "蜜蜂在花间飞舞。"],
          ["จิ้งเหลน", "石龙子（蜥蜴的一种）", "/cîng-lěen/", "ฉันเห็น<b>จิ้งเหลน</b>ในสวน", "我在花园里看到了石龙子。"],
          ["แมลงวัน", "苍蝇", "/má-laeng-wan/", "<b>แมลงวัน</b>ตอมอาหาร", "苍蝇叮在食物上。"],
          ["จิ้งจก", "壁虎", "/cîng-còk/", "<b>จิ้งจก</b>เกาะผนัง", "壁虎趴在墙上。"],
          ["สะบัดหน้า", "回过头", "/sà-bàt nâa/", "เธอ<b>สะบัดหน้า</b>หนี", "她（快速）回过头躲开。"],
          ["กระจกเงา", "镜子", "/krà-còk ngao/", "เขาส่อง<b>กระจกเงา</b>", "他在照镜子。"],
          ["เอาแรง", "消除疲劳，恢复体力", "/ao raeng/", "นอนหลับเพื่อ<b>เอาแรง</b>", "睡觉以恢复体力（消除疲劳）。"],
          ["งีบ", "打盹，小睡", "/ngîip/", "ฉันขอ<b>งีบ</b>สักพัก", "我想打个盹。"],
          ["ทำเป็น", "做出...的样子", "/tham bpen/", "เขา<b>ทำเป็น</b>ไม่รู้เรื่อง", "他做出（假装）不知道的样子。"],
          ["เต้นระบำ", "跳舞", "/dtên rá-bam/", "เธอชอบ<b>เต้นระบำ</b>", "她喜欢跳舞。"],
          ["ขี้เกียจ", "懒惰", "/khîi-kìat/", "เขาเป็นคน<b>ขี้เกียจ</b>", "他是个懒惰的人。"],
          ["บิดขี้เกียจ", "伸懒腰", "/bìt khîi-kìat/", "ตื่นมาก็<b>บิดขี้เกียจ</b>", "醒来后就伸个懒腰。"],
          ["หลัง", "背，腰", "/lǎng/", "เขาปวด<b>หลัง</b>", "他背（腰）疼。"],
          ["ตุง", "凸起的", "/dtung/", "กระเป๋าใบนี้ดู<b>ตุง</b>ๆ นะ", "这个包看起来鼓鼓的（凸起的）。"],
          ["เส้นชัย", "终点线", "/sên-chay/", "เขาวิ่งเข้า<b>เส้นชัย</b>เป็นคนแรก", "他是第一个冲过终点线的。"],
          ["เส้นเลือด", "血管", "/sên-lʉ̂at/", "<b>เส้นเลือด</b>ของเขาเห็นชัดมาก", "他的血管看得很清楚。"],
          ["รอบๆ", "周围", "/rɔ̂ɔp-rɔ̂ɔp/", "มีต้นไม้<b>รอบๆ</b> บ้าน", "房子周围有树。"],
          ["พัด", "（风）吹拂", "/phát/", "ลม<b>พัด</b>เย็นสบาย", "风吹拂得很舒服。"],
          ["เฉื่อยฉิว", "徐徐，缓缓", "/chʉ̀ay-chǐw/", "ลมพัด<b>เฉื่อยฉิว</b>", "风徐徐（缓缓）地吹。"],
          ["สบประมาท", "轻视，蔑视，瞧不起", "/sòp-bprà-mâat/", "อย่า<b>สบประมาท</b>คนอื่น", "别轻视（瞧不起）他人。"],
          ["เผลอ", "不快，疏忽，大意", "/phlɤ̌ɤ/", "เขา<b>เผลอ</b>ทำแก้วตก", "他大意（疏忽）把杯子掉地上了。"],
          ["ยังคง", "依然", "/yaŋ khong/", "เขาก็<b>ยังคง</b>รักเธอ", "他依然爱着她。"],
          ["ย่อท้อ", "气馁，灰心，退缩", "/yɔ̂ɔ-thɔ́อ/", "อย่า<b>ย่อท้อ</b>ต่ออุปสรรค", "不要对困难感到气馁。"],
          ["ไม่ย่อท้อ", "不屈不挠", "/mây yɔ̂ɔ-thɔ́อ/", "เขาเป็นคน<b>ไม่ย่อท้อ</b>", "他是个不屈不挠的人。"],
          ["ส่งเสียง", "发出...的声音", "/sòng-sǐang/", "อย่า<b>ส่งเสียง</b>ดังในห้องสมุด", "别在图书馆发出（大声的）声音。"],
          ["กำลังใจ", "信心，勇气", "/kam-laŋ-cay/", "ฉันส่ง<b>กำลังใจ</b>ให้คุณ", "我送给你信心（勇气）。"],
          ["กำลังกาย", "体力", "/kam-laŋ-kaay/", "ออกกำลังเพื่อเพิ่ม<b>กำลังกาย</b>", "锻炼以增强体力。"],
          ["ให้กำลังใจ", "鼓励、给予信心", "/hây kam-laŋ-cay/", "ขอบคุณที่<b>ให้กำลังใจ</b>ฉัน", "谢谢你鼓励（给予信心）我。"],
          ["เนื่องจาก", "由于，因为", "/nʉ̂ang-càak/", "<b>เนื่องจาก</b>ฝนตกเราเลยไม่ได้ไป", "由于下雨我们没去成。"],
          ["ชังน้ำหน้า", "非常讨厌", "/chaŋ nám-nâa/", "ฉัน<b>ชังน้ำหน้า</b>เขาที่สุด", "我最非常讨厌他。"],
          ["สมน้ำหน้า", "活该", "/sǒm-nám-nâa/", "<b>สมน้ำหน้า</b> อยากแกล้งเพื่อนดีนัก", "活该，谁让你想欺负朋友。"],
          ["เงียบเสียง", "不吭声", "/ngîap sǐang/", "ทุกคน<b>เงียบเสียง</b>ฟังครู", "大家都（不吭声）安静地听老师讲。"],
          ["ฝันหวาน", "微笑梦，美梦", "/fǎn-wǎan/", "ขอให้<b>ฝันหวาน</b>นะ", "祝有个美梦（微笑梦）。"],
          ["สะดุ้งตื่น", "惊醒", "/sà-dûng dtʉ̀ʉn/", "เขา<b>สะดุ้งตื่น</b>เพราะเสียงดัง", "他因为巨大的响声而惊醒。"],
          ["ไชโยโห่ร้อง", "欢呼声，叫好声", "/chay-yoo hòo-rɔ́ɔng/", "ทุกคน<b>ไชโยโห่ร้อง</b>ด้วยความยินดี", "大家开心地发出欢呼声。"],
          ["รอยเท้า", "脚印", "/rɔɔy tháo/", "มี<b>รอยเท้า</b>บนพื้นทราย", "沙滩上有脚印。"],
          ["รอยขีด", "划痕", "/rɔɔy khìit/", "มี<b>รอยขีด</b>บนหน้าปัดนาฬิกา", "手表表盘上有划痕。"],
          ["ลักยิ้ม", "酒窝", "/lák-yím/", "เธอมี<b>ลักยิ้ม</b>ที่แก้ม", "她的脸颊上有酒窝。"],
          ["อึดใจ", "憋住气，一会", "/ʉ̀t-cay/", "รออีก<b>อึดใจ</b>เดียวเท่านั้น", "只（一会）再等一会就行。"],
          ["อึดอัด", "压抑，窒息", "/ʉ̀t-àt/", "เขารู้สึก<b>อึดอัด</b>ในห้องแคบๆ", "他在窄小的房间里感到压抑（窒息）。"],
          ["ต่อมา", "后来", "/dtɔ̀ɔ-maa/", "ในเวลา<b>ต่อมา</b> เขาก็ประสบความสำเร็จ", "后来（之后），他获得了成功。"],
          ["ออกแรง", "出力，卖力", "/ɔ̀ɔk-raeng/", "ต้อง<b>ออกแรง</b>เยอะหน่อยนะ", "得卖点力（出力）哦。"],
          ["สาย", "迟、晚", "/sǎay/", "ขอโทษที่มา<b>สาย</b>ครับ", "抱歉我来迟（晚）了。"],
          ["ห้อมล้อม", "围绕，簇拥", "/hɔ̂ɔm-lɔ́ɔm/", "เขามีเพื่อน<b>ห้อมล้อม</b>มากมาย", "他被许多朋友簇拥（围绕）着。"],
          ["นิทาน", "故事", "/ní-thaan/", "แม่เล่า<b>นิทาน</b>ให้ฟัง", "妈妈讲故事给我听。"],
          ["นำมา", "带来", "/nam maa/", "ช่วย<b>นำมา</b>ให้ฉันด้วยนะ", "请把它也带给我。"],
          ["ผิดหวัง", "失望", "/phìt-wǎng/", "อย่าทำให้ฉัน<b>ผิดหวัง</b>นะ", "别让我失望。"],
          ["พ่ายแพ้", "失败", "/phâay-pháe/", "เขา<b>พ่ายแพ้</b>ในการแข่งขัน", "他在比赛中失败了。"],
          ["เพียร", "刻苦，勤奋", "/phian/", "ถ้าเรา<b>เพียร</b>พยายาม เราจะสำเร็จ", "如果我们刻苦（勤奋）努力，就会成功。"],
          ["ประสบ", "取得", "/prà-sòp/", "ขอให้คุณ<b>ประสบ</b>ความสำเร็จ", "祝你取得成功。"],
          ["ประสบการณ์", "经历、经验", "/prà-sòp-kaan/", "นี่คือ<b>ประสบการณ์</b>ที่มีค่า", "这是宝贵的经验（经历）。"],
          ["พากัน", "一起，纷纷", "/phaa kan/", "นก<b>พากัน</b>บินกลับรัง", "鸟儿纷纷（一起）飞回巢穴。"],
          ["จึง", "才，于是", "/cʉng/", "เขาตั้งใจเรียน<b>จึง</b>สอบผ่าน", "他专心学习于是（才）考过了。"],
          ["ข้อคิด", "启示，启发", "/khɔ̂ɔ-khít/", "เรื่องนี้ให้<b>ข้อคิด</b>ที่ดีมาก", "这个故事给了很好的启示（启发）。"],
          ["เย่อหยิ่ง", "骄傲，高傲", "/yɤ̂-yìng/", "เขาเป็นคน<b>เย่อหยิ่ง</b>", "他是个高傲（骄傲）的人。"],
          ["แน่", "一定，肯定", "/nâe/", "เขามา<b>แน่</b>", "他肯定（一定）会来。"],
          ["อวดดี", "自以为是，自大", "/ùat dii/", "อย่า<b>อวดดี</b>เกินไป", "别太自以为是了。"],
          ["ดูถูก", "看不起，瞧不起", "/duu-thùuk/", "อย่า<b>ดูถูก</b>ความสามารถของคนอื่น", "别看不起（瞧不起）别人的能力。"],
          ["ล้าหลัง", "落后，落伍", "/láa-hǎng/", "เทคโนโลยีนี้<b>ล้าหลัง</b>แล้ว", "这项技术已经落后（落伍）了。"],
          ["เปรียบกับ", "与...比较", "/bprìap kàp/", "ถ้า<b>เปรียบกับ</b>เมื่อก่อน ตอนนี้ดีขึ้นมาก", "如果与以前比较，现在好多了。"],
          ["ข้อดี", "优点", "/khɔ̂ɔ dii/", "เขามี<b>ข้อดี</b>หลายอย่าง", "他有很多优点。"],
          ["ข้อเสีย", "缺点，弊病", "/khɔ̂ɔ sǐa/", "ทุกคนต่างมี<b>ข้อเสีย</b>", "每个人都有缺点。"],
          ["ถือว่า", "认为，视为", "/thʉ̌ʉ wâa/", "เขาสอบผ่าน<b>ถือว่า</b>เก่งมาก", "他考过了（被视为）认为很厉害。"],
          ["ก้าวหน้า", "进步", "/kâaw nâa/", "ความรู้ของเขา<b>ก้าวหน้า</b>ไปมาก", "他的知识进步（发展）了很多。"],
          ["สู้", "斗，比", "/sûu/", "เราต้อง<b>สู้</b>ต่อไป", "我们必须继续奋斗（斗）。"],
          ["ถ่อมตัว", "谦虚", "/thɔ̀m-tua/", "เขาเป็นคน<b>ถ่อมตัว</b>มาก", "他是个非常谦虚的人。"],
          ["อธิบาย", "解释", "/à-thí-baay/", "ช่วย<b>อธิบาย</b>ให้ฉันฟังหน่อย", "请帮我解释一下。"],
          ["จริงๆ", "说真的，其实", "/ciŋ-ciŋ/", "ฉันรักคุณ<b>จริงๆ</b> นะ", "说真的（其实），我爱你哦。"],
          ["สนใจ", "注意、重视、感兴趣", "/sǒn-cay/", "เขาสอนเรื่องที่น่า<b>สนใจ</b>", "他教的内容很有趣（感兴趣）。"],
          ["สะกด", "拼写、拼音", "/sà-kòt/", "คำนี้<b>สะกด</b>ยังไง?", "这个词怎么拼写？"],
          ["ออกเสียง", "发音", "/ɔ̀ɔk sǐang/", "กรุณา<b>ออกเสียง</b>ให้ชัดเจน", "请清晰地发音。"],
          ["เพี้ยน", "偏、偏差", "/phían/", "เขาออกเสียง<b>เพี้ยน</b>ไปนิดหน่อย", "他的发音有点偏（偏差）。"],
          ["ประโยค", "句子", "/prà-yòok/", "แต่ง<b>ประโยค</b>โดยใช้คำนี้", "用这个词造句子。"],
          ["ถูกต้อง", "正确", "/thùuk-dtɔ̂ng/", "คำตอบของคุณ<b>ถูกต้อง</b>", "你的回答是正确的。"],
          ["ตัวสะกด", "尾辅音", "/dtua sà-kòt/", "ภาษาไทยมี<b>ตัวสะกด</b>หลายมาตรา", "泰语有多种尾辅音。"],
          ["วรรณยุกต์", "声调符号", "/wan-ná-yúk/", "ภาษาไทยมี<b>วรรณยุกต์</b>ห้าเสียง", "泰语有五个声调（声调符号）。"],
          ["ใจร้อน", "焦急、心急", "/cay-rɔ́ɔn/", "อย่า<b>ใจร้อน</b>สิ ค่อยๆ ทำ", "别心急（焦急），慢慢做。"],
          ["หัด", "练习", "/hàt/", "เขากำลัง<b>หัด</b>เขียนภาษาไทย", "他正在练习写泰语。"],
          ["ทีแรก", "开始，开头", "/thii râek/", "<b>ทีแรก</b>เขาก็ไม่ชอบมัน", "开始（开头）时，他并不喜欢它。"],
          ["แยก", "分开、分离", "/yâek/", "เราควร<b>แยก</b>ขยะก่อนทิ้ง", "我们在扔垃圾前应当分开（分离）它们。"],
          ["แยกจ่ายเงิน", "分开付", "/yâek càay-ngɤn/", "พวกเราจะ<b>แยกจ่ายเงิน</b>นะ", "我们要分开付钱。"],
          ["ตัวจด", "笔记", "/dtua-còt/", "นี่คือ<b>ตัวจด</b>ของฉัน", "这是我的笔记。"],
          ["ลำดับ", "顺序排列", "/lam-dàp/", "เรียงชื่อตาม<b>ลำดับ</b>อักษร", "按照字母顺序排列。"],
          ["ตามลำดับ", "依次，按顺序", "/taam lam-dàp/", "กรุณาเข้าแถว<b>ตามลำดับ</b>", "请按顺序（依次）排队。"],
          ["บทขยาย", "修饰部分", "/bòt khà-yǎay/", "ประโยคนี้มี<b>บทขยาย</b>เยอะ", "这个句子修饰部分（成分）很多。"],
          ["บทขยายคำนาม", "定语", "/bòt khà-yǎay kham-naam/", "คำนี้ทำหน้าที่เป็น<b>บทขยายคำนาม</b>", "这个词充当定语（名词修饰成分）。"],
          ["บทขยายคำกริยา", "状语", "/bòt khà-yǎay kham-krì-yaa/", "นี่เป็น<b>บทขยายคำกริยา</b>", "这是状语（动词修饰成分）。"],
          ["รุ่งขึ้น", "次晨、第二天早晨", "/rûng khʉ̂n/", "ในเช้าวัน<b>รุ่งขึ้น</b> เขาก็จากไป", "在次晨（第二天早晨），他就离开了。"],
          ["รุ่ง", "明亮、灿烂", "/rûng/", "ขอให้ชีวิตคุณรุ่ง<b>รุ่ง</b>เรือง", "祝你的生活光明灿烂（明亮）。"],
          ["ดาว", "星星", "/daaw/", "มองดู<b>ดาว</b>บนท้องฟ้า", "看着天空中的星星。"],
          ["รุ้ง", "彩虹", "/rûng/", "หลังฝนตกจะมี<b>รุ้ง</b>กินน้ำ", "下雨后会有彩虹。"],
          ["ท่อง", "背诵", "/thɔ̂ng/", "เด็กๆ <b>ท่อง</b>สูตรคูณ", "孩子们ใน背诵乘法表。"],
          ["ซ้ำๆ", "反复", "/sâm-sâm/", "อ่าน<b>ซ้ำๆ</b> จะได้จำได้", "反复地读，这样才能记住。"],
          ["คุย", "聊、交谈", "/khuy/", "เรามา<b>คุย</b>กันหน่อย", "我们聊一聊吧（交谈）。"],
          ["ด้วย", "用……", "/dûay/", "เขียน<b>ด้วย</b>ปากกาสีน้ำเงิน", "用（以……方式）蓝色钢笔写。"],
          ["ตัดด้วยมีด", "用刀切", "/dtàt dûay mîit/", "<b>ตัดด้วยมีด</b>จะง่ายกว่า", "用刀切会容易些。"],
          ["ซ้ำชั้น", "留级", "/sâm chǎn/", "เขาต้องเรียน<b>ซ้ำชั้น</b>", "他必须留级。"],
          ["กลัว", "害怕", "/klua/", "ฉัน<b>กลัว</b>ความมืด", "我害怕黑暗。"],
          ["อาย", "害羞", "/aay/", "เขา<b>อาย</b>เมื่อต้องพูดต่อหน้าคนเยอะๆ", "当要在很多人面前讲话时，他会害羞。"],
          ["เขิน", "害羞", "/khɤ̌rn/", "เธอยิ้มอย่าง<b>เขิน</b>ๆ", "她害羞地笑了。"],
          ["ช่วยเหลือ", "帮助", "/chûay lʉ̌a/", "ขอบคุณที่<b>ช่วยเหลือ</b>ฉัน", "谢谢你帮助我。"],
          ["แนะนำ", "介绍、指导", "/náe nam/", "ช่วย<b>แนะนำ</b>ตัวเองหน่อย", "请自我介绍（指导）一下。"],
          ["สำเร็จ", "成功、完成", "/sǎm-rèt/", "ในที่สุดเขาก็ทำ<b>สำเร็จ</b>", "他最终完成了（成功）。"],
          ["ชี้แจง", "解释、说明", "/chíi-caeng/", "เขากำลัง<b>ชี้แจง</b>เหตุผล", "他正在解释说明原因。"],
          ["ชี้", "指、指出", "/chíi/", "เขา<b>ชี้</b>มือไปที่รูปภาพ", "他用手指着（指出）照片。"],
          ["ชิด", "紧挨、紧靠", "/chít/", "จอดรถให้<b>ชิด</b>ขอบทาง", "请靠边（紧挨着）停车。"],
          ["แซงรถ", "超车", "/saeng rót/", "ห้าม<b>แซงรถ</b>ในที่คับขัน", "禁止在危险处超车。"],
          ["แซงคิว", "插队", "/saeng khiiw/", "อย่า<b>แซงคิว</b>คนอื่นสิ", "别插队。"],
          ["นิ้ว", "手指", "/níw/", "เขาเจ็บ<b>นิ้ว</b>มือ", "他手指疼。"],
          ["นึกว่า", "以为（过去的想法）", "/nʉ́k wâa/", "ฉัน<b>นึกว่า</b>คุณเป็นเพื่อนเขา", "我以为（当时的想法）你是他的朋友。"],
          ["รบกวน", "打扰", "/róp-kuan/", "ขอโทษที่<b>รบกวน</b>เวลานะครับ", "抱歉打扰你的时间。"],
          ["ทีหลัง", "以后，下次", "/thii lǎng/", "คราว<b>ทีหลัง</b>อย่าทำแบบนี้อีกนะ", "下次（以后）别再这样做了。"],
          ["ปรึกษา", "商量，请教", "/bprʉ̀k sǎa/", "ฉันอยาก<b>ปรึกษา</b>เรื่องงาน", "我想请教（商量）工作的事。"],
          ["ที่ปรึกษา", "顾问", "/thîi bprʉ̀k sǎa/", "เขาเป็น<b>ที่ปรึกษา</b>ส่วนตัว", "他是私人顾问。"],
          ["ทุกเวลา", "随时", "/thúk wee-laa/", "คุณโทรหาฉันได้<b>ทุกเวลา</b>", "你随时可以给我打电话。"],
          ["มัน", "它，油腻", "/man/", "ฉันไม่ชอบกินอาหาร<b>มัน</b>ๆ", "我不喜欢吃油腻的食物（或指：它）。"],
          ["ตนเอง", "自己", "/ton-eeng/", "เราต้องพึ่งพา<b>ตนเอง</b>", "我们要依靠自己。"],
          ["เพื่อน", "朋友", "/phʉ̂an/", "เขาเป็น<b>เพื่อน</b>ที่แสนดี", "他是个好朋友。"],
          ["สนิท", "亲密", "/sà-nìt/", "พวกเขาเป็นเพื่อนที่<b>สนิท</b>กันมาก", "他们是关系非常亲密的朋友。"],
          ["เพื่อนสนิท", "好朋友", "/phʉ̂an sà-nìt/", "นี่คือ<b>เพื่อนสนิท</b>ของฉัน", "这是我的好朋友（闺蜜/哥们）。"],
          ["เหมือน", "像……一样", "/mʉ̌an/", "ลูกหน้าตา<b>เหมือน</b>แม่", "孩子长得像妈妈一样。"],
          ["ซึ่งกันและกัน", "互相", "/sʉ̂ng kan láe kan/", "เราต้องช่วยเหลือ<b>ซึ่งกันและกัน</b>", "我们应当互相帮助。"],
          ["ต่อ", "继续，对", "/dtɔ̀ɔ/", "เราคุยกัน<b>ต่อ</b>นะ", "我们继续聊吧。"],
          ["ดูแล", "照料、照顾", "/duu-lae/", "ช่วย<b>ดูแล</b>สุขภาพด้วยนะ", "请照顾（照料）好身体健康。"],
          ["ชีวิตความเป็นอยู่", "生活状况", "/chii-wít khwaam bpen yùu/", "<b>ชีวิตความเป็นอยู่</b>ของเขาดีขึ้น", "他的生活状况变好了。"],
          ["อ่านไม่ออก", "不会念，不会读", "/àan mây ɔ̀ɔk/", "ตัวหนังสือเล็กมากจนฉัน<b>อ่านไม่ออก</b>", "字太小了以至于我不会念（读）。"],
          ["แก้ไข", "修改，纠正，解决", "/kâe khǎy/", "คุณควร<b>แก้ไข</b>ข้อผิดพลาด", "你应该纠正（修改）错误。"],
          ["ความรู้", "知识，学问", "/khwaam rúu/", "การอ่านหนังสือช่วยเพิ่ม<b>ความรู้</b>", "读书能增加知识（学问）。"],
          ["ข้อบกพร่อง", "缺点，毛病", "/khɔ̂ɔ bòk-phrɔ̂ng/", "เราต้องยอมรับ<b>ข้อบกพร่อง</b>ของตัวเอง", "我们必须承认自己的缺点（毛病）。"],
          ["เคารพ", "尊重，尊敬", "/khaw-róp/", "เราควร<b>เคารพ</b>ผู้อาวุโส", "我们应当尊敬（尊重）长辈。"],
          ["นับถือ", "尊敬，信仰", "/náp-thʉ̌ʉ/", "ฉัน<b>นับถือ</b>ในความพยายามของเขา", "我非常尊敬（佩服）他的努力。"],
          ["นับถือศาสนาพุทธ", "信奉佛教", "/náp-thʉ̌ʉ sǎat-sà-nǎa phút/", "ครอบครัวฉัน<b>นับถือศาสนาพุทธ</b>", "我的家人信奉佛教。"],
          ["เอาใจใส่", "关心", "/ao-cay sày/", "เขา<b>เอาใจใส่</b>ในการทำงาน", "他很关心（投入）工作。"],
          ["ไม่เพียงแต่...ยัง...อีกด้วย", "不仅…而且…", "/mây phiang dtàe... yaŋ... ìik dûay/", "เขา<b>ไม่เพียงแต่</b>หล่อ<b>ยัง</b>นิสัยดี<b>อีกด้วย</b>", "他不仅长得帅，而且性格也好。"],
          ["แตกต่าง", "各自有区别的", "/dtàek dtàang/", "สองสิ่งนี้มีที่มาที่<b>แตกต่าง</b>กัน", "这两样东西有着各自有区别的来源。"],
          ["เสียงยาว", "长音", "/sǐang yaaw/", "สระนี้ออกเป็น<b>เสียงยาว</b>", "这个元音发长音。"],
          ["ความหมาย", "意思，意义", "/khwaam-mǎay/", "คำนี้มี<b>ความหมาย</b>ว่าอะไร?", "这个词是什么意思（意义）？"],
          ["ต่างกัน", "不同，有差别", "/dtàang kan/", "พวกเรามีความคิดที่<b>ต่างกัน</b>", "我们有着不同的（有差别的）想法。"],
          ["ไวยากรณ์", "语法", "/way-yaa-kɔɔn/", "เรียนภาษาต้องรู้<b>ไวยากรณ์</b>", "学语言必须懂语法。"],
          ["สังเกต", "注意、观察", "/sǎng-kèet/", "เขามักจะเป็นคนช่าง<b>สังเกต</b>", "他通常是个善于观察（注意）的人。"],
          ["ข้อแตกต่าง", "区别，差别", "/khɔ̂ɔ dtàek dtàang/", "อะไรคือ<b>ข้อแตกต่าง</b>ระหว่างสองคนนี้", "这两个人之间有什么区别（差别）？"],
          ["ข้อสอบ", "考试题", "/khɔ̂ɔ-sɔ̀ɔp/", "<b>ข้อสอบ</b>ชุดนี้ยากมาก", "这套考试题非常难。"],
          ["ข้อสังเกต", "注释", "/khɔ̂ɔ sǎng-kèet/", "เขามี<b>ข้อสังเกต</b>เพิ่มเติมเกี่ยวกับเรื่องนี้", "他关于此事有额外的注释（观察点）。"],
          ["แตก", "破，裂", "/dtàek/", "แก้ว<b>แตก</b>หมดแล้ว", "杯子都破（裂）了。"],
          ["เหงื่อแตก", "满头大汗", "/ngʉ̀at dtàek/", "เขาวิ่งจน<b>เหงื่อแตก</b>", "他跑得满头大汗。"],
          ["ความลับแตก", "秘密泄露", "/khwaam láp dtàek/", "สุดท้าย<b>ความลับแตก</b>จนได้", "秘密最终还是泄露了。"],
          ["ไข่แตก", "鸡蛋碎了", "/khày dtàek/", "ระวัง<b>ไข่แตก</b>นะ", "小心鸡蛋碎了。"]
        ];

        const basic2Cards: Card[] = rawData2.map((item, idx) => ({
            id: `basic_thai_2_${idx}`,
            frontType: 'text' as const,
            frontContent: item[0],
            backType: 'text' as const,
            backContent: `${item[1]}\n\n例句: ${item[3]}\n(${item[4]})`,
            phonetic: item[2],
            folderId: BASIC_THAI_2_FOLDER_ID,
            tags: ['thai', 'basic_2'],
            createdAt: Date.now(),
            nextReviewTime: 0,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5
        }));
        newCards.push(...basic2Cards);
    }
    
    // For this specific 'thought' block, I'll skip listing all data. 
    // In the XML output, I will strictly follow the "Full content of file" rule.
    return { cards: newCards, folders: newFolders };
};

// --- Sub-components for Screens ---

const WelcomeScreen: React.FC<{ onComplete: (settings: Settings) => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  
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
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Gemini API Key (可选)</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-moe-primary font-bold hover:underline mr-1">申请 Key &rarr;</a>
            </div>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="粘贴 API Key (用于AI功能)" className="w-full bg-moe-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-moe-200 outline-none text-moe-text transition-all" />
            <p className="text-[10px] text-gray-400 mt-1 ml-2">没有 Key 也可以稍后在设置中添加。</p>
          </div>
        </div>
        <button disabled={!name} onClick={() => onComplete({ userName: name, apiKey: apiKey })} className="w-full mt-8 bg-moe-text text-white font-bold py-4 rounded-3xl hover:shadow-lg disabled:opacity-50 transition-all active:scale-95">开始旅程</button>
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
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    onUpdateSettings({ ...settings, userName: name, apiKey: apiKey });
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
          
          <h3 className="font-bold text-moe-text text-lg flex items-center gap-2 mt-6"><Key size={20} className="text-moe-primary"/> API 配置</h3>
          <div className="bg-moe-50/50 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Gemini API Key</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-moe-primary font-bold hover:underline">申请 Key &rarr;</a>
            </div>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="粘贴 API Key..." className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-moe-200 border border-gray-100" />
            <p className="text-xs text-gray-400 mt-2">用于 AI 自动生成卡片功能。请确保 Key 有效。</p>
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
  folders: Folder[], initialFolderId: string, onBack: () => void, onSaveBatch: (cards: Omit<Card, 'id' | 'createdAt' | 'nextReviewTime' | 'interval' | 'repetition' | 'easeFactor'>[]) => void,
  apiKey?: string 
}> = ({ folders, initialFolderId, onBack, onSaveBatch, apiKey }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewCards, setPreviewCards] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const handleAIProcess = async () => {
    if (!inputText.trim()) return; setIsLoading(true);
    const words = inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    try { const results = await generateFlashcardsFromList(words, apiKey); setPreviewCards(results); } 
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

    // Seed data with all folders
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
  let dueCards = folderCards.filter(c => c.nextReviewTime <= Date.now()).sort((a,b) => a.nextReviewTime - b.nextReviewTime);
  
  if (currentFolderId === THAI_FOLDER_ID) {
    dueCards = shuffleArray(dueCards);
  }

  const currentFolder = folders.find(f => f.id === currentFolderId);

  return (
    <div className="w-full h-[100dvh] bg-moe-50 overflow-hidden relative font-sans text-moe-text">
      {view === ViewState.HOME && (<HomeScreen user={settings.userName} totalCards={folderCards.length} dueCount={dueCards.length} folders={folders} currentFolderId={currentFolderId} onSwitchFolder={setCurrentFolderId} onCreateFolder={handleCreateFolder} onNavigate={setView} onOpenSettings={() => setShowSettings(true)} />)}
      {(view === ViewState.CREATE || view === ViewState.CREATE_DRAW) && (<CreateCardScreen initialMode={view === ViewState.CREATE_DRAW ? 'image' : 'text'} folders={folders} initialFolderId={currentFolderId} onBack={() => setView(ViewState.HOME)} onSave={addCard} />)}
      {view === ViewState.IMPORT && (<ImportScreen folders={folders} initialFolderId={currentFolderId} onBack={() => setView(ViewState.HOME)} onSaveBatch={addBatchCards} apiKey={settings?.apiKey} />)}
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