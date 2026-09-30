document.addEventListener("DOMContentLoaded", () => {

  const cards = document.querySelectorAll(".problem-type-card");

  cards.forEach(card => {

    const button = card.querySelector(".problem-type-card-button");

    if (!button) return;

    button.addEventListener("click", () => {

      // 現在開いているカードを閉じる
      cards.forEach(otherCard => {
        if (otherCard !== card) {
          otherCard.classList.remove("expanded");
        }
      });

      // クリックしたカードを開閉
      card.classList.toggle("expanded");

    });

  });

});