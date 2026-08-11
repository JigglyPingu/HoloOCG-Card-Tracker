  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
  import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
  import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyB3oy1AZaIlbM5TdFs-mmNb_F-RcqBHZN0",
    authDomain: "holoocg-card-tracker.firebaseapp.com",
    projectId: "holoocg-card-tracker",
    storageBucket: "holoocg-card-tracker.firebasestorage.app",
    messagingSenderId: "62008984406",
    appId: "1:62008984406:web:a1616a8e7f8924f55accf7",
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  // All devices read this one fixed document; only a signed-in (password)
  // account can write to it — see the Firestore rules for the actual gate.
  const BINDER_DOC_REF = doc(db, "binder", "shared");

  let canEdit = false;

  function setSyncStatus(state, label) {
    const el = document.getElementById("syncStatus");
    el.className = "sync-status " + state;
    el.innerHTML = `<span class="sync-dot"></span>${label}`;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function applyEditability() {
    const authBtn = document.getElementById("authLinkBtn");
    const addBtn = document.getElementById("openAddCardBtn");
    authBtn.textContent = canEdit ? "Signed in ✓" : "Sign in to edit";
    authBtn.className = "auth-link" + (canEdit ? " signed-in" : "");
    addBtn.style.display = canEdit ? "" : "none";
    renderContent();
  }

  const FOIL_RARITIES = new Set(["OSR", "SEC", "OUR", "UR", "SY", "HR", "SR"]);
  const STORAGE_KEY = "oshi-binder-ownership";

  // Card database — one entry per known card, sourced from the official hOCG card list.
  // "set" is the primary set tab; a card's own number prefix may differ from the
  // starter deck/booster it's being tracked from since many support cards are reprints.
  const CARD_DATABASE = [
    { number: "hSD11-001", name: "虎金妃笑虎", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hSD11-003", name: "虎金妃笑虎", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hSD11-004", name: "虎金妃笑虎", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hSD11-005", name: "虎金妃笑虎", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hSD11-006", name: "虎金妃笑虎", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hSD11-008", name: "水宮枢", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD11-009", name: "水宮枢", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP01-104", name: "ふつうのパソコン", type: "サポート・アイテム", rarity: "C", color: "無" },
    { number: "hSD01-016", name: "春先のどか", type: "サポート・スタッフ・LIMITED", rarity: "C", color: "無" },
    { number: "hSD01-017", name: "マネちゃん", type: "サポート・スタッフ・LIMITED", rarity: "C", color: "無" },
    { number: "hSD01-019", name: "スゴイパソコン", type: "サポート・アイテム・LIMITED", rarity: "C", color: "無" },
    { number: "hSD10-010", name: "響咲リオナ", type: "ホロメン", rarity: "RR", color: "無" },
    { number: "hSD10-011", name: "WHAT'S UP!!!!! KEEEEEP GROWING!!!!!", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hSD10-012", name: "FLOW GLOW", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hSD10-013", name: "ふぐ太郎", type: "サポート・ツール", rarity: "C", color: "無" },

    // hSD12 — スタートデッキ 推し Advent (26/26 confirmed)
    { number: "hBP04-063", name: "古石ビジュー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hSD12-001", name: "シオリ・ノヴェラ", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hSD12-002", name: "古石ビジュー", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hSD12-003", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD12-004", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD12-005", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hSD12-006", name: "シオリ・ノヴェラ", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hSD12-007", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hSD12-008", name: "古石ビジュー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hSD12-009", name: "古石ビジュー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hSD12-010", name: "古石ビジュー", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hSD12-011", name: "古石ビジュー", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hSD12-012", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hSD12-013", name: "モココ・アビスガード", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hSD12-014", name: "フワワ・アビスガード", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD12-015", name: "脱獄を果たした共犯者たち", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hSD12-016", name: "GEOW", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-108", name: "じゃあ敵だね", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-077", name: "レトロパソコン", type: "サポート・アイテム・LIMITED", rarity: "C", color: "無" },
    { number: "hBP04-050", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP04-096", name: "Advent", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP05-074", name: "フレンドリーパソコン", type: "サポート・アイテム", rarity: "C", color: "無" },
    { number: "hY04-001", name: "青エール", type: "エール", rarity: "C", color: "青" },
    { number: "hY05-001", name: "紫エール", type: "エール", rarity: "C", color: "紫" },

    // hBP08 — ブースターパック バウンサーバウンド (Set 8) — 250 of 251 confirmed (1 dup already in DB)
    { number: "hBP01-028", name: "IRyS", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-056", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-062", name: "小鳥遊キアラ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP02-018", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP02-061", name: "一伊那尓栖", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-037", name: "モココ・アビスガード", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-040", name: "フワワ・アビスガード", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP03-080", name: "音乃瀬奏", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-028", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP08-001", name: "IRyS", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP08-002", name: "セシリア・イマーグリーン", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP08-003", name: "FUWAMOCO", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP08-004", name: "水宮枢", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP08-005", name: "鷹嶺ルイ", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP08-006", name: "一伊那尓栖", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP08-007", name: "音乃瀬奏", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP08-008", name: "IRyS", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP08-009", name: "IRyS", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP08-010", name: "IRyS", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP08-011", name: "IRyS", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP08-012", name: "IRyS", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP08-013", name: "IRyS", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP08-014", name: "IRyS", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP08-015", name: "ときのそら", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP08-016", name: "ときのそら", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP08-017", name: "ときのそら", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP08-018", name: "ときのそら", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP08-019", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP08-020", name: "響咲リオナ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP08-021", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP08-022", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP08-023", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP08-024", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP08-025", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP08-026", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP08-027", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP08-028", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP08-029", name: "風真いろは", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP08-030", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP08-031", name: "パヴォリア・レイネ", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP08-032", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP08-033", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP08-034", name: "モココ・アビスガード", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP08-035", name: "モココ・アビスガード", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP08-036", name: "モココ・アビスガード", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP08-037", name: "モココ・アビスガード", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-038", name: "モココ・アビスガード", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-039", name: "モココ・アビスガード", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP08-040", name: "百鬼あやめ", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-041", name: "小鳥遊キアラ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP08-042", name: "小鳥遊キアラ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP08-043", name: "小鳥遊キアラ", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-044", name: "小鳥遊キアラ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP08-045", name: "ハコス・ベールズ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-046", name: "エリザベス・ローズ・ブラッドフレイム", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP08-047", name: "水宮枢", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP08-048", name: "水宮枢", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP08-049", name: "水宮枢", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP08-050", name: "水宮枢", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP08-051", name: "水宮枢", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP08-052", name: "水宮枢", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP08-053", name: "水宮枢", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP08-054", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP08-055", name: "フワワ・アビスガード", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP08-056", name: "フワワ・アビスガード", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP08-057", name: "フワワ・アビスガード", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP08-058", name: "フワワ・アビスガード", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP08-059", name: "フワワ・アビスガード", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP08-060", name: "FUWAMOCO", type: "ホロメン", rarity: "R", color: "青赤" },
    { number: "hBP08-061", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-062", name: "鷹嶺ルイ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP08-063", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-064", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-065", name: "鷹嶺ルイ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP08-066", name: "鷹嶺ルイ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP08-067", name: "鷹嶺ルイ", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP08-068", name: "一伊那尓栖", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-069", name: "一伊那尓栖", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP08-070", name: "一伊那尓栖", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-071", name: "一伊那尓栖", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP08-072", name: "一伊那尓栖", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP08-073", name: "一伊那尓栖", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP08-074", name: "一伊那尓栖", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP08-075", name: "ロボ子さん", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP08-076", name: "癒月ちょこ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP08-077", name: "音乃瀬奏", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP08-078", name: "音乃瀬奏", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP08-079", name: "音乃瀬奏", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP08-080", name: "音乃瀬奏", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP08-081", name: "音乃瀬奏", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP08-082", name: "音乃瀬奏", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP08-083", name: "音乃瀬奏", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP08-084", name: "夏色まつり", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP08-085", name: "不知火フレア", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP08-086", name: "不知火フレア", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP08-087", name: "不知火フレア", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP08-088", name: "不知火フレア", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP08-089", name: "ジジ・ムリン", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP08-090", name: "エレガントパソコン", type: "サポート・アイテム・LIMITED", rarity: "C", color: "無" },
    { number: "hBP08-091", name: "クリエイターパソコン", type: "サポート・アイテム", rarity: "U", color: "無" },
    { number: "hBP08-092", name: "思い出のドーナツショップ", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-093", name: "ちょこのなすユッケ", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP08-094", name: "パパは仕事を辞める", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-095", name: "破滅の呪文", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP08-096", name: "優しいモンスター", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-097", name: "りっちしょこらのハンバーグ", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP08-098", name: "hololive Mythology", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-099", name: "HOLOTORI", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP08-100", name: "Myth", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-101", name: "We are ReGLOSS", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP08-102", name: "クールなパーカー", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP08-103", name: "ホロマント", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP08-104", name: "けはい", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP08-105", name: "Bloom＆Gloom", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP08-106", name: "GuyRyS", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP08-107", name: "Otomo", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP08-108", name: "いたずらなRuffians", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP08-109", name: "ルイ友", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP08-110", name: "Takodachi", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hSD11-007", name: "水宮枢", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hY01-013", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-011", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-015", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-012", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-010", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },
    { number: "hY06-010", name: "黄エール", type: "エール", rarity: "SY", color: "黄" },

    // hBP07 — ブースターパック「ディーヴァフィーバー」(Set 7) — 247 of 249 confirmed (2 dups already in DB)
    { number: "hBP01-024", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-044", name: "AZKi", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-092", name: "オーロ・クロニー", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-124", name: "開拓者", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP02-024", name: "大神ミオ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP02-101", name: "ミオファ", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-031", name: "赤井はあと", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-067", name: "角巻わため", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-112", name: "わためいと", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hBP04-054", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP04-083", name: "桃鈴ねね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP07-001", name: "角巻わため", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP07-002", name: "ベスティア・ゼータ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP07-003", name: "大神ミオ", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP07-004", name: "赤井はあと", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP07-005", name: "オーロ・クロニー", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP07-006", name: "AZKi", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP07-007", name: "桃鈴ねね", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP07-008", name: "角巻わため", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-009", name: "角巻わため", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP07-010", name: "角巻わため", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-011", name: "角巻わため", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-012", name: "角巻わため", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP07-013", name: "角巻わため", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP07-014", name: "角巻わため", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP07-015", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-016", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP07-017", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-018", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP07-019", name: "ベスティア・ゼータ", type: "Buzzホロメン", rarity: "R", color: "白" },
    { number: "hBP07-020", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP07-021", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP07-022", name: "白銀ノエル", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP07-023", name: "大神ミオ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP07-024", name: "大神ミオ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP07-025", name: "大神ミオ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP07-026", name: "大神ミオ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP07-027", name: "大神ミオ", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP07-028", name: "大神ミオ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP07-029", name: "大神ミオ", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP07-030", name: "風真いろは", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP07-031", name: "アイラニ・イオフィフティーン", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP07-032", name: "輪堂千速", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP07-033", name: "輪堂千速", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP07-034", name: "輪堂千速", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP07-035", name: "輪堂千速", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP07-036", name: "赤井はあと", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP07-037", name: "赤井はあと", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP07-038", name: "赤井はあと", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP07-039", name: "赤井はあと", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP07-040", name: "赤井はあと", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP07-041", name: "赤井はあと", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP07-042", name: "赤井はあと", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP07-043", name: "さくらみこ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP07-044", name: "尾丸ポルカ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP07-045", name: "ハコス・ベールズ", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP07-046", name: "エリザベス・ローズ・ブラッドフレイム", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP07-047", name: "エリザベス・ローズ・ブラッドフレイム", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP07-048", name: "エリザベス・ローズ・ブラッドフレイム", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP07-049", name: "エリザベス・ローズ・ブラッドフレイム", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP07-050", name: "オーロ・クロニー", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP07-051", name: "オーロ・クロニー", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP07-052", name: "オーロ・クロニー", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP07-053", name: "オーロ・クロニー", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP07-054", name: "オーロ・クロニー", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hBP07-055", name: "オーロ・クロニー", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP07-056", name: "オーロ・クロニー", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP07-057", name: "猫又おかゆ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP07-058", name: "こぼ・かなえる", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP07-059", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP07-060", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP07-061", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP07-062", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP07-063", name: "AZKi", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP07-064", name: "AZKi", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP07-065", name: "AZKi", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP07-066", name: "AZKi", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP07-067", name: "AZKi", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP07-068", name: "AZKi", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP07-069", name: "AZKi", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP07-070", name: "癒月ちょこ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP07-071", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP07-072", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP07-073", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP07-074", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP07-075", name: "古石ビジュー", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP07-076", name: "ネリッサ・レイヴンクロフト", type: "Buzzホロメン", rarity: "R", color: "紫" },
    { number: "hBP07-077", name: "桃鈴ねね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP07-078", name: "桃鈴ねね", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP07-079", name: "桃鈴ねね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP07-080", name: "桃鈴ねね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP07-081", name: "桃鈴ねね", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP07-082", name: "桃鈴ねね", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP07-083", name: "桃鈴ねね", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP07-084", name: "夏色まつり", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP07-085", name: "不知火フレア", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP07-086", name: "ジジ・ムリン", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP07-087", name: "虎金妃笑虎", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP07-088", name: "虎金妃笑虎", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP07-089", name: "虎金妃笑虎", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP07-090", name: "虎金妃笑虎", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP07-091", name: "ライブスタッフ", type: "サポート・スタッフ", rarity: "C", color: "無" },
    { number: "hBP07-092", name: "アーカイブパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP07-093", name: "うまみー！", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP07-094", name: "ギリわるロボ", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP07-095", name: "クロスインパクト", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP07-096", name: "ちゃま旅", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP07-097", name: "時の支配者 -Promise-", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP07-098", name: "ビッグゴッドミオーンの占い", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP07-099", name: "ブヒー！", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP07-100", name: "フロンティアスピリット", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP07-101", name: "ASMRマイク", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP07-102", name: "角巻わためのハンマー", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP07-103", name: "ギラファノコギリクワガタ", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP07-104", name: "Thorn", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP07-105", name: "BAZO", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP07-106", name: "ハトタウロス", type: "サポート・マスコット", rarity: "U", color: "無" },
    { number: "hBP07-107", name: "Boros", type: "サポート・マスコット", rarity: "U", color: "無" },
    { number: "hBP07-108", name: "Zecretary", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP07-109", name: "Kronies", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP07-110", name: "ねっ子", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hSD10-002", name: "輪堂千速", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hSD11-002", name: "虎金妃笑虎", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hY01-012", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-010", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-014", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-011", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-009", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },
    { number: "hY06-009", name: "黄エール", type: "エール", rarity: "SY", color: "黄" },

    // hBP06 — ブースターパック「アヤカシヴァーミリオン」(Set 6) — 243 of 243 confirmed
    { number: "hBP01-048", name: "風真いろは", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-072", name: "ハコス・ベールズ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-088", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP02-054", name: "森カリオペ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-009", name: "姫森ルーナ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP03-057", name: "ロボ子さん", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-061", name: "戌神ころね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-016", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP04-043", name: "雪花ラミィ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP04-067", name: "大空スバル", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-079", name: "夏色まつり", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP06-001", name: "ラオーラ・パンテーラ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP06-002", name: "響咲リオナ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP06-003", name: "風真いろは", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP06-004", name: "百鬼あやめ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP06-005", name: "ハコス・ベールズ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP06-006", name: "ムーナ・ホシノヴァ", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP06-007", name: "ロボ子さん", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP06-008", name: "夏色まつり", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP06-009", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP06-010", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP06-011", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP06-012", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP06-013", name: "ラオーラ・パンテーラ", type: "Buzzホロメン", rarity: "R", color: "白" },
    { number: "hBP06-014", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP06-015", name: "響咲リオナ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP06-016", name: "響咲リオナ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP06-017", name: "響咲リオナ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP06-018", name: "響咲リオナ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP06-019", name: "響咲リオナ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP06-020", name: "響咲リオナ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP06-021", name: "博衣こより", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP06-022", name: "風真いろは", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP06-023", name: "風真いろは", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP06-024", name: "風真いろは", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP06-025", name: "風真いろは", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP06-026", name: "風真いろは", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP06-027", name: "風真いろは", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP06-028", name: "姫森ルーナ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP06-029", name: "姫森ルーナ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP06-030", name: "姫森ルーナ", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP06-031", name: "姫森ルーナ", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP06-032", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP06-033", name: "儒烏風亭らでん", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP06-034", name: "百鬼あやめ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP06-035", name: "百鬼あやめ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP06-036", name: "百鬼あやめ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP06-037", name: "百鬼あやめ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP06-038", name: "百鬼あやめ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP06-039", name: "百鬼あやめ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP06-040", name: "ハコス・ベールズ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP06-041", name: "ハコス・ベールズ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP06-042", name: "ハコス・ベールズ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP06-043", name: "ハコス・ベールズ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP06-044", name: "ハコス・ベールズ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP06-045", name: "ハコス・ベールズ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP06-046", name: "鷹嶺ルイ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP06-047", name: "一条莉々華", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP06-048", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP06-049", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP06-050", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP06-051", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP06-052", name: "ムーナ・ホシノヴァ", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hBP06-053", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP06-054", name: "雪花ラミィ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP06-055", name: "沙花叉クロヱ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP06-056", name: "沙花叉クロヱ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP06-057", name: "森カリオペ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP06-058", name: "森カリオペ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP06-059", name: "森カリオペ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP06-060", name: "森カリオペ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP06-061", name: "ロボ子さん", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP06-062", name: "ロボ子さん", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP06-063", name: "ロボ子さん", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP06-064", name: "ロボ子さん", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP06-065", name: "ロボ子さん", type: "Buzzホロメン", rarity: "R", color: "紫" },
    { number: "hBP06-066", name: "ロボ子さん", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP06-067", name: "戌神ころね", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP06-068", name: "戌神ころね", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP06-069", name: "戌神ころね", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP06-070", name: "戌神ころね", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP06-071", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP06-072", name: "夏色まつり", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP06-073", name: "夏色まつり", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP06-074", name: "夏色まつり", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP06-075", name: "夏色まつり", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP06-076", name: "夏色まつり", type: "Buzzホロメン", rarity: "R", color: "黄" },
    { number: "hBP06-077", name: "夏色まつり", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP06-078", name: "大空スバル", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP06-079", name: "大空スバル", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP06-080", name: "大空スバル", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP06-081", name: "大空スバル", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP06-082", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP06-083", name: "ラムダック", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP06-084", name: "AIこより", type: "ホロメン", rarity: "U", color: "◇" },
    { number: "hBP06-085", name: "フェイバリットパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-086", name: "愛情いっぱい召し上がれ♪", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP06-087", name: "しめじダンス", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP06-088", name: "ドッキリうさぎ", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP06-089", name: "ドローイングストリーム", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP06-090", name: "ブルームステージ", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-091", name: "ホロライブ1期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-092", name: "マヨネーズちゅっちゅっ", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP06-093", name: "山田ルイ54世", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-094", name: "ワークアウト", type: "サポート・イベント・LIMITED", rarity: "C", color: "無" },
    { number: "hBP06-095", name: "IDENTIFY -AREA 15-", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-096", name: "2人あわせてラムダック！", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP06-097", name: "カワイイスタジャン", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP06-098", name: "鬼神刀「阿修羅」", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP06-099", name: "ゆび", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP06-100", name: "Chattino", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP06-101", name: "ムーナびと", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP06-102", name: "えびふらいおん", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP06-103", name: "まつりす", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP06-104", name: "スバ友", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hSD02-002", name: "百鬼あやめ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-105", name: "ルーナイト", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hBP03-110", name: "ろぼさー", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hSD02-014", name: "ぽよ余", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hY01-010", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-008", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-013", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-010", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-008", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },
    { number: "hY06-007", name: "黄エール", type: "エール", rarity: "SY", color: "黄" },

    // hSD17 — ライブスタートデッキ 星街すいせい (12 new; 5 shared reprints already in DB)
    { number: "hBP02-084", name: "みっころね24", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hSD14-010", name: "holoAN", type: "サポート・スタッフ・LIMITED", rarity: "C", color: "無" },
    { number: "hSD17-001", name: "星街すいせい", type: "推しホロメン", rarity: "OC", color: "青" },
    { number: "hSD17-002", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD17-003", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD17-004", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD17-005", name: "星街すいせい", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hSD17-006", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD17-007", name: "星街すいせい", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hSD17-008", name: "星街すいせい", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hSD17-009", name: "星街すいせい", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hSD17-010", name: "ステラ", type: "サポート・イベント", rarity: "C", color: "無" },


    // hBP05 — ブースターパック「エンチャントレガリア」(Set 5) — 214 of 217 confirmed (1 dup already in DB)
    { number: "hBP01-032", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-038", name: "兎田ぺこら", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-052", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-068", name: "尾丸ポルカ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-076", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-082", name: "こぼ・かなえる", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP02-008", name: "白上フブキ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-014", name: "白銀ノエル", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-065", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP05-001", name: "白銀ノエル", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP05-002", name: "アイラニ・イオフィフティーン", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP05-003", name: "尾丸ポルカ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP05-004", name: "猫又おかゆ", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP05-005", name: "癒月ちょこ", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP05-006", name: "ネリッサ・レイヴンクロフト", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP05-007", name: "不知火フレア", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP05-008", name: "白銀ノエル", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP05-009", name: "白銀ノエル", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP05-010", name: "白銀ノエル", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP05-011", name: "白銀ノエル", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP05-012", name: "白銀ノエル", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP05-013", name: "ときのそら", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP05-014", name: "兎田ぺこら", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP05-015", name: "兎田ぺこら", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP05-016", name: "兎田ぺこら", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP05-017", name: "姫森ルーナ", type: "Buzzホロメン", rarity: "R", color: "白" },
    { number: "hBP05-018", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP05-019", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP05-020", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP05-021", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP05-022", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP05-023", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP05-024", name: "AZKi", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP05-025", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP05-026", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP05-027", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP05-028", name: "獅白ぼたん", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP05-029", name: "儒烏風亭らでん", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP05-030", name: "尾丸ポルカ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP05-031", name: "尾丸ポルカ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP05-032", name: "尾丸ポルカ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP05-033", name: "尾丸ポルカ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP05-034", name: "尾丸ポルカ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP05-035", name: "さくらみこ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP05-036", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP05-037", name: "星街すいせい", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP05-038", name: "モココ・アビスガード", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP05-039", name: "一条莉々華", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP05-040", name: "miComet", type: "ホロメン", rarity: "U", color: "赤青" },
    { number: "hBP05-041", name: "猫又おかゆ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP05-042", name: "猫又おかゆ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP05-043", name: "猫又おかゆ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP05-044", name: "猫又おかゆ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP05-045", name: "猫又おかゆ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP05-046", name: "雪花ラミィ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP05-047", name: "こぼ・かなえる", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP05-048", name: "こぼ・かなえる", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP05-049", name: "こぼ・かなえる", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP05-050", name: "フワワ・アビスガード", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hBP05-051", name: "火威青", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP05-052", name: "癒月ちょこ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP05-053", name: "癒月ちょこ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP05-054", name: "癒月ちょこ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP05-055", name: "癒月ちょこ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP05-056", name: "癒月ちょこ", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP05-057", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP05-058", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP05-059", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP05-060", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP05-061", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP05-062", name: "常闇トワ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP05-063", name: "不知火フレア", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP05-064", name: "不知火フレア", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP05-065", name: "不知火フレア", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP05-066", name: "不知火フレア", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP05-067", name: "不知火フレア", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP05-068", name: "白上フブキ", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP05-069", name: "白上フブキ", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP05-070", name: "白上フブキ", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP05-071", name: "戌神ころね", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP05-072", name: "角巻わため", type: "Buzzホロメン", rarity: "R", color: "黄" },
    { number: "hBP05-073", name: "アユンダ・リス", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP05-075", name: "牛丼", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP05-076", name: "ちょこのビーフストロガノフ", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP05-077", name: "バカタレサーカス", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP05-078", name: "晩酌配信", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP05-079", name: "み俺恥", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP05-080", name: "SorAZセレブレーション", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP05-081", name: "白銀ノエルのメイス", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP05-082", name: "アキ・ローゼンタールの斧", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP05-083", name: "ネリッサ・レイヴンクロフトの杖", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP05-084", name: "角巻わためのハープ", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP05-085", name: "みこだにぇー", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP05-086", name: "Cilus", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP05-087", name: "Jailbird", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hSD03-002", name: "猫又おかゆ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hSD04-002", name: "癒月ちょこ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hSD07-002", name: "不知火フレア", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP01-114", name: "石の斧", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP01-126", name: "座員", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP05-044-P2", name: "猫又おかゆ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hY01-007", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-006", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-009", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-006", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-005", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },
    { number: "hY06-005", name: "黄エール", type: "エール", rarity: "SY", color: "黄" },

    // hBP04 — ブースターパック「キュリアスユニバース」(Set 4) — 211 of 225 confirmed (10 dups already in DB)
    { number: "hBP04-001", name: "博衣こより", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP04-002", name: "儒烏風亭らでん", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP04-003", name: "一条莉々華", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP04-004", name: "雪花ラミィ", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP04-005", name: "ラプラス・ダークネス", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP04-006", name: "大空スバル", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP04-007", name: "アーニャ・メルフィッサ", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP04-008", name: "博衣こより", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP04-009", name: "博衣こより", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP04-010", name: "博衣こより", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP04-011", name: "博衣こより", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP04-012", name: "博衣こより", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP04-013", name: "博衣こより", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP04-014", name: "白上フブキ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP04-015", name: "IRyS", type: "Buzzホロメン", rarity: "R", color: "白" },
    { number: "hBP04-017", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP04-018", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP04-019", name: "ラオーラ・パンテーラ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP04-020", name: "儒烏風亭らでん", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP04-021", name: "儒烏風亭らでん", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP04-022", name: "儒烏風亭らでん", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP04-023", name: "儒烏風亭らでん", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP04-024", name: "儒烏風亭らでん", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP04-025", name: "儒烏風亭らでん", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP04-026", name: "大神ミオ", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP04-027", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP04-029", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP04-030", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP04-031", name: "セシリア・イマーグリーン", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP04-032", name: "一条莉々華", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP04-033", name: "一条莉々華", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP04-034", name: "一条莉々華", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP04-035", name: "一条莉々華", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP04-036", name: "一条莉々華", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP04-037", name: "一条莉々華", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP04-038", name: "宝鐘マリン", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP04-039", name: "カエラ・コヴァルスキア", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP04-040", name: "カエラ・コヴァルスキア", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP04-041", name: "カエラ・コヴァルスキア", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP04-042", name: "カエラ・コヴァルスキア", type: "Buzzホロメン", rarity: "RR", color: "赤" },
    { number: "hBP04-044", name: "雪花ラミィ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP04-045", name: "雪花ラミィ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP04-046", name: "雪花ラミィ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP04-047", name: "雪花ラミィ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP04-048", name: "雪花ラミィ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP04-049", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP04-051", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP04-052", name: "シオリ・ノヴェラ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP04-053", name: "シオリ・ノヴェラ", type: "Buzzホロメン", rarity: "RR", color: "青" },
    { number: "hBP04-055", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP04-056", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP04-057", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP04-058", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP04-059", name: "ラプラス・ダークネス", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP04-060", name: "紫咲シオン", type: "Buzzホロメン", rarity: "R", color: "紫" },
    { number: "hBP04-061", name: "クレイジー・オリー", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP04-062", name: "森カリオペ", type: "Buzzホロメン", rarity: "R", color: "紫" },
    { number: "hBP04-064", name: "古石ビジュー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP04-065", name: "古石ビジュー", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP04-066", name: "古石ビジュー", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP04-068", name: "大空スバル", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-069", name: "大空スバル", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-070", name: "大空スバル", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-071", name: "大空スバル", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP04-072", name: "大空スバル", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP04-073", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-074", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-075", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-076", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-077", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP04-078", name: "アーニャ・メルフィッサ", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP04-080", name: "夏色まつり", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-081", name: "夏色まつり", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-082", name: "夏色まつり", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP04-084", name: "桃鈴ねね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP04-085", name: "桃鈴ねね", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP04-086", name: "桃鈴ねね", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP04-087", name: "エリザベス・ローズ・ブラッドフレイム", type: "ホロメン", rarity: "C", color: "◇" },
    { number: "hBP04-088", name: "ジジ・ムリン", type: "ホロメン", rarity: "C", color: "◇" },
    { number: "hBP04-089", name: "ツートンカラーパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP04-090", name: "作業用パソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP04-091", name: "限界飯", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP04-092", name: "ねぽらぼ", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP04-093", name: "ホロライブ2期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP04-094", name: "まいたけダンス", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP04-095", name: "マスコットキャッチャー", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP04-097", name: "緑の試験管", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP04-098", name: "鍛冶ハンマー", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP04-099", name: "古代武器", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP04-100", name: "ココロ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP04-101", name: "だいふく", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP04-102", name: "やめなー", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP04-103", name: "カラス", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP04-104", name: "スバルドダック", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP04-105", name: "こよりの助手くん", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hBP04-106", name: "雪民", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hY01-006", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-005", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-004", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-005", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-004", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },
    { number: "hY06-004", name: "黄エール", type: "エール", rarity: "SY", color: "黄" },

    // hBP03 — ブースターパック「エリートスパーク」(Set 3) — 204 new (see notes for exact gaps)
    { number: "hBP03-001", name: "姫森ルーナ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP03-002", name: "獅白ぼたん", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP03-003", name: "さくらみこ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP03-004", name: "FUWAMOCO", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP03-005", name: "常闇トワ", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP03-006", name: "戌神ころね", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP03-007", name: "角巻わため", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP03-008", name: "アユンダ・リス", type: "推しホロメン", rarity: "OSR", color: "黄" },
    { number: "hBP03-010", name: "姫森ルーナ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP03-011", name: "姫森ルーナ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP03-012", name: "姫森ルーナ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP03-013", name: "姫森ルーナ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP03-014", name: "姫森ルーナ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP03-015", name: "轟はじめ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP03-016", name: "獅白ぼたん", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP03-017", name: "獅白ぼたん", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP03-018", name: "獅白ぼたん", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP03-019", name: "獅白ぼたん", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP03-020", name: "獅白ぼたん", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP03-021", name: "獅白ぼたん", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP03-022", name: "アキ・ローゼンタール", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP03-023", name: "兎田ぺこら", type: "Buzzホロメン", rarity: "R", color: "緑" },
    { number: "hBP03-024", name: "風真いろは", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP03-026", name: "さくらみこ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP03-027", name: "さくらみこ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-028", name: "さくらみこ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP03-029", name: "さくらみこ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP03-030", name: "さくらみこ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP03-032", name: "赤井はあと", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-033", name: "赤井はあと", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP03-034", name: "赤井はあと", type: "Buzzホロメン", rarity: "RR", color: "赤" },
    { number: "hBP03-035", name: "鷹嶺ルイ", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP03-036", name: "小鳥遊キアラ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP03-038", name: "モココ・アビスガード", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-039", name: "モココ・アビスガード", type: "Buzzホロメン", rarity: "R", color: "赤" },
    { number: "hBP03-041", name: "フワワ・アビスガード", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP03-042", name: "フワワ・アビスガード", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP03-043", name: "フワワ・アビスガード", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP03-044", name: "星街すいせい", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP03-045", name: "こぼ・かなえる", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hBP03-046", name: "火威青", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP03-047", name: "火威青", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP03-048", name: "火威青", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP03-049", name: "火威青", type: "Buzzホロメン", rarity: "R", color: "青" },
    { number: "hBP03-050", name: "FUWAMOCO", type: "ホロメン", rarity: "R", color: "青赤" },
    { number: "hBP03-051", name: "常闇トワ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-052", name: "常闇トワ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP03-053", name: "常闇トワ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-054", name: "常闇トワ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP03-055", name: "常闇トワ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP03-056", name: "常闇トワ", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP03-058", name: "ロボ子さん", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP03-059", name: "ロボ子さん", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP03-060", name: "ロボ子さん", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP03-062", name: "戌神ころね", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-063", name: "戌神ころね", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-064", name: "戌神ころね", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-065", name: "戌神ころね", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP03-066", name: "戌神ころね", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP03-068", name: "角巻わため", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-069", name: "角巻わため", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-070", name: "角巻わため", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-071", name: "角巻わため", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP03-072", name: "角巻わため", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP03-073", name: "アユンダ・リス", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-074", name: "アユンダ・リス", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-075", name: "アユンダ・リス", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-076", name: "アユンダ・リス", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-077", name: "アユンダ・リス", type: "ホロメン", rarity: "R", color: "黄" },
    { number: "hBP03-078", name: "アユンダ・リス", type: "ホロメン", rarity: "RR", color: "黄" },
    { number: "hBP03-079", name: "不知火フレア", type: "Buzzホロメン", rarity: "RR", color: "黄" },
    { number: "hBP03-081", name: "音乃瀬奏", type: "ホロメン", rarity: "C", color: "黄" },
    { number: "hBP03-082", name: "音乃瀬奏", type: "ホロメン", rarity: "U", color: "黄" },
    { number: "hBP03-083", name: "音乃瀬奏", type: "Buzzホロメン", rarity: "R", color: "黄" },
    { number: "hBP03-084", name: "ゴージャスパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-085", name: "スーパーパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-086", name: "デュアルモニターパソコン", type: "サポート・アイテム・LIMITED", rarity: "C", color: "無" },
    { number: "hBP03-087", name: "コールアンドレスポンス", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP03-089", name: "ファンミーティング", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-090", name: "ホロライブ言えるかな？", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP03-091", name: "ホロライブインドネシア1期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-092", name: "ホロライブ0期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-093", name: "ホロライブ4期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-094", name: "FPS配信", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-095", name: "ホロキャップ", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP03-096", name: "ライフル", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP03-097", name: "リコーダー", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP03-098", name: "金時", type: "サポート・マスコット", rarity: "U", color: "無" },
    { number: "hBP03-099", name: "マグチ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP03-100", name: "ペロ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP03-101", name: "ビビ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP03-102", name: "フトイヌ", type: "サポート・マスコット", rarity: "U", color: "無" },
    { number: "hBP03-103", name: "ホソイヌ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP03-104", name: "Riscot", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP03-106", name: "SSRB", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-108", name: "はあとん", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-109", name: "Ruffians", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-111", name: "ころねすきー", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-113", name: "Risuners", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP03-025", name: "さくらみこ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP03-088", name: "凸待ち", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP03-107", name: "35P", type: "サポート・ファン", rarity: "U", color: "無" },
    { number: "hY01-001", name: "白エール", type: "エール", rarity: "C", color: "白" },
    { number: "hY02-001", name: "緑エール", type: "エール", rarity: "C", color: "緑" },
    { number: "hY03-001", name: "赤エール", type: "エール", rarity: "C", color: "赤" },
    { number: "hY06-001", name: "黄エール", type: "エール", rarity: "C", color: "黄" },

    // hBP02 — ブースターパック「クインテットスペクトラム」(Set 2) — 206 new (see notes for exact gaps)
    { number: "hBP02-001", name: "白上フブキ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP02-002", name: "パヴォリア・レイネ", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP02-003", name: "宝鐘マリン", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP02-004", name: "沙花叉クロヱ", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP02-005", name: "紫咲シオン", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP02-006", name: "クレイジー・オリー", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP02-007", name: "森カリオペ", type: "推しホロメン", rarity: "OSR", color: "紫" },
    { number: "hBP02-008", name: "白上フブキ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-009", name: "白上フブキ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP02-010", name: "白上フブキ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-011", name: "白上フブキ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP02-012", name: "白上フブキ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP02-013", name: "白上フブキ", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP02-014", name: "白銀ノエル", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-015", name: "白銀ノエル", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP02-017", name: "白銀ノエル", type: "Buzzホロメン", rarity: "RR", color: "白" },
    { number: "hBP02-019", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP02-020", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP02-021", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP02-022", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP02-023", name: "パヴォリア・レイネ", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP02-025", name: "大神ミオ", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP02-026", name: "大神ミオ", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP02-027", name: "大神ミオ", type: "Buzzホロメン", rarity: "RR", color: "緑" },
    { number: "hBP02-029", name: "宝鐘マリン", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP02-033", name: "宝鐘マリン", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP02-034", name: "百鬼あやめ", type: "Buzzホロメン", rarity: "RR", color: "赤" },
    { number: "hBP02-035", name: "沙花叉クロヱ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP02-036", name: "沙花叉クロヱ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP02-037", name: "沙花叉クロヱ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP02-038", name: "沙花叉クロヱ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP02-039", name: "沙花叉クロヱ", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP02-040", name: "沙花叉クロヱ", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP02-041", name: "猫又おかゆ", type: "Buzzホロメン", rarity: "RR", color: "青" },
    { number: "hBP02-042", name: "紫咲シオン", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-043", name: "紫咲シオン", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-044", name: "紫咲シオン", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-045", name: "紫咲シオン", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-046", name: "紫咲シオン", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP02-047", name: "紫咲シオン", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP02-048", name: "クレイジー・オリー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-049", name: "クレイジー・オリー", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-050", name: "クレイジー・オリー", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-051", name: "クレイジー・オリー", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-052", name: "クレイジー・オリー", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP02-053", name: "クレイジー・オリー", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP02-055", name: "森カリオペ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-056", name: "森カリオペ", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-057", name: "森カリオペ", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-058", name: "森カリオペ", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP02-059", name: "森カリオペ", type: "ホロメン", rarity: "RR", color: "紫" },
    { number: "hBP02-060", name: "癒月ちょこ", type: "Buzzホロメン", rarity: "R", color: "紫" },
    { number: "hBP02-062", name: "一伊那尓栖", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-063", name: "一伊那尓栖", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-064", name: "一伊那尓栖", type: "Buzzホロメン", rarity: "RR", color: "紫" },
    { number: "hBP02-065", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-066", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "C", color: "紫" },
    { number: "hBP02-067", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "U", color: "紫" },
    { number: "hBP02-068", name: "ネリッサ・レイヴンクロフト", type: "ホロメン", rarity: "R", color: "紫" },
    { number: "hBP02-069", name: "魔法少女みこ", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-070", name: "魔法少女かなた", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-071", name: "魔法少女ルーナ", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-072", name: "魔法少女シオン", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-073", name: "魔法少女マリン", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-074", name: "魔法少女クロヱ", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP02-075", name: "アイドルサインペン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-078", name: "かなた建設", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-079", name: "爆発の魔法", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP02-081", name: "ホロライブ インドネシア2期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-082", name: "ホロライブゲーマーズ", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-083", name: "魔法のタンス", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP02-085", name: "HOLOLIVE FANTASY", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-086", name: "ホロスパークリング", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP02-087", name: "紫咲シオンの魔法のステッキ", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP02-089", name: "おるやんけ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-090", name: "ネジマキツネ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-091", name: "フブチュン", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-092", name: "フブラ", type: "サポート・マスコット", rarity: "U", color: "無" },
    { number: "hBP02-093", name: "ミテイル", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-094", name: "Tatang", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-096", name: "イヌ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-097", name: "UDIN", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-098", name: "Death-sensei", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP02-099", name: "すこん部", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP02-100", name: "白銀聖騎士団", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP02-102", name: "塩っ子", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP02-028", name: "宝鐘マリン", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP02-030", name: "宝鐘マリン", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP02-032", name: "宝鐘マリン", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP02-076", name: "カスタムパソコン", type: "サポート・アイテム", rarity: "C", color: "無" },
    { number: "hBP02-080", name: "秘密結社holoX", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP02-088", name: "森カリオペの鎌", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP02-095", name: "ドクロくん", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hY01-001", name: "白エール", type: "エール", rarity: "C", color: "白" },
    { number: "hY02-001", name: "緑エール", type: "エール", rarity: "C", color: "緑" },
    { number: "hY03-001", name: "赤エール", type: "エール", rarity: "C", color: "赤" },
    { number: "hY01-003", name: "白エール", type: "エール", rarity: "SY", color: "白" },
    { number: "hY02-002", name: "緑エール", type: "エール", rarity: "SY", color: "緑" },
    { number: "hY03-002", name: "赤エール", type: "エール", rarity: "SY", color: "赤" },
    { number: "hY04-002", name: "青エール", type: "エール", rarity: "SY", color: "青" },
    { number: "hY05-002", name: "紫エール", type: "エール", rarity: "SY", color: "紫" },

    // hBP01 — ブースターパック「ブルーミングレディアンス」(Set 1) — 137 new, 153/153 confirmed complete
    { number: "hBP01-001", name: "天音かなた", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP01-002", name: "七詩ムメイ", type: "推しホロメン", rarity: "OSR", color: "白" },
    { number: "hBP01-003", name: "アキ・ローゼンタール", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP01-004", name: "兎田ぺこら", type: "推しホロメン", rarity: "OSR", color: "緑" },
    { number: "hBP01-005", name: "鷹嶺ルイ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP01-006", name: "小鳥遊キアラ", type: "推しホロメン", rarity: "OSR", color: "赤" },
    { number: "hBP01-007", name: "星街すいせい", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP01-008", name: "こぼ・かなえる", type: "推しホロメン", rarity: "OSR", color: "青" },
    { number: "hBP01-010", name: "天音かなた", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-012", name: "天音かなた", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-014", name: "天音かなた", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP01-015", name: "七詩ムメイ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-016", name: "七詩ムメイ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-017", name: "七詩ムメイ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-018", name: "七詩ムメイ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-019", name: "七詩ムメイ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-020", name: "七詩ムメイ", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP01-021", name: "ときのそら", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-022", name: "ときのそら", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-023", name: "ときのそら", type: "ホロメン", rarity: "RR", color: "白" },
    { number: "hBP01-025", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-026", name: "ベスティア・ゼータ", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-027", name: "ベスティア・ゼータ", type: "Buzzホロメン", rarity: "RR", color: "白" },
    { number: "hBP01-029", name: "IRyS", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-030", name: "IRyS", type: "ホロメン", rarity: "U", color: "白" },
    { number: "hBP01-031", name: "IRyS", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP01-032", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-033", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-034", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-035", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-036", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-037", name: "アキ・ローゼンタール", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP01-038", name: "兎田ぺこら", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-039", name: "兎田ぺこら", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-040", name: "兎田ぺこら", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-042", name: "兎田ぺこら", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP01-043", name: "兎田ぺこら", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP01-045", name: "AZKi", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-046", name: "AZKi", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-047", name: "AZKi", type: "ホロメン", rarity: "RR", color: "緑" },
    { number: "hBP01-049", name: "風真いろは", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-050", name: "風真いろは", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-051", name: "風真いろは", type: "Buzzホロメン", rarity: "RR", color: "緑" },
    { number: "hBP01-052", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-053", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "C", color: "緑" },
    { number: "hBP01-054", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "U", color: "緑" },
    { number: "hBP01-055", name: "アイラニ・イオフィフティーン", type: "ホロメン", rarity: "R", color: "緑" },
    { number: "hBP01-057", name: "鷹嶺ルイ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-058", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-059", name: "鷹嶺ルイ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-060", name: "鷹嶺ルイ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-061", name: "鷹嶺ルイ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP01-063", name: "小鳥遊キアラ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-064", name: "小鳥遊キアラ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-065", name: "小鳥遊キアラ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-066", name: "小鳥遊キアラ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP01-067", name: "小鳥遊キアラ", type: "ホロメン", rarity: "RR", color: "赤" },
    { number: "hBP01-068", name: "尾丸ポルカ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-069", name: "尾丸ポルカ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-070", name: "尾丸ポルカ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-071", name: "尾丸ポルカ", type: "Buzzホロメン", rarity: "RR", color: "赤" },
    { number: "hBP01-073", name: "ハコス・ベールズ", type: "ホロメン", rarity: "C", color: "赤" },
    { number: "hBP01-074", name: "ハコス・ベールズ", type: "ホロメン", rarity: "U", color: "赤" },
    { number: "hBP01-075", name: "ハコス・ベールズ", type: "ホロメン", rarity: "R", color: "赤" },
    { number: "hBP01-076", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-077", name: "星街すいせい", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-078", name: "星街すいせい", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-079", name: "星街すいせい", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-080", name: "星街すいせい", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP01-081", name: "星街すいせい", type: "ホロメン", rarity: "RR", color: "青" },
    { number: "hBP01-082", name: "こぼ・かなえる", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-083", name: "こぼ・かなえる", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-084", name: "こぼ・かなえる", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-085", name: "こぼ・かなえる", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-086", name: "こぼ・かなえる", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-087", name: "こぼ・かなえる", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP01-089", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-090", name: "ムーナ・ホシノヴァ", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-091", name: "ムーナ・ホシノヴァ", type: "Buzzホロメン", rarity: "RR", color: "青" },
    { number: "hBP01-093", name: "オーロ・クロニー", type: "ホロメン", rarity: "C", color: "青" },
    { number: "hBP01-094", name: "オーロ・クロニー", type: "ホロメン", rarity: "U", color: "青" },
    { number: "hBP01-095", name: "オーロ・クロニー", type: "ホロメン", rarity: "R", color: "青" },
    { number: "hBP01-096", name: "兎田ぺこら", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP01-097", name: "不知火フレア", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP01-098", name: "白銀ノエル", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP01-099", name: "宝鐘マリン", type: "ホロメン", rarity: "R", color: "◇" },
    { number: "hBP01-100", name: "森カリオペ", type: "ホロメン", rarity: "C", color: "◇" },
    { number: "hBP01-101", name: "ワトソン・アメリア", type: "ホロメン", rarity: "C", color: "◇" },
    { number: "hBP01-102", name: "アイドルマイク", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-103", name: "ゲーミングパソコン", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-107", name: "アンコール", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hBP01-109", name: "月と兎の物語", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-110", name: "鈍器でぶっ叩くわよ！", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-111", name: "ホロライブインドネシア3期生", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-112", name: "わくわくいたずらタイム", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP01-113", name: "Promise", type: "サポート・イベント・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-115", name: "星街すいせいのマイク", type: "サポート・ツール", rarity: "U", color: "無" },
    { number: "hBP01-117", name: "フレンド", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-118", name: "あん肝", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-119", name: "ジョブズ", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-120", name: "がんも", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-121", name: "Kotori", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-122", name: "ロゼ隊", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP01-123", name: "野うさぎ同盟", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP01-125", name: "KFP", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hBP01-009", name: "天音かなた", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-011", name: "天音かなた", type: "ホロメン", rarity: "C", color: "白" },
    { number: "hBP01-013", name: "天音かなた", type: "ホロメン", rarity: "R", color: "白" },
    { number: "hBP01-105", name: "ペンライト", type: "サポート・アイテム・LIMITED", rarity: "U", color: "無" },
    { number: "hBP01-106", name: "あとは任せた！", type: "サポート・イベント", rarity: "U", color: "無" },
    { number: "hBP01-114", name: "石の斧", type: "サポート・ツール", rarity: "C", color: "無" },
    { number: "hBP01-116", name: "うぱお", type: "サポート・マスコット", rarity: "C", color: "無" },
    { number: "hBP01-126", name: "座員", type: "サポート・ファン", rarity: "C", color: "無" },
    { number: "hSD01-020", name: "ホロリスの輪", type: "サポート・イベント", rarity: "C", color: "無" },
    { number: "hY01-001", name: "白エール", type: "エール", rarity: "C", color: "白" },
    { number: "hY02-001", name: "緑エール", type: "エール", rarity: "C", color: "緑" },
    { number: "hY03-001", name: "赤エール", type: "エール", rarity: "C", color: "赤" },
  ];

    const ENGLISH_NAMES = {
    "AIこより": "AI Koyori",
    "AZKi": "AZKi",
    "FUWAMOCO": "FUWAMOCO",
    "IRyS": "IRyS",
    "miComet": "miComet",
    "こぼ・かなえる": "Kobo Kanaeru",
    "さくらみこ": "Sakura Miko",
    "ときのそら": "Tokino Sora",
    "アイラニ・イオフィフティーン": "Airani Iofifteen",
    "アキ・ローゼンタール": "Aki Rosenthal",
    "アユンダ・リス": "Ayunda Risu",
    "アーニャ・メルフィッサ": "Anya Melfissa",
    "エリザベス・ローズ・ブラッドフレイム": "Elizabeth Rose Bloodflame",
    "オーロ・クロニー": "Ouro Kronii",
    "カエラ・コヴァルスキア": "Kaela Kovalskia",
    "クレイジー・オリー": "Kureiji Ollie",
    "シオリ・ノヴェラ": "Shiori Novella",
    "ジジ・ムリン": "Gigi Murin",
    "セシリア・イマーグリーン": "Cecilia Immergreen",
    "ネリッサ・レイヴンクロフト": "Nerissa Ravencroft",
    "ハコス・ベールズ": "Hakos Baelz",
    "パヴォリア・レイネ": "Pavolia Reine",
    "フワワ・アビスガード": "Fuwawa Abyssgard",
    "ベスティア・ゼータ": "Vestia Zeta",
    "ムーナ・ホシノヴァ": "Moona Hoshinova",
    "モココ・アビスガード": "Mococo Abyssgard",
    "ラオーラ・パンテーラ": "Raora Panthera",
    "ラプラス・ダークネス": "Laplus Darknesss",
    "ラムダック": "LAMBDUCK",
    "ロボ子さん": "Robocosan",
    "ワトソン・アメリア": "Watson Amelia",
    "一伊那尓栖": "Ninomae Ina'nis",
    "一条莉々華": "Ichijou Ririka",
    "七詩ムメイ": "Nanashi Mumei",
    "不知火フレア": "Shiranui Flare",
    "儒烏風亭らでん": "Juufuutei Raden",
    "兎田ぺこら": "Usada Pekora",
    "博衣こより": "Hakui Koyori",
    "古石ビジュー": "Koseki Bijou",
    "夏色まつり": "Natsuiro Matsuri",
    "大神ミオ": "Ookami Mio",
    "大空スバル": "Oozora Subaru",
    "天音かなた": "Amane Kanata",
    "姫森ルーナ": "Himemori Luna",
    "宝鐘マリン": "Houshou Marine",
    "小鳥遊キアラ": "Takanashi Kiara",
    "尾丸ポルカ": "Omaru Polka",
    "常闇トワ": "Tokoyami Towa",
    "戌神ころね": "Inugami Korone",
    "星街すいせい": "Hoshimachi Suisei",
    "桃鈴ねね": "Momosuzu Nene",
    "森カリオペ": "Mori Calliope",
    "水宮枢": "Mizumiya Su",
    "沙花叉クロヱ": "Sakamata Chloe",
    "火威青": "Hiodoshi Ao",
    "猫又おかゆ": "Nekomata Okayu",
    "獅白ぼたん": "Shishiro Botan",
    "癒月ちょこ": "Yuzuki Choco",
    "白上フブキ": "Shirakami Fubuki",
    "白銀ノエル": "Shirogane Noel",
    "百鬼あやめ": "Nakiri Ayame",
    "紫咲シオン": "Murasaki Shion",
    "虎金妃笑虎": "Koganei Niko",
    "角巻わため": "Tsunomaki Watame",
    "赤井はあと": "Akai Haato",
    "輪堂千速": "Rindou Chihaya",
    "轟はじめ": "Todoroki Hajime",
    "雪花ラミィ": "Yukihana Lamy",
    "音乃瀬奏": "Otonose Kanade",
    "響咲リオナ": "Isaki Riona",
    "風真いろは": "Kazama Iroha",
    "魔法少女かなた": "Magical Girl Kanata",
    "魔法少女みこ": "Magical Girl Miko",
    "魔法少女クロヱ": "Magical Girl Chloe",
    "魔法少女シオン": "Magical Girl Shion",
    "魔法少女マリン": "Magical Girl Marine",
    "魔法少女ルーナ": "Magical Girl Luna",
    "鷹嶺ルイ": "Takane Lui",
    "白エール": "White Cheer",
    "紫エール": "Purple Cheer",
    "緑エール": "Green Cheer",
    "赤エール": "Red Cheer",
    "青エール": "Blue Cheer",
    "黄エール": "Yellow Cheer",
    "2人あわせてラムダック！": "2 of Us Form LAMBDUCK",
    "ASMRマイク": "ASMR Microphone",
    "FPS配信": "FPS Stream",
    "SorAZセレブレーション": "SorAZ Celebration",
    "あとは任せた！": "I leave the rest to you!",
    "あん肝": "Ankimo",
    "いたずらなRuffians": "Mischievous Ruffians",
    "うぱお": "Upao",
    "うまみー！": "Umami!",
    "えびふらいおん": "Ebifrion",
    "おるやんけ": "Oruyanku",
    "かなた建設": "Kanata Construction",
    "がんも": "Ganmo",
    "けはい": "Aura",
    "こよりの助手くん": "Koyori's Assistants",
    "ころねすきー": "Koronesuki",
    "しめじダンス": "Shimeji Dance",
    "じゃあ敵だね": "So, That Makes You My Enemy",
    "すこん部": "Sukonbu",
    "だいふく": "Daifuku",
    "ちゃま旅": "Chama Journey",
    "ちょこのなすユッケ": "Choco's Eggplant Yukhoe",
    "ちょこのビーフストロガノフ": "Choco's Beef Stroganoff",
    "ねっ子": "Nekko",
    "ねぽらぼ": "NePoLaBo",
    "はあとん": "Haaton",
    "ふぐ太郎": "Fugutaro",
    "ふつうのパソコン": "Normal PC",
    "ぽよ余": "Poyoyo",
    "まいたけダンス": "Maitake Dance",
    "まつりす": "Matsurisu",
    "みこだにぇー": "Mikodanye",
    "みっころね24": "Mikkorone 24",
    "み俺恥": "DIYMiko",
    "やめなー": "Yamena",
    "ゆび": "Fingers",
    "りっちしょこらのハンバーグ": "Rich Chocolat's Hamburg Steak",
    "ろぼさー": "Roboser",
    "わくわくいたずらタイム": "Exciting Prank Time",
    "わためいと": "Watamates",
    "アイドルサインペン": "Idol's Autograph Pen",
    "アイドルマイク": "Idol Microphone",
    "アキ・ローゼンタールの斧": "Aki Rosenthal's Axe",
    "アンコール": "Encore",
    "アーカイブパソコン": "Archive PC",
    "イヌ": "Inu",
    "エレガントパソコン": "Elegant PC",
    "カスタムパソコン": "Custom PC",
    "カラス": "Karasu",
    "カワイイスタジャン": "Cute Stadium Jacket",
    "ギラファノコギリクワガタ": "Giraffe Stag Beetle",
    "ギリわるロボ": "GiriWaru Robo",
    "クリエイターパソコン": "Creator PC",
    "クロスインパクト": "Cross Impact",
    "クールなパーカー": "Cool Hoodie",
    "ゲーミングパソコン": "Gaming PC",
    "ココロ": "Kokoro",
    "コールアンドレスポンス": "Call and Response",
    "ゴージャスパソコン": "Gorgeous PC",
    "ジョブズ": "Jobs",
    "スゴイパソコン": "Amazing PC",
    "ステラ": "Stellar",
    "スバルドダック": "Subaru Duck",
    "スバ友": "Subatomo",
    "スーパーパソコン": "Super PC",
    "ツートンカラーパソコン": "Two-Tone PC",
    "デュアルモニターパソコン": "Dual-Monitor PC",
    "ドクロくん": "Dokuro-kun",
    "ドッキリうさぎ": "Prankster Rabbit",
    "ドローイングストリーム": "Drawing Stream",
    "ネジマキツネ": "Nejimakitsune",
    "ネリッサ・レイヴンクロフトの杖": "Nerissa Ravencroft's Staff",
    "ハトタウロス": "Pigeotaurus",
    "バカタレサーカス": "BAKATARE CIRCUS",
    "パパは仕事を辞める": "Papa Quits His Job",
    "ビッグゴッドミオーンの占い": "Big God Mion's Fortune Telling",
    "ビビ": "Bibi",
    "ファンミーティング": "Fan Meeting",
    "フェイバリットパソコン": "Favorite PC",
    "フトイヌ": "Futoinu",
    "フブチュン": "Fubu-Chan",
    "フブラ": "Fubzilla",
    "フレンド": "Friend",
    "フレンドリーパソコン": "Friendly PC",
    "フロンティアスピリット": "Frontier Spirit",
    "ブヒー！": "Buhii!",
    "ブルームステージ": "Bloom Stage",
    "ペロ": "Pero",
    "ペンライト": "Penlight",
    "ホソイヌ": "Hosoinu",
    "ホロキャップ": "HoloCap",
    "ホロスパークリング": "holoSparkling",
    "ホロマント": "holoCape",
    "ホロライブ インドネシア2期生": "Hololive Indonesia Gen 2",
    "ホロライブ0期生": "Hololive Gen 0",
    "ホロライブ1期生": "Hololive Gen 1",
    "ホロライブ2期生": "Hololive Gen 2",
    "ホロライブ4期生": "Hololive Gen 4",
    "ホロライブインドネシア1期生": "Hololive Indonesia Gen 1",
    "ホロライブインドネシア3期生": "Hololive Indonesia Gen 3",
    "ホロライブゲーマーズ": "hololive GAMERS",
    "ホロライブ言えるかな？": "Can You Do the Hololive?",
    "ホロリスの輪": "Circle of hololive Listener",
    "マグチ": "Maguchi",
    "マスコットキャッチャー": "Mascot Catcher",
    "マネちゃん": "Manager-chan",
    "マヨネーズちゅっちゅっ": "Sipping Mayonnaise",
    "ミオファ": "Mio-fam",
    "ミテイル": "Miteiru",
    "ムーナびと": "Moonabito",
    "ライフル": "Rifle",
    "ライブスタッフ": "Live Staff",
    "リコーダー": "Recorder",
    "ルイ友": "Lui-tomo",
    "ルーナイト": "Lu-Knights",
    "レトロパソコン": "Retro PC",
    "ロゼ隊": "Rose Knights",
    "ワークアウト": "Workout",
    "作業用パソコン": "Work PC",
    "優しいモンスター": "Gentle Monster",
    "凸待ち": "Totsumachi",
    "古代武器": "Ancient Weapon",
    "塩っ子": "Shiokko",
    "山田ルイ54世": "Yamada Lui the 54th",
    "座員": "Troupe Member",
    "思い出のドーナツショップ": "Donut Shop Full of Memories",
    "愛情いっぱい召し上がれ♪": "For You with Lots of Love",
    "星街すいせいのマイク": "Hoshimachi Suisei's Microphone",
    "春先のどか": "Harusaki Nodoka",
    "時の支配者 -Promise-": "Ruler of Timer -Promise-",
    "晩酌配信": "Late-Night Drinking Stream",
    "月と兎の物語": "Tale of the Moon and the Rabbit",
    "森カリオペの鎌": "Mori Calliope's Scythe",
    "爆発の魔法": "Explosion Magic",
    "牛丼": "Beef Bowl",
    "白銀ノエルのメイス": "Shirogane Noel's Mace",
    "白銀聖騎士団": "Knight's Order of Shirogane",
    "石の斧": "Stone Axe",
    "破滅の呪文": "Doom",
    "秘密結社holoX": "HoloX",
    "紫咲シオンの魔法のステッキ": "Murasaki Shion's Magic Wand",
    "緑の試験管": "Green Test tube",
    "脱獄を果たした共犯者たち": "A Group of Criminals That Escaped from The Cell",
    "角巻わためのハンマー": "Tsunomaki Watame's Hammer",
    "角巻わためのハープ": "Tsunomaki Watame's Harp",
    "野うさぎ同盟": "Wild Rabbit Alliance",
    "金時": "Kintoki",
    "鈍器でぶっ叩くわよ！": "I'll smack you with a blunt weapon!",
    "鍛冶ハンマー": "Smithing Hammer",
    "開拓者": "Pioneers",
    "限界飯": "Struggle Meal",
    "雪民": "Yukimin",
    "鬼神刀「阿修羅」": "Demon Blade Asura",
    "魔法のタンス": "Magic Dresser",
  };

  const NICKNAMES = {
    "2人あわせてラムダック！": "LAMBDUCK",
    "じゃあ敵だね": "Teki",
    "ちゃま旅": "Chama Trip",
    "ゆび": "Yubi",
    "アキ・ローゼンタールの斧": "Aki Axe",
    "カワイイスタジャン": "Jacket",
    "ギラファノコギリクワガタ": "Nene Beetle",
    "クールなパーカー": "Hoodie",
    "パパは仕事を辞める": "PapaKin",
    "フレンドリーパソコン": "Friendly",
    "マネちゃん": "Mane-chan",
    "レトロパソコン": "Retro",
    "凸待ち": "Totsu",
    "山田ルイ54世": "YamadaLui",
    "思い出のドーナツショップ": "Donut Shop",
    "春先のどか": "Nodoka",
    "時の支配者 -Promise-": "Promise",
    "牛丼": "Gyudon",
    "脱獄を果たした共犯者たち": "Criminals",
    "角巻わためのハンマー": "Hammer",
    "角巻わためのハープ": "Harp",
    "鬼神刀「阿修羅」": "Asura",
  };

  // Live-editable name mapping: pulls from a published Google Sheet CSV so
  // JPingu can update English names/nicknames anytime without a code change.
  // ENGLISH_NAMES / NICKNAMES above stay as an offline fallback if this fails.
  const NAME_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOjVF7J6Wabi9bzgA7f-0h0A3SNKB6I4iw6oAbBV9oSCtISljDVpT8d73Y9gcl6g66ZI-NH4oYA5Zk/pub?gid=1870339826&single=true&output=csv";

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field); field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  async function loadNameSheet() {
    try {
      const res = await fetch(NAME_SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      const text = await res.text();
      const rows = parseCsv(text);
      const [header, ...body] = rows;
      const jpIdx = header.findIndex((h) => /japanese/i.test(h));
      const enIdx = header.findIndex((h) => /english/i.test(h));
      const nickIdx = header.findIndex((h) => /nickname|slang/i.test(h));
      if (jpIdx === -1) throw new Error("unexpected sheet format");

      let updated = 0;
      body.forEach((r) => {
        const jp = (r[jpIdx] || "").trim();
        if (!jp) return;
        const en = enIdx > -1 ? (r[enIdx] || "").trim() : "";
        const nick = nickIdx > -1 ? (r[nickIdx] || "").trim() : "";
        if (en) { ENGLISH_NAMES[jp] = en; updated++; }
        if (nick) { NICKNAMES[jp] = nick; }
        else { delete NICKNAMES[jp]; }
      });
      if (updated > 0 && typeof renderAll === "function") {
        renderAll();
      }
    } catch (e) {
      // Offline or sheet unreachable — the hardcoded ENGLISH_NAMES/NICKNAMES
      // above just keep serving as-is, nothing else to do here.
    }
  }

  const CARD_IMAGES = {
    "hSD11-001": "hSD11-001_0.webp",
    "hSD11-003": "hSD11-003_0.webp",
    "hSD11-004": "hSD11-004_0.webp",
    "hSD11-005": "hSD11-005_0.webp",
    "hSD11-006": "hSD11-006_0.webp",
    "hSD11-008": "hSD11-008_0.webp",
    "hSD11-009": "hSD11-009_0.webp",
    "hBP01-104": "hBP01-104_0.webp",
    "hSD01-016": "hSD01-016_0.webp",
    "hSD01-017": "hSD01-017_0.webp",
    "hSD01-019": "hSD01-019_0.webp",
    "hSD10-010": "hSD10-010_0.webp",
    "hSD10-011": "hSD10-011_0.webp",
    "hSD10-012": "hSD10-012_0.webp",
    "hSD10-013": "hSD10-013_0.webp",
    "hSD12-003": "hSD12-003_0.webp",
    "hSD12-013": "hSD12-013_0.webp",
    "hSD12-014": "hSD12-014_0.webp",
    "hSD12-015": "hSD12-015_0.webp",
    "hBP01-108": "hBP01-108_0.webp",
    "hBP02-077": "hBP02-077_0.webp",
    "hBP04-050": "hBP04-050_0.webp",
    "hBP05-074": "hBP05-074_0.webp",
    "hY04-001": "hY04-001_0.webp",
    "hY05-001": "hY05-001_0.webp",
    "hBP01-028": "hBP01-028_0.webp",
    "hBP01-056": "hBP01-056_0.webp",
    "hBP01-062": "hBP01-062_0.webp",
    "hBP02-018": "hBP02-018_0.webp",
    "hBP02-061": "hBP02-061_0.webp",
    "hBP03-037": "hBP03-037_0.webp",
    "hBP03-040": "hBP03-040_0.webp",
    "hBP03-080": "hBP03-080_0.webp",
    "hBP04-028": "hBP04-028_0.webp",
    "hBP08-001": "hBP08-001_0.webp",
    "hBP08-002": "hBP08-002_0.webp",
    "hBP08-003": "hBP08-003_0.webp",
    "hBP08-004": "hBP08-004_0.webp",
    "hBP08-005": "hBP08-005_0.webp",
    "hBP08-006": "hBP08-006_0.webp",
    "hBP08-007": "hBP08-007_0.webp",
    "hBP08-008": "hBP08-008_0.webp",
    "hBP08-009": "hBP08-009_0.webp",
    "hBP08-010": "hBP08-010_0.webp",
    "hBP08-011": "hBP08-011_0.webp",
    "hBP08-012": "hBP08-012_0.webp",
    "hBP08-013": "hBP08-013_0.webp",
    "hBP08-014": "hBP08-014_0.webp",
    "hBP08-015": "hBP08-015_0.webp",
    "hBP08-016": "hBP08-016_0.webp",
    "hBP08-017": "hBP08-017_0.webp",
    "hBP08-018": "hBP08-018_0.webp",
    "hBP08-019": "hBP08-019_0.webp",
    "hBP08-020": "hBP08-020_0.webp",
    "hBP08-021": "hBP08-021_0.webp",
    "hBP08-022": "hBP08-022_0.webp",
    "hBP08-023": "hBP08-023_0.webp",
    "hBP08-024": "hBP08-024_0.webp",
    "hBP08-025": "hBP08-025_0.webp",
    "hBP08-026": "hBP08-026_0.webp",
    "hBP08-027": "hBP08-027_0.webp",
    "hBP08-029": "hBP08-029_0.webp",
    "hBP08-030": "hBP08-030_0.webp",
    "hBP08-031": "hBP08-031_0.webp",
    "hBP08-032": "hBP08-032_0.webp",
    "hBP08-033": "hBP08-033_0.webp",
    "hBP08-034": "hBP08-034_0.webp",
    "hBP08-035": "hBP08-035_0.webp",
    "hBP08-036": "hBP08-036_0.webp",
    "hBP08-037": "hBP08-037_0.webp",
    "hBP08-038": "hBP08-038_0.webp",
    "hBP08-039": "hBP08-039_0.webp",
    "hBP08-040": "hBP08-040_0.webp",
    "hBP08-041": "hBP08-041_0.webp",
    "hBP08-047": "hBP08-047_0.webp",
    "hBP08-048": "hBP08-048_0.webp",
    "hBP08-049": "hBP08-049_0.webp",
    "hBP08-050": "hBP08-050_0.webp",
    "hBP08-051": "hBP08-051_0.webp",
    "hBP08-052": "hBP08-052_0.webp",
    "hBP08-053": "hBP08-053_0.webp",
    "hBP08-055": "hBP08-055_0.webp",
    "hBP08-056": "hBP08-056_0.webp",
    "hBP08-057": "hBP08-057_0.webp",
    "hBP08-058": "hBP08-058_0.webp",
    "hBP08-059": "hBP08-059_0.webp",
    "hBP08-060": "hBP08-060_0.webp",
    "hBP08-061": "hBP08-061_0.webp",
    "hBP08-062": "hBP08-062_0.webp",
    "hBP08-063": "hBP08-063_0.webp",
    "hBP08-064": "hBP08-064_0.webp",
    "hBP08-065": "hBP08-065_0.webp",
    "hBP08-066": "hBP08-066_0.webp",
    "hBP08-067": "hBP08-067_0.webp",
    "hBP08-068": "hBP08-068_0.webp",
    "hBP08-069": "hBP08-069_0.webp",
    "hBP08-070": "hBP08-070_0.webp",
    "hBP08-071": "hBP08-071_0.webp",
    "hBP08-072": "hBP08-072_0.webp",
    "hBP08-073": "hBP08-073_0.webp",
    "hBP08-074": "hBP08-074_0.webp",
    "hBP08-075": "hBP08-075_0.webp",
    "hBP08-077": "hBP08-077_0.webp",
    "hBP08-078": "hBP08-078_0.webp",
    "hBP08-079": "hBP08-079_0.webp",
    "hBP08-080": "hBP08-080_0.webp",
    "hBP08-081": "hBP08-081_0.webp",
    "hBP08-082": "hBP08-082_0.webp",
    "hBP08-083": "hBP08-083_0.webp",
    "hBP08-085": "hBP08-085_0.webp",
    "hBP08-086": "hBP08-086_0.webp",
    "hBP08-087": "hBP08-087_0.webp",
    "hBP08-089": "hBP08-089_0.webp",
    "hBP08-091": "hBP08-091_0.webp",
    "hBP08-092": "hBP08-092_0.webp",
    "hBP08-094": "hBP08-094_0.webp",
    "hBP08-095": "hBP08-095_0.webp",
    "hBP08-098": "hBP08-098_0.webp",
    "hBP08-099": "hBP08-099_0.webp",
    "hBP08-100": "hBP08-100_0.webp",
    "hBP08-101": "hBP08-101_0.webp",
    "hBP08-102": "hBP08-102_0.webp",
    "hBP08-103": "hBP08-103_0.webp",
    "hBP08-104": "hBP08-104_0.webp",
    "hBP08-105": "hBP08-105_0.webp",
    "hBP08-106": "hBP08-106_0.webp",
    "hBP08-107": "hBP08-107_0.webp",
    "hBP08-108": "hBP08-108_0.webp",
    "hBP08-109": "hBP08-109_0.webp",
    "hBP08-110": "hBP08-110_0.webp",
    "hSD11-007": "hSD11-007_0.webp",
    "hY01-013": "hY01-013_0.webp",
    "hY02-011": "hY02-011_0.webp",
    "hY03-015": "hY03-015_0.webp",
    "hY04-012": "hY04-012_0.webp",
    "hY05-010": "hY05-010_0.webp",
    "hY06-010": "hY06-010_0.webp",
    "hBP01-024": "hBP01-024_0.webp",
    "hBP01-044": "hBP01-044_0.webp",
    "hBP01-092": "hBP01-092_0.webp",
    "hBP01-124": "hBP01-124_0.webp",
    "hBP02-024": "hBP02-024_0.webp",
    "hBP02-101": "hBP02-101_0.webp",
    "hBP03-031": "hBP03-031_0.webp",
    "hBP03-067": "hBP03-067_0.webp",
    "hBP04-054": "hBP04-054_0.webp",
    "hBP04-083": "hBP04-083_0.webp",
    "hBP07-001": "hBP07-001_0.webp",
    "hBP07-002": "hBP07-002_0.webp",
    "hBP07-003": "hBP07-003_0.webp",
    "hBP07-004": "hBP07-004_0.webp",
    "hBP07-005": "hBP07-005_0.webp",
    "hBP07-006": "hBP07-006_0.webp",
    "hBP07-007": "hBP07-007_0.webp",
    "hBP07-008": "hBP07-008_0.webp",
    "hBP07-009": "hBP07-009_0.webp",
    "hBP07-010": "hBP07-010_0.webp",
    "hBP07-011": "hBP07-011_0.webp",
    "hBP07-012": "hBP07-012_0.webp",
    "hBP07-013": "hBP07-013_0.webp",
    "hBP07-014": "hBP07-014_0.webp",
    "hBP07-015": "hBP07-015_0.webp",
    "hBP07-016": "hBP07-016_0.webp",
    "hBP07-017": "hBP07-017_0.webp",
    "hBP07-018": "hBP07-018_0.webp",
    "hBP07-019": "hBP07-019_0.webp",
    "hBP07-020": "hBP07-020_0.webp",
    "hBP07-021": "hBP07-021_0.webp",
    "hBP07-023": "hBP07-023_0.webp",
    "hBP07-024": "hBP07-024_0.webp",
    "hBP07-025": "hBP07-025_0.webp",
    "hBP07-026": "hBP07-026_0.webp",
    "hBP07-027": "hBP07-027_0.webp",
    "hBP07-028": "hBP07-028_0.webp",
    "hBP07-029": "hBP07-029_0.webp",
    "hBP07-030": "hBP07-030_0.webp",
    "hBP07-032": "hBP07-032_0.webp",
    "hBP07-033": "hBP07-033_0.webp",
    "hBP07-034": "hBP07-034_0.webp",
    "hBP07-035": "hBP07-035_0.webp",
    "hBP07-036": "hBP07-036_0.webp",
    "hBP07-037": "hBP07-037_0.webp",
    "hBP07-038": "hBP07-038_0.webp",
    "hBP07-039": "hBP07-039_0.webp",
    "hBP07-040": "hBP07-040_0.webp",
    "hBP07-041": "hBP07-041_0.webp",
    "hBP07-042": "hBP07-042_0.webp",
    "hBP07-044": "hBP07-044_0.webp",
    "hBP07-045": "hBP07-045_0.webp",
    "hBP07-046": "hBP07-046_0.webp",
    "hBP07-048": "hBP07-048_0.webp",
    "hBP07-050": "hBP07-050_0.webp",
    "hBP07-051": "hBP07-051_0.webp",
    "hBP07-052": "hBP07-052_0.webp",
    "hBP07-053": "hBP07-053_0.webp",
    "hBP07-054": "hBP07-054_0.webp",
    "hBP07-055": "hBP07-055_0.webp",
    "hBP07-056": "hBP07-056_0.webp",
    "hBP07-063": "hBP07-063_0.webp",
    "hBP07-064": "hBP07-064_0.webp",
    "hBP07-065": "hBP07-065_0.webp",
    "hBP07-066": "hBP07-066_0.webp",
    "hBP07-067": "hBP07-067_0.webp",
    "hBP07-068": "hBP07-068_0.webp",
    "hBP07-069": "hBP07-069_0.webp",
    "hBP07-071": "hBP07-071_0.webp",
    "hBP07-072": "hBP07-072_0.webp",
    "hBP07-073": "hBP07-073_0.webp",
    "hBP07-074": "hBP07-074_0.webp",
    "hBP07-077": "hBP07-077_0.webp",
    "hBP07-078": "hBP07-078_0.webp",
    "hBP07-079": "hBP07-079_0.webp",
    "hBP07-080": "hBP07-080_0.webp",
    "hBP07-081": "hBP07-081_0.webp",
    "hBP07-082": "hBP07-082_0.webp",
    "hBP07-083": "hBP07-083_0.webp",
    "hBP07-086": "hBP07-086_0.webp",
    "hBP07-087": "hBP07-087_0.webp",
    "hBP07-088": "hBP07-088_0.webp",
    "hBP07-089": "hBP07-089_0.webp",
    "hBP07-090": "hBP07-090_0.webp",
    "hBP07-091": "hBP07-091_0.webp",
    "hBP07-092": "hBP07-092_0.webp",
    "hBP07-093": "hBP07-093_0.webp",
    "hBP07-094": "hBP07-094_0.webp",
    "hBP07-095": "hBP07-095_0.webp",
    "hBP07-096": "hBP07-096_0.webp",
    "hBP07-097": "hBP07-097_0.webp",
    "hBP07-098": "hBP07-098_0.webp",
    "hBP07-099": "hBP07-099_0.webp",
    "hBP07-100": "hBP07-100_0.webp",
    "hBP07-101": "hBP07-101_0.webp",
    "hBP07-102": "hBP07-102_0.webp",
    "hBP07-103": "hBP07-103_0.webp",
    "hBP07-104": "hBP07-104_0.webp",
    "hBP07-105": "hBP07-105_0.webp",
    "hBP07-106": "hBP07-106_0.webp",
    "hBP07-107": "hBP07-107_0.webp",
    "hBP07-108": "hBP07-108_0.webp",
    "hBP07-109": "hBP07-109_0.webp",
    "hBP07-110": "hBP07-110_0.webp",
    "hSD10-002": "hSD10-002_0.webp",
    "hSD11-002": "hSD11-002_0.webp",
    "hY01-012": "hY01-012_0.webp",
    "hY02-010": "hY02-010_0.webp",
    "hY03-014": "hY03-014_0.webp",
    "hY04-011": "hY04-011_0.webp",
    "hY05-009": "hY05-009_0.webp",
    "hY06-009": "hY06-009_0.webp",
    "hBP01-048": "hBP01-048_1.webp",
    "hBP02-054": "hBP02-054_1.webp",
    "hBP03-057": "hBP03-057_0.webp",
    "hBP03-061": "hBP03-061_0.webp",
    "hBP04-016": "hBP04-016_0.webp",
    "hBP04-067": "hBP04-067_1.webp",
    "hBP06-001": "hBP06-001_0.webp",
    "hBP06-002": "hBP06-002_0.webp",
    "hBP06-003": "hBP06-003_0.webp",
    "hBP06-004": "hBP06-004_0.webp",
    "hBP06-007": "hBP06-007_0.webp",
    "hBP06-009": "hBP06-009_0.webp",
    "hBP06-010": "hBP06-010_0.webp",
    "hBP06-011": "hBP06-011_0.webp",
    "hBP06-012": "hBP06-012_0.webp",
    "hBP06-013": "hBP06-013_0.webp",
    "hBP06-014": "hBP06-014_0.webp",
    "hBP06-015": "hBP06-015_0.webp",
    "hBP06-016": "hBP06-016_0.webp",
    "hBP06-017": "hBP06-017_0.webp",
    "hBP06-018": "hBP06-018_0.webp",
    "hBP06-019": "hBP06-019_0.webp",
    "hBP06-020": "hBP06-020_0.webp",
    "hBP06-021": "hBP06-021_0.webp",
    "hBP06-022": "hBP06-022_0.webp",
    "hBP06-023": "hBP06-023_0.webp",
    "hBP06-024": "hBP06-024_0.webp",
    "hBP06-025": "hBP06-025_0.webp",
    "hBP06-026": "hBP06-026_0.webp",
    "hBP06-027": "hBP06-027_0.webp",
    "hBP06-032": "hBP06-032_0.webp",
    "hBP06-033": "hBP06-033_0.webp",
    "hBP06-034": "hBP06-034_0.webp",
    "hBP06-035": "hBP06-035_0.webp",
    "hBP06-036": "hBP06-036_0.webp",
    "hBP06-037": "hBP06-037_0.webp",
    "hBP06-038": "hBP06-038_0.webp",
    "hBP06-039": "hBP06-039_0.webp",
    "hBP06-040": "hBP06-040_0.webp",
    "hBP06-041": "hBP06-041_0.webp",
    "hBP06-046": "hBP06-046_0.webp",
    "hBP06-057": "hBP06-057_0.webp",
    "hBP06-058": "hBP06-058_0.webp",
    "hBP06-059": "hBP06-059_0.webp",
    "hBP06-060": "hBP06-060_0.webp",
    "hBP06-061": "hBP06-061_0.webp",
    "hBP06-062": "hBP06-062_0.webp",
    "hBP06-063": "hBP06-063_0.webp",
    "hBP06-064": "hBP06-064_0.webp",
    "hBP06-065": "hBP06-065_0.webp",
    "hBP06-066": "hBP06-066_0.webp",
    "hBP06-067": "hBP06-067_0.webp",
    "hBP06-068": "hBP06-068_0.webp",
    "hBP06-069": "hBP06-069_0.webp",
    "hBP06-070": "hBP06-070_0.webp",
    "hBP06-071": "hBP06-071_0.webp",
    "hBP06-078": "hBP06-078_0.webp",
    "hBP06-079": "hBP06-079_0.webp",
    "hBP06-080": "hBP06-080_0.webp",
    "hBP06-081": "hBP06-081_0.webp",
    "hBP06-083": "hBP06-083_0.webp",
    "hBP06-084": "hBP06-084_0.webp",
    "hBP06-085": "hBP06-085_0.webp",
    "hBP06-087": "hBP06-087_0.webp",
    "hBP06-089": "hBP06-089_0.webp",
    "hBP06-090": "hBP06-090_0.webp",
    "hBP06-092": "hBP06-092_0.webp",
    "hBP06-093": "hBP06-093_0.webp",
    "hBP06-094": "hBP06-094_0.webp",
    "hBP06-096": "hBP06-096_0.webp",
    "hBP06-097": "hBP06-097_0.webp",
    "hBP06-098": "hBP06-098_0.webp",
    "hBP06-099": "hBP06-099_0.webp",
    "hBP06-100": "hBP06-100_0.webp",
    "hBP06-104": "hBP06-104_0.webp",
    "hSD02-002": "hSD02-002_0.webp",
    "hBP03-110": "hBP03-110_0.webp",
    "hSD02-014": "hSD02-014_0.webp",
    "hY01-010": "hY01-010_0.webp",
    "hY02-008": "hY02-008_0.webp",
    "hY03-013": "hY03-013_0.webp",
    "hY04-010": "hY04-010_0.webp",
    "hY05-008": "hY05-008_0.webp",
    "hY06-007": "hY06-007_0.webp",
    "hBP02-084": "hBP02-084_0.webp",
    "hSD14-010": "hSD14-010_0.webp",
    "hSD17-010": "hSD17-010_0.webp",
    "hBP01-038": "hBP01-038_0.webp",
    "hBP01-068": "hBP01-068_2.webp",
    "hBP05-003": "hBP05-003_0.webp",
    "hBP05-013": "hBP05-013_0.webp",
    "hBP05-016": "hBP05-016_0.webp",
    "hBP05-018": "hBP05-018_0.webp",
    "hBP05-029": "hBP05-029_0.webp",
    "hBP05-030": "hBP05-030_0.webp",
    "hBP05-031": "hBP05-031_0.webp",
    "hBP05-032": "hBP05-032_0.webp",
    "hBP05-033": "hBP05-033_0.webp",
    "hBP05-034": "hBP05-034_0.webp",
    "hBP05-064": "hBP05-064_0.webp",
    "hBP05-071": "hBP05-071_0.webp",
    "hBP05-075": "hBP05-075_0.webp",
    "hBP05-079": "hBP05-079_0.webp",
    "hBP05-080": "hBP05-080_0.webp",
    "hSD07-002": "hSD07-002_0.webp",
    "hBP01-114": "hBP01-114_0.webp",
    "hBP01-126": "hBP01-126_1.webp",
    "hY01-007": "hY01-007_0.webp",
    "hY02-006": "hY02-006_0.webp",
    "hY03-009": "hY03-009_0.webp",
    "hY04-006": "hY04-006_0.webp",
    "hY05-005": "hY05-005_0.webp",
    "hY06-005": "hY06-005_0.webp",
    "hBP04-001": "hBP04-001_0.webp",
    "hBP04-002": "hBP04-002_0.webp",
    "hBP04-005": "hBP04-005_0.webp",
    "hBP04-006": "hBP04-006_0.webp",
    "hBP04-008": "hBP04-008_0.webp",
    "hBP04-009": "hBP04-009_0.webp",
    "hBP04-010": "hBP04-010_0.webp",
    "hBP04-011": "hBP04-011_0.webp",
    "hBP04-012": "hBP04-012_0.webp",
    "hBP04-013": "hBP04-013_0.webp",
    "hBP04-015": "hBP04-015_0.webp",
    "hBP04-017": "hBP04-017_0.webp",
    "hBP04-018": "hBP04-018_0.webp",
    "hBP04-019": "hBP04-019_0.webp",
    "hBP04-020": "hBP04-020_0.webp",
    "hBP04-021": "hBP04-021_0.webp",
    "hBP04-022": "hBP04-022_0.webp",
    "hBP04-023": "hBP04-023_0.webp",
    "hBP04-024": "hBP04-024_0.webp",
    "hBP04-025": "hBP04-025_0.webp",
    "hBP04-026": "hBP04-026_0.webp",
    "hBP04-027": "hBP04-027_0.webp",
    "hBP04-029": "hBP04-029_0.webp",
    "hBP04-030": "hBP04-030_0.webp",
    "hBP04-031": "hBP04-031_0.webp",
    "hBP04-038": "hBP04-038_0.webp",
    "hBP04-053": "hBP04-053_0.webp",
    "hBP04-055": "hBP04-055_0.webp",
    "hBP04-056": "hBP04-056_0.webp",
    "hBP04-057": "hBP04-057_0.webp",
    "hBP04-058": "hBP04-058_0.webp",
    "hBP04-059": "hBP04-059_0.webp",
    "hBP04-062": "hBP04-062_0.webp",
    "hBP04-068": "hBP04-068_0.webp",
    "hBP04-069": "hBP04-069_0.webp",
    "hBP04-070": "hBP04-070_0.webp",
    "hBP04-071": "hBP04-071_0.webp",
    "hBP04-072": "hBP04-072_0.webp",
    "hBP04-084": "hBP04-084_0.webp",
    "hBP04-085": "hBP04-085_0.webp",
    "hBP04-086": "hBP04-086_0.webp",
    "hBP04-088": "hBP04-088_0.webp",
    "hBP04-089": "hBP04-089_0.webp",
    "hBP04-094": "hBP04-094_0.webp",
    "hBP04-097": "hBP04-097_0.webp",
    "hBP04-100": "hBP04-100_0.webp",
    "hBP04-103": "hBP04-103_0.webp",
    "hBP04-104": "hBP04-104_0.webp",
    "hBP04-105": "hBP04-105_0.webp",
    "hY01-006": "hY01-006_0.webp",
    "hY02-005": "hY02-005_0.webp",
    "hY03-004": "hY03-004_0.webp",
    "hY04-005": "hY04-005_0.webp",
    "hY05-004": "hY05-004_0.webp",
    "hY06-004": "hY06-004_0.webp",
    "hBP03-006": "hBP03-006_0.webp",
    "hBP03-024": "hBP03-024_0.webp",
    "hBP03-032": "hBP03-032_0.webp",
    "hBP03-033": "hBP03-033_0.webp",
    "hBP03-034": "hBP03-034_0.webp",
    "hBP03-035": "hBP03-035_0.webp",
    "hBP03-038": "hBP03-038_0.webp",
    "hBP03-042": "hBP03-042_0.webp",
    "hBP03-050": "hBP03-050_0.webp",
    "hBP03-058": "hBP03-058_0.webp",
    "hBP03-059": "hBP03-059_0.webp",
    "hBP03-060": "hBP03-060_0.webp",
    "hBP03-062": "hBP03-062_0.webp",
    "hBP03-063": "hBP03-063_0.webp",
    "hBP03-065": "hBP03-065_0.webp",
    "hBP03-066": "hBP03-066_0.webp",
    "hBP03-070": "hBP03-070_0.webp",
    "hBP03-081": "hBP03-081_0.webp",
    "hBP03-082": "hBP03-082_0.webp",
    "hBP03-083": "hBP03-083_0.webp",
    "hBP03-090": "hBP03-090_0.webp",
    "hBP03-097": "hBP03-097_0.webp",
    "hBP03-100": "hBP03-100_0.webp",
    "hBP03-102": "hBP03-102_0.webp",
    "hBP03-108": "hBP03-108_0.webp",
    "hBP03-109": "hBP03-109_0.webp",
    "hBP03-088": "hBP03-088_0.webp",
    "hY01-001": "hY01-001_0.webp",
    "hY02-001": "hY02-001_0.webp",
    "hY03-001": "hY03-001_0.webp",
    "hY06-001": "hY06-001_0.webp",
    "hBP02-002": "hBP02-002_0.webp",
    "hBP02-003": "hBP02-003_0.webp",
    "hBP02-007": "hBP02-007_0.webp",
    "hBP02-019": "hBP02-019_0.webp",
    "hBP02-020": "hBP02-020_0.webp",
    "hBP02-021": "hBP02-021_0.webp",
    "hBP02-022": "hBP02-022_0.webp",
    "hBP02-023": "hBP02-023_0.webp",
    "hBP02-025": "hBP02-025_0.webp",
    "hBP02-026": "hBP02-026_0.webp",
    "hBP02-027": "hBP02-027_0.webp",
    "hBP02-029": "hBP02-029_0.webp",
    "hBP02-033": "hBP02-033_0.webp",
    "hBP02-034": "hBP02-034_0.webp",
    "hBP02-035": "hBP02-035_0.webp",
    "hBP02-038": "hBP02-038_0.webp",
    "hBP02-039": "hBP02-039_0.webp",
    "hBP02-040": "hBP02-040_0.webp",
    "hBP02-048": "hBP02-048_0.webp",
    "hBP02-055": "hBP02-055_0.webp",
    "hBP02-056": "hBP02-056_0.webp",
    "hBP02-057": "hBP02-057_0.webp",
    "hBP02-058": "hBP02-058_0.webp",
    "hBP02-059": "hBP02-059_0.webp",
    "hBP02-062": "hBP02-062_0.webp",
    "hBP02-063": "hBP02-063_0.webp",
    "hBP02-064": "hBP02-064_0.webp",
    "hBP02-079": "hBP02-079_0.webp",
    "hBP02-086": "hBP02-086_0.webp",
    "hBP02-094": "hBP02-094_0.webp",
    "hBP02-098": "hBP02-098_0.webp",
    "hBP02-028": "hBP02-028_0.webp",
    "hBP02-030": "hBP02-030_0.webp",
    "hBP02-032": "hBP02-032_0.webp",
    "hBP02-080": "hBP02-080_0.webp",
    "hBP02-088": "hBP02-088_0.webp",
    "hBP02-095": "hBP02-095_0.webp",
    "hY01-003": "hY01-003_0.webp",
    "hY02-002": "hY02-002_0.webp",
    "hY03-002": "hY03-002_0.webp",
    "hY04-002": "hY04-002_0.webp",
    "hY05-002": "hY05-002_0.webp",
    "hBP01-002": "hBP01-002_0.webp",
    "hBP01-004": "hBP01-004_0.webp",
    "hBP01-005": "hBP01-005_0.webp",
    "hBP01-007": "hBP01-007_0.webp",
    "hBP01-021": "hBP01-021_0.webp",
    "hBP01-022": "hBP01-022_0.webp",
    "hBP01-023": "hBP01-023_0.webp",
    "hBP01-025": "hBP01-025_0.webp",
    "hBP01-026": "hBP01-026_0.webp",
    "hBP01-027": "hBP01-027_0.webp",
    "hBP01-029": "hBP01-029_0.webp",
    "hBP01-030": "hBP01-030_0.webp",
    "hBP01-031": "hBP01-031_0.webp",
    "hBP01-045": "hBP01-045_0.webp",
    "hBP01-046": "hBP01-046_0.webp",
    "hBP01-049": "hBP01-049_0.webp",
    "hBP01-050": "hBP01-050_0.webp",
    "hBP01-051": "hBP01-051_0.webp",
    "hBP01-057": "hBP01-057_0.webp",
    "hBP01-058": "hBP01-058_0.webp",
    "hBP01-059": "hBP01-059_0.webp",
    "hBP01-060": "hBP01-060_0.webp",
    "hBP01-061": "hBP01-061_0.webp",
    "hBP01-069": "hBP01-069_0.webp",
    "hBP01-070": "hBP01-070_0.webp",
    "hBP01-071": "hBP01-071_0.webp",
    "hBP01-093": "hBP01-093_0.webp",
    "hBP01-094": "hBP01-094_0.webp",
    "hBP01-095": "hBP01-095_0.webp",
    "hBP01-099": "hBP01-099_0.webp",
    "hBP01-100": "hBP01-100_0.webp",
    "hBP01-107": "hBP01-107_0.webp",
    "hBP01-118": "hBP01-118_0.webp",
    "hBP01-120": "hBP01-120_0.webp",
    "hBP01-125": "hBP01-125_0.webp",
    "hBP01-106": "hBP01-106_0.webp",
    "hSD01-020": "hSD01-020_0.webp",
  };

  const COLOR_HEX = {
    "白": "#F3F1FA", "緑": "#4ADE80", "赤": "#F87171", "青": "#60A5FA",
    "紫": "#A78BFA", "黄": "#FBBF24", "無": "#8D89A8", "多": "#F472B6",
    "青赤": "#38BDF8",
  };

  let ownership = {};
  let customCards = [];
  const CUSTOM_CARDS_KEY = "oshi-binder-custom-cards";
  let activeSet = "All";
  let query = "";
  let rarityFilter = "All";
  let ownFilter = "All";

  let saveTimer = null;

  let firstSnapshotReceived = false;

  function startLiveSync() {
    onSnapshot(
      BINDER_DOC_REF,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          ownership = data.ownership || {};
          customCards = data.customCards || [];
        } else {
          ownership = {};
          customCards = [];
        }
        cacheLocally();
        setSyncStatus("ok", snap.metadata.hasPendingWrites ? "Saving…" : "Synced");
        if (!firstSnapshotReceived) {
          firstSnapshotReceived = true;
          renderRarityFilterOptions();
        }
        renderAll();
      },
      () => {
        // Offline or unreachable — fall back to whatever was last cached on
        // this device so the app still works; it'll pick back up live once
        // the connection returns, no action needed here.
        loadFromLocalCache();
        setSyncStatus("error", "Offline — showing last saved copy");
        if (!firstSnapshotReceived) {
          firstSnapshotReceived = true;
          renderRarityFilterOptions();
          renderAll();
        }
      }
    );
  }

  function loadFromLocalCache() {
    try {
      const rawOwn = localStorage.getItem(STORAGE_KEY);
      ownership = rawOwn ? JSON.parse(rawOwn) : {};
    } catch (e) {
      ownership = {};
    }
    try {
      const rawCustom = localStorage.getItem(CUSTOM_CARDS_KEY);
      customCards = rawCustom ? JSON.parse(rawCustom) : [];
    } catch (e) {
      customCards = [];
    }
  }

  function cacheLocally() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ownership));
      localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(customCards));
    } catch (e) {
      // best-effort; ignore
    }
  }

  function getAllCards() {
    return CARD_DATABASE.concat(customCards);
  }

  function isCustomCard(number) {
    return customCards.some((c) => c.number === number);
  }

  function saveBinderData() {
    cacheLocally();
    if (!canEdit) return; // shouldn't happen from the UI, but safety net
    setSyncStatus("pending", "Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const payload = { ownership, customCards, updatedAt: Date.now() };
        await setDoc(BINDER_DOC_REF, payload);
        // Rolling daily backup — one doc per calendar day, overwritten with
        // the latest state each time something saves that day. Older days
        // are left untouched, so this builds up a simple history over time.
        setDoc(doc(db, "binder_backups", todayKey()), payload).catch(() => {});
        setSyncStatus("ok", "Synced");
      } catch (e) {
        setSyncStatus("error", "Couldn't sync — saved on this device only");
      }
    }, 400);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function cardSet(card) {
    const prefix = card.number.split("-")[0];
    if (/^hY0[1-6]$/.test(prefix)) return "hSY";
    return prefix;
  }

  // Real hOCG release order, oldest first — used only for sets outside the
  // hBP/hSD families (Yell cards, promos, etc). Unknown/future codes fall
  // back to alphabetical order after everything in this list.
  const SET_ORDER = [
    "hYS01", "hSD01", "hBP01", "hSD02", "hSD03", "hSD04", "hBP02",
    "hSD05", "hSD06", "hSD07", "hBP03", "hPC01", "hBP04", "hCS01",
    "hSD2025summer", "hSD08", "hSD09", "hBP05", "hSD10", "hSD11",
    "hBP06", "hSD12", "hSD13", "hBP07", "hSD14", "hSD15", "hSD16",
    "hSD17", "hSD18", "hSD19", "hCO01", "hWF01", "hBP08",
    "hPR", "hSY",
  ];

  function familyRank(setCode) {
    if (/^hBP/.test(setCode)) return 0; // all booster packs first
    if (/^hSD/.test(setCode)) return 1; // then all starter decks
    return 2; // everything else (Yell, promos, etc.)
  }

  function trailingNumber(setCode) {
    const m = setCode.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : -1;
  }

  function getSets() {
    const unique = Array.from(new Set(getAllCards().map(cardSet)));
    return unique.sort((a, b) => {
      const fa = familyRank(a);
      const fb = familyRank(b);
      if (fa !== fb) return fa - fb;
      if (fa === 2) {
        const ia = SET_ORDER.indexOf(a);
        const ib = SET_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return -1;
        if (ib === -1) return 1;
        return ib - ia;
      }
      // Within hBP or hSD: newest (highest number) first
      return trailingNumber(b) - trailingNumber(a);
    });
  }

  function isOwned(number) {
    return !!(ownership[number] && ownership[number].owned);
  }

  function getQty(number) {
    return (ownership[number] && ownership[number].qty) || 1;
  }

  function cardNumberParts(number) {
    const m = number.match(/^(h[A-Za-z0-9]*?)-(\d+)(?:-P(\d+))?$/);
    if (!m) return { prefix: number, num: 0, para: 0 };
    return { prefix: m[1], num: parseInt(m[2], 10), para: m[3] ? parseInt(m[3], 10) : 0 };
  }

  function getFiltered() {
    return getAllCards().filter((c) => {
      if (activeSet !== "All" && cardSet(c) !== activeSet) return false;
      if (rarityFilter !== "All" && c.rarity !== rarityFilter) return false;
      if (ownFilter === "Owned" && !isOwned(c.number)) return false;
      if (ownFilter === "Missing" && isOwned(c.number)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const enName = ENGLISH_NAMES[c.name] || "";
        const nick = NICKNAMES[c.name] || "";
        const hay = `${c.name} ${enName} ${nick} ${c.number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const pa = cardNumberParts(a.number);
      const pb = cardNumberParts(b.number);
      if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
      if (pa.num !== pb.num) return pa.num - pb.num;
      return pa.para - pb.para;
    });
  }

  function renderStats() {
    const ownedCount = getAllCards().filter((c) => isOwned(c.number)).length;
    const total = getAllCards().length;
    document.getElementById("statOwned").textContent = ownedCount;
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statPct").textContent = total ? Math.round((ownedCount / total) * 100) + "%" : "0%";
  }

  function renderTabs() {
    const sets = ["All", ...getSets()];
    const tabsEl = document.getElementById("tabs");
    tabsEl.innerHTML = sets.map((s) => {
      let progress = "";
      if (s !== "All") {
        const inSet = getAllCards().filter((c) => cardSet(c) === s);
        const owned = inSet.filter((c) => isOwned(c.number)).length;
        progress = `<span class="tab-progress">${owned}/${inSet.length}</span>`;
      }
      return `<button class="tab ${s === activeSet ? "active" : ""}" data-set="${escapeHtml(s)}">${escapeHtml(s)}${progress}</button>`;
    }).join("");
    tabsEl.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSet = btn.dataset.set;
        renderAll();
      });
    });
  }

  function renderRarityFilterOptions() {
    const rarities = Array.from(new Set(getAllCards().map((c) => c.rarity)));
    const sel = document.getElementById("rarityFilter");
    const current = sel.value || "All";
    sel.innerHTML = `<option value="All">All rarities</option>` +
      rarities.map((r) => `<option value="${r}">${r}</option>`).join("");
    sel.value = rarities.includes(current) ? current : "All";
  }

  function renderContent() {
    const filtered = getFiltered();
    const contentEl = document.getElementById("content");

    if (filtered.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No cards match that filter</div>
          <div class="empty-sub">Try a different search, rarity, or set.</div>
        </div>`;
      return;
    }

    contentEl.innerHTML = `<div class="grid">${filtered.map(renderPocket).join("")}</div>`;

    contentEl.querySelectorAll("[data-toggle-own]").forEach((el) => {
      el.addEventListener("click", () => toggleOwned(el.dataset.toggleOwn));
    });
    contentEl.querySelectorAll("[data-qty-up]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); changeQty(btn.dataset.qtyUp, 1); });
    });
    contentEl.querySelectorAll("[data-qty-down]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); changeQty(btn.dataset.qtyDown, -1); });
    });
    contentEl.querySelectorAll("[data-delete-custom]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); deleteCustomCard(btn.dataset.deleteCustom); });
    });
  }

  function renderPocket(card) {
    const owned = isOwned(card.number);
    const isFoil = FOIL_RARITIES.has(card.rarity);
    const dot = COLOR_HEX[card.color] || "#8D89A8";
    const qty = getQty(card.number);
    const custom = isCustomCard(card.number);
    const imgFile = CARD_IMAGES[card.number];

    return `
      <div class="pocket-wrap ${isFoil ? "foil" : ""} ${owned ? "owned" : "missing"}">
        <div class="pocket ${owned ? "" : "missing"} ${canEdit ? "" : "readonly"}">
          ${custom && canEdit ? `
            <button class="pocket-delete" data-delete-custom="${card.number}" title="Remove this card">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          ` : ""}
          ${imgFile ? `<div class="pocket-img"><img src="images/${imgFile}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.closest('.pocket-img').remove()"></div>` : ""}
          <div class="pocket-meta">
            <span class="dot" style="background:${dot}; box-shadow:0 0 6px ${dot};"></span>
            <span class="pocket-number">${escapeHtml(card.number)}</span>
            ${custom ? `<span class="custom-badge">CUSTOM</span>` : ""}
          </div>
          <div class="pocket-name">${escapeHtml(card.name)}</div>
          ${ENGLISH_NAMES[card.name] ? `<div class="pocket-name-en">${escapeHtml(ENGLISH_NAMES[card.name])}</div>` : ""}
          <div class="pocket-type">${escapeHtml(card.type)}</div>
          <div class="pocket-footer">
            <span class="rarity-badge ${isFoil ? "foil" : "normal"}">${escapeHtml(card.rarity)}</span>
            <div style="display:flex; align-items:center; gap:8px;">
              ${owned ? `
                <div class="qty-controls">
                  <button class="qty-btn" data-qty-down="${card.number}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <span class="qty-value">${qty}</span>
                  <button class="qty-btn" data-qty-up="${card.number}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              ` : ""}
              <div class="own-toggle" data-toggle-own="${card.number}">
                <div class="own-check ${owned ? "checked" : ""}">
                  ${owned ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0B1613" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function toggleOwned(number) {
    if (!canEdit) return;
    const current = isOwned(number);
    ownership[number] = { owned: !current, qty: current ? 0 : 1 };
    saveBinderData();
    renderAll();
  }

  function changeQty(number, delta) {
    if (!canEdit) return;
    const entry = ownership[number] || { owned: true, qty: 1 };
    entry.qty = Math.max(1, (entry.qty || 1) + delta);
    entry.owned = true;
    ownership[number] = entry;
    saveBinderData();
    renderAll();
  }

  function deleteCustomCard(number) {
    if (!canEdit) return;
    customCards = customCards.filter((c) => c.number !== number);
    delete ownership[number];
    saveBinderData();
    renderAll();
  }

  function populateAddCardSuggestions() {
    const types = Array.from(new Set(getAllCards().map((c) => c.type)));
    const rarities = Array.from(new Set(getAllCards().map((c) => c.rarity)));
    document.getElementById("typeSuggestions").innerHTML = types.map((t) => `<option value="${escapeHtml(t)}"></option>`).join("");
    document.getElementById("raritySuggestions").innerHTML = rarities.map((r) => `<option value="${escapeHtml(r)}"></option>`).join("");
  }

  function updateAddCardSubmitState() {
    const number = document.getElementById("fNumber").value.trim();
    const name = document.getElementById("fName").value.trim();
    const btn = document.getElementById("submitAddCardBtn");
    const ready = !!number && !!name;
    btn.className = "btn-submit " + (ready ? "enabled" : "disabled");
    btn.disabled = !ready;
  }

  function openAddCardModal() {
    populateAddCardSuggestions();
    document.getElementById("addCardOverlay").classList.add("open");
    document.getElementById("fNumber").focus();
  }

  function closeAddCardModal() {
    document.getElementById("addCardOverlay").classList.remove("open");
  }

  function resetAddCardForm() {
    document.getElementById("fNumber").value = "";
    document.getElementById("fName").value = "";
    document.getElementById("fType").value = "";
    document.getElementById("fRarity").value = "";
    document.getElementById("fColor").value = "無";
    updateAddCardSubmitState();
  }

  function submitAddCard() {
    if (!canEdit) return;
    const number = document.getElementById("fNumber").value.trim();
    const name = document.getElementById("fName").value.trim();
    if (!number || !name) return;

    if (getAllCards().some((c) => c.number === number)) {
      alert("A card with that number is already in the binder.");
      return;
    }

    const newCard = {
      number,
      name,
      type: document.getElementById("fType").value.trim() || "不明",
      rarity: document.getElementById("fRarity").value.trim() || "?",
      color: document.getElementById("fColor").value,
    };

    customCards.push(newCard);
    ownership[number] = { owned: true, qty: 1 };
    saveBinderData();

    resetAddCardForm();
    closeAddCardModal();
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderTabs();
    renderContent();
  }

  // ---- Wiring ----
  document.getElementById("searchInput").addEventListener("input", (e) => {
    query = e.target.value;
    renderContent();
  });
  document.getElementById("rarityFilter").addEventListener("change", (e) => {
    rarityFilter = e.target.value;
    renderContent();
  });
  document.getElementById("ownFilter").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      ownFilter = btn.dataset.val;
      document.getElementById("ownFilter").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderContent();
    });
  });
  document.getElementById("openAddCardBtn").addEventListener("click", openAddCardModal);
  document.getElementById("closeAddCardBtn").addEventListener("click", closeAddCardModal);
  document.getElementById("addCardOverlay").addEventListener("click", (e) => {
    if (e.target.id === "addCardOverlay") closeAddCardModal();
  });
  document.getElementById("fNumber").addEventListener("input", updateAddCardSubmitState);
  document.getElementById("fName").addEventListener("input", updateAddCardSubmitState);
  document.getElementById("submitAddCardBtn").addEventListener("click", submitAddCard);

  // ---- Auth (sign-in controls edit access; reading never requires it) ----
  function openAuthModal() {
    document.getElementById("authError").textContent = "";
    document.getElementById("authOverlay").classList.add("open");
    const signedIn = !!auth.currentUser;
    document.getElementById("authSignedOutView").style.display = signedIn ? "none" : "";
    document.getElementById("authSignedInView").style.display = signedIn ? "" : "none";
    if (!signedIn) document.getElementById("authEmail").focus();
  }
  function closeAuthModal() {
    document.getElementById("authOverlay").classList.remove("open");
  }
  async function submitAuth() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errEl = document.getElementById("authError");
    errEl.textContent = "";
    if (!email || !password) { errEl.textContent = "Enter both email and password."; return; }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (e) {
      errEl.textContent = "Couldn't sign in — check your email and password.";
    }
  }

  document.getElementById("authLinkBtn").addEventListener("click", openAuthModal);
  document.getElementById("closeAuthBtn").addEventListener("click", closeAuthModal);
  document.getElementById("authOverlay").addEventListener("click", (e) => {
    if (e.target.id === "authOverlay") closeAuthModal();
  });
  document.getElementById("submitAuthBtn").addEventListener("click", submitAuth);
  document.getElementById("authPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitAuth();
  });
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await signOut(auth);
    closeAuthModal();
  });

  // ---- Export backup (downloads a local copy of the current collection) ----
  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      ownership,
      customCards,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oshi-binder-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);

  // ---- Init ----
  setSyncStatus("pending", "Connecting…");
  loadNameSheet();
  applyEditability();
  startLiveSync();
  onAuthStateChanged(auth, (user) => {
    canEdit = !!user;
    applyEditability();
  });