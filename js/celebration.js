
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
  const crownElement = document.getElementById("celebrationCrown");
  const trophyElement = document.getElementById("celebrationTrophy");

  if (!overlay) {
    console.error("結果画面 #passCelebration が見つかりません。");
    return;
  }

  const titleElement = overlay.querySelector(".celebration-title");
  const messageElement = overlay.querySelector(".celebration-message");

  // 必要なHTML要素を確認
  if (
    !levelElement ||
    !confettiElement ||
    !correctCountElement ||
    !accuracyElement ||
    !titleElement ||
    !messageElement
  ) {
    console.error("結果画面に必要なHTML要素が見つかりません。");
    return;
  }

  // 前回の紙吹雪を削除
  confettiElement.replaceChildren();

  // 結果の種類を判定
  const resultType = result.resultType || "pass";

  // 結果に応じて王冠・トロフィーを切り替える
  if (crownElement) {
    crownElement.style.display =
      resultType === "perfect" ? "block" : "none";
  }

  if (trophyElement) {
    trophyElement.style.display =
      resultType === "pass" ? "block" : "none";
  }

  // 前回の結果クラスを削除
  overlay.classList.remove(
    "pass-celebration--perfect",
    "pass-celebration--pass",
    "pass-celebration--retry"
  );

  // 今回の結果クラスを追加
  overlay.classList.add(`pass-celebration--${resultType}`);

  // 結果タイトルとメッセージ
  if (resultType === "perfect") {
    titleElement.textContent = "パーフェクト！ 全問正解！";
    messageElement.textContent = "最高の結果です！";
  } else if (resultType === "pass") {
    titleElement.textContent = "合格！";
    messageElement.textContent = "よく頑張りました！";
  } else {
    titleElement.textContent = "チャレンジ完了！";
    messageElement.textContent = "また挑戦しましょう！";
  }

  // 級・段の表示
  levelElement.textContent = levelText || "";

  // 正解数・正答率
  correctCountElement.textContent =
    `${result.correctCount ?? 0} / ${result.questionCount ?? 15}`;

  accuracyElement.textContent =
    `${result.rate ?? 0}%`;

  // 結果別の紙吹雪カラー
  const colorsByResult = {
    perfect: ["#ffd700", "#fff1a8", "#ffb700", "#ffffff", "#f5c542"],
    pass: ["#4ade80", "#22c55e", "#ffd700", "#ffffff", "#bbf7d0"],
    retry: ["#60a5fa", "#bfdbfe", "#ffffff", "#93c5fd", "#dbeafe"]
  };

  const colors = colorsByResult[resultType] || colorsByResult.pass;

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
