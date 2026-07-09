<<<<<<< HEAD
// ==========================
// そろばんフラッシュ暗算
// レベル設定コア
// ==========================

const LEVEL_CONFIG = [
  // ======================
  // 🟢 20級〜19級（1桁）
  // ======================
  { level: "20級", digit: 1, length: 5, speed: 1000 },
  { level: "19級", digit: 1, length: 10, speed: 950 },

  // ======================
  // 🟢 18級〜17級（2桁）
  // ======================
  { level: "18級", digit: 2, length: 5, speed: 900 },
  { level: "17級", digit: 2, length: 10, speed: 850 },

  // ======================
  // 🟢 16級〜15級（3桁）
  // ======================
  { level: "16級", digit: 3, length: 5, speed: 800 },
  { level: "15級", digit: 3, length: 10, speed: 750 },

  // ======================
  // 🟢 14級〜13級（4桁）
  // ======================
  { level: "14級", digit: 4, length: 5, speed: 700 },
  { level: "13級", digit: 4, length: 10, speed: 650 },

  // ======================
  // 🟡 12級〜11級（5桁）
  // ======================
  { level: "12級", digit: 5, length: 5, speed: 600 },
  { level: "11級", digit: 5, length: 10, speed: 550 },

  // ======================
  // 🟡 10級〜9級（6桁）
  // ======================
  { level: "10級", digit: 6, length: 6, speed: 500 },
  { level: "9級", digit: 6, length: 10, speed: 450 },

  // ======================
  // 🟡 8級〜7級（7桁）
  // ======================
  { level: "8級", digit: 7, length: 6, speed: 400 },
  { level: "7級", digit: 7, length: 10, speed: 350 },

  // ======================
  // 🟠 6級〜5級（8桁）
  // ======================
  { level: "6級", digit: 8, length: 6, speed: 300 },
  { level: "5級", digit: 8, length: 10, speed: 250 },

  // ======================
  // 🟠 4級〜3級（9桁）
  // ======================
  { level: "4級", digit: 9, length: 8, speed: 200 },
  { level: "3級", digit: 9, length: 12, speed: 180 },

  // ======================
  // 🔵 2級〜1級（10桁）
  // ======================
  { level: "2級", digit: 10, length: 10, speed: 160 },
  { level: "1級", digit: 10, length: 12, speed: 140 },

  // ======================
  // 🔴 段位（11〜15桁）
  // ======================
  { level: "初段", digit: 11, length: 12, speed: 120 },
  { level: "弐段", digit: 11, length: 13, speed: 110 },

  { level: "参段", digit: 12, length: 13, speed: 100 },
  { level: "四段", digit: 12, length: 14, speed: 95 },

  { level: "五段", digit: 13, length: 14, speed: 90 },
  { level: "六段", digit: 13, length: 15, speed: 85 },

  { level: "七段", digit: 14, length: 15, speed: 80 },
  { level: "八段", digit: 14, length: 15, speed: 75 },

  { level: "九段", digit: 15, length: 15, speed: 70 },
  { level: "十段", digit: 15, length: 15, speed: 65 }
=======
// ==========================
// そろばんフラッシュ暗算
// レベル設定コア
// ==========================

const LEVEL_CONFIG = [
  // ======================
  // 🟢 20級〜19級（1桁）
  // ======================
  { level: "20級", digit: 1, length: 5, speed: 1000 },
  { level: "19級", digit: 1, length: 10, speed: 950 },

  // ======================
  // 🟢 18級〜17級（2桁）
  // ======================
  { level: "18級", digit: 2, length: 5, speed: 900 },
  { level: "17級", digit: 2, length: 10, speed: 850 },

  // ======================
  // 🟢 16級〜15級（3桁）
  // ======================
  { level: "16級", digit: 3, length: 5, speed: 800 },
  { level: "15級", digit: 3, length: 10, speed: 750 },

  // ======================
  // 🟢 14級〜13級（4桁）
  // ======================
  { level: "14級", digit: 4, length: 5, speed: 700 },
  { level: "13級", digit: 4, length: 10, speed: 650 },

  // ======================
  // 🟡 12級〜11級（5桁）
  // ======================
  { level: "12級", digit: 5, length: 5, speed: 600 },
  { level: "11級", digit: 5, length: 10, speed: 550 },

  // ======================
  // 🟡 10級〜9級（6桁）
  // ======================
  { level: "10級", digit: 6, length: 6, speed: 500 },
  { level: "9級", digit: 6, length: 10, speed: 450 },

  // ======================
  // 🟡 8級〜7級（7桁）
  // ======================
  { level: "8級", digit: 7, length: 6, speed: 400 },
  { level: "7級", digit: 7, length: 10, speed: 350 },

  // ======================
  // 🟠 6級〜5級（8桁）
  // ======================
  { level: "6級", digit: 8, length: 6, speed: 300 },
  { level: "5級", digit: 8, length: 10, speed: 250 },

  // ======================
  // 🟠 4級〜3級（9桁）
  // ======================
  { level: "4級", digit: 9, length: 8, speed: 200 },
  { level: "3級", digit: 9, length: 12, speed: 180 },

  // ======================
  // 🔵 2級〜1級（10桁）
  // ======================
  { level: "2級", digit: 10, length: 10, speed: 160 },
  { level: "1級", digit: 10, length: 12, speed: 140 },

  // ======================
  // 🔴 段位（11〜15桁）
  // ======================
  { level: "初段", digit: 11, length: 12, speed: 120 },
  { level: "弐段", digit: 11, length: 13, speed: 110 },

  { level: "参段", digit: 12, length: 13, speed: 100 },
  { level: "四段", digit: 12, length: 14, speed: 95 },

  { level: "五段", digit: 13, length: 14, speed: 90 },
  { level: "六段", digit: 13, length: 15, speed: 85 },

  { level: "七段", digit: 14, length: 15, speed: 80 },
  { level: "八段", digit: 14, length: 15, speed: 75 },

  { level: "九段", digit: 15, length: 15, speed: 70 },
  { level: "十段", digit: 15, length: 15, speed: 65 }
>>>>>>> 5710c86fc664d14360db3213159b41e0a8689ba0
];