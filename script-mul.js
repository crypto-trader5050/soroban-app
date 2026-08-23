// =====================
// 乗算・級段設定
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
// ※ state は見取り側と共通でOK
// state = { currentQuestion, questionCount, correctCount, isFinished など }

// =====================
// 乗算：問題生成
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
    console.error("乗算設定が見つかりません:", state.level);
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
  // 乗算：通常レイアウト
  // =====================
  el.style.position = "relative";
  el.style.top = "auto";
  el.style.left = "auto";
  el.style.transform = "none";

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
  // ホームへ戻るボタンを隠す
  // =====================
  document.getElementById("homeBtn").style.display = "none";

  // =====================
  // 問題番号
  // =====================
  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion}問目 / 全${state.questionCount}問`;

  // =====================
  // 判定表示をクリア
  // =====================
  document.getElementById("judge").textContent = "";

  // =====================
  // 入力欄をクリア
  // =====================
  document.getElementById("answerInput").value = "";
}

// =====================
// 乗算用・ランダム数字生成
// =====================
function generateMultiplicationNumber(digits) {

  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

// =====================
// 回答チェック（乗算用）
// =====================
function checkAnswerMultiplication() {

  const inputEl = document.getElementById("answerInput");
  const judge = document.getElementById("judge");

  const clean = inputEl.value.replace(/,/g, "");

  // 未入力
  if (clean === "") {
    judge.textContent = "未入力";
    return;
  }

  // 判定
  if (BigInt(clean) === state.answer) {
    judge.textContent = "正解！";
    state.correctCount++;

    // ★正解音
    playCorrectSound();

  } else {
    judge.textContent =
      "不正解：正解は " + state.answer.toLocaleString();
  }

  setTimeout(() => {

    if (state.isFinished) return;

    inputEl.value = "";

    // ★進行管理（最重要）
    if (state.currentQuestion < state.questionCount) {

      state.currentQuestion++;
      startMultiplication();

    } else {
      showResult();
    }

  }, 500);
}

// =====================
// スタート（乗算用）
// =====================
function startMultiplicationGame() {

  // ★これ絶対必要
  state.isFinished = false;

  state.currentQuestion = 1;
  state.correctCount = 0;

  startMultiplication();
}

function handleOk() {
  if (state.type === "kake") {
    checkAnswerMultiplication();
  } else {
    checkAnswer();
  }
}

// =====================
// 乗算：解答開始
// =====================
document.getElementById("solveBtn").addEventListener("click", () => {

  // 問題を消す
  document.getElementById("display").textContent = "";

  // 解答するボタンを消す
  document.getElementById("solveBtn").style.display = "none";

  // 回答欄・キーパッドを表示
  document.getElementById("answerArea").style.display = "block";

  // 入力欄をクリア
  document.getElementById("answerInput").value = "";

  // 入力欄にフォーカス
  document.getElementById("answerInput").focus();
});