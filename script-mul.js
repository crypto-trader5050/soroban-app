function startMultiplication() {

  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;

  const answer = a * b;

  const el = document.getElementById("display");

  el.textContent = `${a} × ${b}`;

  // ✅ ここ超重要（統一）
  state.answer = answer;

  // 入力表示
  document.getElementById("answerArea").style.display = "block";
}