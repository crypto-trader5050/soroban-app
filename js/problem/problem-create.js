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


        <div class="problem-section-settings">

          <div class="problem-form-item">

            <label class="problem-form-label">
              桁数
            </label>

            <div class="problem-digit-range">

              <select class="problem-form-select digit-min-select">
                ${createOptions(1, 10, "桁")}
              </select>

              <span class="problem-digit-range-separator">～</span>

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


        <div class="problem-section-minus hidden">

          <div class="problem-form-item">

            <label class="problem-form-label">
              マイナス
            </label>

            <select class="problem-form-select minus-select">

              <option value="none">
                マイナスなし
              </option>

              <option value="allow">
                マイナスあり
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

      const minusArea =
        section.querySelector(".problem-section-minus");


      calculationSelect.addEventListener("change", () => {

        if (calculationSelect.value === "add-subtract") {
          minusArea.classList.remove("hidden");
        } else {
          minusArea.classList.add("hidden");
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

});