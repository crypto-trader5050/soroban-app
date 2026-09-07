/* =========================================================
   読み上げ
   reading.js

   ・読み上げ算 / 読み上げ暗算
   ・加算 / 加減算
   ・桁揃い / 桁バラ
   ・1～16桁
   ・3 / 5 / 7 / 10 / 15 / 20口
   ・スピード1～5
========================================================= */

let readingState = {
  type: "yomi",
  calculation: "mixed",
  digitMode: "variable",
  digit: 7,
  minDigit: 7,
  maxDigit: 10,
  count: 15,
  speed: 3,

  // 実行用
  numbers: [],
  answer: 0n,
  currentQuestion: 0,
  correctCount: 0
};


/* =========================================================
   読み上げ設定画面
========================================================= */

function goRead() {

  document.getElementById("home").style.display = "none";
  document.getElementById("flashSelect").style.display = "none";
  document.getElementById("levelSelect").style.display = "none";
  document.getElementById("app").style.display = "none";

  document.getElementById("readSelect").style.display = "block";

  updateReadingScreen();
}


function setupReadingButtons() {

  document.querySelectorAll("[data-read-type]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.type = button.dataset.readType;

      setSelected("[data-read-type]", button);

      updateReadingSummary();
    });

  });


  document.querySelectorAll("[data-calculation]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.calculation = button.dataset.calculation;

      setSelected("[data-calculation]", button);

      updateReadingSummary();
    });

  });


  document.querySelectorAll("[data-digit-mode]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.digitMode = button.dataset.digitMode;

      setSelected("[data-digit-mode]", button);

      updateDigitArea();
      updateReadingSummary();
    });

  });


  document.querySelectorAll("[data-count]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.count = Number(button.dataset.count);

      setSelected("[data-count]", button);

      updateReadingSummary();
    });

  });


  document.querySelectorAll("[data-speed]").forEach(button => {

    button.addEventListener("click", () => {

      readingState.speed = Number(button.dataset.speed);

      setSelected("[data-speed]", button);

      updateReadingSummary();
    });

  });


  const minSelect =
    document.getElementById("minDigitSelect");

  const maxSelect =
    document.getElementById("maxDigitSelect");


  if (minSelect) {

    minSelect.addEventListener("change", () => {

      let min = Number(minSelect.value);
      let max = Number(maxSelect.value);

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

      let min = Number(minSelect.value);
      let max = Number(maxSelect.value);

      if (max < min) {

        min = max;

        minSelect.value = String(min);
      }

      readingState.minDigit = min;
      readingState.maxDigit = max;

      updateReadingSummary();
    });
  }


  const startButton =
    document.getElementById("readStartButton");

  if (startButton) {

    startButton.addEventListener(
      "click",
      startReading
    );
  }


  createSameDigitButtons();
}


function setSelected(selector, selectedButton) {

  document.querySelectorAll(selector).forEach(button => {

    button.classList.remove("selected");

  });

  selectedButton.classList.add("selected");
}


function createSameDigitButtons() {

  const area =
    document.getElementById("sameDigitButtons");

  if (!area) return;

  area.innerHTML = "";

  for (let digit = 1; digit <= 16; digit++) {

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent = `${digit}桁`;

    button.dataset.digit = digit;

    if (digit === readingState.digit) {

      button.classList.add("selected");

    }

    button.addEventListener("click", () => {

      readingState.digit = digit;

      area.querySelectorAll("button").forEach(btn => {

        btn.classList.remove("selected");

      });

      button.classList.add("selected");

      updateReadingSummary();
    });

    area.appendChild(button);
  }
}


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
    getSpeedText(readingState.speed);

  summary.textContent =
    `${typeText}・${calculationText}・${digitText}・${readingState.count}口・${speedText}`;
}


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


function updateReadingScreen() {

  updateDigitArea();
  updateReadingSummary();
}


/* =========================================================
   問題生成
========================================================= */

function getReadingDigit() {

  if (readingState.digitMode === "same") {

    return readingState.digit;

  }

  return Math.floor(
    Math.random() *
      (readingState.maxDigit - readingState.minDigit + 1)
  ) + readingState.minDigit;
}


function randomNumberByDigit(digit) {

  if (digit <= 1) {

    return Math.floor(Math.random() * 9) + 1;
  }

  const min =
    10 ** (digit - 1);

  const max =
    (10 ** digit) - 1;

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}


/*
   加減算では、途中結果がマイナスにならないようにする。
*/

function generateReadingQuestion() {

  const numbers = [];

  let answer = 0n;

  let current = 0n;


  for (
    let i = 0;
    i < readingState.count;
    i++
  ) {

    const digit =
      getReadingDigit();

    let number =
      BigInt(randomNumberByDigit(digit));


    /*
       最初は必ず加算。
    */

    if (i === 0) {

      numbers.push({
        value: number,
        operation: "add"
      });

      current += number;

      continue;
    }


    /*
       加算のみ
    */

    if (readingState.calculation === "addition") {

      numbers.push({
        value: number,
        operation: "add"
      });

      current += number;

      continue;
    }


    /*
       加減算
    */

    const subtract =
      Math.random() < 0.5;


    if (subtract && current >= number) {

      numbers.push({
        value: number,
        operation: "subtract"
      });

      current -= number;

    } else {

      numbers.push({
        value: number,
        operation: "add"
      });

      current += number;
    }
  }


  answer = current;


  readingState.numbers = numbers;
  readingState.answer = answer;

  return numbers;
}


/* =========================================================
   数字 → 日本語読み
========================================================= */

function numberToJapanese(value) {

  const units = [
    "",
    "万",
    "億",
    "兆",
    "京"
  ];

  const smallUnits = [
    "",
    "十",
    "百",
    "千"
  ];


  function fourDigitsToJapanese(num) {

    let result = "";

    const str =
      String(num).padStart(4, "0");


    for (let i = 0; i < 4; i++) {

      const digit =
        Number(str[i]);

      if (digit === 0) continue;

      const unit =
        smallUnits[3 - i];

      if (digit === 1 && unit !== "") {

        result += unit;

      } else {

        result += digit + unit;
      }
    }

    return result;
  }


  let num =
    BigInt(value);

  if (num === 0n) return "零";


  let result = "";
  let unitIndex = 0;


  while (num > 0n) {

    const part =
      Number(num % 10000n);

    if (part !== 0) {

      const partText =
        fourDigitsToJapanese(part);

      result =
        partText +
        units[unitIndex] +
        result;
    }

    num /= 10000n;
    unitIndex++;
  }


  return result;
}

/* =========================================================
   読み上げ用文章
========================================================= */

function getReadingPhrase(item, index) {

  const numberText =
    numberToJapanese(item.value);


  if (index === 0) {

    return "ねがいましては、" +
           numberText +
           "円なーりー";

  }


  if (item.operation === "subtract") {

    return "ひいては、" +
           numberText +
           "円なーりー";

  }


  /*
     前の問題が引き算なら
     「くわえて」を使う。
  */

  const previous =
    readingState.numbers[index - 1];


  if (
    previous &&
    previous.operation === "subtract"
  ) {

    return "くわえて、" +
           numberText +
           "円なーりー";

  }


  return numberText + "円なーりー";

}


/* =========================================================
   音声読み上げ
========================================================= */

function speakReading(text, callback) {

  if (!("speechSynthesis" in window)) {

    if (callback) {
      callback();
    }

    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  /* ---------------------------------------------------------
     日本語音声を選択
  --------------------------------------------------------- */

  const voices = speechSynthesis.getVoices();

  let japaneseVoice =
    voices.find(voice =>
      voice.lang === "ja-JP" &&
      (
        voice.name.includes("Microsoft") ||
        voice.name.includes("Google")
      )
    );

  if (!japaneseVoice) {

    japaneseVoice =
      voices.find(voice =>
        voice.lang.startsWith("ja")
      );

  }

  if (japaneseVoice) {
    utterance.voice = japaneseVoice;
  }

  utterance.lang = "ja-JP";


  /* ---------------------------------------------------------
     スピード設定
     1 = とてもゆっくり
     5 = とても速い
  --------------------------------------------------------- */

  const rates = {

    1: 0.65,
    2: 0.8,
    3: 1.0,
    4: 1.25,
    5: 1.5

  };

  utterance.rate =
    rates[readingState.speed] || 1.0;


  /* ---------------------------------------------------------
     音程
  --------------------------------------------------------- */

  utterance.pitch = 1.0;


  /* ---------------------------------------------------------
     読み上げ終了
  --------------------------------------------------------- */

  utterance.onend = () => {

    if (callback) {
      callback();
    }

  };


  speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   条件説明
========================================================= */

function speakReadingCondition(callback) {

  let digitText;


  if (
    readingState.digitMode === "same"
  ) {

    digitText =
      String(readingState.digit) +
      "桁揃い";

  } else {

    digitText =
      String(readingState.minDigit) +
      "桁から" +
      String(readingState.maxDigit) +
      "桁";

  }


  const calculationText =
    readingState.calculation === "addition"
      ? "加算"
      : "加減算";


  const text =
    digitText +
    "、" +
    calculationText +
    "です";


  speakReading(
    text,
    callback
  );

}


/* =========================================================
   実行画面
========================================================= */

function startReading() {

  readingState.currentQuestion = 0;
  readingState.correctCount = 0;


  document.getElementById(
    "readSelect"
  ).style.display = "none";


  document.getElementById(
    "home"
  ).style.display = "none";


  document.getElementById(
    "flashSelect"
  ).style.display = "none";


  document.getElementById(
    "levelSelect"
  ).style.display = "none";


  document.getElementById(
    "app"
  ).style.display = "block";


  const title =
    document.getElementById(
      "questionTitle"
    );


  const info =
    document.getElementById(
      "questionInfo"
    );


  const display =
    document.getElementById(
      "display"
    );


  const judge =
    document.getElementById(
      "judge"
    );


  if (title) {

    title.textContent =
      readingState.type === "yomi"
        ? "読み上げ算"
        : "読み上げ暗算";

  }


  if (info) {

    info.textContent =
      "全" +
      String(readingState.count) +
      "問";

  }


  if (display) {

    display.textContent = "";

  }


  if (judge) {

    judge.textContent = "";

  }


  /*
     最初の条件説明
  */

  speakReadingCondition(
    () => {

      startReadingQuestion();

    }
  );

}


/* =========================================================
   1問開始
========================================================= */

function startReadingQuestion() {

  const numbers =
    generateReadingQuestion();


  const questionIndex =
    readingState.currentQuestion + 1;


  const info =
    document.getElementById(
      "questionInfo"
    );


  if (info) {

    info.textContent =
      String(questionIndex) +
      " / " +
      String(readingState.count);

  }


  const judge =
    document.getElementById(
      "judge"
    );


  if (judge) {

    judge.textContent = "";

  }


  const input =
    document.getElementById(
      "answerInput"
    );


  if (input) {

    input.value = "";

  }


  /*
     問題の読み上げを開始
  */

  speakReadingSequence(
    numbers,
    0,
    () => {

      showReadingAnswerArea();

    }
  );

}

/* =========================================================
   数字を順番に読む
========================================================= */

function speakReadingSequence(
  numbers,
  index,
  callback
) {

  if (index >= numbers.length) {

    /*
       最後は「○○円では～」
    */

    const last =
      numbers[numbers.length - 1];


    const finalText =
      `${numberToJapanese(last.value)}円では～`;

    speakReading(finalText, callback);

    return;
  }


  const text =
    getReadingPhrase(
      numbers[index],
      index
    );


  speakReading(text, () => {

    speakReadingSequence(
      numbers,
      index + 1,
      callback
    );

  });
}


/* =========================================================
   解答エリア
========================================================= */

function showReadingAnswerArea() {

  const answerArea =
    document.getElementById("answerArea");

  if (answerArea) {

    answerArea.style.display = "block";
  }


  const input =
    document.getElementById("answerInput");

  if (input) {

    input.focus();
  }
}


/* =========================================================
   解答判定
========================================================= */

function checkReadingAnswer() {

  const input =
    document.getElementById("answerInput");


  if (!input) return;


  const userAnswer =
    input.value.trim();


  if (userAnswer === "") {

    return;
  }


  let correct = false;


  try {

    correct =
      BigInt(userAnswer) ===
      readingState.answer;

  } catch {

    correct = false;
  }


  const judge =
    document.getElementById("judge");


  if (correct) {

    readingState.correctCount++;


    if (judge) {

      judge.textContent =
        "正解！";
    }


    speakReading(
      "ご名算です！",
      () => {

        nextReadingQuestion();

      }
    );

  } else {

    if (judge) {

      judge.textContent =
        "不正解";
    }


    setTimeout(() => {

      nextReadingQuestion();

    }, 1000);
  }
}


/* =========================================================
   次の問題
========================================================= */

function nextReadingQuestion() {

  const answerArea =
    document.getElementById("answerArea");


  if (answerArea) {

    answerArea.style.display = "none";
  }


  readingState.currentQuestion++;


  if (
    readingState.currentQuestion >=
    readingState.count
  ) {

    finishReading();

    return;
  }


  startReadingQuestion();
}


/* =========================================================
   セット終了
========================================================= */

function finishReading() {

  const answerArea =
    document.getElementById("answerArea");


  if (answerArea) {

    answerArea.style.display = "none";
  }


  const display =
    document.getElementById("display");


  if (display) {

    display.textContent =
      "終了";
  }


  const judge =
    document.getElementById("judge");


  const score =
    readingState.correctCount;


  if (judge) {

    judge.textContent =
      `${score} / ${readingState.count} 正解`;
  }


  /*
     合格判定
  */

  if (score >= 10) {

    speakReading(
      "合格です。おめでとうございます！"
    );

  } else {

    speakReading(
      "終了です。もう一度挑戦しましょう。"
    );
  }
}


/* =========================================================
   初期化
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupReadingButtons();

  }
);
