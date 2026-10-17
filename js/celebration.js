
/* ==================================================
   合格演出
   ・全画面の合格アニメーション
   ・金色の光と紙吹雪
   ・一定時間後に通常の結果表示へ移行
================================================== */

function showPassCelebration(levelText, onComplete) {


  if (window.sorobanDebugLog) {
    window.sorobanDebugLog(
      "③ 合格演出開始",
      `級=${levelText}`
    );
  }

  const overlay = document.getElementById("passCelebration");
  const levelElement = document.getElementById("celebrationLevel");
  const confettiElement = document.getElementById("celebrationConfetti");

    if (window.sorobanDebugLog) {
      window.sorobanDebugLog(
        "④ 演出用要素の取得",
        `overlay=${!!overlay}` +
        ` level=${!!levelElement}` +
        ` confetti=${!!confettiElement}`
      );
    }


  // 演出用HTMLが見つからない場合は、通常の結果表示へ進む
  if (!overlay || !levelElement || !confettiElement) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  // 前回の紙吹雪を削除
  confettiElement.replaceChildren();

  // 級・段などの表示
  levelElement.textContent = levelText || "";

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

    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;

    const size = 5 + Math.random() * 8;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (1 + Math.random())}px`;

    piece.style.setProperty(
      "--confetti-drift",
      `${Math.random() * 240 - 120}px`
    );

    confettiElement.appendChild(piece);
  }

  // 全画面表示
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");

  // CSSアニメーションを再スタート
  overlay.classList.remove("is-active");
  void overlay.offsetWidth;
  overlay.classList.add("is-active");

  // 演出終了後、通常の結果画面へ
  window.setTimeout(() => {
    overlay.classList.remove("is-active");
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    confettiElement.replaceChildren();

    if (typeof onComplete === "function") {
      onComplete();
    }
  }, 3500);
}
