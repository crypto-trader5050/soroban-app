
/* =========================================================
   かけ算・かけ暗算 問題作成
   ファイル：js/problem/problem-kake.js

   既存の problem-create.js は変更しない
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const kakeCard = document.querySelector(
    '.problem-type-card[data-problem-type="kake"]'
  );

  if (!kakeCard) return;

  const detail = kakeCard.querySelector(".problem-type-detail");
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
      <div class="problem-create-panel">

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
        block.className = "individual-problem-block";
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
                    data-field="title" placeholder="例：かけ算">
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

      function updateDecimalCountOptions() {
        const previous = Number(decimalCountSelect.value) || 0;

        decimalCountSelect.innerHTML = Array.from(
          { length: totalQuestions + 1 },
          (_, n) => `<option value="${n}">${n}問</option>`
        ).join("");

        decimalCountSelect.value = String(
          Math.min(previous, totalQuestions)
        );
      }

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
              <label class="problem-form-label">かけられる数・総桁数</label>
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
              <label class="problem-form-label">かける数・総桁数</label>
              <div class="problem-digit-range">
                <select class="problem-form-select b-int-min">
                  ${options(1, 10, "桁")}
                </select>
                <span>～</span>
                <select class="problem-form-select b-int-max">
                  ${options(1, 10, "桁")}
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
      source.querySelectorAll("input, select").forEach((input, i) => {
        const targets = target.querySelectorAll("input, select");
        if (!targets[i]) return;

        targets[i].value = input.value;
        targets[i].dispatchEvent(new Event("change", { bubbles: true }));
      });

      const selectedCount = source.querySelector(
        ".individual-count-button.selected"
      );

      if (selectedCount) {
        const targetCount = [...target.querySelectorAll(".individual-count-button")]
          .find(b => b.dataset.count === selectedCount.dataset.count);
        if (targetCount) targetCount.click();
      }

      const sourceSections = [...source.querySelectorAll(".problem-section")];
      const targetList = target.querySelector(".individual-section-list");
      const targetAdd = target.querySelector(".individual-add-section-button");

      sourceSections.forEach((section, index) => {
        if (index > 0) targetAdd.click();

        const targetSection = targetList.querySelectorAll(".problem-section")[index];
        if (!targetSection) return;

        section.querySelectorAll("input, select").forEach((input, j) => {
          const targetInputs = targetSection.querySelectorAll("input, select");
          if (!targetInputs[j]) return;
          targetInputs[j].value = input.value;
          targetInputs[j].dispatchEvent(new Event("change", { bubbles: true }));
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
  kakeCard.querySelector(".problem-type-card-button")
    ?.addEventListener("click", () => {
      setTimeout(() => {
        if (kakeCard.classList.contains("expanded")) {
          makeSettings();
        }
      }, 0);
    });

  /* =========================================================
     かけ算の問題生成
     既存のみとり算の生成処理には触れない
  ========================================================= */

  generateButton.addEventListener("click", event => {
    if (!kakeCard.classList.contains("expanded")) return;

    event.stopImmediatePropagation();

    const blocks = [...detail.querySelectorAll(".individual-problem-block")];

    if (!blocks.length) {
      alert("かけ算の設定を開いてください。");
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

      // 問題を生成する
      for (let q = 1; q <= total; q++) {
        const r = ranges.find(x => q >= x.start && q <= x.end);

        const useDecimal = decimalQuestionNumbers.has(q);

        // 最初の小数問題では、0.xxx形式を優先する
        const firstDecimalQuestion =
          useDecimal &&
          q === Math.min(...decimalQuestionNumbers);

        const decimalSide = Math.random() < 0.5 ? "a" : "b";

        const a = makeOperand(
          r,
          "a",
          useDecimal && decimalSide === "a",
          firstDecimalQuestion && decimalSide === "a"
        );

        const b = makeOperand(
          r,
          "b",
          useDecimal && decimalSide === "b",
          firstDecimalQuestion && decimalSide === "b"
        );

        const rawAnswer = a.value * b.value;
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
        title: getField("title") || "かけ算",
        time: getField("time"),
        grade: getField("grade"),
        round: getField("round"),
        freeText: getField("freeText"),
        problems
      });
    }

    const html = sheets.map(renderSheet).join("");

    sessionStorage.setItem("generatedProblemSheets", html);
    window.location.href = "problem-sheet.html";
  }, true);

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
    const useZeroInteger = forceZeroInteger ||
      (style !== "no" && Math.random() < 0.35);

    let textValue;

    if (useZeroInteger) {
      // 小数部の先頭に必要な0の数
      const leadingFractionZeros = {
        "no": 0,
        "point-zero": 0,
        "point-zero-one": 1,
        "point-zero-two": 2
      }[style] ?? 0;

      // 0も1桁として数える表示形式
      const integerZeroDigits = style === "no" ? 0 : 1;
      const minFractionDigits = integerZeroDigits + leadingFractionZeros + 1;

      if (totalDigits < minFractionDigits) {
        // 指定桁数で0.xx形式が作れない場合は通常の小数にする
        return makeOperand(r, side, true, false);
      }

      const fractionDigits = totalDigits - integerZeroDigits;
      const significantDigits = fractionDigits - leadingFractionZeros;

      const tail = randomInt(1, 10 ** significantDigits - 1)
        .toString()
        .padStart(significantDigits, "0");

      const fraction = "0".repeat(leadingFractionZeros) + tail;

      textValue = style === "no"
        ? `.${fraction}`
        : `0.${fraction}`;
    } else {
      // 整数部と小数部を合わせて指定総桁数にする
      if (totalDigits < 2) {
        const value = randomInt(1, 9);
        return { text: String(value), value };
      }

      const integerDigits = totalDigits - 1;
      const integerMin = integerDigits === 1 ? 1 : 10 ** (integerDigits - 1);
      const integerMax = 10 ** integerDigits - 1;
      const integerPart = randomInt(integerMin, integerMax);
      const fraction = String(randomInt(1, 9));

      textValue = `${integerPart}.${fraction}`;
    }

    // 末尾の0と不要な小数点を取り除く
    const value = Number(textValue);
    const cleaned = textValue.replace(/0+$/, "").replace(/\.$/, "");

    // 整数部が0の形式は、指定された表記を維持する
    const display = cleaned === "" || cleaned === "."
      ? "0"
      : cleaned;

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

    // 小数末尾の不要な0と小数点を取り除く
    const normalized = Number(Number(value).toPrecision(12)).toString();

    // 整数部に3桁ごとのカンマを付ける
    const parts = normalized.split(".");
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
    return `
      <section class="kake-print-sheet" style="
        background:#fff; color:#111; max-width:1000px; margin:0 auto 24px;
        padding:28px; box-sizing:border-box; page-break-after:always;
        font-family: sans-serif;">
        <header style="border-bottom:2px solid #222; padding-bottom:10px; margin-bottom:14px;">
          <h1 style="text-align:center; margin:0 0 10px;">
            ${escapeHtml(sheet.title)}
          </h1>
          <div style="display:flex; flex-wrap:wrap; gap:20px; justify-content:space-between;">
            <span>時間：${escapeHtml(sheet.time || "　　　　")} 分</span>
            <span>級・段位：${escapeHtml(sheet.grade || "　　　　　　")}</span>
            <span>回数：${escapeHtml(sheet.round || "　　　　　　")}</span>
          </div>
          ${sheet.freeText ? `<p>${escapeHtml(sheet.freeText)}</p>` : ""}
          ${[...new Set(sheet.problems.map(p => p.instruction).filter(Boolean))]
            .map(instruction => `<p style="margin:10px 0 0;">${escapeHtml(instruction)}</p>`)
            .join("")}
          <p style="margin:8px 0 0;">氏名：________________________________</p>
        </header>

        <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;">
          ${sheet.problems.map(p => `
            <div style="border:1px solid #999; min-height:74px; padding:10px 12px; break-inside:avoid;">
              <div style="font-size:12px; color:#555;">${p.number}問</div>
              <div style="font-size:22px; font-weight:600; text-align:center; padding:5px 0;">
                ${escapeHtml(p.a)} × ${escapeHtml(p.b)} ＝
              </div>
              <div style="height:20px; border-bottom:1px solid #aaa;"></div>
            </div>
          `).join("")}
        </div>

        <details style="margin-top:20px;">
          <summary>答え（印刷時は必要に応じて開いてください）</summary>
          <div style="display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin-top:10px;">
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
