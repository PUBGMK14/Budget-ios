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
  currency: document.getElementById("currency"),
  tax: document.getElementById("tax"),
  precision: document.getElementById("precision"),
  calcBtn: document.getElementById("calcBtn"),
  resetBtn: document.getElementById("resetBtn"),
  addRowBtn: document.getElementById("addRowBtn"),
  pkgBody: document.getElementById("pkgBody"),
  resultTable: document.getElementById("resultTable"),
  resultBody: document.getElementById("resultBody"),
  resCount: document.getElementById("resCount"),
  resUC: document.getElementById("resUC"),
  resCost: document.getElementById("resCost"),
  summary: document.getElementById("summary"),
};

let packages = [];

function fmtMoney(n, cur) {
  return `${cur} ${Number(n.toFixed(0)).toLocaleString()}`;
}
function fmtNumber(n) {
  return Number(n).toLocaleString();
}
function totalUCOf(pkg) {
  return pkg.baseUC + pkg.bonusUC;
}

function rebuildPkgTable() {
  els.pkgBody.innerHTML = "";
  packages.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${p.name}"></td>
      <td><input type="number" step="1" min="0" value="${p.baseUC}"></td>
      <td><input type="number" step="1" min="0" value="${p.bonusUC}"></td>
      <td class="uc-total">${totalUCOf(p)}</td>
      <td><input type="number" step="1" min="0" value="${p.price}"></td>
      <td><button class="del">삭제</button></td>
    `;
    const inputs = tr.querySelectorAll("input");
    inputs[0].addEventListener("input", e => packages[i].name = e.target.value);
    inputs[1].addEventListener("input", e => {
      packages[i].baseUC = parseInt(e.target.value) || 0;
      tr.querySelector(".uc-total").textContent = totalUCOf(packages[i]);
    });
    inputs[2].addEventListener("input", e => {
      packages[i].bonusUC = parseInt(e.target.value) || 0;
      tr.querySelector(".uc-total").textContent = totalUCOf(packages[i]);
    });
    inputs[3].addEventListener("input", e => packages[i].price = parseInt(e.target.value) || 0);
    tr.querySelector(".del").addEventListener("click", () => {
      packages.splice(i, 1);
      rebuildPkgTable();
    });
    els.pkgBody.appendChild(tr);
  });
}

function restoreDefaults() {
  packages = DEFAULT_PACKAGES.map(p => ({...p}));
  rebuildPkgTable();
}

function addRow() {
  packages.push({ name: "새 패키지", baseUC: 0, bonusUC: 0, price: 0 });
  rebuildPkgTable();
}

function compute() {
  const budget = parseInt(els.budget.value) || 0;
  if (budget <= 0) return alert("예산을 입력하세요.");
  const currency = els.currency.value || "₩";
  const usable = packages.filter(p => p.price > 0 && totalUCOf(p) > 0);

  // DP 준비
  const scale = els.precision.value === "auto" ? 1 : parseInt(els.precision.value);
  const budgetScaled = Math.floor(budget / scale);
  const dpUC = Array(budgetScaled+1).fill(-1);
  const dpTake = Array(budgetScaled+1).fill(-1);
  const dpCost = Array(budgetScaled+1).fill(0);
  dpUC[0] = 0;

  usable.forEach(u => u.cost = Math.round(u.price / scale));

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
      <td>${fmtMoney(itemCost, currency)}</td>
    </tr>`;
  }).join("");

  els.resCount.textContent = fmtNumber(sumCount);
  els.resUC.textContent = `${fmtNumber(sumUC)} UC`;
  els.resCost.textContent = fmtMoney(sumCost, currency);
  els.summary.innerHTML = `총 ${fmtNumber(sumUC)} UC, 지출 ${fmtMoney(sumCost, currency)}, 잔액 ${fmtMoney(budget - sumCost, currency)}`;
  els.resultTable.classList.remove("hidden");
}

els.calcBtn.addEventListener("click", compute);
els.resetBtn.addEventListener("click", restoreDefaults);
els.addRowBtn.addEventListener("click", addRow);

restoreDefaults();
