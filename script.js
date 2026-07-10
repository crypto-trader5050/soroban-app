// 状態管理
let state = {
  type: null,
  level: null,
  numbers: [],
  index: 0,
  answer: 0,
  speed: 500
};

// 音
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq = 800, duration = 0.1) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.value = freq;
  osc.type = "sine";

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// HOME → フラッシュ
function goFlash() {
  document.getElementById("home").style.display = "none";
  document.getElementById("typeSelect").style.display = "block";
}

// 種目選択
function selectType(type) {
  state.type = type;

  document.getElementById("typeSelect").style.display = "none";
  document.getElementById("levelSelect").style.display = "block";

  createLevelButtons();
}

// レベルボタン生成
function createLevelButtons() {
  const area = document.getElementById("levelButtons");
  area.innerHTML = "";

  const levels = [];

  // 38級〜1級
  for (let i = 38; i >= 1; i--) {
    levels.push(i + "級");
  }

  // 初段〜十段
  levels.push("初段");
  levels.push("弐段");
  levels.push("参段");
  levels.push("四段");
  levels.push("五段");
  levels.push("六段");
  levels.push("七段");
  levels.push("八段");
  levels.push("九段");
  levels.push("十段");

  levels.forEach(lv => {
    const btn = document.createElement("button");
    btn.textContent = lv;
    btn.onclick = () => selectLevel(lv);
    area.appendChild(btn);
  });
}

// レベル選択
function selectLevel(level) {
  state.level = level;

  document.getElementById("levelSelect").style.display = "none";
  document.getElementById("app").style.display = "block";

  audioCtx.resume();

  startEngine();
}

// LEVEL_CONFIG取得
function getConfig(levelName) {
  return LEVEL_CONFIG.find(l => l.level === levelName);
}

// 問題生成
function startEngine() {

  document.getElementById("homeBtn").style.display = "none";

  state.numbers = [];
  state.index = 0;
  state.answer = 0;

  document.getElementById("answerArea").style.display = "none";
  document.getElementById("judge").textContent = "";
  document.getElementById("answerInput").value = "";

  const config = getConfig(state.level);

  const digit = config.digit;
  const length = config.length;
  const speed = config.speed;

  state.speed = speed;

  for (let i = 0; i < length; i++) {
    const n = randDigit(digit);
    state.numbers.push(n);
    state.answer += n;
  }

  runFlash();
}

// フラッシュ
function runFlash() {
  const el = document.getElementById("display");

  if (state.index >= state.numbers.length) {
    el.textContent = "？";
    document.getElementById("answerArea").style.display = "block";
    return;
  }

  beep();
  el.textContent = state.numbers[state.index];

  setTimeout(() => {
    el.textContent = "";
  }, state.speed * 0.4);

  state.index++;
  setTimeout(runFlash, state.speed);
}

function checkAnswer() {
  const input = document.getElementById("answerInput").value;
  const judge = document.getElementById("judge");

  if (Number(input) === state.answer) {
    judge.textContent = "正解！";
  } else {
    judge.textContent = "不正解：正解は " + state.answer;
  }

  document.getElementById("homeBtn").style.display = "block";
}

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