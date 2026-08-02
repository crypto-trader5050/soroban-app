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

  console.log("現在:", state.currentQuestion, "/", state.questionCount);

  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;

  const el = document.getElementById("display");
  el.textContent = `${a} × ${b}`;

  // ★ BigInt統一（重要）
  state.answer = BigInt(a * b);

  document.getElementById("answerArea").style.display = "block";

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion}問目 / 全${state.questionCount}問`;
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
  } else {
    judge.textContent = "不正解：正解は " + state.answer;
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