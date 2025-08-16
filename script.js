const DEFAULT_PACKAGES = [
  { name: "60 UC", baseUC: 60, bonusUC: 0, price: 1100 },
  { name: "180 + 10 UC", baseUC: 180, bonusUC: 10, price: 3300 },
  { name: "600 + 60 UC", baseUC: 600, bonusUC: 60, price: 11000 },
  { name: "1500 + 300 UC", baseUC: 1500, bonusUC: 300, price: 27500 },
  { name: "2950 + 900 UC", baseUC: 2950, bonusUC: 900, price: 55000 },
  { name: "5900 + 2200 UC", baseUC: 5900, bonusUC: 2200, price: 110000 },
];

const els = {
  budget: document.getElementById("budget"),
  calcBtn: document.getElementById("calcBtn"),
  resultTable: document.getElementById("resultTable"),
  resultBody: document.getElementById("resultBody"),
  resCount: document.getElementById("resCount"),
  resUC: document.getElementById("resUC"),
  resCost: document.getElementById("resCost"),
  summary: document.getElementById("summary"),
};

function fmtMoney(n) {
  return `₩ ${Number(n.toFixed(0)).toLocaleString()}`;
}
function fmtNumber(n) {
  return Number(n).toLocaleString();
}
function totalUCOf(pkg) {
  return pkg.baseUC + pkg.bonusUC;
}

function compute() {
  const budget = parseInt(els.budget.value) || 0;
  if (budget <= 0) return alert("예산을 입력하세요.");

  const usable = DEFAULT_PACKAGES.filter(p => p.price > 0 && totalUCOf(p) > 0);

  // DP (항상 1원 단위 정밀도)
  const budgetScaled = budget;
  const dpUC = Array(budgetScaled+1).fill(-1);
  const dpTake = Array(budgetScaled+1).fill(-1);
  const dpCost = Array(budgetScaled+1).fill(0);
  dpUC[0] = 0;

  usable.forEach(u => u.cost = u.price);

  for (let c = 1; c <= budgetScaled; c++) {
    usable.forEach((u, i) => {
      if (u.cost <= c && dpUC[c - u.cost] >= 0) {
        const candUC = dpUC[c - u.cost] + totalUCOf(u);
        const candCost = dpCost[c - u.cost] + u.cost;
        if (candUC > dpUC[c] || (candUC === dpUC[c] && candCost < dpCost[c])) {
          dpUC[c] = candUC;
          dpCost[c] = candCost;
          dpTake[c] = i;
        }
      }
    });
  }

  let bestC = 0;
  dpUC.forEach((uc, c) => {
    if (uc > dpUC[bestC] || (uc === dpUC[bestC] && dpCost[c] > dpCost[bestC])) bestC = c;
  });

  if (dpUC[bestC] <= 0) {
    els.summary.innerHTML = "구매 가능한 조합이 없습니다.";
    els.resultTable.classList.add("hidden");
    return;
  }

  const counts = Array(usable.length).fill(0);
  let cur = bestC;
  while (cur > 0 && dpTake[cur] >= 0) {
    counts[dpTake[cur]]++;
    cur -= usable[dpTake[cur]].cost;
  }

  let sumUC = 0, sumCost = 0, sumCount = 0;
  els.resultBody.innerHTML = counts.map((cnt, i) => {
    if (!cnt) return "";
    const itemUC = cnt * totalUCOf(usable[i]);
    const itemCost = cnt * usable[i].price;
    sumUC += itemUC; sumCost += itemCost; sumCount += cnt;
    return `<tr>
      <td>${usable[i].name}</td>
      <td>${fmtNumber(cnt)}</td>
      <td>${fmtNumber(itemUC)} UC</td>
      <td>${fmtMoney(itemCost)}</td>
    </tr>`;
  }).join("");

  els.resCount.textContent = fmtNumber(sumCount);
  els.resUC.textContent = `${fmtNumber(sumUC)} UC`;
  els.resCost.textContent = fmtMoney(sumCost);
  els.summary.innerHTML = `총 ${fmtNumber(sumUC)} UC, 지출 ${fmtMoney(sumCost)}, 잔액 ${fmtMoney(budget - sumCost)}`;
  els.resultTable.classList.remove("hidden");
}

els.calcBtn.addEventListener("click", compute);
