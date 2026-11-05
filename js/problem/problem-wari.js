/* =========================================================
   わり算 問題作成
   ファイル：js/problem/problem-wari.js

   かけ算の設定画面・生成処理をベースにしています。
   共通の確認・確定・印刷画面は problem-kake.js 側で管理します。
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const wariCard = document.querySelector(
    '.problem-type-card[data-problem-type="wari"]'
  );

  if (!wariCard) return;

  const detail = wariCard.querySelector(".problem-type-detail");
  const generateButton = document.querySelector("#problemGenerateButton");

  if (!detail || !generateButton) return;

  let sheetCount = 1;

  const labels = ["①", "②", "③", "④", "⑤"];

  function problemLabel(n) {
    return labels[n - 1] || String(n);
  }

  function options(min, max, suffix = "") {
    return Array.from(
      { length: max - min + 1 },
      (_, i) => `<option value="${min + i}">${min + i}${suffix}</option>`
    ).join("");
  }

  function selectOptions(items) {
    return items.map(item =>
      `<option value="${item.value}">${item.label}</option>`
    ).join("");
  }

  function makeSettings() {
    detail.innerHTML = `
      <div class="problem-create-panel kake-problem-create-panel">

        <section class="problem-count-area">
          <h3 class="problem-create-heading">作成枚数</h3>
          <div class="problem-count-buttons">
            ${[1, 2, 3, 4, 5].map(n => `
              <button type="button"
                class="problem-sheet-count-button ${n === 1 ? "selected" : ""}"
                data-sheets="${n}">${n}枚</button>
            `).join("")}
          </div>
        </section>

        <section class="problem-individual-settings-area"
          id="kakeIndividualSettings"></section>

      </div>
    `;

    const area = detail.querySelector("#kakeIndividualSettings");

    function drawSheets() {
      area.innerHTML = "";

      for (let i = 1; i <= sheetCount; i++) {
        const block = document.createElement("div");
        block.className = "individual-problem-block kake-individual-problem-block";
        block.dataset.problemNumber = i;

        block.innerHTML = `
          <section class="individual-problem-settings">
            <h3 class="problem-create-heading">
              問題${problemLabel(i)}
            </h3>

            <section class="mitori-paper-settings">
              <h3 class="problem-create-heading">問題用紙情報</h3>
              <div class="problem-paper-info">

                <div class="problem-form-item">
                  <label class="problem-form-label">タイトル</label>
                  <input class="problem-form-input individual-paper-input"
                    data-field="title" placeholder="例：わり算">
                </div>

                <div class="problem-form-item">
                  <label class="problem-form-label">時間（分）</label>
                  <input type="number" min="1"
                    class="problem-form-input individual-paper-input"
                    data-field="time" placeholder="例：7">
                </div>

                <div class="problem-form-item">
                  <label class="problem-form-label">級・段位</label>
                  <input class="problem-form-input individual-paper-input"
                    data-field="grade" placeholder="例：10級、1級、初段">
                </div>

                <div class="problem-form-item">
                  <label class="problem-form-label">回数</label>
                  <input class="problem-form-input individual-paper-input"
                    data-field="round" placeholder="例：第1回">
                </div>

                <div class="problem-form-item full">
                  <label class="problem-form-label">自由文</label>
                  <input class="problem-form-input individual-paper-input"
                    data-field="freeText" maxlength="100"
                    placeholder="必要な場合のみ入力してください">
                </div>

              </div>
            </section>

            <section class="problem-count-area">
              <h3 class="problem-create-heading">総問題数</h3>
              <div class="problem-count-buttons">
                ${[10, 15, 20, 30, 40, 50, 60].map(n => `
                  <button type="button"
                    class="problem-count-button individual-count-button"
                    data-count="${n}">${n}問</button>
                `).join("")}
              </div>
            </section>

            <section class="problem-count-area">
              <h3 class="problem-create-heading">小数を含む問題数</h3>
              <select class="problem-form-select decimal-question-count">
                <option value="0">0問</option>
              </select>
              <p class="problem-section-status">
                総問題数を選択すると、選べる問題数が表示されます。
              </p>
            </section>

            <section class="problem-count-area">
              <h3 class="problem-create-heading">割り切りパターン</h3>
              <select class="problem-form-select division-pattern">
                <option value="all-exact">① 整数・小数とも割り切れる</option>
                <option value="integer-exact">② 整数のみ割り切れる</option>
                <option value="both-inexact">③ 整数・小数とも割り切れない</option>
              </select>
            </section>

            <section class="problem-count-area division-inexact-settings" style="display:none;">
              <h3 class="problem-create-heading">割り切れない問題数</h3>

              <div class="problem-form-item division-decimal-inexact-area">
                <label class="problem-form-label">小数問題のうち</label>
                <select class="problem-form-select decimal-inexact-count">
                  <option value="0">0問</option>
                </select>
              </div>

              <div class="problem-form-item division-integer-inexact-area" style="display:none;">
                <label class="problem-form-label">整数問題のうち</label>
                <select class="problem-form-select integer-inexact-count">
                  <option value="0">0問</option>
                </select>
              </div>

              <p class="problem-section-status division-inexact-note">
                割り切れない問題数を指定してください。
              </p>
            </section>

            <section class="problem-section-area">
              <h3 class="problem-create-heading">問題設定</h3>
              <div class="problem-section-list individual-section-list"></div>
              <button type="button"
                class="problem-add-section-button individual-add-section-button">
                ＋ 区間を追加
              </button>
              <div class="problem-section-status individual-section-status">
                総問題数を選択してください。
              </div>
            </section>

            ${i === 1 && sheetCount > 1 ? `
              <div class="problem-copy-settings-area">
                <button type="button"
                  class="problem-copy-settings-button kake-copy-button">
                  問題①の設定を問題②以降にコピー
                </button>
              </div>
            ` : ""}
          </section>
        `;

        area.appendChild(block);
        initializeSheet(block);
      }

      const copyButton = area.querySelector(".kake-copy-button");

      if (copyButton) {
        copyButton.addEventListener("click", () => {
          const source = area.querySelector(
            '.individual-problem-block[data-problem-number="1"]'
          );

          for (let i = 2; i <= sheetCount; i++) {
            const target = area.querySelector(
              `.individual-problem-block[data-problem-number="${i}"]`
            );
            if (source && target) copySettings(source, target);
          }

          alert("問題①の設定を、問題②以降にコピーしました。");
        });
      }
    }

    function initializeSheet(block) {
      const countButtons = block.querySelectorAll(".individual-count-button");
      const sectionList = block.querySelector(".individual-section-list");
      const addButton = block.querySelector(".individual-add-section-button");
      const status = block.querySelector(".individual-section-status");

      let totalQuestions = 0;

      const decimalCountSelect = block.querySelector(".decimal-question-count");
      const patternSelect = block.querySelector(".division-pattern");
      const inexactSettings = block.querySelector(".division-inexact-settings");
      const decimalInexactSelect = block.querySelector(".decimal-inexact-count");
      const integerInexactSelect = block.querySelector(".integer-inexact-count");
      const decimalInexactArea = block.querySelector(".division-decimal-inexact-area");
      const integerInexactArea = block.querySelector(".division-integer-inexact-area");

      function setCountOptions(select, max) {
        const previous = Number(select.value) || 0;
        select.innerHTML = Array.from(
          { length: max + 1 },
          (_, n) => `<option value="${n}">${n}問</option>`
        ).join("");
        select.value = String(Math.min(previous, max));
      }

      function updateDivisionCountOptions() {
        const decimalCount = Number(decimalCountSelect.value) || 0;
        const integerCount = Math.max(0, totalQuestions - decimalCount);
        setCountOptions(decimalInexactSelect, decimalCount);
        setCountOptions(integerInexactSelect, integerCount);
      }

      function updateDivisionPatternUI() {
        const pattern = patternSelect.value;
        inexactSettings.style.display = pattern === "all-exact" ? "none" : "";
        decimalInexactArea.style.display = pattern === "all-exact" ? "none" : "";
        integerInexactArea.style.display = pattern === "both-inexact" ? "" : "none";
        updateDivisionCountOptions();
      }

      function updateDecimalCountOptions() {
        const previous = Number(decimalCountSelect.value) || 0;
        setCountOptions(decimalCountSelect, totalQuestions);
        decimalCountSelect.value = String(Math.min(previous, totalQuestions));
        updateDivisionPatternUI();
      }

      decimalCountSelect.addEventListener("change", updateDivisionPatternUI);
      patternSelect.addEventListener("change", updateDivisionPatternUI);
      updateDivisionPatternUI();

      countButtons.forEach(button => {
        button.addEventListener("click", () => {
          countButtons.forEach(b => b.classList.remove("selected"));
          button.classList.add("selected");

          totalQuestions = Number(button.dataset.count);
          updateDecimalCountOptions();
          sectionList.innerHTML = "";
          addSection();
          updateStatus();
        });
      });

      addButton.addEventListener("click", () => {
        if (!totalQuestions) {
          alert("先に総問題数を選択してください。");
          return;
        }

        const last = sectionList.querySelector(".problem-section:last-child");
        const lastEnd = last
          ? Number(last.querySelector(".section-end").value) || 0
          : 0;

        if (lastEnd >= totalQuestions) {
          alert("すべての問題が設定されています。");
          return;
        }

        addSection();
        updateStatus();
      });

      function addSection() {
        const previous = sectionList.querySelector(".problem-section:last-child");
        const start = previous
          ? Number(previous.querySelector(".section-end").value) + 1
          : 1;

        const section = document.createElement("div");
        section.className = "problem-section";

        section.innerHTML = `
          <h4 class="problem-section-title">
            区間 ${sectionList.children.length + 1}
          </h4>

          <div class="problem-section-range">
            <div class="problem-form-item">
              <label class="problem-form-label">開始問題</label>
              <input type="number" min="1" class="problem-form-input section-start"
                value="${start}">
            </div>
            <div class="problem-form-item">
              <label class="problem-form-label">終了問題</label>
              <input type="number" min="1" class="problem-form-input section-end"
                value="${totalQuestions}">
            </div>
          </div>

          <div class="problem-section-settings">

            <div class="problem-form-item">
              <label class="problem-form-label">わられる数・総桁数</label>
              <div class="problem-digit-range">
                <select class="problem-form-select a-int-min">
                  ${options(1, 10, "桁")}
                </select>
                <span>～</span>
                <select class="problem-form-select a-int-max">
                  ${options(1, 10, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">わる数・総桁数</label>
              <div class="problem-digit-range">
                <select class="problem-form-select b-int-min">
                  ${options(1, 7, "桁")}
                </select>
                <span>～</span>
                <select class="problem-form-select b-int-max">
                  ${options(1, 7, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">小数の表記</label>
              <select class="problem-form-select leading-zero">
                <option value="no" selected>先頭の0を付けない</option>
                <option value="point-zero">0. の形式を含める</option>
                <option value="point-zero-one">0.0 の形式を含める</option>
                <option value="point-zero-two">0.00 の形式を含める</option>
              </select>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">答えの処理方法</label>
              <select class="problem-form-select rounding-mode">
                <option value="round" selected>四捨五入</option>
                <option value="truncate">切り捨て</option>
              </select>
            </div>

            <div class="problem-form-item rounding-place-area">
              <label class="problem-form-label">処理する位</label>
              <select class="problem-form-select rounding-place">
                <option value="-1">整数未満</option>
                <option value="1">小数第1位未満</option>
                <option value="2" selected>小数第2位未満</option>
                <option value="3">小数第3位未満</option>
                <option value="4">小数第4位未満</option>
                <option value="5">小数第5位未満</option>
              </select>
            </div>

          </div>
        `;

        sectionList.appendChild(section);

        const rounding = section.querySelector(".rounding-mode");
        const placeArea = section.querySelector(".rounding-place-area");

        function updateRounding() {
          placeArea.style.display =
            rounding.value === "exact" ? "none" : "";
        }

        rounding.addEventListener("change", updateRounding);
        updateRounding();

        section.querySelectorAll("input, select").forEach(input => {
          input.addEventListener("change", updateStatus);
        });
      }

      function updateStatus() {
        if (!totalQuestions) {
          status.textContent = "総問題数を選択してください。";
          status.classList.remove("warning");
          return;
        }

        const sections = [...sectionList.querySelectorAll(".problem-section")];
        const last = sections.length
          ? Number(sections[sections.length - 1].querySelector(".section-end").value) || 0
          : 0;

        if (last === totalQuestions) {
          status.textContent = `第1問～第${totalQuestions}問まで設定されています。`;
          status.classList.remove("warning");
        } else {
          status.textContent = `未設定の問題があります。現在は第${last}問まで設定されています。`;
          status.classList.add("warning");
        }
      }
    }

    function copySettings(source, target) {
      // ① 総問題数を先に選択し、コピー先の区間を初期化する
      const selectedCount = source.querySelector(
        ".individual-count-button.selected"
      );

      if (selectedCount) {
        const targetCount = [
          ...target.querySelectorAll(".individual-count-button")
        ].find(
          button => button.dataset.count === selectedCount.dataset.count
        );

        if (targetCount) targetCount.click();
      }

      // ② 区間以外の設定をコピーする
      source.querySelectorAll("input, select").forEach(input => {
        if (input.closest(".problem-section")) return;
        if (input.closest(".individual-count-button")) return;

        const inputs = [
          ...target.querySelectorAll("input, select")
        ].filter(el =>
          !el.closest(".problem-section") &&
          !el.closest(".individual-count-button")
        );

        const index = [
          ...source.querySelectorAll("input, select")
        ].filter(el =>
          !el.closest(".problem-section") &&
          !el.closest(".individual-count-button")
        ).indexOf(input);

        const targetInput = inputs[index];

        if (targetInput) {
          targetInput.value = input.value;
          targetInput.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });

      // ③ 元の区間を取得する
      const sourceSections = [
        ...source.querySelectorAll(".problem-section")
      ];

      const targetList = target.querySelector(".individual-section-list");
      const targetAdd = target.querySelector(
        ".individual-add-section-button"
      );

      if (!targetList || !targetAdd) return;

      // 総問題数の選択によって、コピー先には最初の区間が作成済み

      // ④ 各区間を順番に作成して設定をコピーする
      sourceSections.forEach((sourceSection, index) => {
        if (index > 0) {
          const previousTarget = targetList.querySelector(
            ".problem-section:last-child"
          );
          const previousSource = sourceSections[index - 1];

          if (!previousTarget || !previousSource) return;

          // 次の区間を追加できるよう、直前の終了問題を設定
          const targetEnd = previousTarget.querySelector(".section-end");
          const sourceEnd = previousSource.querySelector(".section-end");

          targetEnd.value = sourceEnd.value;
          targetEnd.dispatchEvent(
            new Event("change", { bubbles: true })
          );

          targetAdd.click();
        }

        const targetSections = targetList.querySelectorAll(".problem-section");
        const targetSection = targetSections[index];

        if (!targetSection) return;

        const sourceInputs = sourceSection.querySelectorAll("input, select");
        const targetInputs = targetSection.querySelectorAll("input, select");

        sourceInputs.forEach((input, j) => {
          if (!targetInputs[j]) return;

          targetInputs[j].value = input.value;
          targetInputs[j].dispatchEvent(
            new Event("change", { bubbles: true })
          );
        });
      });
    }

    detail.querySelectorAll("[data-sheets]").forEach(button => {
      button.addEventListener("click", () => {
        detail.querySelectorAll("[data-sheets]").forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        sheetCount = Number(button.dataset.sheets);
        drawSheets();
      });
    });

    drawSheets();
  }

  /* 既存カードの開閉後に設定画面を作成 */
  wariCard.querySelector(".problem-type-card-button")
    ?.addEventListener("click", () => {
      setTimeout(() => {
        if (wariCard.classList.contains("expanded")) {
          makeSettings();
        }
      }, 0);
    });

  /* =========================================================
     わり算の問題生成
     既存のみとり算・かけ算の生成処理には触れない
  ========================================================= */

  window.generateWariSheets = () => {
    if (!wariCard.classList.contains("expanded")) return;

    const blocks = [...detail.querySelectorAll(".individual-problem-block")];

    if (!blocks.length) {
      alert("わり算の設定を開いてください。");
      return;
    }

    const sheets = [];

    for (const block of blocks) {
      const countButton = block.querySelector(".individual-count-button.selected");
      const total = countButton ? Number(countButton.dataset.count) : 0;

      if (!total) {
        alert(`問題${problemLabel(Number(block.dataset.problemNumber))}の総問題数を選択してください。`);
        return;
      }

      const sections = [...block.querySelectorAll(".problem-section")];

      if (!sections.length) {
        alert("問題設定の区間がありません。");
        return;
      }

      const decimalQuestionCount = Number(
        block.querySelector(".decimal-question-count").value
      );

      const ranges = sections.map(section => ({
        start: Number(section.querySelector(".section-start").value),
        end: Number(section.querySelector(".section-end").value),
        aIntMin: Number(section.querySelector(".a-int-min").value),
        aIntMax: Number(section.querySelector(".a-int-max").value),
        bIntMin: Number(section.querySelector(".b-int-min").value),
        bIntMax: Number(section.querySelector(".b-int-max").value),
        leadingZero: section.querySelector(".leading-zero").value,
        roundingMode: section.querySelector(".rounding-mode").value,
        roundingPlace: Number(section.querySelector(".rounding-place").value)
      }));

      ranges.sort((a, b) => a.start - b.start);

      let expectedStart = 1;

      for (const r of ranges) {
        if (
          !Number.isInteger(r.start) ||
          !Number.isInteger(r.end) ||
          r.start !== expectedStart ||
          r.end < r.start ||
          r.end > total
        ) {
          alert("区間の開始問題・終了問題を確認してください。区間に抜けや重複がないように設定してください。");
          return;
        }

        if (
          r.aIntMin > r.aIntMax ||
          r.bIntMin > r.bIntMax
        ) {
          alert("総桁数の最小値と最大値を確認してください。");
          return;
        }

        expectedStart = r.end + 1;
      }

      if (expectedStart !== total + 1) {
        alert("総問題数の最後まで区間を設定してください。");
        return;
      }

      const getField = name =>
        block.querySelector(`[data-field="${name}"]`)?.value.trim() || "";

      const problems = [];

      // 全問題を小数問題の候補にする
      const decimalEligible = Array.from(
        { length: total },
        (_, index) => index + 1
      );

      // 指定された小数問題数を実現できるか確認
      if (
        !Number.isInteger(decimalQuestionCount) ||
        decimalQuestionCount < 0 ||
        decimalQuestionCount > total
      ) {
        alert("小数を含む問題数を確認してください。");
        return;
      }

      // 小数を含める問題番号をランダムに選ぶ
      for (let i = decimalEligible.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [decimalEligible[i], decimalEligible[j]] =
          [decimalEligible[j], decimalEligible[i]];
      }

      const decimalQuestionNumbers = new Set(
        decimalEligible.slice(0, decimalQuestionCount)
      );

      const divisionPattern = block.querySelector(".division-pattern").value;
      const decimalInexactCount = Number(
        block.querySelector(".decimal-inexact-count").value
      ) || 0;
      const integerInexactCount = Number(
        block.querySelector(".integer-inexact-count").value
      ) || 0;

      if (divisionPattern === "integer-exact" || divisionPattern === "both-inexact") {
        if (decimalInexactCount < 0 || decimalInexactCount > decimalQuestionCount) {
          alert("小数問題の割り切れない問題数を確認してください。");
          return;
        }
      }

      if (divisionPattern === "both-inexact") {
        const integerQuestionCount = total - decimalQuestionCount;
        if (integerInexactCount < 0 || integerInexactCount > integerQuestionCount) {
          alert("整数問題の割り切れない問題数を確認してください。");
          return;
        }
      }

      const shuffled = values => {
        const result = [...values];
        for (let i = result.length - 1; i > 0; i--) {
          const j = randomInt(0, i);
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };

      const decimalInexactNumbers = new Set(
        shuffled([...decimalQuestionNumbers]).slice(0,
          divisionPattern === "all-exact" ? 0 : decimalInexactCount)
      );

      const integerQuestionNumbers = Array.from(
        { length: total }, (_, index) => index + 1
      ).filter(number => !decimalQuestionNumbers.has(number));

      const integerInexactNumbers = new Set(
        shuffled(integerQuestionNumbers).slice(0,
          divisionPattern === "both-inexact" ? integerInexactCount : 0)
      );

      // 問題を生成する
      for (let q = 1; q <= total; q++) {
        const r = ranges.find(x => q >= x.start && q <= x.end);

        const useDecimal = decimalQuestionNumbers.has(q);

        // 最初の小数問題では、0.xxx形式を優先する
        const firstDecimalQuestion =
          useDecimal &&
          q === Math.min(...decimalQuestionNumbers);

        const decimalSide = Math.random() < 0.5 ? "a" : "b";
        const bothDecimal = useDecimal && Math.random() < 0.25;

        const shouldBeInexact = useDecimal
          ? decimalInexactNumbers.has(q)
          : integerInexactNumbers.has(q);

        let a;
        let b;
        let rawAnswer;
        let matchedPattern = false;

        // 指定された割り切り条件に合う組み合わせを生成する
        for (let attempt = 0; attempt < 20000; attempt++) {
          const candidateA = makeOperand(
            r,
            "a",
            useDecimal && (bothDecimal || decimalSide === "a"),
            firstDecimalQuestion && (bothDecimal || decimalSide === "a")
          );

          const candidateB = makeOperand(
            r,
            "b",
            useDecimal && (bothDecimal || decimalSide === "b"),
            firstDecimalQuestion && (bothDecimal || decimalSide === "b")
          );

          const candidateAnswer = candidateA.value / candidateB.value;
          const isExact = Math.abs(candidateAnswer - Math.round(candidateAnswer)) < 1e-10;

          if (isExact !== shouldBeInexact) {
            a = candidateA;
            b = candidateB;
            rawAnswer = candidateAnswer;
            matchedPattern = true;
            break;
          }
        }

        if (!matchedPattern) {
          alert(
            `第${q}問で指定した割り切り条件の問題を作成できませんでした。\n` +
            "桁数の範囲を広げて、もう一度お試しください。"
          );
          return;
        }

        const answer = processAnswer(
          rawAnswer,
          r.roundingMode,
          r.roundingPlace
        );

        problems.push({
          number: q,
          a: a.text,
          b: b.text,
          answer,
          instruction: makeInstruction(r)
        });
      }

      sheets.push({
        title: getField("title") || "わり算",
        time: getField("time"),
        grade: getField("grade"),
        round: getField("round"),
        freeText: getField("freeText"),
        problems
      });
    }

    const html = sheets.map(renderSheet).join("");

    return html;
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function makeOperand(r, side, useDecimal = false, forceZeroInteger = false) {
    const minDigits = r[`${side}IntMin`];
    const maxDigits = r[`${side}IntMax`];
    const totalDigits = randomInt(minDigits, maxDigits);

    if (!useDecimal) {
      const min = totalDigits === 1 ? 1 : 10 ** (totalDigits - 1);
      const max = 10 ** totalDigits - 1;
      const value = randomInt(min, max);
      return { text: formatNumber(value), value };
    }

    const style = r.leadingZero || "no";

    // 「先頭の0を付けない」場合は、整数部が1以上の小数にする
    // それ以外は、選択した形式まで段階的に0.xxx形式を含める
    const maxLeadingFractionZeros = {
      "no": -1,
      "point-zero": 0,
      "point-zero-one": 1,
      "point-zero-two": 2
    }[style] ?? -1;

    let textValue;

    const canUseZeroInteger =
      maxLeadingFractionZeros >= 0 &&
      totalDigits >= 2;

    const useZeroInteger =
      canUseZeroInteger &&
      (forceZeroInteger || Math.random() < 0.35);

    if (useZeroInteger) {
      // 選択した形式までの範囲から、小数部の先頭の0の数を選ぶ
      const leadingFractionZeros = randomInt(
        0,
        Math.min(maxLeadingFractionZeros, totalDigits - 2)
      );

      // 整数部の0と小数部の先頭の0を含めて総桁数を計算
      const significantDigits =
        totalDigits - 1 - leadingFractionZeros;

      // 最後の桁は必ず0以外にする
      const prefix = randomInt(
        1,
        10 ** significantDigits - 1
      ).toString().padStart(significantDigits, "0");

      const fraction =
        "0".repeat(leadingFractionZeros) + prefix;

      textValue = `0.${fraction}`;
    } else {
      // 整数部が1以上の小数
      if (totalDigits < 2) {
        const value = randomInt(1, 9);
        return { text: String(value), value };
      }

      // 総桁数を維持したまま、小数点以下の桁数を決める
      const decimalDigits = randomInt(1, totalDigits - 1);
      const integerDigits = totalDigits - decimalDigits;

      const integerMin = integerDigits === 1
        ? 1
        : 10 ** (integerDigits - 1);

      const integerMax = 10 ** integerDigits - 1;
      const integerPart = randomInt(integerMin, integerMax);

      // 小数部は指定桁数で生成し、最後の桁は0以外にする
      const fractionPrefix = decimalDigits > 1
        ? String(randomInt(0, 10 ** (decimalDigits - 1) - 1))
            .padStart(decimalDigits - 1, "0")
        : "";

      const fraction = fractionPrefix + randomInt(1, 9);

      textValue = `${integerPart}.${fraction}`;
    }

    const value = Number(textValue);

    // 小数部の末尾にある不要な0だけを削除する
    let display = String(value);

    if (display.includes(".")) {
      display = display.replace(/0+$/, "");
      display = display.replace(/\.$/, "");
    }

    // 先頭の0を必ず補う
    if (display.startsWith(".")) {
      display = "0" + display;
    }

    // カンマは整数部にだけ付ける
    const parts = display.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    display = parts.join(".");

    return {
      text: display,
      value
    };
  }

  function processAnswer(value, mode, places) {
    const digits = Math.max(0, places);
    const factor = 10 ** digits;

    const adjusted = mode === "round"
      ? Math.round((value + Number.EPSILON) * factor)
      : Math.trunc(value * factor);

    return formatNumber(adjusted / factor);
  }

  function formatNumber(value) {
    if (!Number.isFinite(Number(value))) return String(value);

    let text = Number(Number(value).toPrecision(12)).toString();

    if (text.includes(".")) {
      text = text.replace(/0+$/, "");
      text = text.replace(/\.$/, "");
    }

    const parts = text.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return parts.join(".");
  }

  function makeInstruction(r) {
    const place = r.roundingPlace === -1
      ? "整数未満"
      : `小数第${r.roundingPlace}位未満`;

    const method = r.roundingMode === "round"
      ? "四捨五入"
      : "切り捨て";

    return `答えは${place}を${method}して答えなさい。`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]);
  }

  function renderSheet(sheet) {
    const useTwoColumns =
      sheet.problems.length >= 30 &&
      !sheet.problems.some(p =>
        String(p.a).replace(/\D/g, "").length +
        String(p.b).replace(/\D/g, "").length >= 10
      );

    const middle = Math.ceil(sheet.problems.length / 2);

    const problemColumns = useTwoColumns
      ? [
          sheet.problems.slice(0, middle),
          sheet.problems.slice(middle)
        ]
      : [sheet.problems];

    return `
      <section class="kake-print-sheet wari-print-sheet" style="
        background:#fff;
        color:#111;
        max-width:1000px;
        margin:0 auto 24px;
        padding:28px;
        box-sizing:border-box;
        page-break-after:always;
        font-family:sans-serif;
      ">

        <header style="
          border-bottom:2px solid #222;
          padding-bottom:10px;
          margin-bottom:18px;
        ">
          <h1 style="
            text-align:center;
            margin:0 0 14px;
            font-size:26px;
          ">
            ${escapeHtml(sheet.title)}
          </h1>

          <div style="
            display:flex;
            flex-wrap:wrap;
            gap:20px;
            justify-content:space-between;
            font-size:14px;
          ">
            <span>時間：${escapeHtml(sheet.time || "　　　　")} 分</span>
            <span>級・段位：${escapeHtml(sheet.grade || "　　　　　　")}</span>
            <span>回数：${escapeHtml(sheet.round || "　　　　　　")}</span>
          </div>

          ${sheet.freeText
            ? `<p style="margin:10px 0 0;">${escapeHtml(sheet.freeText)}</p>`
            : ""}

          ${[...new Set(sheet.problems.map(p => p.instruction).filter(Boolean))]
            .map(instruction => `
              <p style="margin:10px 0 0;">
                ${escapeHtml(instruction)}
              </p>
            `).join("")}

          <p style="margin:12px 0 0;">
            氏名：________________________________
          </p>
        </header>

        <div style="
          display:grid;
          grid-template-columns:${useTwoColumns ? "repeat(2, minmax(0, 1fr))" : "1fr"};
          gap:${useTwoColumns ? "12px" : "0"};
          width:100%;
          box-sizing:border-box;
        ">

          ${problemColumns.map(column => `
            <div style="
              border:2px solid #222;
              min-width:0;
              box-sizing:border-box;
            ">

              ${column.map(p => `
                <div style="
                  display:grid;
                  grid-template-columns:${useTwoColumns ? "34px minmax(0, 1fr)" : "60px minmax(0, 1fr)"};
                  min-height:${useTwoColumns ? "42px" : "48px"};
                  border-bottom:1px solid #777;
                  box-sizing:border-box;
                  break-inside:avoid;
                ">

                  <div style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-right:1px solid #777;
                    font-size:${useTwoColumns ? "12px" : "15px"};
                    font-weight:600;
                  ">
                    ${p.number}
                  </div>

                  <div style="
                    display:flex;
                    align-items:center;
                    justify-content:flex-start;
                    padding:${useTwoColumns ? "4px 5px" : "5px 18px"};
                    box-sizing:border-box;
                    font-size:${useTwoColumns ? "15px" : "21px"};
                    font-weight:600;
                    font-variant-numeric:tabular-nums;
                    white-space:nowrap;
                    min-width:0;
                  ">

                    <span style="
                      display:inline-block;
                      flex:1;
                      min-width:0;
                      text-align:right;
                      font-family:'Soloburn', sans-serif;
                      font-weight:500;
                    ">
                      ${escapeHtml(p.a)}
                    </span>

                    <span style="
                      display:inline-block;
                      width:${useTwoColumns ? "18px" : "42px"};
                      flex-shrink:0;
                      text-align:center;
                      font-weight:400;
                    ">÷</span>

                    <span style="
                      display:inline-block;
                      flex:1;
                      min-width:0;
                      text-align:right;
                      font-family:'Soloburn', sans-serif;
                      font-weight:500;
                    ">
                      ${escapeHtml(p.b)}
                    </span>

                    <span style="
                      display:inline-block;
                      width:${useTwoColumns ? "18px" : "42px"};
                      flex-shrink:0;
                      text-align:center;
                      font-weight:400;
                    ">＝</span>

                    <span style="
                      display:inline-block;
                      width:${useTwoColumns ? "35px" : "150px"};
                      flex-shrink:0;
                      height:28px;
                    "></span>

                  </div>
                </div>
              `).join("")}

            </div>
          `).join("")}

        </div>

        <details style="margin-top:20px;">
          <summary>答え（印刷時は必要に応じて開いてください）</summary>

          <div style="
            display:grid;
            grid-template-columns:repeat(5,minmax(0,1fr));
            gap:8px;
            margin-top:10px;
          ">
            ${sheet.problems.map(p => `
              <div style="border:1px solid #ddd; padding:6px;">
                ${p.number}. ${escapeHtml(p.answer)}
              </div>
            `).join("")}
          </div>
        </details>

      </section>
    `;
  }

});