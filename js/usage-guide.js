
// ========================================
// 使い方ガイドの開閉
// ========================================

function openUsageGuide() {
  const guide = document.getElementById("usageGuide");

  if (guide) {
    guide.style.display = "flex";
  }
}

function closeUsageGuide() {
  const guide = document.getElementById("usageGuide");

  if (guide) {
    guide.style.display = "none";
  }
}
