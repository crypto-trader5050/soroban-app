/* =========================================================
   読み上げ
   reading.js
========================================================= */


/* =========================================================
   読み上げ設定
========================================================= */

let readingState = {

  // 種目
  type: "yomi",

  // 計算方法
  calculation: "mixed",

  // 桁モード
  digitMode: "variable",

  // 桁揃い
  digit: 7,

  // 桁バラ
  minDigit: 7,
  maxDigit: 10,

  // 口数
  count: 15,

  // スピード
  speed: 3

};


/* =========================================================
   読み上げ画面を開く
========================================================= */

function goRead() {

  document.getElementById("home").style.display = "none";

  document.getElementById("flashSelect").style.display = "none";

  document.getElementById("levelSelect").style.display = "none";

  document.getElementById("readSelect").style.display = "block";

  updateReadingScreen();

}


/* =========================================================
   カード選択
========================================================= */

function setupReadingButtons() {

  /* -------------------------------------------------------
     種目
  ------------------------------------------------------- */

  document.querySelectorAll("[data-read-type]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.type =
        button.dataset.readType;

      setSelected(
        "[data-read-type]",
        button
      );

      updateReadingSummary();

    });

  });


  /* -------------------------------------------------------
     計算方法
  ------------------------------------------------------- */

  document.querySelectorAll("[data-calculation]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.calculation =
        button.dataset.calculation;

      setSelected(
        "[data-calculation]",
        button
      );

      updateReadingSummary();

    });

  });


  /* -------------------------------------------------------
     桁モード
  ------------------------------------------------------- */

  document.querySelectorAll("[data-digit-mode]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.digitMode =
        button.dataset.digitMode;

      setSelected(
        "[data-digit-mode]",
        button
      );

      updateDigitArea();

      updateReadingSummary();

    });

  });


  /* -------------------------------------------------------
     口数
  ------------------------------------------------------- */

  document.querySelectorAll("[data-count]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.count =
        Number(button.dataset.count);

      setSelected(
        "[data-count]",
        button
      );

      updateReadingSummary();

    });

  });


  /* -------------------------------------------------------
     スピード
  ------------------------------------------------------- */

  document.querySelectorAll("[data-speed]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.speed =
        Number(button.dataset.speed);

      setSelected(
        "[data-speed]",
        button
      );

      updateReadingSummary();

    });

  });


  /* -------------------------------------------------------
     桁バラ
  ------------------------------------------------------- */

  const minSelect =
    document.getElementById("minDigitSelect");

  const maxSelect =
    document.getElementById("maxDigitSelect");


  if (minSelect) {

    minSelect.addEventListener("change", () => {

      let min =
        Number(minSelect.value);

      let max =
        Number(maxSelect.value);

      if (min > max) {

        max = min;

        maxSelect.value = String(max);

      }

      readingState.minDigit = min;

      readingState.maxDigit = max;

      updateReadingSummary();

    });

  }


  if (maxSelect) {

    maxSelect.addEventListener("change", () => {

      let min =
        Number(minSelect.value);

      let max =
        Number(maxSelect.value);

      if (max < min) {

        min = max;

        minSelect.value = String(min);

      }

      readingState.minDigit = min;

      readingState.maxDigit = max;

      updateReadingSummary();

    });

  }


  /* -------------------------------------------------------
     スタート
  ------------------------------------------------------- */

  const startButton =
    document.getElementById("readStartButton");

  if (startButton) {

    startButton.addEventListener(
      "click",
      startReading
    );

  }


  /* -------------------------------------------------------
     桁揃いボタン
  ------------------------------------------------------- */

  createSameDigitButtons();

}


/* =========================================================
   選択状態
========================================================= */

function setSelected(selector, selectedButton) {

  document.querySelectorAll(selector).forEach(button => {

    button.classList.remove("selected");

  });

  selectedButton.classList.add("selected");

}


/* =========================================================
   桁揃い 1～16桁を生成
========================================================= */

function createSameDigitButtons() {

  const area =
    document.getElementById("sameDigitButtons");

  if (!area) return;

  area.innerHTML = "";

  for (let digit = 1; digit <= 16; digit++) {

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent =
      `${digit}桁`;

    button.dataset.digit =
      digit;

    if (digit === readingState.digit) {

      button.classList.add("selected");

    }

    button.addEventListener("click", () => {

      readingState.digit =
        digit;

      area
        .querySelectorAll("button")
        .forEach(btn => {

          btn.classList.remove("selected");

        });

      button.classList.add("selected");

      updateReadingSummary();

    });

    area.appendChild(button);

  }

}


/* =========================================================
   桁選択エリア切り替え
========================================================= */

function updateDigitArea() {

  const sameArea =
    document.getElementById("sameDigitSelect");

  const variableArea =
    document.getElementById("variableDigitSelect");


  if (!sameArea || !variableArea) return;


  if (readingState.digitMode === "same") {

    sameArea.style.display = "block";

    variableArea.style.display = "none";

  } else {

    sameArea.style.display = "none";

    variableArea.style.display = "block";

  }

}


/* =========================================================
   設定表示更新
========================================================= */

function updateReadingSummary() {

  const summary =
    document.getElementById("readSettingSummary");

  if (!summary) return;


  const typeText =
    readingState.type === "yomi"
      ? "読み上げ算"
      : "読み上げ暗算";


  const calculationText =
    readingState.calculation === "addition"
      ? "加算"
      : "加減算";


  let digitText;


  if (readingState.digitMode === "same") {

    digitText =
      `${readingState.digit}桁`;

  } else {

    digitText =
      `${readingState.minDigit}～${readingState.maxDigit}桁`;

  }


  const speedText =
    getSpeedText(
      readingState.speed
    );


  summary.textContent =
    `${typeText}・${calculationText}・${digitText}・${readingState.count}口・${speedText}`;

}


/* =========================================================
   スピード表示
========================================================= */

function getSpeedText(speed) {

  const speedNames = {

    1: "とてもゆっくり",
    2: "ゆっくり",
    3: "普通",
    4: "速い",
    5: "とても速い"

  };

  return speedNames[speed] || "普通";

}


/* =========================================================
   画面初期化
========================================================= */

function updateReadingScreen() {

  updateDigitArea();

  updateReadingSummary();

}


/* =========================================================
   読み上げ開始
========================================================= */

function startReading() {

  console.log(
    "読み上げ開始",
    readingState
  );

}

document.addEventListener("DOMContentLoaded", () => {
  setupReadingButtons();
});