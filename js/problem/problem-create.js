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


      console.log(
        "【見取算・取得した設定】",
        settings
      );


      alert(
        "見取算の設定を取得しました。\n\n" +
        `総問題数：${totalQuestions}問\n` +
        `区間数：${sections.length}区間`
      );

    });

  }

});