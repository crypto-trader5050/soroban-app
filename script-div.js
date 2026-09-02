// =====================
// 除算・級段設定
// =====================

const DIV_LEVEL_CONFIG = [
  { level: "10級", aDigits: 3, bDigits: 1 },
  { level: "9級",  aDigits: 4, bDigits: 1 },
  { level: "8級",  aDigits: 4, bDigits: 2 },
  { level: "7級",  aDigits: 5, bDigits: 2 },
  { level: "6級",  aDigits: 5, bDigits: 3 },
  { level: "5級",  aDigits: 6, bDigits: 2 },
  { level: "4級",  aDigits: 6, bDigits: 3 },
  { level: "3級",  aDigits: 6, bDigits: 4 },
  { level: "2級",  aDigits: 7, bDigits: 3 },
  { level: "1級",  aDigits: 7, bDigits: 4 },

  { level: "初段", aDigits: 8,  bDigits: 3 },
  { level: "弐段", aDigits: 8,  bDigits: 4 },
  { level: "参段", aDigits: 9,  bDigits: 4 },
  { level: "四段", aDigits: 9,  bDigits: 5 },
  { level: "五段", aDigits: 10, bDigits: 5 },
  { level: "六段", aDigits: 10, bDigits: 6 },
  { level: "七段", aDigits: 11, bDigits: 6 },
  { level: "八段", aDigits: 11, bDigits: 7 },
  { level: "九段", aDigits: 12, bDigits: 7 },
  { level: "十段", aDigits: 12, bDigits: 8 }
];


// =====================
// 除算・問題生成
// =====================

function startDivision() {

  if (state.isFinished) return;

  if (state.currentQuestion > state.questionCount) {
    showResult();
    return;
  }

  console.log(
    "除算 現在:",
    state.currentQuestion,
    "/",
    state.questionCount
  );

  const config = DIV_LEVEL_CONFIG.find(
    item => item.level === state.level
  );

  if (!config) {
    console.error("除算設定が見つかりません:", state.level);
    return;
  }

  const problem = generateDivisionProblem(
    config.aDigits,
    config.bDigits
  );

  const el = document.getElementById("display");

  const problemText =
    `${problem.dividend.toLocaleString()} ÷ ${problem.divisor.toLocaleString()}`;

  el.textContent = problemText;

  // 文字数に応じて問題の大きさを調整
  const length =
    problemText.replace(/,/g, "").length;

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

  // 正解
  state.answer = problem.answer;

  // 回答欄・キーパッドを隠す
  document.getElementById("answerArea").style.display = "none";

  // 解答するボタンを表示
  const solveBtn =
    document.getElementById("solveBtn");

  solveBtn.style.display = "inline-block";

  // ホームへ戻るボタンを隠す
  document.getElementById("homeBtn").style.display = "none";

  // 問題番号
  document.getElementById("questionInfo").style.display = "block";

  document.getElementById("questionInfo").textContent =
    `${state.currentQuestion}問目 / 全${state.questionCount}問`;

  // 判定表示をクリア
  document.getElementById("judge").textContent = "";

  // 入力欄をクリア
  document.getElementById("answerInput").value = "";
}


// =====================
// 除算・問題生成本体
// =====================

function generateDivisionProblem(
  dividendDigits,
  divisorDigits
) {

  const divisorMin =
    10n ** BigInt(divisorDigits - 1);

  const divisorMax =
    10n ** BigInt(divisorDigits) - 1n;

  const dividendMin =
    10n ** BigInt(dividendDigits - 1);

  const dividendMax =
    10n ** BigInt(dividendDigits) - 1n;

  while (true) {

    // 割る数を生成
    const divisor =
      randomBigInt(divisorMin, divisorMax);

    // 商の最小・最大を計算
    let answerMin =
      (dividendMin + divisor - 1n) / divisor;

    let answerMax =
      dividendMax / divisor;

    if (answerMin > answerMax) {
      continue;
    }

    // 商をランダム生成
    const answer =
      randomBigInt(answerMin, answerMax);

    // 割られる数
    const dividend =
      divisor * answer;

    // 桁数チェック
    if (
      dividend >= dividendMin &&
      dividend <= dividendMax
    ) {

      return {
        dividend: dividend,
        divisor: divisor,
        answer: answer
      };
    }
  }
}


// =====================
// BigIntランダム生成
// =====================

function randomBigInt(min, max) {

  if (min > max) {
    throw new Error("randomBigInt: 範囲が不正です");
  }

  const range = max - min + 1n;

  const random =
    Math.floor(Math.random() * Number(range));

  return min + BigInt(random);
}


// =====================
// 除算・ゲーム開始
// =====================

function startDivisionGame() {

  state.isFinished = false;

  state.currentQuestion = 1;
  state.correctCount = 0;

  startDivision();
}


// =====================
// 除算・回答チェック
// =====================

function checkAnswerDivision() {

  console.log(
    "除算 問題番号",
    state.currentQuestion
  );

  if (state.nextTimer) {
    clearTimeout(state.nextTimer);
    state.nextTimer = null;
  }

  const inputEl =
    document.getElementById("answerInput");

  const judge =
    document.getElementById("judge");

  const clean =
    inputEl.value.replace(/,/g, "");

  // 未入力
  if (clean === "") {

    judge.textContent = "未入力";

    setTimeout(() => {

      if (state.isFinished) return;

      inputEl.value = "";

      if (
        state.currentQuestion <
        state.questionCount
      ) {

        state.currentQuestion++;

        startDivision();

      } else {

        showResult();

      }

    }, 300);

    return;
  }

  // 正解判定
  if (BigInt(clean) === state.answer) {

    judge.textContent = "正解！";

    state.correctCount++;

    playCorrectSound();

    inputEl.style.background = "#003300";

  } else {

    judge.textContent =
      "不正解：正解は " +
      state.answer.toLocaleString();

  }

  setTimeout(() => {

    if (state.isFinished) return;

    inputEl.style.background = "black";
    inputEl.value = "";

    if (
      state.currentQuestion <
      state.questionCount
    ) {

      state.currentQuestion++;

      state.nextTimer = setTimeout(() => {

        if (state.isFinished) return;

        startDivision();

      }, 800);

    } else {

      showResult();

    }

  }, 300);
}