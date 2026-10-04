document.addEventListener("DOMContentLoaded", () => {

  const cards = document.querySelectorAll(".problem-type-card");

  cards.forEach(card => {

    const button = card.querySelector(".problem-type-card-button");
    const detail = card.querySelector(".problem-type-detail");

    if (!button || !detail) return;

    button.addEventListener("click", () => {

      // 他のカードを閉じる
      cards.forEach(otherCard => {

        if (otherCard !== card) {
          otherCard.classList.remove("expanded");

          const otherDetail =
            otherCard.querySelector(".problem-type-detail");

          if (otherDetail) {
            otherDetail.innerHTML = "";
          }
        }

      });

      // クリックしたカードを開閉
      const isOpen = card.classList.contains("expanded");

      if (isOpen) {

        card.classList.remove("expanded");
        detail.innerHTML = "";

        return;
      }

      card.classList.add("expanded");

      // 見取算だけ設定画面を表示
      if (card.dataset.problemType === "mitori") {
        createMitoriSettings(detail);
      }

    });

  });


  /* =====================================================
     見取算 設定画面
  ===================================================== */

  function createMitoriSettings(container) {

    container.innerHTML = `

      <div class="problem-create-panel">

        <!-- 問題用紙情報 -->
        <section>

          <h3 class="problem-create-heading">
            問題用紙情報
          </h3>

          <div class="problem-paper-info">

            <div class="problem-form-item">
              <label class="problem-form-label">
                タイトル
              </label>

              <input
                type="text"
                class="problem-form-input"
                placeholder="例：みとり算"
              >
            </div>


            <div class="problem-form-item">
              <label class="problem-form-label">
                時間（分）
              </label>

              <input
                type="number"
                class="problem-form-input"
                min="1"
                step="1"
                placeholder="例：7"
              >
            </div>


            <div class="problem-form-item">
              <label class="problem-form-label">
                級・段位
              </label>

              <input
                type="text"
                class="problem-form-input"
                placeholder="例：10級、1級、初段、十段"
              >
            </div>


            <div class="problem-form-item">
              <label class="problem-form-label">
                回数
              </label>

              <input
                type="text"
                class="problem-form-input"
                placeholder="例：第12回"
              >
            </div>


            <div class="problem-form-item">
              <label class="problem-form-label">
                評点
              </label>

              <input
                type="text"
                class="problem-form-input"
                value=""
                disabled
                placeholder="手書き用"
              >
            </div>


            <div class="problem-form-item full">
              <label class="problem-form-label">
                自由文
              </label>

              <input
                type="text"
                class="problem-form-input"
                maxlength="100"
                placeholder="必要な場合のみ入力してください"
              >
            </div>

          </div>

        </section>


        <!-- 総問題数 -->
        <section class="problem-count-area">

          <h3 class="problem-create-heading">
            総問題数
          </h3>

          <div class="problem-count-buttons">

            <button type="button"
                    class="problem-count-button"
                    data-count="10">
              10問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="15">
              15問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="20">
              20問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="30">
              30問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="40">
              40問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="50">
              50問
            </button>

            <button type="button"
                    class="problem-count-button"
                    data-count="60">
              60問
            </button>

          </div>

        </section>


        <!-- 区間 -->
        <section class="problem-section-area">

          <h3 class="problem-create-heading">
            問題設定
          </h3>

          <div class="problem-section-list"
               id="mitoriSectionList">

          </div>


          <button
            type="button"
            class="problem-add-section-button"
            id="mitoriAddSection">
            ＋ 区間を追加
          </button>


          <div
            class="problem-section-status"
            id="mitoriSectionStatus">
            総問題数を選択してください。
          </div>

        </section>

      </div>
    `;


    /* ===================================================
       総問題数
    =================================================== */

    let totalQuestions = 0;
    let sectionNumber = 0;

    const countButtons =
      container.querySelectorAll(".problem-count-button");

    const sectionList =
      container.querySelector("#mitoriSectionList");

    const addSectionButton =
      container.querySelector("#mitoriAddSection");

    const status =
      container.querySelector("#mitoriSectionStatus");


    countButtons.forEach(button => {

      button.addEventListener("click", () => {

        countButtons.forEach(btn => {
          btn.classList.remove("selected");
        });

        button.classList.add("selected");

        totalQuestions =
          Number(button.dataset.count);

        sectionList.innerHTML = "";
        sectionNumber = 0;

        addSection();

        updateStatus();

      });

    });


    /* ===================================================
       区間追加
    =================================================== */

    addSectionButton.addEventListener("click", () => {

      if (!totalQuestions) {
        alert("先に総問題数を選択してください。");
        return;
      }

      const currentEnd =
        getLastSectionEnd();

      if (currentEnd >= totalQuestions) {
        alert("すべての問題が設定されています。");
        return;
      }

      addSection();

      updateStatus();

    });


    /* ===================================================
       区間を作る
    =================================================== */

    function addSection() {

      sectionNumber++;

      const previousEnd =
        getLastSectionEnd();

      const startNumber =
        previousEnd + 1;

      const section = document.createElement("div");

      section.className =
        "problem-section";

      section.innerHTML = `

        <h4 class="problem-section-title">
          区間 ${sectionNumber}
        </h4>


        <div class="problem-section-range">

          <div class="problem-form-item">

            <label class="problem-form-label">
              開始問題
            </label>

            <input
              type="number"
              class="problem-form-input section-start"
              min="1"
              value="${startNumber}"
            >

          </div>


          <div class="problem-form-item">

            <label class="problem-form-label">
              終了問題
            </label>

            <input
              type="number"
              class="problem-form-input section-end"
              min="1"
              value="${totalQuestions || ""}"
            >

          </div>

        </div>


        <!-- 桁数・口数・計算方法 -->

        <div class="problem-section-settings">

          <!-- 桁数 -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              桁数
            </label>

            <div class="problem-digit-range">

              <select class="problem-form-select digit-min-select">
                ${createOptions(1, 10, "桁")}
              </select>

              <span class="problem-digit-range-separator">
                ～
              </span>

              <select class="problem-form-select digit-max-select">
                ${createOptions(1, 10, "桁")}
              </select>

            </div>

          </div>


          <!-- 口数 -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              口数
            </label>

            <select class="problem-form-select mouth-select">
              ${createOptions(3, 10, "口")}
            </select>

          </div>


          <!-- 計算方法 -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              計算方法
            </label>

            <select class="problem-form-select calculation-select">

              <option value="addition">
                加算
              </option>

              <option value="add-subtract">
                加減算
              </option>

            </select>

          </div>

        </div>


        <!-- 加減算の詳細設定 -->

        <div class="problem-add-subtract-settings hidden">

          <!-- 加算のみ -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              加算のみの問題
            </label>

            <select
              class="problem-form-select addition-only-count-select">
            </select>

          </div>


          <!-- 引き算を含む問題 -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              引き算を含む問題
            </label>

            <div class="problem-auto-value subtraction-count-display">
              0問
            </div>

          </div>


          <!-- マイナスになる問題 -->

          <div class="problem-form-item">

            <label class="problem-form-label">
              マイナスになる問題
            </label>

            <select
              class="problem-form-select negative-count-select">
              <option value="0">
                0問
              </option>
            </select>

          </div>

        </div>

      `;


      sectionList.appendChild(section);


      const startInput =
        section.querySelector(".section-start");

      const endInput =
        section.querySelector(".section-end");

      const calculationSelect =
        section.querySelector(".calculation-select");

      const addSubtractSettings =
        section.querySelector(".problem-add-subtract-settings");

      const additionOnlyCountSelect =
        section.querySelector(".addition-only-count-select");

      const subtractionCountDisplay =
        section.querySelector(".subtraction-count-display");

      const negativeCountSelect =
        section.querySelector(".negative-count-select");

      function updateAddSubtractCounts() {

        const total =
          Number(endInput.value) -
          Number(startInput.value) +
          1;

        if (total <= 0) {
          return;
        }

        // 加算のみの選択肢を作る
        additionOnlyCountSelect.innerHTML = "";

        for (let i = 0; i <= total; i++) {

          const option =
            document.createElement("option");

          option.value = i;
          option.textContent = `${i}問`;

          additionOnlyCountSelect.appendChild(option);

        }

        // 初期値
        additionOnlyCountSelect.value = total;

        updateSubtractionCount();

      }

      function updateSubtractionCount() {

        const total =
          Number(endInput.value) -
          Number(startInput.value) +
          1;

        const additionOnly =
          Number(additionOnlyCountSelect.value) || 0;

        const subtractionCount =
          Math.max(
            0,
            total - additionOnly
          );

        subtractionCountDisplay.textContent =
          `${subtractionCount}問`;

        // マイナスになる問題の選択肢
        negativeCountSelect.innerHTML = "";

        for (let i = 0; i <= subtractionCount; i++) {

          const option =
            document.createElement("option");

          option.value = i;
          option.textContent = `${i}問`;

          negativeCountSelect.appendChild(option);

        }

      }

      additionOnlyCountSelect.addEventListener("change", () => {

        updateSubtractionCount();

      });

      calculationSelect.addEventListener("change", () => {

        if (calculationSelect.value === "add-subtract") {

          addSubtractSettings.classList.remove("hidden");

          updateAddSubtractCounts();

        } else {

          addSubtractSettings.classList.add("hidden");

        }

      });


      endInput.addEventListener("change", () => {

        updateFollowingSectionStarts();
        updateStatus();

      });


      startInput.addEventListener("change", () => {
        updateStatus();
      });

    }


    /* ===================================================
       最後の区間の終了番号
    =================================================== */

    function getLastSectionEnd() {

      const ends =
        sectionList.querySelectorAll(".section-end");

      if (!ends.length) {
        return 0;
      }

      const last =
        ends[ends.length - 1];

      return Number(last.value) || 0;

    }


    /* ===================================================
       次の区間の開始番号を更新
    =================================================== */

    function updateFollowingSectionStarts() {

      const sections =
        sectionList.querySelectorAll(".problem-section");

      let previousEnd = 0;

      sections.forEach(section => {

        const start =
          section.querySelector(".section-start");

        const end =
          section.querySelector(".section-end");

        start.value =
          previousEnd + 1;

        previousEnd =
          Number(end.value) || previousEnd;

      });

    }


    /* ===================================================
       状態表示
    =================================================== */

    function updateStatus() {

      if (!totalQuestions) {

        status.textContent =
          "総問題数を選択してください。";

        status.classList.remove("warning");

        return;
      }


      const sections =
        sectionList.querySelectorAll(".problem-section");


      if (!sections.length) {

        status.textContent =
          "区間を設定してください。";

        status.classList.add("warning");

        return;
      }


      const lastEnd =
        getLastSectionEnd();


      if (lastEnd === totalQuestions) {

        status.textContent =
          `第1問～第${totalQuestions}問まで設定されています。`;

        status.classList.remove("warning");

      } else {

        status.textContent =
          `未設定の問題があります。現在は第${lastEnd}問まで設定されています。`;

        status.classList.add("warning");

      }

    }


    /* ===================================================
       select option生成
    =================================================== */

    function createOptions(min, max, suffix) {

      let html = "";

      for (let i = min; i <= max; i++) {

        html += `
          <option value="${i}">
            ${i}${suffix}
          </option>
        `;

      }

      return html;

    }

  }

  /* =====================================================
     見取算 問題生成
     第1段階：設定値の取得
  ===================================================== */

  const problemGenerateButton =
    document.querySelector("#problemGenerateButton");

  if (problemGenerateButton) {

    problemGenerateButton.addEventListener("click", () => {

      // 見取算カードを探す
      const mitoriCard =
        document.querySelector(
          '.problem-type-card[data-problem-type="mitori"]'
        );

      if (!mitoriCard) {
        alert("見取算の設定が見つかりません。");
        return;
      }

      // 見取算が開かれているか確認
      const mitoriPanel =
        mitoriCard.querySelector(".problem-type-detail");

      if (
        !mitoriCard.classList.contains("expanded") ||
        !mitoriPanel ||
        !mitoriPanel.querySelector(".problem-create-panel")
      ) {
        alert("先に見取算の設定を開いてください。");
        return;
      }


      /* =================================================
         問題用紙情報
      ================================================= */

      const paperInputs =
        mitoriPanel.querySelectorAll(
          ".problem-paper-info .problem-form-input"
        );

      const title =
        paperInputs[0]?.value.trim() || "";

      const time =
        Number(paperInputs[1]?.value) || 0;

      const grade =
        paperInputs[2]?.value.trim() || "";

      const round =
        paperInputs[3]?.value.trim() || "";

      const freeText =
        paperInputs[5]?.value.trim() || "";


      /* =================================================
         総問題数
      ================================================= */

      const selectedCountButton =
        mitoriPanel.querySelector(
          ".problem-count-button.selected"
        );

      if (!selectedCountButton) {
        alert("総問題数を選択してください。");
        return;
      }

      const totalQuestions =
        Number(selectedCountButton.dataset.count);


      /* =================================================
         区間
      ================================================= */

      const sectionElements =
        mitoriPanel.querySelectorAll(
          ".problem-section"
        );

      if (!sectionElements.length) {
        alert("問題設定の区間がありません。");
        return;
      }


      const sections = [];


      sectionElements.forEach((section, index) => {

        const start =
          Number(
            section.querySelector(".section-start")?.value
          );

        const end =
          Number(
            section.querySelector(".section-end")?.value
          );

        const digitMin =
          Number(
            section.querySelector(".digit-min-select")?.value
          );

        const digitMax =
          Number(
            section.querySelector(".digit-max-select")?.value
          );

        const mouth =
          Number(
            section.querySelector(".mouth-select")?.value
          );

        const calculation =
          section.querySelector(
            ".calculation-select"
          )?.value || "addition";


        let additionOnly = 0;
        let subtractionCount = 0;
        let negativeCount = 0;


        if (calculation === "add-subtract") {

          additionOnly =
            Number(
              section.querySelector(
                ".addition-only-count-select"
              )?.value
            ) || 0;

          subtractionCount =
            Math.max(
              0,
              end - start + 1 - additionOnly
            );

          negativeCount =
            Number(
              section.querySelector(
                ".negative-count-select"
              )?.value
            ) || 0;

        }


        sections.push({

          sectionNumber: index + 1,

          start,
          end,

          digitMin,
          digitMax,

          mouth,

          calculation,

          additionOnly,

          subtractionCount,

          negativeCount

        });

      });


      /* =================================================
         設定内容を確認
      ================================================= */

      const settings = {

        paper: {

          title,
          time,
          grade,
          round,
          freeText

        },

        totalQuestions,

        sections

      };

      /* =================================================
         設定チェック
      ================================================= */

      // 総問題数
      if (
        ![10, 15, 20, 30, 40, 50, 60]
          .includes(totalQuestions)
      ) {

        alert("総問題数の設定が正しくありません。");
        return;

      }


      // 区間が存在するか
      if (!sections.length) {

        alert("問題設定の区間がありません。");
        return;

      }


      // 各区間をチェック
      for (let i = 0; i < sections.length; i++) {

        const section = sections[i];

        const questionCount =
          section.end - section.start + 1;


        // 開始・終了番号
        if (
          !Number.isInteger(section.start) ||
          !Number.isInteger(section.end)
        ) {

          alert(
            `区間${section.sectionNumber}の問題番号が正しくありません。`
          );

          return;

        }


        if (section.start > section.end) {

          alert(
            `区間${section.sectionNumber}の開始問題が終了問題を超えています。`
          );

          return;

        }


        // 問題番号の範囲
        if (
          section.start < 1 ||
          section.end > totalQuestions
        ) {

          alert(
            `区間${section.sectionNumber}の問題番号が範囲外です。`
          );

          return;

        }


        // 桁数
        if (
          section.digitMin < 1 ||
          section.digitMin > 10 ||
          section.digitMax < 1 ||
          section.digitMax > 10
        ) {

          alert(
            `区間${section.sectionNumber}の桁数が正しくありません。`
          );

          return;

        }


        if (section.digitMin > section.digitMax) {

          alert(
            `区間${section.sectionNumber}の桁数は、最小桁数が最大桁数を超えないようにしてください。`
          );

          return;

        }


        // 口数
        if (
          section.mouth < 3 ||
          section.mouth > 10
        ) {

          alert(
            `区間${section.sectionNumber}の口数が正しくありません。`
          );

          return;

        }


        // 加減算
        if (section.calculation === "add-subtract") {

          if (
            section.additionOnly < 0 ||
            section.additionOnly > questionCount
          ) {

            alert(
              `区間${section.sectionNumber}の「加算のみの問題」の数が正しくありません。`
            );

            return;

          }


          if (
            section.subtractionCount !==
            questionCount - section.additionOnly
          ) {

            alert(
              `区間${section.sectionNumber}の「引き算を含む問題」の数が正しくありません。`
            );

            return;

          }


          if (
            section.negativeCount < 0 ||
            section.negativeCount >
            section.subtractionCount
          ) {

            alert(
              `区間${section.sectionNumber}の「マイナスになる問題」の数が正しくありません。`
            );

            return;

          }

        }

      }


      /* =================================================
         区間の連続性をチェック
      ================================================= */

      let expectedStart = 1;

      for (const section of sections) {

        if (section.start !== expectedStart) {

          alert(
            `区間の問題番号が連続していません。\n\n` +
            `第${expectedStart}問から始まる区間が必要です。`
          );

          return;

        }

        expectedStart =
          section.end + 1;

      }


      // 最後まで設定されているか
      if (expectedStart !== totalQuestions + 1) {

        alert(
          `第${expectedStart}問以降の設定がありません。\n\n` +
          `第1問～第${totalQuestions}問まで設定してください。`
        );

        return;

      }


      console.log(
        "【見取算・設定チェック】OK",
        settings
      );

      console.log(
        "【見取算・取得した設定】",
        settings
      );


      const generatedProblems =
        generateMitoriProblems(settings);

      console.log(
        "【見取算・生成された問題】",
        generatedProblems
      );

      displayGeneratedMitoriProblems(
        settings,
        generatedProblems
      );

    });

  }

  /* =====================================================
     見取算 問題生成本体
  ===================================================== */

  function generateMitoriProblems(settings) {

    const problems = [];

    let problemNumber = 1;


    for (const section of settings.sections) {

      const questionCount =
        section.end - section.start + 1;


      /*
       * この区間の問題タイプを決める
       *
       * addition
       *   加算のみ
       *
       * subtraction
       *   引き算を含む
       *
       * negative
       *   計算途中でマイナスになる
       */

      const problemTypes = [];


      if (section.calculation === "addition") {

        for (let i = 0; i < questionCount; i++) {

          problemTypes.push("addition");

        }

      } else {

        /*
         * まず全部を加算のみとして作る
         */

        for (
          let i = 0;
          i < section.additionOnly;
          i++
        ) {

          problemTypes.push("addition");

        }


        /*
         * 残りを引き算ありにする
         */

        for (
          let i = 0;
          i < section.subtractionCount;
          i++
        ) {

          problemTypes.push("subtraction");

        }


        /*
         * 引き算ありの問題の中から
         * 「マイナスになる問題」を選ぶ
         */

        const subtractionIndexes = [];

        problemTypes.forEach((type, index) => {

          if (type === "subtraction") {
            subtractionIndexes.push(index);
          }

        });


        shuffleArray(subtractionIndexes);


        for (
          let i = 0;
          i < section.negativeCount;
          i++
        ) {

          const index =
            subtractionIndexes[i];

          problemTypes[index] =
            "negative";

        }

      }


      /*
       * 問題の種類をシャッフル
       *
       * 「加算のみ○問」
       * 「引き算あり○問」
       *
       * が同じ並びにならないようにする
       */

      shuffleArray(problemTypes);


      /*
       * 問題を実際に生成
       */

      for (
        let i = 0;
        i < questionCount;
        i++
      ) {

        const type =
          problemTypes[i];


        const problem =
          generateSingleMitoriProblem(
            section,
            type
          );


        problem.number =
          problemNumber;


        problem.sectionNumber =
          section.sectionNumber;


        problems.push(problem);

        problemNumber++;

      }

    }


    return problems;

  }


  /* =====================================================
     1問分の見取算を生成
  ===================================================== */

  function generateSingleMitoriProblem(
    section,
    type
  ) {

    const mouth =
      section.mouth;


    /*
     * 加算の場合
     */

    if (type === "addition") {

      return generateAdditionProblem(
        section,
        mouth
      );

    }


    /*
     * 加減算でマイナスにならない問題
     */

    if (type === "subtraction") {

      return generateAddSubtractProblem(
        section,
        mouth,
        false
      );

    }


    /*
     * 計算途中でマイナスになる問題
     */

    return generateAddSubtractProblem(
      section,
      mouth,
      true
    );

  }


  /* =====================================================
     加算問題
  ===================================================== */

  function generateAdditionProblem(
    section,
    mouth
  ) {

    const numbers = [];


    /*
     * 最初の数字
     */

    numbers.push(
      randomNumberByDigitRange(
        section.digitMin,
        section.digitMax
      )
    );


    /*
     * 残りはすべて加算
     */

    for (
      let i = 1;
      i < mouth;
      i++
    ) {

      numbers.push(
        randomNumberByDigitRange(
          section.digitMin,
          section.digitMax
        )
      );

    }


    return {

      type: "addition",

      numbers,

      operations:
        numbers.map(() => "+"),

      answer:
        numbers.reduce(
          (sum, value) => sum + value,
          0n
        )

    };

  }


  /* =====================================================
     加減算問題
  ===================================================== */

  function generateAddSubtractProblem(
    section,
    mouth,
    mustBecomeNegative
  ) {

    /*
     * 何度も試して条件に合う問題を探す
     */

    const maxAttempts = 1000;


    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {

      const numbers = [];

      const operations = [];


      /*
       * 先頭は必ず加算
       */

      const firstNumber =
        randomNumberByDigitRange(
          section.digitMin,
          section.digitMax
        );

      numbers.push(firstNumber);

      operations.push("+");


      let current =
        firstNumber;


      let becameNegative = false;


      /*
       * 引き算の口数
       *
       * 口数の40%
       */

      const subtractionCount =
        Math.max(
          1,
          Math.round(mouth * 0.4)
        );


      /*
       * 2口目以降から
       * 引き算位置を決める
       */

      const possiblePositions = [];


      for (
        let i = 1;
        i < mouth;
        i++
      ) {

        possiblePositions.push(i);

      }


      shuffleArray(possiblePositions);


      const subtractionPositions =
        new Set(
          possiblePositions.slice(
            0,
            subtractionCount
          )
        );


      /*
       * 残りの口を生成
       */

      for (
        let i = 1;
        i < mouth;
        i++
      ) {

        const number =
          randomNumberByDigitRange(
            section.digitMin,
            section.digitMax
          );


        const isSubtraction =
          subtractionPositions.has(i);


        if (isSubtraction) {

          operations.push("-");

          current -= number;

        } else {

          operations.push("+");

          current += number;

        }


        numbers.push(number);


        if (current < 0n) {

          becameNegative = true;

        }

      }


      /*
       * 条件確認
       */

      if (
        mustBecomeNegative &&
        !becameNegative
      ) {

        continue;

      }


      if (
        !mustBecomeNegative &&
        becameNegative
      ) {

        continue;

      }


      /*
       * 最終答を計算
       */

      let answer =
        numbers[0];


      for (
        let i = 1;
        i < numbers.length;
        i++
      ) {

        if (operations[i] === "+") {

          answer += numbers[i];

        } else {

          answer -= numbers[i];

        }

      }


      return {

        type:
          mustBecomeNegative
            ? "negative"
            : "subtraction",

        numbers,

        operations,

        answer

      };

    }


    /*
     * 1000回試しても条件に合わない場合
     */

    console.warn(
      "条件に合う加減算問題を生成できなかったため、再試行します。"
    );


    return generateAddSubtractProblem(
      section,
      mouth,
      mustBecomeNegative
    );

  }


  /* =====================================================
     指定した桁数の数字を作る
  ===================================================== */

  function randomNumberByDigitRange(
    minDigit,
    maxDigit
  ) {

    const digit =
      randomInteger(
        minDigit,
        maxDigit
      );


    /*
     * 1桁
     */

    if (digit === 1) {

      return BigInt(
        randomInteger(1, 9)
      );

    }


    /*
     * 2桁以上
     *
     * 先頭0は禁止
     */

    const min =
      10n ** BigInt(digit - 1);

    const max =
      (10n ** BigInt(digit)) - 1n;


    return randomBigInt(
      min,
      max
    );

  }


  /* =====================================================
     BigIntの乱数
  ===================================================== */

  function randomBigInt(min, max) {

    const range =
      max - min + 1n;


    /*
     * rangeがNumberで扱える場合
     */

    if (
      range <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {

      const value =
        Math.floor(
          Math.random() *
          Number(range)
        );

      return min + BigInt(value);

    }


    /*
     * 大きな数字の場合
     *
     * 10桁まで対応
     */

    const digits =
      max.toString().length;


    while (true) {

      let text = "";


      for (
        let i = 0;
        i < digits;
        i++
      ) {

        text +=
          Math.floor(
            Math.random() * 10
          );

      }


      if (text[0] === "0") {
        continue;
      }


      const value =
        BigInt(text);


      if (
        value >= min &&
        value <= max
      ) {

        return value;

      }

    }

  }


  /* =====================================================
     整数乱数
  ===================================================== */

  function randomInteger(min, max) {

    return Math.floor(
      Math.random() *
      (max - min + 1)
    ) + min;

  }


  /* =====================================================
     配列シャッフル
  ===================================================== */

  function shuffleArray(array) {

    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );


      [
        array[i],
        array[j]
      ] =
      [
        array[j],
        array[i]
      ];

    }


    return array;

  }

/* =====================================================
   見取算 問題用紙の列数を自動決定
===================================================== */

function calculateMitoriColumns(problems, problemList) {

  if (!problems.length) {
    return 1;
  }

  /*
   * 数字の横幅を取得
   * Soloburnの「0」を基準にする
   */
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  context.font = '18px "Soloburn", sans-serif';

  const digitWidth =
    context.measureText("0").width;

  /*
   * 問題の最大桁数を調べる
   */
  let maxDigits = 1;

  problems.forEach(problem => {

    problem.numbers.forEach(value => {

      const digits =
        value.toString().length;

      maxDigits =
        Math.max(maxDigits, digits);

    });

  });

  /*
   * 「数字の1の左側に最低4桁分」
   *
   * 例：5桁
   *   12345
   *
   *     左側4桁分
   *
   * マイナスの場合
   *   −12345
   *
   *     左側3桁分 + −
   *
   * つまり問題全体として
   * 「最大桁数 + 4桁分」
   * の横幅を最低限必要とする。
   */
  const requiredWidth =
    (maxDigits + 4) * digitWidth;

  /*
   * 問題一覧の実際の横幅
   */
  const availableWidth =
    problemList.clientWidth;

  /*
   * まず「幅に収まる最大列数」を求める
   */
  let maxColumns =
    Math.floor(
      availableWidth / requiredWidth
    );

  /*
   * 最低1列
   */
  maxColumns =
    Math.max(1, maxColumns);

  /*
   * 総問題数を完全に割り切れる列数を優先する。
   *
   * これにより最後の行が空にならない。
   */
  const total =
    problems.length;

  const candidates = [];

  for (
    let columns = 1;
    columns <= Math.min(maxColumns, total);
    columns++
  ) {

    if (total % columns === 0) {
      candidates.push(columns);
    }

  }

  /*
   * 一番多くの問題を横に並べられる
   * 列数を採用する。
   */
  if (candidates.length) {
    return Math.max(...candidates);
  }

  /*
   * 完全に割り切れる列数がない場合。
   *
   * その場合は、最後の行ができるだけ
   * 空かない列数を使用する。
   */
  return maxColumns;
}

  /* =====================================================
     生成した見取算問題を画面に表示
  ===================================================== */

  function displayGeneratedMitoriProblems(
    settings,
    problems
  ) {

    /*
     * 以前の表示があれば削除
     */

    const oldSheet =
      document.querySelector(
        "#problemGeneratedSheet"
      );

    if (oldSheet) {
      oldSheet.remove();
    }


    /*
     * 問題用紙を作成
     */

    const sheet =
      document.createElement("div");

    sheet.id =
      "problemGeneratedSheet";


    /*
     * 問題用紙情報
     */

    const header =
      document.createElement("div");

    header.className =
      "problem-generated-header";


    const title =
      document.createElement("h2");

    title.textContent =
      settings.paper.title ||
      "みとり算";


    header.appendChild(title);


    /*
     * 基本情報
     */

    const info =
      document.createElement("div");

    info.className =
      "problem-generated-info";


    if (settings.paper.time) {

      info.innerHTML +=
        `<span>時間：${settings.paper.time}分</span>`;

    }


    if (settings.paper.grade) {

      info.innerHTML +=
        `<span>級・段位：${escapeHtml(
          settings.paper.grade
        )}</span>`;

    }


    if (settings.paper.round) {

      info.innerHTML +=
        `<span>${escapeHtml(
          settings.paper.round
        )}</span>`;

    }


    info.innerHTML +=
      `<span>全${problems.length}問</span>`;


    header.appendChild(info);


    /*
     * 自由文
     */

    if (settings.paper.freeText) {

      const freeText =
        document.createElement("p");

      freeText.className =
        "problem-generated-free-text";

      freeText.textContent =
        settings.paper.freeText;

      header.appendChild(freeText);

    }


    sheet.appendChild(header);


    /*
     * 問題一覧
     */

    const problemList =
      document.createElement("div");

    problemList.className =
      "problem-generated-list";


    problems.forEach(problem => {

      const item =
        document.createElement("div");

      item.className =
        "problem-generated-item";


      /*
       * 問題番号
       */

      const number =
        document.createElement("div");

      number.className =
        "problem-generated-number";

      number.textContent =
        problem.number;


      /*
       * 数字
       */

      const numbers =
        document.createElement("div");

      numbers.className =
        "problem-generated-numbers";


      problem.numbers.forEach(
        (value, index) => {

          const row =
            document.createElement("div");

          row.className =
            "problem-generated-row";


          const operation =
            document.createElement("span");

          operation.className =
            "problem-generated-operation";


          /*
           * 最初の数字だけ
           * 「＋」を表示しない
           */

          if (problem.operations[index] === "+") {
            operation.textContent = "";
          } else {
            operation.textContent = "−";
          }


          const valueElement =
            document.createElement("span");

          valueElement.className =
            "problem-generated-value";

          valueElement.textContent =
            value.toLocaleString("en-US");


          row.appendChild(operation);

          row.appendChild(valueElement);

          numbers.appendChild(row);

        }
      );


      /*
       * 答え
       *
       * 現段階では確認用として表示
       */

      const answer =
        document.createElement("div");

      answer.className =
        "problem-generated-answer";

      answer.textContent =
        `答え：${problem.answer.toString()}`;


      item.appendChild(number);

      item.appendChild(numbers);

      item.appendChild(answer);


      problemList.appendChild(item);

    });

    /*
    * 桁数と総問題数から列数を自動決定
    */
    const columns =
      calculateMitoriColumns(
        problems,
        problemList
      );

    /*
    * CSSの5列固定を上書き
    */
    problemList.style.gridTemplateColumns =
      `repeat(${columns}, minmax(0, 1fr))`;

    sheet.appendChild(problemList);


    /*
     * 画面へ追加
     */

    const generateButton =
      document.querySelector(
        "#problemGenerateButton"
      );


    if (generateButton) {

      generateButton.insertAdjacentElement(
        "afterend",
        sheet
      );

    } else {

      document.body.appendChild(sheet);

    }


    /*
     * 問題用紙の位置まで移動
     */

    sheet.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }


  /* =====================================================
     HTMLエスケープ
  ===================================================== */

  function escapeHtml(value) {

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

});