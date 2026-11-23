
// ========================================
// 速度トレーニング設定
// 所要時間は1問全体の表示時間（秒）
// ========================================

const SPEED_LEVEL_CONFIG = [
  { level: "20級", digit: 1, length: 1, time: 2 },
  { level: "19級", digit: 1, length: 2, time: 4 },
  { level: "18級", digit: 1, length: 3, time: 6 },
  { level: "17級", digit: 1, length: 4, time: 8 },
  { level: "16級", digit: 1, length: 5, time: 5 },
  { level: "15級", digit: 1, length: 6, time: 6 },
  { level: "14級", digit: 1, length: 8, time: 8 },
  { level: "13級", digit: 1, length: 10, time: 10 },
  { level: "12級", digit: 1, length: 3, time: 4 },
  { level: "11級", digit: 1, length: 4, time: 4 },
  { level: "10級", digit: 1, length: 4, time: 4 },
  { level: "9級", digit: 1, length: 5, time: 5 },
  { level: "8級", digit: 1, length: 6, time: 6 },
  { level: "7級", digit: 2, length: 3, time: 3 },
  { level: "6級", digit: 2, length: 3, time: 3 },
  { level: "5級", digit: 2, length: 4, time: 4 },
  { level: "4級", digit: 2, length: 5, time: 5 },
  { level: "3級", digit: 2, length: 6, time: 5 },
  { level: "2級", digit: 2, length: 8, time: 7 },
  { level: "1級", digit: 2, length: 10, time: 8 },
  { level: "初段", digit: 3, length: 4, time: 4 },
  { level: "弐段", digit: 3, length: 5, time: 4 },
  { level: "参段", digit: 3, length: 6, time: 4 },
  { level: "四段", digit: 3, length: 7, time: 4 },
  { level: "五段", digit: 3, length: 8, time: 4 },
  { level: "六段", digit: 3, length: 9, time: 4 },
  { level: "七段", digit: 3, length: 10, time: 4 },
  { level: "八段", digit: 3, length: 12, time: 4 },
  { level: "九段", digit: 3, length: 15, time: 4 },
  { level: "十段", digit: 3, length: 15, time: 3 }
];


// ========================================
// 速度トレーニング用 級・段位ボタン
// ========================================

function createSpeedLevelButtons() {

  const area = document.getElementById("levelButtons");
  area.innerHTML = "";

  levelList = SPEED_LEVEL_CONFIG.map(item => item.level);

  SPEED_LEVEL_CONFIG.forEach(config => {

    const btn = document.createElement("button");

    const levelName = document.createElement("span");
    levelName.className = "level-name";
    levelName.textContent = config.level;

    const levelSpec = document.createElement("span");
    levelSpec.className = "level-spec";

    levelSpec.textContent =
      `${config.digit}桁・${config.length}口・${config.time}秒`;

    btn.appendChild(levelName);
    btn.appendChild(levelSpec);

    btn.onclick = () => selectLevel(config.level);

    area.appendChild(btn);

  });

}


// ========================================
// 速度トレーニング用 問題生成
// ========================================

function generateSpeedQuestion() {

  if (state.isFinished) return;

  if (state.currentQuestion > state.questionCount) return;

  // 回答ロック解除
  state.answerLocked = false;

  const answerInput = document.getElementById("answerInput");

  if (answerInput) {
    answerInput.disabled = false;
  }

  // タイマーをリセット
  state.runId++;

  if (state.nextTimer) {
    clearTimeout(state.nextTimer);
    state.nextTimer = null;
  }

  state.timers.forEach(timer => clearTimeout(timer));
  state.timers = [];

  // 問題番号
  document.getElementById("questionInfo").style.display = "block";

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion} / ${state.questionCount}`;

  document.getElementById("homeBtn").style.display = "block";

  // 表示を初期化
  document.getElementById("questionTitle").style.display = "none";
  document.getElementById("readingConditionDisplay").style.display = "none";

  document.getElementById("answerArea").style.display = "none";
  document.getElementById("judge").textContent = "";

  const correctResult = document.getElementById("correctResult");

  if (correctResult) {
    correctResult.style.display = "none";
  }

  answerInput.value = "";

  // 選択された級・段位の設定を取得
  const config = SPEED_LEVEL_CONFIG.find(
    item => item.level === state.level
  );

  if (!config) {
    console.error("速度トレーニングの設定が見つかりません:", state.level);
    return;
  }

  // 1口あたりの表示間隔（ミリ秒）
  state.speed = Math.round(
    (config.time * 1000) / config.length
  );

  // 問題を作成
  state.numbers = [];
  state.index = 0;
  state.answer = BigInt(0);

  for (let i = 0; i < config.length; i++) {

    const number = randDigit(config.digit);

    state.numbers.push(number);

    state.answer += BigInt(number);

  }

  // 既存と同じカウントダウン・フラッシュ表示を使用
  countdownBeep(() => {
    runFlash();
  });

}
