
/* ==================================================
   合格演出・最終結果画面
   ・金色の光と紙吹雪
   ・合格結果を表示
   ・ホームボタンを押すまで画面を維持
================================================== */

function showPassCelebration(levelText, result = {}) {

  const overlay = document.getElementById("passCelebration");
  const levelElement = document.getElementById("celebrationLevel");
  const confettiElement = document.getElementById("celebrationConfetti");
  const correctCountElement = document.getElementById("celebrationCorrectCount");
  const accuracyElement = document.getElementById("celebrationAccuracy");

  // 必要なHTMLが見つからない場合は、エラーを記録して終了
  if (
    !overlay ||
    !levelElement ||
    !confettiElement ||
    !correctCountElement ||
    !accuracyElement
  ) {
    console.error("合格演出に必要なHTML要素が見つかりません。");
    return;
  }

  // 前回の紙吹雪を削除
  confettiElement.replaceChildren();

  // 級・段の表示
  levelElement.textContent = levelText || "";

  // 正解数・正答率
  correctCountElement.textContent =
    `${result.correctCount ?? 0} / ${result.questionCount ?? 15}`;

  accuracyElement.textContent =
    `${result.rate ?? 0}%`;

  // 紙吹雪を生成
  const colors = [
    "#ffd700",
    "#fff1a8",
    "#ffb700",
    "#ffffff",
    "#f5c542",
    "#ff8c00"
  ];

  for (let i = 0; i < 90; i++) {
    const piece = document.createElement("span");

    piece.className = "celebration-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    // CSS側のアニメーション変数に設定
    piece.style.setProperty(
      "--fall-delay",
      `${Math.random() * 1.5}s`
    );

    piece.style.setProperty(
      "--fall-duration",
      `${2.5 + Math.random() * 2}s`
    );

    piece.style.setProperty(
      "--drift",
      `${Math.random() * 240 - 120}px`
    );

    const size = 5 + Math.random() * 8;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (1 + Math.random())}px`;

    confettiElement.appendChild(piece);
  }

  // 全画面表示
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");

  // CSSアニメーションを再スタート
  overlay.classList.remove("is-active");
  void overlay.offsetWidth;
  overlay.classList.add("is-active");
}


/* ==================================================
   合格画面のホームボタン
================================================== */

function closePassCelebration() {

  const overlay = document.getElementById("passCelebration");
  const confettiElement = document.getElementById("celebrationConfetti");

  // 合格演出を閉じる
  if (overlay) {
    overlay.classList.remove("is-active");
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
  }

  // 紙吹雪を片付ける
  if (confettiElement) {
    confettiElement.replaceChildren();
  }

  // 既存のホーム処理を利用
  if (typeof backHome === "function") {
    backHome();
  }
}
