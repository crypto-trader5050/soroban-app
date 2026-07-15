// =====================
// 状態管理
// =====================
let state = {
  type: null,
  level: null,
  numbers: [],
  index: 0,
  answer: 0,
  speed: 1000,
  questionCount: 15,
  currentQuestion: 0,
  correctCount: 0,
  timers: [],
  nextTimer: null,
  runId: 0,
};

let levelList = [];
let currentLevelIndex = 0;

const PASS_SCORE = 10;

// =====================
// 音
// =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ① 基本音（先に定義）
function beepAt(time, freq = 800, duration = 0.1) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.value = freq;
  osc.type = "square";

  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.start(time);
  osc.stop(time + duration);
}

// ② それを使う関数（後）
function tapSound() {
  beepAt(audioCtx.currentTime, 500, 0.02);
}

// ③ 正解音
function playCorrectSound() {
  beepAt(audioCtx.currentTime, 1000, 0.08);
  beepAt(audioCtx.currentTime + 0.08, 1400, 0.1);
}

// カウントダウン音
function countdownBeep(callback) {
  const start = audioCtx.currentTime + 0.2;

  // 2回分予約（完全等間隔）
  beepAt(start, 600);
  beepAt(start + 1, 600);

  // 表示開始タイミングも合わせる
  const delay = (start + 2 - audioCtx.currentTime) * 1000;
  const timer = setTimeout(callback, delay);
  state.timers.push(timer);
}

// =====================
// 画面遷移
// =====================
function goFlash() {
  document.getElementById("home").style.display = "none";
  document.getElementById("typeSelect").style.display = "block";
}

function selectType(type) {
  state.type = type;

  document.getElementById("typeSelect").style.display = "none";
  document.getElementById("levelSelect").style.display = "block";

  createLevelButtons();
}

function createLevelButtons() {
  const area = document.getElementById("levelButtons");
  area.innerHTML = "";

  levelList = [];

  for (let i = 38; i >= 1; i--) {
    levelList.push(i + "級");
  }

  levelList.push(
    "初段","弐段","参段","四段","五段",
    "六段","七段","八段","九段","十段"
  );

  levelList.forEach(lv => {
    const btn = document.createElement("button");
    btn.textContent = lv;
    btn.onclick = () => selectLevel(lv);
    area.appendChild(btn);
  });
}

function selectLevel(level) {
  state.level = level;

  currentLevelIndex = levelList.indexOf(level);

  state.correctCount = 0;
  state.currentQuestion = 0;

  document.getElementById("levelSelect").style.display = "none";
  document.getElementById("app").style.display = "block";

  audioCtx.resume();

  document.fonts.ready.then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startEngine();
      });
    });
  });
}

// =====================
// メイン処理
// =====================
function getConfig(levelName) {
  return LEVEL_CONFIG.find(l => l.level === levelName);
}

function startEngine() {
  state.currentQuestion = 1;
  state.correctCount = 0;
  generateQuestion();
}

function generateQuestion() {

  state.runId++;

  if (state.nextTimer) {
    clearTimeout(state.nextTimer);
    state.nextTimer = null;
  }

  state.timers.forEach(t => clearTimeout(t));
  state.timers = [];

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion}問目 / 全${state.questionCount}問`;

  document.getElementById("homeBtn").style.display = "none";

  state.numbers = [];
  state.index = 0;

  // ✅ 修正①
  state.answer = BigInt(0);

  document.getElementById("answerArea").style.display = "none";
  document.getElementById("judge").textContent = "";
  document.getElementById("answerInput").value = "";

  const config = getConfig(state.level);

  state.speed = config.speed;

  for (let i = 0; i < config.length; i++) {
    const n = randDigit(config.digit);
    state.numbers.push(n);

    // ✅ 修正②
    state.answer += BigInt(n);
  }

  countdownBeep(() => {
    runFlash();
  });
}

// =====================
// フラッシュ表示
// =====================
function runFlash() {

  document.getElementById("answerArea").style.display = "none";

  if (!state.numbers.length) return;

  const myRun = state.runId;

  const el = document.getElementById("display");

    // ★フォント強制適用
  el.style.fontFamily = '"Soloburn", monospace';
  el.textContent = "0";
  el.offsetHeight; // ←これで強制反映
  el.textContent = "";

  const startAudioTime = audioCtx.currentTime + 0.2;

  state.numbers.forEach((num, i) => {
    const t = startAudioTime + i * (state.speed / 1000);

    // =====================
    // 音を正確に予約
    // =====================
    beepAt(t, 1200, 0.05);

    const delay = (t - audioCtx.currentTime) * 1000;

    // =====================
    // 表示を同期
    // =====================
    const timer = setTimeout(() => {
      if (myRun !== state.runId) return;
      const numStr = num.toLocaleString();
      el.textContent = numStr;

      // 桁に応じてサイズ
      const len = numStr.length;
      if (len <= 4) el.style.fontSize = "100px";
      else if (len <= 8) el.style.fontSize = "80px";
      else if (len <= 12) el.style.fontSize = "60px";
      else el.style.fontSize = "45px";

      el.style.opacity = 1;

      const fadeTimer = setTimeout(() => {
        if (myRun !== state.runId) return;
        el.style.opacity = 0;
      }, state.speed * 0.4);

      state.timers.push(fadeTimer);

    }, delay);

    state.timers.push(timer);
  });

  // =====================
  // 最後
  // =====================
  const endTime = startAudioTime + state.numbers.length * (state.speed / 1000);
  const delay = (endTime - audioCtx.currentTime) * 1000;

  const timer = setTimeout(() => {
    if (myRun !== state.runId) return;
    el.textContent = "？";
    document.getElementById("answerArea").style.display = "block";
  }, delay);

    state.timers.push(timer);
  }

// =====================
// 回答チェック
// =====================
function checkAnswer() {
  const inputEl = document.getElementById("answerInput");

  inputEl.addEventListener("input", () => {
    const len = inputEl.value.replace(/,/g, "").length;

    if (len <= 6) inputEl.style.fontSize = "36px";
    else if (len <= 10) inputEl.style.fontSize = "28px";
    else if (len <= 14) inputEl.style.fontSize = "22px";
    else inputEl.style.fontSize = "14px";
  });

  const input = inputEl.value;
  const judge = document.getElementById("judge");

  const clean = input.replace(/,/g, "");

  // 空入力ガード
  if (clean === "") return;

  // ✅ ここ修正
  if (BigInt(clean) === BigInt(state.answer)) {
    judge.textContent = "正解！";
    state.correctCount++;

    playCorrectSound();
    inputEl.style.background = "#003300";

  } else {
    judge.textContent = "不正解：正解は " + state.answer;
  }

  setTimeout(() => {
    inputEl.style.background = "black";
    inputEl.value = "";

    if (state.currentQuestion < state.questionCount) {
      state.currentQuestion++;

      state.nextTimer = setTimeout(() => {
        generateQuestion();
      }, 800);

    } else {
      showResult();
    }

  }, 300);
}

// =====================
// 結果表示
// =====================
function showResult() {
  const display = document.getElementById("display");
  const judge = document.getElementById("judge");

  const isPass = state.correctCount >= PASS_SCORE;
  const rate = Math.round(
    (state.correctCount / state.questionCount) * 100
  );

  if (isPass) playCorrectSound();

  // 問題表示を結果に変更
  display.innerHTML = `
    <div style="font-size:28px;">
      結果<br>
      ${state.correctCount} / ${state.questionCount}<br>
      正答率：${rate}%
    </div>
  `;

  judge.innerHTML = "";

  // 合否表示
  judge.innerHTML = isPass
    ? "🎉 合格！"
    : "❌ 不合格";
  
  if (isPass) {
    const next = levelList[currentLevelIndex + 1] || "なし";
    judge.innerHTML += `<br>次：${next}`;
  }

  // ボタン表示切り替え
  const answerArea = document.getElementById("answerArea");
  answerArea.style.display = "none";

  const homeBtn = document.getElementById("homeBtn");
  homeBtn.style.display = "block";

  // 追加ボタン（動的に出す）
  const extraBtn = document.createElement("button");

  if (isPass) {
    extraBtn.textContent = "次の級へ ▶";
    extraBtn.onclick = nextLevel;
  } else {
    extraBtn.textContent = "もう一度挑戦";
    extraBtn.onclick = retry;
  }

  judge.appendChild(document.createElement("br"));
  judge.appendChild(extraBtn);
}

function nextLevel() {
  state.correctCount = 0;
  state.currentQuestion = 0;

  currentLevelIndex++;

  if (currentLevelIndex >= levelList.length) {
    alert("すべてクリア！");
    backHome();
    return;
  }

  selectLevel(levelList[currentLevelIndex]);
}

function retry() {
  state.correctCount = 0;
  state.currentQuestion = 0;

  startEngine();
}

// =====================
// その他
// =====================
function randDigit(digit) {
  const min = Math.pow(10, digit - 1);
  const max = Math.pow(10, digit) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function backHome() {
  document.getElementById("home").style.display = "block";
  document.getElementById("typeSelect").style.display = "none";
  document.getElementById("levelSelect").style.display = "none";
  document.getElementById("app").style.display = "none";

  document.getElementById("display").textContent = "";
  document.getElementById("judge").textContent = "";
  document.getElementById("answerInput").value = "";

  document.getElementById("homeBtn").style.display = "block";
}

document.getElementById("answerInput")
  .addEventListener("keydown", e => {
    if (e.key === "Enter") checkAnswer();
  });

const inputEl = document.getElementById("answerInput");

document.getElementById("keypad").addEventListener("click", (e) => {
  const num = e.target.dataset.num;

  if (num !== undefined) {
    tapSound();

    let value = inputEl.value.replace(/,/g, "");
    value += num;

    inputEl.value = Number(value).toLocaleString();
  }

  if (e.target.id === "clear") {
    tapSound(); // 🔊
    inputEl.value = "";
  }

  if (e.target.id === "ok") {
    tapSound(); // 🔊
    checkAnswer();
  }
});