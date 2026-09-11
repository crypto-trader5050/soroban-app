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
  correctCount: 0,
  isRunning: false
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
   数字 → 読み上げ用ひらがな
========================================================= */

function numberToJapaneseYomi(value) {

  const ones = [
    "",
    "いち",
    "に",
    "さん",
    "よん",
    "ご",
    "ろく",
    "なな",
    "はち",
    "きゅう"
  ];

  const smallUnits = [
    "",
    "じゅう",
    "ひゃく",
    "せん"
  ];


  function fourDigitsToYomi(num) {

    const str =
      String(num).padStart(4, "0");

    let result = "";

    for (let i = 0; i < 4; i++) {

      const digit =
        Number(str[i]);

      if (digit === 0) continue;

      const unit =
        smallUnits[3 - i];

      /* 千 */
      if (unit === "せん") {

        if (digit === 1) {
          result += "せん";
        } else if (digit === 3) {
          result += "さんぜん";
        } else if (digit === 8) {
          result += "はっせん";
        } else {
          result += ones[digit] + "せん";
        }

        continue;
      }


      /* 百 */
      if (unit === "ひゃく") {

        if (digit === 1) {
          result += "ひゃく";
        } else if (digit === 3) {
          result += "さんびゃく";
        } else if (digit === 6) {
          result += "ろっぴゃく";
        } else if (digit === 8) {
          result += "はっぴゃく";
        } else {
          result += ones[digit] + "ひゃく";
        }

        continue;
      }


      /* 十 */
      if (unit === "じゅう") {

        if (digit === 1) {
          result += "じゅう";
        } else {
          result += ones[digit] + "じゅう";
        }

        continue;
      }


      /* 一の位 */
      result += ones[digit];
    }

    return result;
  }


  let num =
    BigInt(value);

  if (num === 0n) {
    return "ぜろ";
  }


  const units = [
    "",
    "まん",
    "おく",
    "ちょう",
    "けい"
  ];


  let result = "";
  let unitIndex = 0;


  while (num > 0n) {

    const part =
      Number(num % 10000n);

    if (part !== 0) {

      result =
        fourDigitsToYomi(part) +
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
    numberToJapaneseYomi(item.value);


  if (index === 0) {

    return "ねがいましては、" +
           numberText +
           "えんなり";

  }


  if (item.operation === "subtract") {

    return "ひいては、" +
           numberText +
           "えんなり";

  }


  const previous =
    readingState.numbers[index - 1];


  if (
    previous &&
    previous.operation === "subtract"
  ) {

    return "くわえて、" +
           numberText +
           "えんなり";

  }


  return numberText + "えんなり";

}


/* =========================================================
   日本語音声取得・確認用
========================================================= */

function getJapaneseVoice() {

  const voices =
    speechSynthesis.getVoices();


  const japaneseVoices =
    voices.filter(voice =>
      voice.lang === "ja-JP" ||
      voice.lang.startsWith("ja")
    );


  console.log("===== 日本語音声一覧 =====");

  japaneseVoices.forEach((voice, index) => {

    console.log(
      index + " : " +
      voice.name +
      " / " +
      voice.lang
    );

  });


  /*
     現在と同じく、
     最初の日本語音声を使用
  */

  return japaneseVoices[0] || null;

}


/* =========================================================
   基本読み上げ
========================================================= */

function speakReading(
  text,
  callback,
  options = {}
) {

  if (!("speechSynthesis" in window)) {

    if (callback) {
      callback();
    }

    return;
  }


  const utterance =
    new SpeechSynthesisUtterance(text);


  const japaneseVoice =
    getJapaneseVoice();


  if (japaneseVoice) {

    utterance.voice =
      japaneseVoice;

  }


  utterance.lang =
    "ja-JP";


  const rates = {

    1: 0.65,
    2: 0.80,
    3: 1.00,
    4: 1.25,
    5: 1.50

  };


  const baseRate =
    rates[readingState.speed] || 1.0;


  utterance.rate =
    options.rate !== undefined
      ? options.rate
      : baseRate;


  utterance.pitch =
    options.pitch !== undefined
      ? options.pitch
      : 1.0;


  utterance.volume = 1.0;


  let finished = false;


  function finish() {

    if (finished) {
      return;
    }


    finished = true;


    if (callback) {
      callback();
    }

  }


  utterance.onend = () => {

    finish();

  };


  utterance.onerror = () => {

    finish();

  };


  /*
     ブラウザ側で onend が返ってこない場合の保険。

     短すぎるタイマーで次の音声が重ならないよう、
     十分長めに設定する。
  */

  const safetyTime =
    Math.max(
      6000,
      text.length *
      450 /
      utterance.rate
    );


  setTimeout(() => {

    finish();

  }, safetyTime);


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
      : "かげんざん";


  /*
     条件説明は一つの文章として読む。

     ここでは数字と「えんなり」のような
     競技中の数字読みではないため、
     通常の文章として自然に読ませる。
  */

  const text =
    digitText +
    "、" +
    calculationText +
    "です";


  speakReading(
    text,
    callback,
    {
      rate: 0.90,
      pitch: 0.98
    }
  );

}


/* =========================================================
   問題読み上げ
========================================================= */

function speakReadingSequence(
  numbers,
  index,
  callback
) {

  /*
     全ての数字を読み終えた
  */

  if (
    index >= numbers.length
  ) {

    const last =
      numbers[numbers.length - 1];


    /*
       最後の数字と「えんでは」は
       絶対に分離しない。
    */

    const finalText =
      numberToJapanese(last.value) +
      "えんでは～";


    speakReading(
      finalText,
      callback,
      {
        rate: 0.90,
        pitch: 0.90
      }
    );


    return;
  }


  const item =
    numbers[index];


  const numberText =
    numberToJapanese(item.value);


  const rates = {

    1: 0.65,
    2: 0.80,
    3: 1.00,
    4: 1.25,
    5: 1.50

  };


  const baseRate =
    rates[readingState.speed] || 1.0;


  /* =======================================================
     1問目
  ======================================================= */

  if (index === 0) {

    /*
       「ねがいましては」
       ↓
       少し間
       ↓
       「数字＋えんなり」

       数字と「えんなり」は
       同じUtteranceにする。
    */

    speakReading(
      "ねがいましては",
      () => {

        setTimeout(() => {

          speakReading(
            numberText +
            "えんなり",

            () => {

              setTimeout(() => {

                speakReadingSequence(
                  numbers,
                  index + 1,
                  callback
                );

              }, 260);

            },

            {
              rate:
                baseRate * 0.94,

              pitch:
                1.00
            }
          );

        }, 380);

      },

      {
        rate:
          baseRate * 0.88,

        pitch:
          1.02
      }
    );


    return;
  }


  /* =======================================================
     引き算
  ======================================================= */

  if (
    item.operation === "subtract"
  ) {

    speakReading(
      "ひいては",
      () => {

        setTimeout(() => {

          speakReading(
            numberText +
            "えんなり",

            () => {

              setTimeout(() => {

                speakReadingSequence(
                  numbers,
                  index + 1,
                  callback
                );

              }, 250);

            },

            {
              rate:
                baseRate * 0.94,

              pitch:
                0.99
            }
          );

        }, 180);

      },

      {
        rate:
          baseRate * 0.90,

        pitch:
          0.98
      }
    );


    return;
  }


  /* =======================================================
     前の数字が引き算
     →「くわえて」
  ======================================================= */

  const previous =
    numbers[index - 1];


  if (
    previous &&
    previous.operation === "subtract"
  ) {

    speakReading(
      "くわえて",
      () => {

        setTimeout(() => {

          speakReading(
            numberText +
            "えんなり",

            () => {

              setTimeout(() => {

                speakReadingSequence(
                  numbers,
                  index + 1,
                  callback
                );

              }, 250);

            },

            {
              rate:
                baseRate * 0.94,

              pitch:
                1.00
            }
          );

        }, 180);

      },

      {
        rate:
          baseRate * 0.90,

        pitch:
          1.01
      }
    );


    return;
  }


  /* =======================================================
     通常の加算
  ======================================================= */

  speakReading(
    numberText +
    "えんなり",

    () => {

      setTimeout(() => {

        speakReadingSequence(
          numbers,
          index + 1,
          callback
        );

      }, 250);

    },

    {
      rate:
        baseRate * 0.94,

      pitch:
        1.00
    }
  );

}


/* =========================================================
   実行画面
========================================================= */

function startReading() {

  readingState.isRunning = true;

  readingState.currentQuestion = 0;
  readingState.correctCount = 0;


  /*
     開始時だけ現在の音声をキャンセルする。

     問題読み上げ中には cancel() しない。
  */

  if ("speechSynthesis" in window) {

    speechSynthesis.cancel();

  }


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


  const answerArea =
    document.getElementById(
      "answerArea"
    );


  if (answerArea) {

    answerArea.style.display =
      "none";

  }


  /*
     条件説明
     ↓
     1問目
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


  const answerArea =
    document.getElementById(
      "answerArea"
    );


  if (answerArea) {

    answerArea.style.display =
      "none";

  }


  /*
     問題読み上げ
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
   解答エリア
========================================================= */

function showReadingAnswerArea() {

  const answerArea =
    document.getElementById(
      "answerArea"
    );


  if (answerArea) {

    answerArea.style.display =
      "block";

  }


  const input =
    document.getElementById(
      "answerInput"
    );


  if (input) {

    input.focus();

  }

}


/* =========================================================
   解答判定
========================================================= */

function checkReadingAnswer() {

  const input =
    document.getElementById(
      "answerInput"
    );


  if (!input) {
    return;
  }


  const userAnswer =
    input.value.trim();


  if (
    userAnswer === ""
  ) {

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
    document.getElementById(
      "judge"
    );


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
    document.getElementById(
      "answerArea"
    );


  if (answerArea) {

    answerArea.style.display =
      "none";

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

  readingState.isRunning =
    false;


  const answerArea =
    document.getElementById(
      "answerArea"
    );


  if (answerArea) {

    answerArea.style.display =
      "none";

  }


  const display =
    document.getElementById(
      "display"
    );


  if (display) {

    display.textContent =
      "終了";

  }


  const judge =
    document.getElementById(
      "judge"
    );


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