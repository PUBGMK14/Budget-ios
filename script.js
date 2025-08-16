const DEFAULT_PACKAGES = [
  { name: "60 UC", baseUC: 60, bonusUC: 0, price: 1100 },
  { name: "180 + 10 UC", baseUC: 180, bonusUC: 10, price: 4400 },
  { name: "600 + 60 UC", baseUC: 600, bonusUC: 60, price: 14000 },
  { name: "1500 + 300 UC", baseUC: 1500, bonusUC: 300, price: 33000 },
  { name: "2950 + 900 UC", baseUC: 2950, bonusUC: 900, price: 66000 },
  { name: "5900 + 2200 UC", baseUC: 5900, bonusUC: 2200, price: 149000 },
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

const fmtKRW = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const fmtINT = new Intl.NumberFormat("ko-KR");

function fmtMoney(n) { return fmtKRW.format(Math.round(n)); }
function fmtNumber(n) { return fmtINT.format(Math.round(n)); }
function totalUCOf(pkg) { return pkg.baseUC + pkg.bonusUC; }

function parseBudget() {
  const raw = (els.budget.value || "").replace(/,/g, "").trim();
  const num = Number.parseInt(raw, 10);
  return Number.isFinite(num) ? num : 0;
}

function setLoading(loading) {
  els.calcBtn.disabled = loading;
  els.calcBtn.textContent = loading ? "계산 중..." : "최적 조합 계산";
}

function showMessage(msg) {
  els.summary.textContent = msg;
  els.resultTable.classList.add("hidden");
}

function compute() {
  const budget = parseBudget();
  if (budget <= 0) {
    showMessage("예산을 입력하세요.");
    return;
  }

  setLoading(true);
  try {
    // 유효 패키지
    const usable = DEFAULT_PACKAGES
      .filter(p => p.price > 0 && totalUCOf(p) > 0)
      .map(p => ({ ...p, cost: p.price }));

    const budgetScaled = budget; // 1원 단위
    const dpUC = new Array(budgetScaled + 1).fill(-1);
    const dpCost = new Array(budgetScaled + 1).fill(0);
    const dpTake = new Array(budgetScaled + 1).fill(-1);
    dpUC[0] = 0;

    // 무한 배낭 DP
    for (let c = 1; c <= budgetScaled; c++) {
      for (let i = 0; i < usable.length; i++) {
        const u = usable[i];
        if (u.cost <= c && dpUC[c - u.cost] >= 0) {
          const candUC = dpUC[c - u.cost] + totalUCOf(u);
          const candCost = dpCost[c - u.cost] + u.cost;
          // 동률 기준: 같은 UC면 지출이 더 큰 쪽(잔액 최소화) 선택
          if (candUC > dpUC[c] || (candUC === dpUC[c] && candCost > dpCost[c])) {
            dpUC[c] = candUC;
            dpCost[c] = candCost;
            dpTake[c] = i;
          }
        }
      }
    }

    // 최적 지점 선택 (동일 UC면 지출 큰 쪽)
    let bestC = 0;
    for (let c = 1; c <= budgetScaled; c++) {
      if (dpUC[c] > dpUC[bestC] || (dpUC[c] === dpUC[bestC] && dpCost[c] > dpCost[bestC])) {
        bestC = c;
      }
    }

    if (dpUC[bestC] <= 0) {
      showMessage("구매 가능한 조합이 없습니다.");
      return;
    }

    // 역추적
    const counts = new Array(usable.length).fill(0);
    let cur = bestC;
    while (cur > 0 && dpTake[cur] >= 0) {
      const idx = dpTake[cur];
      counts[idx]++;
      cur -= usable[idx].cost;
    }

    // 렌더링
    let sumUC = 0, sumCost = 0, sumCount = 0;
    const rows = [];
    for (let i = 0; i < counts.length; i++) {
      const cnt = counts[i];
      if (!cnt) continue;
      const itemUC = cnt * totalUCOf(usable[i]);
      const itemCost = cnt * usable[i].price;
      sumUC += itemUC;
      sumCost += itemCost;
      sumCount += cnt;
      rows.push(
        `<tr>
          <td>${usable[i].name}</td>
          <td>${fmtNumber(cnt)}</td>
          <td>${fmtNumber(itemUC)} UC</td>
          <td>${fmtMoney(itemCost)}</td>
        </tr>`
      );
    }

    els.resultBody.innerHTML = rows.join("");
    els.resCount.textContent = fmtNumber(sumCount);
    els.resUC.textContent = `${fmtNumber(sumUC)} UC`;
    els.resCost.textContent = fmtMoney(sumCost);
    els.summary.textContent = `총 ${fmtNumber(sumUC)} UC, 지출 ${fmtMoney(sumCost)}, 잔액 ${fmtMoney(budget - sumCost)}`;
    els.resultTable.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showMessage("오류가 발생했습니다. 입력값을 확인 후 다시 시도해 주세요.");
  } finally {
    setLoading(false);
  }
}

els.calcBtn.addEventListener("click", compute);
els.budget.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    compute();
  }
});
