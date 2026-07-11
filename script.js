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
  timers: []
};

// =====================
// 音
// =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// =====================
// ★完全同期用の音
// =====================
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

  const levels = [];

  for (let i = 38; i >= 1; i--) {
    levels.push(i + "級");
  }

  levels.push(
    "初段","弐段","参段","四段","五段",
    "六段","七段","八段","九段","十段"
  );

  levels.forEach(lv => {
    const btn = document.createElement("button");
    btn.textContent = lv;
    btn.onclick = () => selectLevel(lv);
    area.appendChild(btn);
  });
}

function selectLevel(level) {
  state.level = level;

  document.getElementById("levelSelect").style.display = "none";
  document.getElementById("app").style.display = "block";

  audioCtx.resume();

  startEngine();
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

  state.timers.forEach(t => clearTimeout(t));
  state.timers = [];

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion}問目 / 全${state.questionCount}問`;

  document.getElementById("homeBtn").style.display = "none";

  state.numbers = [];
  state.index = 0;
  state.answer = 0;

  document.getElementById("answerArea").style.display = "none";
  document.getElementById("judge").textContent = "";
  document.getElementById("answerInput").value = "";

  const config = getConfig(state.level);

  state.speed = config.speed;

  for (let i = 0; i < config.length; i++) {
    const n = randDigit(config.digit);
    state.numbers.push(n);
    state.answer += n;
  }

  // ★カウント後スタート
  countdownBeep(runFlash);
}

// =====================
// フラッシュ表示
// =====================
function runFlash() {
  const el = document.getElementById("display");

  const startAudioTime = audioCtx.currentTime + 0.2;

  state.numbers.forEach((num, i) => {
    const t = startAudioTime + i * (state.speed / 1000);

    // =====================
    // 音を正確に予約
    // =====================
    beepAt(t, 1200, 0.05);

    // =====================
    // 表示を同期
    // =====================
    const timer = setTimeout(() => {
      const numStr = String(num);
      el.textContent = numStr;

      // 桁に応じてサイズ
      const len = numStr.length;
      if (len <= 4) el.style.fontSize = "100px";
      else if (len <= 8) el.style.fontSize = "80px";
      else if (len <= 12) el.style.fontSize = "60px";
      else el.style.fontSize = "45px";

      el.style.opacity = 1;

      const fadeTimer = setTimeout(() => {
        el.style.opacity = 0;
      }, state.speed * 0.4);

      state.timers.push(fadeTimer);

    }, i * state.speed);

    state.timers.push(timer);
  });

  // =====================
  // 最後
  // =====================
  const timer = setTimeout(() => {
    el.textContent = "？";
    document.getElementById("answerArea").style.display = "block";
  }, state.numbers.length * state.speed);

  state.timers.push(timer);
}

// =====================
// 回答チェック
// =====================
function checkAnswer() {
  const input = document.getElementById("answerInput").value;
  const judge = document.getElementById("judge");

  if (Number(input) === state.answer) {
    judge.textContent = "正解！";
    state.correctCount++;
  } else {
    judge.textContent = "不正解：正解は " + state.answer;
  }

  if (state.currentQuestion < state.questionCount) {
    state.currentQuestion++;
    setTimeout(generateQuestion, 1200);
  } else {
    showResult();
  }
}

// =====================
// 結果表示
// =====================
function showResult() {
  document.getElementById("display").textContent =
    `結果：${state.correctCount} / ${state.questionCount}`;

  document.getElementById("homeBtn").style.display = "block";
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