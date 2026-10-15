// =====================
// かけ算・級段設定
// =====================

const MUL_LEVEL_CONFIG = [
  { level: "13級", aDigits: 2, bDigits: 1 },
  { level: "12級", aDigits: 3, bDigits: 1 },
  { level: "11級", aDigits: 4, bDigits: 1 },
  { level: "10級", aDigits: 2, bDigits: 2 },
  { level: "9級",  aDigits: 3, bDigits: 2 },
  { level: "8級",  aDigits: 4, bDigits: 2 },
  { level: "7級",  aDigits: 3, bDigits: 3 },
  { level: "6級",  aDigits: 4, bDigits: 3 },
  { level: "5級",  aDigits: 5, bDigits: 3 },
  { level: "4級",  aDigits: 4, bDigits: 4 },
  { level: "3級",  aDigits: 5, bDigits: 4 },
  { level: "2級",  aDigits: 6, bDigits: 4 },
  { level: "1級",  aDigits: 5, bDigits: 5 },

  { level: "初段", aDigits: 6, bDigits: 5 },
  { level: "弐段", aDigits: 7, bDigits: 5 },
  { level: "参段", aDigits: 6, bDigits: 6 },
  { level: "四段", aDigits: 7, bDigits: 6 },
  { level: "五段", aDigits: 8, bDigits: 6 },
  { level: "六段", aDigits: 7, bDigits: 7 },
  { level: "七段", aDigits: 8, bDigits: 7 },
  { level: "八段", aDigits: 9, bDigits: 7 },
  { level: "九段", aDigits: 8, bDigits: 8 },
  { level: "十段", aDigits: 9, bDigits: 8 }
];

// =====================
// 状態（共通前提）
// =====================
// ※ state はみとり側と共通でOK
// state = { currentQuestion, questionCount, correctCount, isFinished など }

// =====================
// かけ算：問題生成
// =====================
function startMultiplication() {

  if (state.isFinished) return;

  if (state.currentQuestion > state.questionCount) {
    showResult();
    return;
  }

  console.log(
    "現在:",
    state.currentQuestion,
    "/",
    state.questionCount
  );

  // 現在の級・段の設定を取得
  const config = MUL_LEVEL_CONFIG.find(
    item => item.level === state.level
  );

  if (!config) {
    console.error("かけ算設定が見つかりません:", state.level);
    return;
  }

  // 設定された桁数で数字を作る
  const a = generateMultiplicationNumber(config.aDigits);
  const b = generateMultiplicationNumber(config.bDigits);

  // =====================
  // 問題表示
  // =====================
  const el = document.getElementById("display");

  const problemText =
    `${a.toLocaleString()} × ${b.toLocaleString()}`;

  el.textContent = problemText;

  // 文字数に応じて問題の大きさを調整
  const length = problemText.replace(/,/g, "").length;

  if (length <= 5) {
    el.style.fontSize = "80px";
  } else if (length <= 8) {
    el.style.fontSize = "65px";
  } else if (length <= 11) {
    el.style.fontSize = "52px";
  } else if (length <= 14) {
    el.style.fontSize = "42px";
  } else if (length <= 17) {
    el.style.fontSize = "34px";
  } else {
    el.style.fontSize = "28px";
  }

  el.style.opacity = "1";
  el.style.fontFamily = '"Soloburn", monospace';

  // =====================
  // 正解
  // =====================
  state.answer = BigInt(a) * BigInt(b);

  // =====================
  // 回答欄・キーパッドを隠す
  // =====================
  document.getElementById("answerArea").style.display = "none";

  // =====================
  // 「解答する」ボタンを表示
  // =====================
  const solveBtn = document.getElementById("solveBtn");
  solveBtn.style.display = "inline-block";

  // =====================
  // 問題番号
  // =====================
  document.getElementById("questionInfo").style.display = "block";

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion} / ${state.questionCount}`;

  document.getElementById("homeBtn").style.display = "block";

  // =====================
  // 判定表示をリセット
  // =====================
  document.getElementById("judge").textContent = "";

  const correctResult = document.getElementById("correctResult");
  const answerResult = document.getElementById("answerResult");
  const answerProgress = document.getElementById("answerProgress");
  const answerProgressBar = document.getElementById("answerProgressBar");

  if (correctResult) correctResult.style.display = "none";
  if (answerResult) answerResult.style.display = "none";
  if (answerProgress) answerProgress.style.display = "none";

  if (answerProgressBar) {
    answerProgressBar.style.transition = "none";
    answerProgressBar.style.width = "0%";
  }

  // =====================
  // 入力欄をクリア
  // =====================
  document.getElementById("answerInput").value = "";
}

// =====================
// かけ算用・ランダム数字生成
// =====================
function generateMultiplicationNumber(digits) {

  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

// =====================
// 回答チェック（かけ算用）
// =====================
function checkAnswerMultiplication() {

  const inputEl = document.getElementById("answerInput");
  const judge = document.getElementById("judge");
  const correctResult = document.getElementById("correctResult");
  const result = document.getElementById("answerResult");
  const yourAnswer = document.getElementById("yourAnswer");
  const correctAnswer = document.getElementById("correctAnswer");
  const progress = document.getElementById("answerProgress");
  const progressBar = document.getElementById("answerProgressBar");

  const input = inputEl.value;
  const clean = input.replace(/,/g, "");

  // 前回の表示をリセット
  if (correctResult) correctResult.style.display = "none";
  if (result) result.style.display = "none";
  if (progress) progress.style.display = "none";

  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
  }

  // 未入力
  if (clean === "") {
    judge.textContent = "未入力";

    setTimeout(() => {
      if (state.isFinished) return;

      inputEl.value = "";

      if (state.currentQuestion < state.questionCount) {
        state.currentQuestion++;
        startMultiplication();
      } else {
        showResult();
      }
    }, 300);

    return;
  }

  // 正解
  if (BigInt(clean) === state.answer) {
    judge.textContent = "";

    if (correctResult) correctResult.style.display = "block";

    state.correctCount++;
    playCorrectSound();
    inputEl.style.background = "#003300";

    setTimeout(() => {
      if (state.isFinished) return;

      inputEl.style.background = "black";
      inputEl.value = "";

      if (state.currentQuestion < state.questionCount) {
        state.currentQuestion++;

        state.nextTimer = setTimeout(() => {
          if (state.isFinished) return;
          startMultiplication();
        }, 800);
      } else {
        showResult();
      }
    }, 300);

  } else {
    // 不正解
    judge.textContent = "";

    if (yourAnswer) yourAnswer.textContent = input;
    if (correctAnswer) correctAnswer.textContent = state.answer.toLocaleString();
    if (result) result.style.display = "block";

    if (progress && progressBar) {
      progress.style.display = "block";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          progressBar.style.transition = "width 3s linear";
          progressBar.style.width = "100%";
        });
      });
    }

    state.nextTimer = setTimeout(() => {
      if (state.isFinished) return;

      inputEl.style.background = "black";
      inputEl.value = "";

      if (correctResult) correctResult.style.display = "none";
      if (result) result.style.display = "none";
      if (progress) progress.style.display = "none";

      if (progressBar) {
        progressBar.style.transition = "none";
        progressBar.style.width = "0%";
      }

      if (state.currentQuestion < state.questionCount) {
        state.currentQuestion++;
        startMultiplication();
      } else {
        showResult();
      }
    }, 3000);
  }
}

// =====================
// スタート（かけ算用）
// =====================
function startMultiplicationGame() {

  // ★これ絶対必要
  state.isFinished = false;

  state.currentQuestion = 1;
  state.correctCount = 0;

  startMultiplication();
}

// =====================
// かけ算：解答開始
// =====================
document.getElementById("solveBtn").addEventListener("click", () => {

  // 問題を消す
  document.getElementById("display").textContent = "";

  // 解答するボタンを消す
  document.getElementById("solveBtn").style.display = "none";

  // 回答欄・キーパッドを表示
  document.getElementById("answerArea").style.display = "block";
  document.getElementById("homeBtn").style.display = "none";
  document.getElementById("questionInfo").style.display = "none";
  document.getElementById("questionTitle").style.display = "none";
  document.getElementById("levelInfo").style.display = "none";

  // 入力欄をクリア
  document.getElementById("answerInput").value = "";

  // 入力欄にフォーカス
  document.getElementById("answerInput").focus();
});