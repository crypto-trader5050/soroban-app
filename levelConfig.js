// ==========================
// そろばんフラッシュ暗算
// レベル設定コア
// ==========================

const LEVEL_CONFIG = [

  // 1桁
  { level: "38級", digit: 1, length: 5, speed: 1000 },
  { level: "37級", digit: 1, length: 10, speed: 1000 },
  { level: "36級", digit: 1, length: 15, speed: 1000 },

  // 2桁
  { level: "35級", digit: 2, length: 5, speed: 1000 },
  { level: "34級", digit: 2, length: 10, speed: 1000 },
  { level: "33級", digit: 2, length: 15, speed: 1000 },

  // 3桁
  { level: "32級", digit: 3, length: 5, speed: 1000 },
  { level: "31級", digit: 3, length: 10, speed: 1000 },
  { level: "30級", digit: 3, length: 15, speed: 1000 },

  // 4桁
  { level: "29級", digit: 4, length: 5, speed: 1000 },
  { level: "28級", digit: 4, length: 10, speed: 1000 },
  { level: "27級", digit: 4, length: 15, speed: 1000 },

  // 5桁
  { level: "26級", digit: 5, length: 5, speed: 1000 },
  { level: "25級", digit: 5, length: 10, speed: 1000 },
  { level: "24級", digit: 5, length: 15, speed: 1000 },

  // 6桁
  { level: "23級", digit: 6, length: 5, speed: 1000 },
  { level: "22級", digit: 6, length: 10, speed: 1000 },
  { level: "21級", digit: 6, length: 15, speed: 1000 },

  // 7桁
  { level: "20級", digit: 7, length: 5, speed: 1000 },
  { level: "19級", digit: 7, length: 10, speed: 1000 },
  { level: "18級", digit: 7, length: 15, speed: 1000 },

  // 8桁
  { level: "17級", digit: 8, length: 5, speed: 1000 },
  { level: "16級", digit: 8, length: 10, speed: 1000 },
  { level: "15級", digit: 8, length: 15, speed: 1000 },

  // 9桁
  { level: "14級", digit: 9, length: 5, speed: 1000 },
  { level: "13級", digit: 9, length: 10, speed: 1000 },
  { level: "12級", digit: 9, length: 15, speed: 1000 },

  // 10桁
  { level: "11級", digit: 10, length: 5, speed: 1000 },
  { level: "10級", digit: 10, length: 10, speed: 1000 },
  { level: "9級", digit: 10, length: 15, speed: 1000 },

  // 11桁
  { level: "8級", digit: 11, length: 5, speed: 1000 },
  { level: "7級", digit: 11, length: 10, speed: 1000 },
  { level: "6級", digit: 11, length: 15, speed: 1000 },

  // 12桁
  { level: "5級", digit: 12, length: 5, speed: 1000 },
  { level: "4級", digit: 12, length: 10, speed: 1000 },
  { level: "3級", digit: 12, length: 15, speed: 1000 },

  // 13桁
  { level: "2級", digit: 13, length: 5, speed: 1000 },
  { level: "1級", digit: 13, length: 10, speed: 1000 },
  { level: "初段", digit: 13, length: 15, speed: 1000 },

  // 14桁
  { level: "弐段", digit: 14, length: 5, speed: 1000 },
  { level: "参段", digit: 14, length: 10, speed: 1000 },
  { level: "四段", digit: 14, length: 15, speed: 1000 },

  // 15桁
  { level: "五段", digit: 15, length: 5, speed: 1000 },
  { level: "六段", digit: 15, length: 10, speed: 1000 },
  { level: "七段", digit: 15, length: 15, speed: 1000 },

  // 16桁
  { level: "八段", digit: 16, length: 5, speed: 1000 },
  { level: "九段", digit: 16, length: 10, speed: 1000 },
  { level: "十段", digit: 16, length: 15, speed: 1000 }

];