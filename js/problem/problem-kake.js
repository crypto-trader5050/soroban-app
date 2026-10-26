
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

      countButtons.forEach(button => {
        button.addEventListener("click", () => {
          countButtons.forEach(b => b.classList.remove("selected"));
          button.classList.add("selected");

          totalQuestions = Number(button.dataset.count);
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
              <label class="problem-form-label">かけられる数・整数部分</label>
              <select class="problem-form-select a-int-min">
                ${options(1, 10, "桁")}
              </select>
              <div class="problem-digit-range">
                <select class="problem-form-select a-int-max">
                  ${options(1, 10, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">かける数・整数部分</label>
              <select class="problem-form-select b-int-min">
                ${options(1, 10, "桁")}
              </select>
              <div class="problem-digit-range">
                <select class="problem-form-select b-int-max">
                  ${options(1, 10, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">小数点</label>
              <select class="problem-form-select decimal-mode">
                <option value="none">整数のみ</option>
                <option value="optional" selected>整数・小数を含める</option>
                <option value="required">小数を必ず含める</option>
              </select>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">かけられる数・小数桁数</label>
              <div class="problem-digit-range">
                <select class="problem-form-select a-dec-min">
                  ${options(0, 4, "桁")}
                </select>
                <span>～</span>
                <select class="problem-form-select a-dec-max">
                  ${options(0, 4, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">かける数・小数桁数</label>
              <div class="problem-digit-range">
                <select class="problem-form-select b-dec-min">
                  ${options(0, 4, "桁")}
                </select>
                <span>～</span>
                <select class="problem-form-select b-dec-max">
                  ${options(0, 4, "桁")}
                </select>
              </div>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">0から始まる小数</label>
              <select class="problem-form-select leading-zero">
                <option value="yes" selected>含める（0.3、0.05、0.008）</option>
                <option value="no">含めない</option>
              </select>
            </div>

            <div class="problem-form-item">
              <label class="problem-form-label">答えの処理方法</label>
              <select class="problem-form-select rounding-mode">
                <option value="exact">正確に答える</option>
                <option value="round">四捨五入</option>
                <option value="truncate">切り捨て</option>
              </select>
            </div>

            <div class="problem-form-item rounding-place-area">
              <label class="problem-form-label">答えを求める位</label>
              <select class="problem-form-select rounding-place">
                <option value="0">一の位まで</option>
                <option value="1">小数第1位まで</option>
                <option value="2" selected>小数第2位まで</option>
                <option value="3">小数第3位まで</option>
                <option value="4">小数第4位まで</option>
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

      const ranges = sections.map(section => ({
        start: Number(section.querySelector(".section-start").value),
        end: Number(section.querySelector(".section-end").value),
        aIntMin: Number(section.querySelector(".a-int-min").value),
        aIntMax: Number(section.querySelector(".a-int-max").value),
        bIntMin: Number(section.querySelector(".b-int-min").value),
        bIntMax: Number(section.querySelector(".b-int-max").value),
        decimalMode: section.querySelector(".decimal-mode").value,
        aDecMin: Number(section.querySelector(".a-dec-min").value),
        aDecMax: Number(section.querySelector(".a-dec-max").value),
        bDecMin: Number(section.querySelector(".b-dec-min").value),
        bDecMax: Number(section.querySelector(".b-dec-max").value),
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

        if (r.aIntMin > r.aIntMax || r.bIntMin > r.bIntMax ||
            r.aDecMin > r.aDecMax || r.bDecMin > r.bDecMax) {
          alert("桁数の最小値と最大値を確認してください。");
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

      for (let q = 1; q <= total; q++) {
        const r = ranges.find(x => q >= x.start && q <= x.end);
        const a = makeOperand(r, "a");
        const b = makeOperand(r, "b");

        const rawAnswer = a.value * b.value;
        const answer = processAnswer(rawAnswer, r.roundingMode, r.roundingPlace);

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

  function makeOperand(r, side) {
    const intMin = r[`${side}IntMin`];
    const intMax = r[`${side}IntMax`];
    const decMin = r[`${side}DecMin`];
    const decMax = r[`${side}DecMax`];

    let decimals = r.decimalMode === "none"
      ? 0
      : randomInt(decMin, decMax);

    if (r.decimalMode === "required" && decimals === 0) {
      const maxPossible = Math.max(r.aDecMax, r.bDecMax);
      if (maxPossible === 0) {
        throw new Error("小数を必ず含める設定では、小数桁数を1桁以上にしてください。");
      }
      decimals = randomInt(1, maxPossible);
    }

    const intDigits = randomInt(intMin, intMax);
    let integerPart = randomInt(
      intDigits === 1 ? 1 : 10 ** (intDigits - 1),
      10 ** intDigits - 1
    );

    if (r.leadingZero === "yes" && decimals > 0 && Math.random() < 0.35) {
      integerPart = 0;
    }

    const fraction = decimals > 0
      ? randomInt(0, 10 ** decimals - 1).toString().padStart(decimals, "0")
      : "";

    const textValue = decimals > 0
      ? `${integerPart}.${fraction}`
      : String(integerPart);

    return {
      text: textValue,
      value: Number(textValue)
    };
  }

  function processAnswer(value, mode, places) {
    if (mode === "exact") return formatNumber(value);

    const factor = 10 ** places;
    const adjusted = mode === "round"
      ? Math.round((value + Number.EPSILON) * factor)
      : Math.trunc(value * factor);

    return formatNumber(adjusted / factor);
  }

  function formatNumber(value) {
    return Number(value.toPrecision(12)).toString();
  }

  function makeInstruction(r) {
    if (r.roundingMode === "exact") {
      return "答えは正確に求めなさい。";
    }

    const place = r.roundingPlace === 0
      ? "一の位"
      : `小数第${r.roundingPlace}位`;

    const discarded = r.roundingPlace === 0
      ? "一の位未満"
      : `小数第${r.roundingPlace + 1}位未満`;

    const method = r.roundingMode === "round" ? "四捨五入" : "切り捨て";

    return `答えは${place}まで求め、${discarded}を${method}しなさい。`;
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
          <p style="margin:10px 0 0;">${escapeHtml(sheet.problems[0]?.instruction || "")}</p>
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
