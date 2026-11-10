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
      <div class="problem-create-panel wari-problem-create-panel">

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

            <p class="problem-section-status">
              ※小数点と先頭の0は桁数に含みません。
            </p>

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
     割り切れる問題は「わる数 × 答え」で作る
     割り切れない問題は「わる数 × 答え ＋ 余り」で作る
  ========================================================= */

  window.generateWariSheets = () => {
    if (!wariCard.classList.contains("expanded")) return;

    const blocks = [
      ...detail.querySelectorAll(".individual-problem-block")
    ];

    if (!blocks.length) {
      alert("わり算の設定を開いてください。");
      return;
    }

    const sheets = [];

    for (const block of blocks) {
      const countButton = block.querySelector(
        ".individual-count-button.selected"
      );

      const total = countButton
        ? Number(countButton.dataset.count)
        : 0;

      if (!total) {
        alert("総問題数を選択してください。");
        return;
      }

      const sections = [
        ...block.querySelectorAll(".problem-section")
      ];

      if (!sections.length) {
        alert("問題設定の区間がありません。");
        return;
      }

      const decimalQuestionCount = Number(
        block.querySelector(".decimal-question-count").value
      );

      const divisionPattern = block.querySelector(
        ".division-pattern"
      ).value;

      const decimalInexactCount = Number(
        block.querySelector(".decimal-inexact-count").value
      ) || 0;

      const integerInexactCount = Number(
        block.querySelector(".integer-inexact-count").value
      ) || 0;

      if (
        !Number.isInteger(decimalQuestionCount) ||
        decimalQuestionCount < 0 ||
        decimalQuestionCount > total
      ) {
        alert("小数を含む問題数を確認してください。");
        return;
      }

      if (
        divisionPattern !== "all-exact" &&
        (
          decimalInexactCount < 0 ||
          decimalInexactCount > decimalQuestionCount
        )
      ) {
        alert("小数問題の割り切れない問題数を確認してください。");
        return;
      }

      if (divisionPattern === "both-inexact") {
        const integerQuestionCount =
          total - decimalQuestionCount;

        if (
          integerInexactCount < 0 ||
          integerInexactCount > integerQuestionCount
        ) {
          alert("整数問題の割り切れない問題数を確認してください。");
          return;
        }
      }

      const ranges = sections.map(section => ({
        start: Number(
          section.querySelector(".section-start").value
        ),
        end: Number(
          section.querySelector(".section-end").value
        ),
        aIntMin: Number(
          section.querySelector(".a-int-min").value
        ),
        aIntMax: Number(
          section.querySelector(".a-int-max").value
        ),
        bIntMin: Number(
          section.querySelector(".b-int-min").value
        ),
        bIntMax: Number(
          section.querySelector(".b-int-max").value
        ),
        leadingZero: section.querySelector(".leading-zero").value,
        roundingMode: section.querySelector(".rounding-mode").value,
        roundingPlace: Number(
          section.querySelector(".rounding-place").value
        )
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
          alert(
            "区間の開始問題・終了問題を確認してください。" +
            "区間に抜けや重複がないように設定してください。"
          );
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
        block.querySelector(`[data-field="${name}"]`)
          ?.value.trim() || "";

      // 小数を含む問題の番号をランダムに決める
      const questionNumbers = Array.from(
        { length: total },
        (_, index) => index + 1
      );

      const decimalQuestionNumbers = new Set(
        shuffle(questionNumbers).slice(0, decimalQuestionCount)
      );

      const integerQuestionNumbers = questionNumbers.filter(
        number => !decimalQuestionNumbers.has(number)
      );

      // 割り切れない問題の番号を決める
      const decimalInexactNumbers = new Set(
        divisionPattern === "all-exact"
          ? []
          : shuffle([...decimalQuestionNumbers])
              .slice(0, decimalInexactCount)
      );

      const integerInexactNumbers = new Set(
        divisionPattern === "both-inexact"
          ? shuffle(integerQuestionNumbers)
              .slice(0, integerInexactCount)
          : []
      );

      const firstDecimalQuestionNumber =
        decimalQuestionNumbers.size > 0
          ? Math.min(...decimalQuestionNumbers)
          : null;

      const problems = [];

      // 問題を1問ずつ生成
      for (let q = 1; q <= total; q++) {
        const r = ranges.find(
          x => q >= x.start && q <= x.end
        );

        if (!r) {
          alert(`第${q}問の設定が見つかりません。`);
          return;
        }

        const useDecimal = decimalQuestionNumbers.has(q);

        const shouldBeInexact = useDecimal
          ? decimalInexactNumbers.has(q)
          : integerInexactNumbers.has(q);

        // 最初の小数問題だけ、選択された形式の0.xxxを優先する
        const forceLeadingZero =
          useDecimal &&
          q === firstDecimalQuestionNumber &&
          r.leadingZero !== "no";

        const pair = makeDivisionPair(
          r,
          useDecimal,
          shouldBeInexact,
          forceLeadingZero
        );

        if (!pair) {
          alert(
            `第${q}問を指定した桁数と割り切り条件で作成できません。\n\n` +
            "わられる数・わる数の桁数範囲を広げてください。" +
            (useDecimal
              ? "\n小数問題では、選択した小数の表記に必要な桁数も確認してください。"
              : "")
          );
          return;
        }

        const answer = processAnswer(
          pair.answer,
          r.roundingMode,
          r.roundingPlace
        );

        problems.push({
          number: q,
          a: pair.a.text,
          b: pair.b.text,
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

    return sheets.map(renderSheet).join("");
  };


  /* =========================================================
     共通処理
  ========================================================= */

  function randomInt(min, max) {
    return Math.floor(
      Math.random() * (max - min + 1)
    ) + min;
  }

  function shuffle(values) {
    const result = [...values];

    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

function getCoefficientRange(
  digits,
  scale,
  allowLeadingZero
) {
  if (!Number.isInteger(digits) || digits < 1) {
    return null;
  }

  // 整数の場合
  if (scale === 0) {
    return {
      min: 10 ** (digits - 1),
      max: (10 ** digits) - 1
    };
  }

  // 0.xxx形式を許可しない場合、
  // 小数点以下の桁数以内の有効数字は使用できない
  if (digits <= scale && !allowLeadingZero) {
    return null;
  }

  // 係数そのものの有効数字の桁数を基準にする
  return {
    min: 10 ** (digits - 1),
    max: (10 ** digits) - 1
  };
}


  /* =========================================================
     総桁数に合う係数の範囲
  ========================================================= */


function makeDivisionPair(
  r,
  useDecimal,
  inexact,
  forceLeadingZero
) {
  const scaleMap = {
    "no": 1,
    "point-zero": 1,
    "point-zero-one": 2,
    "point-zero-two": 3
  };

  const scale = useDecimal
    ? (scaleMap[r.leadingZero] ?? 1)
    : 0;

  const remainder = inexact ? 1 : 0;

  const candidates = [];

  // 総桁数は有効数字の桁数として扱う
  // 0.xxx形式の場合は、整数部の0と小数部先頭の0を数えない

  let aStart = r.aIntMin;
  let aEnd = r.aIntMax;

  let bStart = r.bIntMin;
  let bEnd = r.bIntMax;

  // 0.xxx形式を強制する場合は、
  // 小数点以下の桁数以内の有効数字に限定する
  if (useDecimal && forceLeadingZero) {
    aEnd = Math.min(aEnd, scale);
    bEnd = Math.min(bEnd, scale);
  }

  if (
    aStart > aEnd ||
    bStart > bEnd
  ) {
    return null;
  }

  // わられる数の桁数を選ぶ
  for (
    let aDigits = aStart;
    aDigits <= aEnd;
    aDigits++
  ) {
    const aRange = getCoefficientRange(
      aDigits,
      scale,
      forceLeadingZero
    );

    if (!aRange) continue;

    // わる数の桁数を選ぶ
    for (
      let bDigits = bStart;
      bDigits <= bEnd;
      bDigits++
    ) {
      const bRange = getCoefficientRange(
        bDigits,
        scale,
        forceLeadingZero
      );

      if (!bRange) continue;

      const effectiveBMin = Math.max(
        bRange.min,
        inexact ? 2 : 1
      );

      if (effectiveBMin > bRange.max) {
        continue;
      }

      // 商の範囲を計算する
      const qMin = Math.max(
        inexact ? 1 : 2,
        Math.ceil(
          (aRange.min - remainder) / bRange.max
        )
      );

      const qMax = Math.min(
        Math.floor(
          (aRange.max - remainder) / effectiveBMin
        ),
        aRange.max - aRange.min
      );

      if (qMin <= qMax) {
        candidates.push({
          aRange,
          bRange,
          qMin,
          qMax,
          effectiveBMin
        });
      }
    }
  }

  if (!candidates.length) {
    return null;
  }

  // 桁数条件に合う組み合わせを選ぶ
  const selected = candidates[
    randomInt(0, candidates.length - 1)
  ];

  const q = randomInt(
    selected.qMin,
    selected.qMax
  );

  // わる数の範囲を計算する
  const bMin = Math.max(
    selected.effectiveBMin,
    Math.ceil(
      (selected.aRange.min - remainder) / q
    )
  );

  const bMax = Math.min(
    selected.bRange.max,
    Math.floor(
      (selected.aRange.max - remainder) / q
    )
  );

  if (bMin > bMax) {
    return null;
  }

  const bCoefficient = randomInt(bMin, bMax);

  // 割り切れる・割り切れない条件を満たす数を直接生成
  const aCoefficient =
    bCoefficient * q + remainder;

  const aValue =
    aCoefficient / (10 ** scale);

  const bValue =
    bCoefficient / (10 ** scale);

  return {
    a: {
      text: formatScaledNumber(aCoefficient, scale),
      value: aValue
    },
    b: {
      text: formatScaledNumber(bCoefficient, scale),
      value: bValue
    },
    answer: aCoefficient / bCoefficient
  };
}



/* =========================================================
   係数を小数表記に変換
   小数部分の末尾の0は取り除く
   整数部分の0は維持する
========================================================= */

function formatScaledNumber(value, scale) {
  if (scale === 0) {
    return formatNumber(value);
  }

  const digits = String(value).padStart(
    scale + 1,
    "0"
  );

  let integerPart = digits.slice(0, -scale);
  let decimalPart = digits.slice(-scale);

  // 小数部分の末尾の0だけを取り除く
  decimalPart = decimalPart.replace(/0+$/, "");

  // 小数部分がなくなった場合は整数として表示
  if (decimalPart === "") {
    return formatNumber(Number(integerPart));
  }

  integerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );

  return `${integerPart}.${decimalPart}`;
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
      <section class="kake-print-sheet wari-print-sheet"
        data-sheet-round="${escapeHtml(sheet.round || "")}"
        style="
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
            ${sheet.round
              ? `<span>${escapeHtml(sheet.round)}</span>`
              : ""}
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
                <div
                  data-answer-key="true"
                  data-problem-number="${p.number}"
                  data-answer="${escapeHtml(p.answer)}"
                  style="
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

      </section>
    `;
  }

});