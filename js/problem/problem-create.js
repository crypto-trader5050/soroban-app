alert("★★★ problem-create.js が読み込まれました ★★★");

document.addEventListener("DOMContentLoaded", () => {

    alert("★★★ DOMContentLoaded が実行されました ★★★");

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

      <!-- =================================================
           作成枚数
      ================================================== -->

      <section class="problem-count-area">

        <h3 class="problem-create-heading">
          作成枚数
        </h3>

        <div class="problem-count-buttons">

          <button
            type="button"
            class="problem-sheet-count-button selected"
            data-sheet-count="1">
            1枚
          </button>

          <button
            type="button"
            class="problem-sheet-count-button"
            data-sheet-count="2">
            2枚
          </button>

          <button
            type="button"
            class="problem-sheet-count-button"
            data-sheet-count="3">
            3枚
          </button>

          <button
            type="button"
            class="problem-sheet-count-button"
            data-sheet-count="4">
            4枚
          </button>

          <button
            type="button"
            class="problem-sheet-count-button"
            data-sheet-count="5">
            5枚
          </button>

        </div>

      </section>

      <!-- =================================================
           問題ごとに設定
      ================================================== -->

      <section
        class="problem-individual-settings-area"
        id="mitoriIndividualSettings">
      </section>

    </div>
  `;


  /* =====================================================
     共通状態
  ===================================================== */

  let sheetCount = 1;

  const individualSettings =
    container.querySelector(
      "#mitoriIndividualSettings"
    );

  const sheetCountButtons =
    container.querySelectorAll(
      ".problem-sheet-count-button"
    );


  /* =====================================================
     共通：選択状態
  ===================================================== */

  function setSelected(buttons, selectedButton) {

    buttons.forEach(button => {
      button.classList.remove("selected");
    });

    selectedButton.classList.add("selected");

  }


  /* =====================================================
     共通：select option生成
  ===================================================== */

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


  /* =====================================================
     問題①〜⑤の丸数字
  ===================================================== */

  function getProblemLabel(number) {

    return [
      "①",
      "②",
      "③",
      "④",
      "⑤"
    ][number - 1] || number;

  }


  /* =====================================================
     問題ごとの設定フォームを作成
  ===================================================== */

  function createIndividualProblemPlaceholders(count) {

    individualSettings.innerHTML = "";


    for (let i = 1; i <= count; i++) {

      const problemBlock =
        document.createElement("div");

      problemBlock.className =
        "individual-problem-block";

      problemBlock.dataset.problemNumber =
        i;


      problemBlock.innerHTML = `

        <section class="individual-problem-settings">

          <h3 class="problem-create-heading">
            問題${getProblemLabel(i)}
          </h3>


          <!-- 問題用紙情報 -->

          <section class="mitori-paper-settings">

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
                  class="problem-form-input individual-paper-input"
                  data-field="title"
                  placeholder="例：みとり算">
              </div>


              <div class="problem-form-item">
                <label class="problem-form-label">
                  時間（分）
                </label>

                <input
                  type="number"
                  class="problem-form-input individual-paper-input"
                  data-field="time"
                  min="1"
                  step="1"
                  placeholder="例：7">
              </div>


              <div class="problem-form-item">
                <label class="problem-form-label">
                  級・段位
                </label>

                <input
                  type="text"
                  class="problem-form-input individual-paper-input"
                  data-field="grade"
                  placeholder="例：10級、1級、初段、十段">
              </div>


              <div class="problem-form-item">
                <label class="problem-form-label">
                  回数
                </label>

                <input
                  type="text"
                  class="problem-form-input individual-paper-input"
                  data-field="round"
                  placeholder="例：第12回">
              </div>


              <div class="problem-form-item">
                <label class="problem-form-label">
                  評点
                </label>

                <input
                  type="text"
                  class="problem-form-input individual-paper-input"
                  data-field="score"
                  value=""
                  disabled
                  placeholder="手書き用">
              </div>


              <div class="problem-form-item full">
                <label class="problem-form-label">
                  自由文
                </label>

                <input
                  type="text"
                  class="problem-form-input individual-paper-input"
                  data-field="freeText"
                  maxlength="100"
                  placeholder="必要な場合のみ入力してください">
              </div>

            </div>

          </section>


          <!-- 総問題数 -->

          <section class="problem-count-area">

            <h3 class="problem-create-heading">
              総問題数
            </h3>

            <div class="problem-count-buttons">

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="10">
                10問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="15">
                15問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="20">
                20問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="30">
                30問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="40">
                40問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="50">
                50問
              </button>

              <button
                type="button"
                class="problem-count-button individual-count-button"
                data-count="60">
                60問
              </button>

            </div>

          </section>


          <!-- 問題設定 -->

          <section class="problem-section-area">

            <h3 class="problem-create-heading">
              問題設定
            </h3>

            <div
              class="problem-section-list individual-section-list">
            </div>

            <button
              type="button"
              class="problem-add-section-button individual-add-section-button">
              ＋ 区間を追加
            </button>

            <div
              class="problem-section-status individual-section-status">
              総問題数を選択してください。
            </div>

          </section>

        </section>

      `;


      individualSettings.appendChild(
        problemBlock
      );


      initializeIndividualProblem(
        problemBlock,
        i
      );

    }


    /*
     * 問題②以降は直前の問題の設定をコピー
     */

    for (let i = 2; i <= count; i++) {

      const previousBlock =
        individualSettings.querySelector(
          `.individual-problem-block[data-problem-number="${i - 1}"]`
        );

      const currentBlock =
        individualSettings.querySelector(
          `.individual-problem-block[data-problem-number="${i}"]`
        );

      if (
        previousBlock &&
        currentBlock
      ) {

        copyProblemSettings(
          previousBlock,
          currentBlock
        );

      }

    }

  }

  createIndividualProblemPlaceholders(sheetCount);

  /* =====================================================
     個別問題を初期化
  ===================================================== */

  function initializeIndividualProblem(
    problemBlock,
    problemNumber
  ) {

    const countButtons =
      problemBlock.querySelectorAll(
        ".individual-count-button"
      );

    const sectionList =
      problemBlock.querySelector(
        ".individual-section-list"
      );

    const addSectionButton =
      problemBlock.querySelector(
        ".individual-add-section-button"
      );

    const status =
      problemBlock.querySelector(
        ".individual-section-status"
      );


    let totalQuestions = 0;
    let sectionNumber = 0;


    /* -----------------------------------------------
       総問題数
    ------------------------------------------------ */

    countButtons.forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setSelected(
            countButtons,
            button
          );

          totalQuestions =
            Number(button.dataset.count);

          sectionList.innerHTML = "";

          sectionNumber = 0;

          addSection();

          updateStatus();

        }
      );

    });


    /* -----------------------------------------------
       区間追加
    ------------------------------------------------ */

    addSectionButton.addEventListener(
      "click",
      () => {

        if (!totalQuestions) {

          alert(
            `問題${getProblemLabel(problemNumber)}の総問題数を選択してください。`
          );

          return;

        }


        const currentEnd =
          getLastSectionEnd(
            sectionList
          );


        if (
          currentEnd >=
          totalQuestions
        ) {

          alert(
            "すべての問題が設定されています。"
          );

          return;

        }


        addSection();

        updateStatus();

      }
    );


    /* -----------------------------------------------
       区間作成
    ------------------------------------------------ */

    function addSection() {

      sectionNumber++;


      const previousEnd =
        getLastSectionEnd(
          sectionList
        );


      const startNumber =
        previousEnd + 1;


      const section =
        document.createElement("div");

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
              value="${startNumber}">
          </div>


          <div class="problem-form-item">

            <label class="problem-form-label">
              終了問題
            </label>

            <input
              type="number"
              class="problem-form-input section-end"
              min="1"
              value="${totalQuestions || ""}">
          </div>

        </div>


        <div class="problem-section-settings">

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


          <div class="problem-form-item">

            <label class="problem-form-label">
              口数
            </label>

            <select class="problem-form-select mouth-select">
              ${createOptions(3, 10, "口")}
            </select>

          </div>


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


        <div class="problem-add-subtract-settings hidden">

          <div class="problem-form-item">

            <label class="problem-form-label">
              加算のみの問題
            </label>

            <select
              class="problem-form-select addition-only-count-select">
            </select>

          </div>


          <div class="problem-form-item">

            <label class="problem-form-label">
              引き算を含む問題
            </label>

            <div class="problem-auto-value subtraction-count-display">
              0問
            </div>

          </div>


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


      sectionList.appendChild(
        section
      );


      const startInput =
        section.querySelector(
          ".section-start"
        );

      const endInput =
        section.querySelector(
          ".section-end"
        );

      const calculationSelect =
        section.querySelector(
          ".calculation-select"
        );

      const addSubtractSettings =
        section.querySelector(
          ".problem-add-subtract-settings"
        );

      const additionOnlyCountSelect =
        section.querySelector(
          ".addition-only-count-select"
        );

      const subtractionCountDisplay =
        section.querySelector(
          ".subtraction-count-display"
        );

      const negativeCountSelect =
        section.querySelector(
          ".negative-count-select"
        );


      function updateAddSubtractCounts() {

        const total =
          Number(endInput.value) -
          Number(startInput.value) +
          1;


        if (total <= 0) {
          return;
        }


        additionOnlyCountSelect.innerHTML =
          "";


        for (
          let i = 0;
          i <= total;
          i++
        ) {

          const option =
            document.createElement(
              "option"
            );

          option.value = i;

          option.textContent =
            `${i}問`;

          additionOnlyCountSelect.appendChild(
            option
          );

        }


        additionOnlyCountSelect.value =
          total;


        updateSubtractionCount();

      }


      function updateSubtractionCount() {

        const total =
          Number(endInput.value) -
          Number(startInput.value) +
          1;


        const additionOnly =
          Number(
            additionOnlyCountSelect.value
          ) || 0;


        const subtractionCount =
          Math.max(
            0,
            total - additionOnly
          );


        subtractionCountDisplay.textContent =
          `${subtractionCount}問`;


        negativeCountSelect.innerHTML =
          "";


        for (
          let i = 0;
          i <= subtractionCount;
          i++
        ) {

          const option =
            document.createElement(
              "option"
            );

          option.value = i;

          option.textContent =
            `${i}問`;

          negativeCountSelect.appendChild(
            option
          );

        }

      }


      additionOnlyCountSelect.addEventListener(
        "change",
        () => {

          updateSubtractionCount();

        }
      );


      calculationSelect.addEventListener(
        "change",
        () => {

          if (
            calculationSelect.value ===
            "add-subtract"
          ) {

            addSubtractSettings.classList.remove(
              "hidden"
            );

            updateAddSubtractCounts();

          } else {

            addSubtractSettings.classList.add(
              "hidden"
            );

          }

        }
      );


      endInput.addEventListener(
        "change",
        () => {

          updateFollowingSectionStarts(
            sectionList
          );

          updateStatus();

        }
      );


      startInput.addEventListener(
        "change",
        () => {

          updateStatus();

        }
      );

    }


    /*
     * 問題設定を1つ作った直後に
     * 総問題数が未選択なら何もしない
     */

    updateStatus();

  }


  /* =====================================================
     区間の最後の終了番号
  ===================================================== */

  function getLastSectionEnd(
    sectionList
  ) {

    const ends =
      sectionList.querySelectorAll(
        ".section-end"
      );


    if (!ends.length) {
      return 0;
    }


    const last =
      ends[ends.length - 1];


    return Number(last.value) || 0;

  }


  /* =====================================================
     次の区間の開始番号を更新
  ===================================================== */

  function updateFollowingSectionStarts(
    sectionList
  ) {

    const sections =
      sectionList.querySelectorAll(
        ".problem-section"
      );


    let previousEnd = 0;


    sections.forEach(section => {

      const start =
        section.querySelector(
          ".section-start"
        );

      const end =
        section.querySelector(
          ".section-end"
        );


      start.value =
        previousEnd + 1;


      previousEnd =
        Number(end.value) ||
        previousEnd;

    });

  }


  /* =====================================================
     状態表示
  ===================================================== */

  function updateStatusForList(
    sectionList,
    status,
    totalQuestions
  ) {

    if (!totalQuestions) {

      status.textContent =
        "総問題数を選択してください。";

      status.classList.remove(
        "warning"
      );

      return;

    }


    const sections =
      sectionList.querySelectorAll(
        ".problem-section"
      );


    if (!sections.length) {

      status.textContent =
        "区間を設定してください。";

      status.classList.add(
        "warning"
      );

      return;

    }


    const lastEnd =
      getLastSectionEnd(
        sectionList
      );


    if (
      lastEnd ===
      totalQuestions
    ) {

      status.textContent =
        `第1問～第${totalQuestions}問まで設定されています。`;

      status.classList.remove(
        "warning"
      );

    } else {

      status.textContent =
        `未設定の問題があります。現在は第${lastEnd}問まで設定されています。`;

      status.classList.add(
        "warning"
      );

    }

  }


  /* =====================================================
     個別問題の設定コピー
  ===================================================== */

  function copyProblemSettings(
    sourceBlock,
    targetBlock
  ) {

    /*
     * 問題用紙情報
     */

    const sourceInputs =
      sourceBlock.querySelectorAll(
        ".individual-paper-input"
      );

    const targetInputs =
      targetBlock.querySelectorAll(
        ".individual-paper-input"
      );


    sourceInputs.forEach(
      (sourceInput, index) => {

        const targetInput =
          targetInputs[index];

        if (
          targetInput &&
          !targetInput.disabled
        ) {

          targetInput.value =
            sourceInput.value;

        }

      }
    );


    /*
     * 総問題数
     */

    const sourceCount =
      sourceBlock.querySelector(
        ".individual-count-button.selected"
      );

    const targetCountButtons =
      targetBlock.querySelectorAll(
        ".individual-count-button"
      );


    if (sourceCount) {

      const matchingButton =
        Array.from(
          targetCountButtons
        ).find(
          button =>
            button.dataset.count ===
            sourceCount.dataset.count
        );


      if (matchingButton) {

        matchingButton.click();

      }

    }


    /*
     * 区間
     */

    const sourceSections =
      sourceBlock.querySelectorAll(
        ".individual-section-list .problem-section"
      );

    const targetSectionList =
      targetBlock.querySelector(
        ".individual-section-list"
      );


    if (
      !sourceSections.length ||
      !targetSectionList
    ) {

      return;

    }


    const targetAddButton =
      targetBlock.querySelector(
        ".individual-add-section-button"
      );


    /*
     * まず最初の区間は
     * 総問題数選択時に自動生成されている
     */

    sourceSections.forEach(
      (sourceSection, index) => {

        let targetSections =
          targetSectionList.querySelectorAll(
            ".problem-section"
          );


        if (
          index > 0 &&
          targetAddButton
        ) {

          targetAddButton.click();

          targetSections =
            targetSectionList.querySelectorAll(
              ".problem-section"
            );

        }


        const targetSection =
          targetSections[index];


        if (!targetSection) {
          return;
        }


        const sourceStart =
          sourceSection.querySelector(
            ".section-start"
          );

        const sourceEnd =
          sourceSection.querySelector(
            ".section-end"
          );

        const targetStart =
          targetSection.querySelector(
            ".section-start"
          );

        const targetEnd =
          targetSection.querySelector(
            ".section-end"
          );


        if (
          sourceStart &&
          targetStart
        ) {

          targetStart.value =
            sourceStart.value;

        }


        if (
          sourceEnd &&
          targetEnd
        ) {

          targetEnd.value =
            sourceEnd.value;

          targetEnd.dispatchEvent(
            new Event("change")
          );

        }


        const sourceDigitMin =
          sourceSection.querySelector(
            ".digit-min-select"
          );

        const sourceDigitMax =
          sourceSection.querySelector(
            ".digit-max-select"
          );

        const sourceMouth =
          sourceSection.querySelector(
            ".mouth-select"
          );

        const sourceCalculation =
          sourceSection.querySelector(
            ".calculation-select"
          );


        const targetDigitMin =
          targetSection.querySelector(
            ".digit-min-select"
          );

        const targetDigitMax =
          targetSection.querySelector(
            ".digit-max-select"
          );

        const targetMouth =
          targetSection.querySelector(
            ".mouth-select"
          );

        const targetCalculation =
          targetSection.querySelector(
            ".calculation-select"
          );


        if (
          sourceDigitMin &&
          targetDigitMin
        ) {

          targetDigitMin.value =
            sourceDigitMin.value;

        }


        if (
          sourceDigitMax &&
          targetDigitMax
        ) {

          targetDigitMax.value =
            sourceDigitMax.value;

        }


        if (
          sourceMouth &&
          targetMouth
        ) {

          targetMouth.value =
            sourceMouth.value;

        }


        if (
          sourceCalculation &&
          targetCalculation
        ) {

          targetCalculation.value =
            sourceCalculation.value;

          targetCalculation.dispatchEvent(
            new Event("change")
          );

        }


        const sourceAdditionOnly =
          sourceSection.querySelector(
            ".addition-only-count-select"
          );

        const targetAdditionOnly =
          targetSection.querySelector(
            ".addition-only-count-select"
          );


        if (
          sourceAdditionOnly &&
          targetAdditionOnly
        ) {

          targetAdditionOnly.value =
            sourceAdditionOnly.value;

          targetAdditionOnly.dispatchEvent(
            new Event("change")
          );

        }


        const sourceNegative =
          sourceSection.querySelector(
            ".negative-count-select"
          );

        const targetNegative =
          targetSection.querySelector(
            ".negative-count-select"
          );


        if (
          sourceNegative &&
          targetNegative
        ) {

          targetNegative.value =
            sourceNegative.value;

        }

      }
    );

  }


  /* =====================================================
     作成枚数
  ===================================================== */

  sheetCountButtons.forEach(button => {

      button.addEventListener("click", () => {

          setSelected(sheetCountButtons,
            button
          );

          sheetCount = Number(
            button.dataset.sheetCount
          );

          createIndividualProblemPlaceholders(
            sheetCount
          );

        }
      );

    }
  );

  /* =====================================================
     見取算 問題生成
     新方式：問題用紙ごとに設定を取得
  ===================================================== */

  alert("① createMitoriSettings が実行されました");

  const problemGenerateButton =
    document.querySelector(
      "#problemGenerateButton"
    );

    console.log("★問題生成ボタン取得:", problemGenerateButton);

  if (problemGenerateButton) {

    problemGenerateButton.addEventListener(
      "click",
      () => {

        /* =================================================
           見取算カードを確認
        ================================================= */

        const mitoriCard =
          document.querySelector(
            '.problem-type-card[data-problem-type="mitori"]'
          );


        if (!mitoriCard) {

          alert(
            "見取算の設定が見つかりません。"
          );

          return;

        }


        const mitoriPanel =
          mitoriCard.querySelector(
            ".problem-type-detail"
          );


        if (
          !mitoriCard.classList.contains(
            "expanded"
          )
          ||
          !mitoriPanel
          ||
          !mitoriPanel.querySelector(
            ".problem-create-panel"
          )
        ) {

          alert(
            "先に見取算の設定を開いてください。"
          );

          return;

        }


        /* =================================================
           問題用紙を取得
        ================================================= */

        const problemBlocks =
          mitoriPanel.querySelectorAll(
            ".individual-problem-block"
          );


        if (!problemBlocks.length) {

          alert(
            "問題用紙の設定がありません。"
          );

          return;

        }


        /* =================================================
           問題用紙ごとに設定を取得
        ================================================= */

        const allSettings = [];


        problemBlocks.forEach(
          (problemBlock, index) => {

            const problemNumber =
              index + 1;


            /* ---------------------------------------------
               問題用紙情報
            --------------------------------------------- */

            const paperInputs =
              problemBlock.querySelectorAll(
                ".individual-paper-input"
              );


            const title =
              paperInputs[0]?.value.trim() || "";


            const time =
              Number(
                paperInputs[1]?.value
              ) || 0;


            const grade =
              paperInputs[2]?.value.trim() || "";


            const round =
              paperInputs[3]?.value.trim() || "";


            const freeText =
              paperInputs[5]?.value.trim() || "";


            /* ---------------------------------------------
               総問題数
            --------------------------------------------- */

            const selectedCountButton =
              problemBlock.querySelector(
                ".individual-count-button.selected"
              );

              if (!selectedCountButton) {

                alert(
                  `問題${getProblemLabel(problemNumber)}の総問題数を選択してください。`
                );

                return;

              }


            const totalQuestions =
              Number(
                selectedCountButton.dataset.count
              );


            /* ---------------------------------------------
               区間
            --------------------------------------------- */

            const sectionElements =
              problemBlock.querySelectorAll(
                ".individual-section-list .problem-section"
              );


            if (!sectionElements.length) {

              alert(
                `問題${getProblemLabel(problemNumber)}の問題設定の区間を設定してください。`
              );

              return;

            }


            const sections = [];


            sectionElements.forEach(
              (section, sectionIndex) => {

                const start =
                  Number(
                    section.querySelector(
                      ".section-start"
                    )?.value
                  );


                const end =
                  Number(
                    section.querySelector(
                      ".section-end"
                    )?.value
                  );


                const digitMin =
                  Number(
                    section.querySelector(
                      ".digit-min-select"
                    )?.value
                  );


                const digitMax =
                  Number(
                    section.querySelector(
                      ".digit-max-select"
                    )?.value
                  );


                const mouth =
                  Number(
                    section.querySelector(
                      ".mouth-select"
                    )?.value
                  );


                const calculation =
                  section.querySelector(
                    ".calculation-select"
                  )?.value
                  ||
                  "addition";


                let additionOnly = 0;

                let subtractionCount = 0;

                let negativeCount = 0;


                if (
                  calculation ===
                  "add-subtract"
                ) {

                  additionOnly =
                    Number(
                      section.querySelector(
                        ".addition-only-count-select"
                      )?.value
                    ) || 0;


                  subtractionCount =
                    Math.max(
                      0,
                      end - start + 1
                      - additionOnly
                    );


                  negativeCount =
                    Number(
                      section.querySelector(
                        ".negative-count-select"
                      )?.value
                    ) || 0;

                }


                sections.push({

                  sectionNumber:
                    sectionIndex + 1,

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

              }
            );


            allSettings.push({

              paper: {

                title,

                time,

                grade,

                round,

                freeText

              },

              totalQuestions,

              sheetCount: 1,

              sections

            });

          }
        );


        /* =================================================
           設定チェック
        ================================================= */

        for (
          let sheetIndex = 0;
          sheetIndex < allSettings.length;
          sheetIndex++
        ) {

          const settings =
            allSettings[sheetIndex];


          const label =
            `問題${getProblemLabel(
              sheetIndex + 1
            )}`;


          /* ---------------------------------------------
             総問題数
          --------------------------------------------- */

          if (
            ![
              10,
              15,
              20,
              30,
              40,
              50,
              60
            ].includes(
              settings.totalQuestions
            )
          ) {

            alert(
              `${label}の総問題数の設定が正しくありません。`
            );

            return;

          }


          /* ---------------------------------------------
             区間
          --------------------------------------------- */

          if (
            !settings.sections.length
          ) {

            alert(
              `${label}の問題設定の区間がありません。`
            );

            return;

          }


          /* ---------------------------------------------
             各区間
          --------------------------------------------- */

          for (
            let i = 0;
            i < settings.sections.length;
            i++
          ) {

            const section =
              settings.sections[i];


            const questionCount =
              section.end
              - section.start
              + 1;


            /* 問題番号 */

            if (
              !Number.isInteger(
                section.start
              )
              ||
              !Number.isInteger(
                section.end
              )
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の問題番号が正しくありません。`
              );

              return;

            }


            if (
              section.start >
              section.end
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の開始問題が終了問題を超えています。`
              );

              return;

            }


            if (
              section.start < 1
              ||
              section.end >
              settings.totalQuestions
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の問題番号が範囲外です。`
              );

              return;

            }


            /* 桁数 */

            if (
              section.digitMin < 1
              ||
              section.digitMin > 10
              ||
              section.digitMax < 1
              ||
              section.digitMax > 10
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の桁数が正しくありません。`
              );

              return;

            }


            if (
              section.digitMin >
              section.digitMax
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の最小桁数が最大桁数を超えています。`
              );

              return;

            }


            /* 口数 */

            if (
              section.mouth < 3
              ||
              section.mouth > 10
            ) {

              alert(
                `${label}・区間${section.sectionNumber}の口数が正しくありません。`
              );

              return;

            }


            /* 加減算 */

            if (
              section.calculation ===
              "add-subtract"
            ) {

              if (
                section.additionOnly < 0
                ||
                section.additionOnly >
                questionCount
              ) {

                alert(
                  `${label}・区間${section.sectionNumber}の「加算のみの問題」の数が正しくありません。`
                );

                return;

              }


              if (
                section.subtractionCount !==
                questionCount
                - section.additionOnly
              ) {

                alert(
                  `${label}・区間${section.sectionNumber}の「引き算を含む問題」の数が正しくありません。`
                );

                return;

              }


              if (
                section.negativeCount < 0
                ||
                section.negativeCount >
                section.subtractionCount
              ) {

                alert(
                  `${label}・区間${section.sectionNumber}の「マイナスになる問題」の数が正しくありません。`
                );

                return;

              }

            }

          }


          /* ---------------------------------------------
             区間の連続性
          --------------------------------------------- */

          let expectedStart = 1;


          for (
            const section
            of settings.sections
          ) {

            if (
              section.start !==
              expectedStart
            ) {

              alert(
                `${label}の区間が連続していません。\n\n` +
                `第${expectedStart}問から始まる区間が必要です。`
              );

              return;

            }


            expectedStart =
              section.end + 1;

          }


          if (
            expectedStart !==
            settings.totalQuestions + 1
          ) {

            alert(
              `${label}の第${expectedStart}問以降の設定がありません。\n\n` +
              `第1問～第${settings.totalQuestions}問まで設定してください。`
            );

            return;

          }

        }


        /* =================================================
           既存の生成結果を削除
        ================================================= */

        const oldSheets =
          document.querySelector(
            "#problemGeneratedSheets"
          );


        if (oldSheets) {

          oldSheets.remove();

        }


        /* =================================================
           問題用紙①～⑤を個別に生成
        ================================================= */

        allSettings.forEach(
          (settings, index) => {

            const sheetNumber =
              index + 1;


            const generatedProblems =
              generateMitoriProblems(
                settings
              );


            console.log(
              `【見取算・問題${getProblemLabel(sheetNumber)}・生成された問題】`,
              generatedProblems
            );


            displayGeneratedMitoriProblems(
              settings,
              generatedProblems,
              sheetNumber
            );

          }
        );

      }
    );

  }

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
   見取算 問題用紙の行数・配置を自動決定
===================================================== */

function calculateMitoriRows(problems, problemList) {

  if (!problems.length) {
    return [];
  }


  /* ---------------------------------------------------
     Soloburnの数字幅を測定
  --------------------------------------------------- */

  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d");

  context.font =
    '18px "Soloburn", sans-serif';

  const digitWidth =
    context.measureText("0").width;


  /* ---------------------------------------------------
     左側4桁分の予約幅
  --------------------------------------------------- */

  const leftReserveWidth =
    digitWidth * 4;


  /* ---------------------------------------------------
     各問題に必要な幅を計算
  --------------------------------------------------- */

  const problemWidths =
    problems.map(problem => {

      let maxValueWidth = 0;

      problem.numbers.forEach(value => {

        const displayValue =
          value.toLocaleString("en-US");

        const valueWidth =
          context.measureText(
            displayValue
          ).width;

        maxValueWidth =
          Math.max(
            maxValueWidth,
            valueWidth
          );
      });

      return (
        leftReserveWidth
        + maxValueWidth
        + 24
      );
    });


  /* ---------------------------------------------------
     問題用紙の実際の横幅
  --------------------------------------------------- */

  const availableWidth =
    problemList.clientWidth;


  /* ---------------------------------------------------
     1行に入れられるか判定
  --------------------------------------------------- */

  function canFit(start, end) {

    const count =
      end - start + 1;

    let maxWidth = 0;

    for (
      let i = start;
      i <= end;
      i++
    ) {

      maxWidth =
        Math.max(
          maxWidth,
          problemWidths[i]
        );
    }

    const columnWidth =
      availableWidth / count;

    return columnWidth >= maxWidth;
  }


  /* ---------------------------------------------------
     まず「最低何行必要か」を求める

     左から順番に、
     入るだけ入れていった場合の最小行数
  --------------------------------------------------- */

  let minimumRows = 1;

  while (true) {

    const testRows = [];

    let start = 0;

    while (start < problems.length) {

      let end = start;

      while (
        end + 1 < problems.length &&
        canFit(start, end + 1)
      ) {

        end++;
      }

      testRows.push({
        start,
        end
      });

      start = end + 1;
    }

    minimumRows =
      testRows.length;

    break;
  }


  /* ---------------------------------------------------
     最小行数の中で、
     「各行の問題数ができるだけ均等」
     になる組み合わせを探す
  --------------------------------------------------- */

  let bestRows = null;

  let bestMaxCount =
    Infinity;

  let bestMinCount =
    -Infinity;

  let bestUnusedWidth =
    Infinity;


  function search(
    rowIndex,
    startIndex,
    rows
  ) {

    /* -----------------------------------------------
       最後の行
    ------------------------------------------------ */

    if (
      rowIndex === minimumRows - 1
    ) {

      const endIndex =
        problems.length - 1;

      if (
        startIndex > endIndex
        || !canFit(
          startIndex,
          endIndex
        )
      ) {
        return;
      }


      const finalRows =
        [
          ...rows,
          {
            start: startIndex,
            end: endIndex
          }
        ];


      const counts =
        finalRows.map(row =>
          row.end - row.start + 1
        );


      const maxCount =
        Math.max(...counts);

      const minCount =
        Math.min(...counts);


      /* ---------------------------------------------
         各行の余白合計
      --------------------------------------------- */

      let unusedWidth = 0;

      finalRows.forEach(row => {

        const count =
          row.end - row.start + 1;

        let maxWidth = 0;

        for (
          let i = row.start;
          i <= row.end;
          i++
        ) {

          maxWidth =
            Math.max(
              maxWidth,
              problemWidths[i]
            );
        }

        unusedWidth +=
          availableWidth
          - (
              maxWidth * count
            );
      });


      /* ---------------------------------------------
         より良い配置か判定

         ① 最大問題数を小さく
         ② 最小問題数を大きく
         ③ 余白を小さく
      --------------------------------------------- */

      if (
        maxCount < bestMaxCount
        ||
        (
          maxCount === bestMaxCount
          &&
          minCount > bestMinCount
        )
        ||
        (
          maxCount === bestMaxCount
          &&
          minCount === bestMinCount
          &&
          unusedWidth < bestUnusedWidth
        )
      ) {

        bestRows =
          finalRows;

        bestMaxCount =
          maxCount;

        bestMinCount =
          minCount;

        bestUnusedWidth =
          unusedWidth;
      }

      return;
    }


    /* -----------------------------------------------
       現在の行に入れる問題数を試す

       最後の行を残す必要があるため、
       最低1問は残す
    ------------------------------------------------ */

    const remainingRows =
      minimumRows - rowIndex - 1;

    const maxEnd =
      problems.length
      - remainingRows
      - 1;


    for (
      let endIndex = startIndex;
      endIndex <= maxEnd;
      endIndex++
    ) {

      if (
        !canFit(
          startIndex,
          endIndex
        )
      ) {
        break;
      }


      search(
        rowIndex + 1,
        endIndex + 1,
        [
          ...rows,
          {
            start: startIndex,
            end: endIndex
          }
        ]
      );
    }
  }


  search(
    0,
    0,
    []
  );


  /* ---------------------------------------------------
     万一見つからなかった場合
  --------------------------------------------------- */

  if (!bestRows) {

    return problems.map(
      (_, index) => [index]
    );
  }


  /* ---------------------------------------------------
     実際の問題番号配列に変換
  --------------------------------------------------- */

  return bestRows.map(row => {

    const indexes = [];

    for (
      let i = row.start;
      i <= row.end;
      i++
    ) {

      indexes.push(i);
    }

    return indexes;
  });
}

  /* =====================================================
     生成した見取算問題を画面に表示
  ===================================================== */

  function displayGeneratedMitoriProblems(
    settings,
    problems,
    sheetNumber = 1
  ) {

    /*
    * 1枚目を生成するときだけ
    * 以前の問題用紙を削除
    */

    if (sheetNumber === 1) {

      const oldSheets =
        document.querySelector(
          "#problemGeneratedSheets"
        );

      if (oldSheets) {
        oldSheets.remove();
      }

    }


    /*
    * 問題用紙をまとめる親容器
    */

    let sheetsContainer =
      document.querySelector(
        "#problemGeneratedSheets"
      );


    /*
    * 親容器がまだ無ければ作成
    */

    if (!sheetsContainer) {

      sheetsContainer =
        document.createElement("div");

      sheetsContainer.id =
        "problemGeneratedSheets";

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

    const problemItems = [];

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


      problemItems.push(item);

    });

    sheet.appendChild(problemList);

    /*
     * 問題用紙を親容器に追加
     */

    sheetsContainer.appendChild(sheet);


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
        sheetsContainer
      );

    } else {

      document.body.appendChild(
        sheetsContainer
      );

    }

    /*
    * 問題用紙が画面に追加された後で
    * 桁数と総問題数から列数を自動決定
    */
    problemList.style.display = "flex";
    problemList.style.flexWrap = "wrap";
    problemList.style.columnGap = "0";
    problemList.style.rowGap = "14px";
    problemList.style.alignItems = "stretch";

    const rows =
      calculateMitoriRows(
        problems,
        problemList
      );

    const availableWidth =
      problemList.clientWidth;

    rows.forEach(row => {

      /* -------------------------------------------------
        この行の中で一番口数が多い問題を調べる
      ------------------------------------------------- */

      let maxMouthCount = 0;

      row.forEach(index => {

        const problem =
          problems[index];

        maxMouthCount =
          Math.max(
            maxMouthCount,
            problem.numbers.length
          );
      });


      /* -------------------------------------------------
        この行全体の高さを決める

        上部35px
        ＋ 数字1口あたり22px
        ＋ 下部42px

        答え欄は position:absolute なので
        一番下に固定される
      ------------------------------------------------- */

      const rowHeight =
        35
        + (
            maxMouthCount * 22
          )
        + 42;


      /* -------------------------------------------------
        この行の問題数に合わせて横幅を決める
      ------------------------------------------------- */

      const itemWidth =
        availableWidth / row.length;


      /* -------------------------------------------------
        行内の全問題を同じ高さにする
      ------------------------------------------------- */

      row.forEach((index, position) => {

        const item =
          problemItems[index];


        item.style.flex =
          `0 0 ${itemWidth}px`;

        item.style.width =
          `${itemWidth}px`;

        item.style.maxWidth =
          `${itemWidth}px`;

        item.style.height =
          `${rowHeight}px`;

        item.style.minHeight =
          `${rowHeight}px`;

        item.style.boxSizing =
          "border-box";

        item.classList.add(
          "mitori-row-top",
          "mitori-row-bottom"
        );

        if (position === 0) {
          item.classList.add(
            "mitori-row-left"
          );
        }

        if (position === row.length - 1) {
          item.classList.add(
            "mitori-row-right"
          );
        }

        problemList.appendChild(item);

      });

    });


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