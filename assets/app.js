/* ============================================================
   3. 相片位 — 有真相就用 item.img，冇就畫個杯／碟
   ============================================================ */
function placeholder(hue){
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' +
    '<rect width="160" height="160" fill="hsl(' + hue + ' 32% 90%)"/>' +
    '<circle cx="80" cy="74" r="46" fill="none" stroke="hsl(' + hue + ' 30% 66%)" stroke-width="2.5"/>' +
    '<circle cx="80" cy="74" r="27" fill="hsl(' + hue + ' 38% 80%)"/>' +
    '<text x="80" y="140" text-anchor="middle" font-size="15" font-family="sans-serif" ' +
    'fill="hsl(' + hue + ' 22% 52%)">相片</text></svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
MENU.forEach(function(m){
  if(!m.img) m.img = placeholder(m.hue);
  if(!m.portion) m.portion = "1杯（350ml）";   // 糖水、飲品預設
  if(!m.tags) m.tags = [];
});

const CAT = {};
CATEGORIES.forEach(function(c){ CAT[c.key] = c; });
const byId = function(id){ return MENU.find(function(x){ return x.id === id; }); };

/* ============================================================
   4. 狀態
   ============================================================ */
const state = {
  picked: {},          // {id: 數量}
  cats: new Set(),     // 分類篩選
  diets: new Set(),    // 飲食需要
  q: "",
  priceMax: 400,
  onlyStar: false,
  onlyPicked: false,
  submitted: false     // 撳過落單之後先即時顯示錯誤
};

const $ = function(s){ return document.querySelector(s); };
const money = function(n){ return "$" + n.toLocaleString("en-US"); };
const esc = function(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
};

/* ============================================================
   4b. 工作天（星期一至五，扣除 CONFIG.holidays）
   ============================================================ */
function ymd(d){
  const p = function(n){ return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function isWorkingDay(d){
  const wd = d.getDay();
  if(wd === 0 || wd === 6) return false;
  return CONFIG.holidays.indexOf(ymd(d)) === -1;
}
/* 由 from 起計，加 n 個工作天 */
function addWorkingDays(from, n){
  const d = new Date(from);
  d.setHours(0,0,0,0);
  let left = n;
  while(left > 0){
    d.setDate(d.getDate() + 1);
    if(isWorkingDay(d)) left--;
  }
  return d;
}
function leadDateStr(){ return ymd(addWorkingDays(new Date(), CONFIG.leadWorkingDays)); }
function addDays(n){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n); return d; }
function tomorrowStr(){ return ymd(addDays(1)); }
function minDateStr(){ return CONFIG.allowRushOrders ? tomorrowStr() : leadDateStr(); }
function isRushDate(dateStr){ return !!dateStr && dateStr < leadDateStr(); }

/* ============================================================
   5. 篩選側欄
   ============================================================ */
function chipGroup(el, values, set){
  el.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "chips";
  values.forEach(function(v){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = v.label;
    b.setAttribute("aria-pressed", set.has(v.key) ? "true" : "false");
    b.addEventListener("click", function(){
      if(set.has(v.key)) set.delete(v.key); else set.add(v.key);
      b.setAttribute("aria-pressed", set.has(v.key) ? "true" : "false");
      renderMenu();
    });
    wrap.appendChild(b);
  });
  el.appendChild(wrap);
}

function buildChips(){
  chipGroup($("#catOpts"), CATEGORIES.map(function(c){ return { key: c.key, label: c.label }; }), state.cats);
  chipGroup($("#dietOpts"), DIETS.map(function(d){ return { key: d.key, label: d.label }; }), state.diets);
}

function buildFilters(){
  buildChips();

  $("#q").addEventListener("input", function(e){ state.q = e.target.value.trim(); renderMenu(); });

  $("#priceMax").addEventListener("input", function(e){
    state.priceMax = +e.target.value;
    $("#priceLbl").textContent = state.priceMax >= 400 ? "唔限價錢" : money(state.priceMax) + " 或以下";
    renderMenu();
  });

  $("#onlyStar").addEventListener("change", function(e){ state.onlyStar = e.target.checked; renderMenu(); });
  $("#onlyPicked").addEventListener("change", function(e){ state.onlyPicked = e.target.checked; renderMenu(); });

  $("#reset").addEventListener("click", function(){
    state.cats.clear(); state.diets.clear();
    state.q = ""; state.priceMax = 400; state.onlyPicked = false; state.onlyStar = false;
    $("#q").value = ""; $("#priceMax").value = 400; $("#priceLbl").textContent = "唔限價錢";
    $("#onlyPicked").checked = false; $("#onlyStar").checked = false;
    buildChips();
    renderMenu();
  });

  $("#fToggle").addEventListener("click", function(){
    const open = $("#fpanel").classList.toggle("open");
    $("#fToggle").setAttribute("aria-expanded", String(open));
  });

  // 度身定製 / 招牌 WhatsApp
  const custom = "想度身定製一個辦公室到會餐單：\n場合：\n人數：\n日期／時間：\n預算：\n特別要求：";
  $("#customCta").href = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(custom);
  $("#waHead").href = "https://wa.me/" + CONFIG.whatsappNumber;
}

function visibleItems(){
  // 「只睇已揀」唔會被其他篩選遮住
  if(state.onlyPicked){
    return MENU.filter(function(m){ return m.id in state.picked; });
  }
  const rush = isRushDate($("#fDate").value);
  return MENU.filter(function(m){
    if(rush && !m.rush) return false;
    if(state.cats.size && !state.cats.has(m.cat)) return false;
    if(state.onlyStar && !m.signature) return false;
    if(m.price > state.priceMax) return false;
    if(state.q){
      const hay = m.name + (m.portion || "") + CAT[m.cat].label + m.tags.join("");
      if(hay.toLowerCase().indexOf(state.q.toLowerCase()) === -1) return false;
    }
    for(const d of DIETS){
      if(!state.diets.has(d.key)) continue;
      const has = m.tags.indexOf(d.key) !== -1;
      if(d.mode === "include" && !has) return false;
      if(d.mode === "exclude" && has) return false;
    }
    return true;
  });
}

/* ============================================================
   6. 畫餐單
   ============================================================ */
function tagHtml(m){
  const all = (m.signature ? ["皇牌"] : []).concat(m.tags);
  return all.map(function(t){
    const cls = TAG_STYLE[t] || "";
    return '<span class="tag' + (cls ? " " + cls : "") + '">' + esc(t) + "</span>";
  }).join("");
}

function pricePill(m){
  return '<span class="pricepill"><s>' + money(m.list) + "</s>" +
         '<span class="now">' + money(m.price) + '</span><span class="per">/份</span></span>';
}

function renderMenu(){
  const wrap = $("#menu");
  const items = visibleItems();
  wrap.innerHTML = "";

  // 急單提示
  const rush = isRushDate($("#fDate").value);
  const note = $("#rushNote");
  note.hidden = !rush;
  if(rush) note.innerHTML = "你揀咗 <b>" + esc($("#fDate").value) + "</b>，未夠 " + CONFIG.leadWorkingDays +
    " 個工作天。急單只提供部分菜式，下面只顯示急單可做嘅款。";

  if(!items.length){
    wrap.innerHTML = '<div class="empty"><b>冇食物合到呢啲條件</b>試下放寬價錢，或者清除篩選。</div>';
    updateBar();
    return;
  }

  CATEGORIES.forEach(function(cat){
    const inCat = items.filter(function(m){ return m.cat === cat.key; });
    if(!inCat.length) return;

    const sec = document.createElement("section");
    sec.className = "course";
    sec.innerHTML =
      '<div class="course-head"><h2>' + esc(cat.label) + '</h2>' +
      '<span class="note">' + esc(cat.note || "") + '</span>' +
      '<span class="n">' + inCat.length + ' 款</span></div>';

    inCat.forEach(function(m){
      const on = m.id in state.picked;
      const row = document.createElement("article");
      row.className = "dish" + (on ? " on" : "");
      row.id = "dish-" + m.id;
      row.innerHTML =
        '<img src="' + m.img + '" alt="' + esc(m.name) + '" loading="lazy" data-sheet="' + m.id + '">' +
        '<div class="dish-body">' +
          '<div class="dish-line">' +
            '<span class="dish-name"><button type="button" data-sheet="' + m.id + '">' + esc(m.name) + '</button></span>' +
            pricePill(m) +
          '</div>' +
          '<p class="portion">份量 <b>' + esc(m.portion) + '</b></p>' +
          '<div class="meta">' + tagHtml(m) + '</div>' +
        '</div>' +
        '<div class="pick">' +
          '<label class="tick"><input type="checkbox" data-pick="' + m.id + '"' + (on ? " checked" : "") + '>' +
            '<span>' + (on ? "已揀" : "揀呢款") + '</span></label>' +
          '<div class="qty"' + (on ? "" : " hidden") + '>' +
            '<button type="button" data-step="-1" data-id="' + m.id + '" aria-label="減少 ' + esc(m.name) + '">−</button>' +
            '<input type="number" data-qty="' + m.id + '" value="' + (on ? state.picked[m.id] : 1) +
              '" min="1" max="' + CONFIG.maxQty + '" inputmode="numeric" aria-label="' + esc(m.name) + ' 份數">' +
            '<button type="button" data-step="1" data-id="' + m.id + '" aria-label="增加 ' + esc(m.name) + '">+</button>' +
          '</div>' +
          '<span class="line-total"></span>' +
        '</div>' +
        '<div class="dish-err"></div>';
      sec.appendChild(row);
      paintRow(m.id);
    });

    if(cat.foot){
      const f = document.createElement("div");
      f.className = "course-foot";
      f.textContent = cat.foot;
      sec.appendChild(f);
    }
    wrap.appendChild(sec);
  });

  updateBar();
}

/* 只更新一行，唔洗成個餐單重畫（唔會搶走 input 個焦點） */
function paintRow(id){
  const row = document.getElementById("dish-" + id);
  if(!row) return;
  const m = byId(id);
  const on = id in state.picked;
  const qtyBox = row.querySelector(".qty");
  const input = row.querySelector("[data-qty]");
  const minus = row.querySelector('[data-step="-1"]');
  const plus = row.querySelector('[data-step="1"]');
  const lineTotal = row.querySelector(".line-total");
  const label = row.querySelector(".tick span");
  const errBox = row.querySelector(".dish-err");
  const tick = row.querySelector("[data-pick]");

  row.classList.toggle("on", on);
  qtyBox.hidden = !on;
  tick.checked = on;
  label.textContent = on ? "已揀" : "揀呢款";

  if(!on){
    lineTotal.textContent = "";
    errBox.textContent = "";
    row.classList.remove("bad");
    qtyBox.classList.remove("bad");
    return;
  }

  const raw = state.picked[id];
  if(input.value !== String(raw)) input.value = raw;
  const err = qtyError(raw);
  minus.disabled = !(raw > 1);
  plus.disabled = !(raw < CONFIG.maxQty);

  if(err){
    lineTotal.textContent = "";
    errBox.textContent = err;
    row.classList.toggle("bad", state.submitted);
    qtyBox.classList.toggle("bad", state.submitted);
  }else{
    lineTotal.textContent = raw + " 份 × " + money(m.price) + " = " + money(raw * m.price);
    errBox.textContent = "";
    row.classList.remove("bad");
    qtyBox.classList.remove("bad");
  }
}

/* ============================================================
   6b. 菜式詳情 sheet
   ============================================================ */
const SHEET = { id: null };

function openSheet(id){
  const m = byId(id);
  if(!m) return;
  SHEET.id = id;
  $("#shImg").src = m.img;
  $("#shImg").alt = m.name;
  $("#shCat").textContent = CAT[m.cat].label + (CAT[m.cat].note ? "・" + CAT[m.cat].note : "");
  $("#shName").textContent = m.name;
  $("#shPrice").innerHTML = pricePill(m);
  $("#shPortion").textContent = "份量：" + m.portion;
  $("#shTags").innerHTML = tagHtml(m) || '<span class="tag">冇特別標籤</span>';
  const cur = Number(state.picked[id]) || 0;
  $("#shQty").value = cur > 0 ? cur : 1;
  $("#shAdd").textContent = cur > 0 ? "更新數量" : "加入訂單";
  $("#sheet").showModal();
}

function sheetQty(){ return Math.max(0, Math.min(CONFIG.maxQty, Math.floor(Number($("#shQty").value) || 0))); }

$("#shMinus").addEventListener("click", function(){ $("#shQty").value = Math.max(0, sheetQty() - 1); });
$("#shPlus").addEventListener("click", function(){ $("#shQty").value = Math.min(CONFIG.maxQty, sheetQty() + 1); });
$("#shAdd").addEventListener("click", function(){
  const n = sheetQty();
  if(n <= 0) delete state.picked[SHEET.id]; else state.picked[SHEET.id] = n;
  paintRow(SHEET.id);
  updateBar();
  if(state.submitted) validate(false);
});
$("#sheet").addEventListener("click", function(e){
  if(e.target === e.currentTarget) e.currentTarget.close();   // 撳背景關閉
});

/* ============================================================
   7. 數量 / 剔選 事件（用事件委派，行數少啲）
   ============================================================ */
function qtyError(v){
  if(v === "" || v === null || typeof v === "undefined") return "請填份數";
  const n = Number(v);
  if(!Number.isInteger(n)) return "份數要係整數";
  if(n < 1) return "最少 1 份";
  if(n > CONFIG.maxQty) return "單一款最多 " + CONFIG.maxQty + " 份，多過呢個數請 WhatsApp 落單";
  return "";
}

document.addEventListener("change", function(e){
  const pick = e.target.closest ? e.target.closest("[data-pick]") : null;
  if(pick){
    const id = pick.dataset.pick;
    if(pick.checked){
      state.picked[id] = 1;
    }else{
      delete state.picked[id];
    }
    paintRow(id);
    updateBar();
    if(state.submitted) validate(false);
  }
});

document.addEventListener("input", function(e){
  const q = e.target.closest ? e.target.closest("[data-qty]") : null;
  if(q){
    const id = q.dataset.qty;
    if(!(id in state.picked)) return;
    const raw = q.value.trim();
    state.picked[id] = raw === "" ? "" : Number(raw);
    paintRow(id);
    updateBar();
    if(state.submitted) validate(false);
  }
});

document.addEventListener("click", function(e){
  const step = e.target.closest ? e.target.closest("[data-step]") : null;
  if(step){
    const id = step.dataset.id;
    if(!(id in state.picked)) return;
    const cur = Number(state.picked[id]) || 0;
    const next = Math.min(CONFIG.maxQty, Math.max(1, cur + Number(step.dataset.step)));
    state.picked[id] = next;
    paintRow(id);
    updateBar();
    if(state.submitted) validate(false);
    return;
  }
  const sh = e.target.closest ? e.target.closest("[data-sheet]") : null;
  if(sh){ openSheet(sh.dataset.sheet); }
});

/* ============================================================
   8. 埋單計數
      line_total = 9折價 × 份數
      subtotal   = Σ line_total
      運費       = subtotal >= 1500 ? 0 : 標準運費
      送上寫字樓 = +100
   ============================================================ */
function totals(){
  let subtotal = 0, listTotal = 0, count = 0;
  Object.keys(state.picked).forEach(function(id){
    const n = Number(state.picked[id]);
    if(!Number.isInteger(n) || n < 1) return;
    const m = byId(id);
    subtotal += m.price * n;
    listTotal += m.list * n;
    count += n;
  });
  const fee = (subtotal === 0 || subtotal >= CONFIG.freeDeliveryAt) ? 0 : CONFIG.deliveryFee;
  const walkup = (subtotal > 0 && $("#fWalkup").checked) ? CONFIG.walkupSurcharge : 0;
  return { subtotal: subtotal, listTotal: listTotal, saved: listTotal - subtotal,
           fee: fee, walkup: walkup, total: subtotal + fee + walkup,
           count: count, kinds: Object.keys(state.picked).length };
}

function updateBar(){
  const t = totals();
  $("#pickedN").textContent = t.kinds;
  $("#barCnt").textContent = t.kinds === 0 ? "未揀食物" : "已揀 " + t.kinds + " 款 · 共 " + t.count + " 份";
  $("#barAmt").textContent = money(t.total);

  let b = "";
  if(t.subtotal > 0){
    b = "小計 <span>" + money(t.subtotal) + "</span>（9折已慳 <span>" + money(t.saved) + "</span>）";
    if(CONFIG.minOrder > 0 && t.subtotal < CONFIG.minOrder){
      b += "<br>距最低消費仲差 <span>" + money(CONFIG.minOrder - t.subtotal) + "</span>";
    }else if(t.fee > 0){
      b += "<br>運費 <span>" + money(t.fee) + "</span>，再加 <span>" +
           money(CONFIG.freeDeliveryAt - t.subtotal) + "</span> 免運";
    }else{
      b += '<br><span class="free">滿 $1,500 免運費</span>';
    }
    if(t.walkup > 0) b += "，送上寫字樓 <span>+" + money(t.walkup) + "</span>";
  }
  $("#barBreak").innerHTML = b;
}

/* ============================================================
   9. 驗證
   ============================================================ */
function setFieldError(name, msg){
  const f = document.querySelector('.field[data-f="' + name + '"]');
  if(!f) return;
  f.classList.toggle("bad", !!msg);
  f.querySelector(".err").textContent = msg || "";
}

function hkPhoneOk(v){
  const d = v.replace(/[\s-]/g, "");
  return /^[23569]\d{7}$/.test(d);
}

function validate(scroll){
  const problems = []; // {msg, focus}
  const t = totals();
  const date = $("#fDate").value;
  const rush = isRushDate(date);

  // --- 食物 ---
  if(t.kinds === 0){
    problems.push({ msg: "請至少揀一款食物", focus: "#menu" });
  }
  Object.keys(state.picked).forEach(function(id){
    const m = byId(id);
    const err = qtyError(state.picked[id]);
    if(err){
      problems.push({ msg: m.name + "：" + err, focus: "#dish-" + id });
    }else if(rush && !m.rush){
      problems.push({ msg: m.name + "：急單唔做呢款，請改日期或者剔走", focus: "#dish-" + id });
    }
  });
  if(t.kinds > 0 && CONFIG.minOrder > 0 && t.subtotal > 0 && t.subtotal < CONFIG.minOrder){
    problems.push({
      msg: "未夠最低消費 " + money(CONFIG.minOrder) + "，仲差 " + money(CONFIG.minOrder - t.subtotal),
      focus: "#menu"
    });
  }

  // --- 送貨資料 ---
  const name = $("#fName").value.trim();
  if(name.length < 2){
    setFieldError("name", "請填聯絡人姓名");
    problems.push({ msg: "未填聯絡人姓名", focus: "#fName" });
  } else setFieldError("name", "");

  const phone = $("#fPhone").value.trim();
  if(!phone){
    setFieldError("phone", "請填電話");
    problems.push({ msg: "未填電話", focus: "#fPhone" });
  }else if(!hkPhoneOk(phone)){
    setFieldError("phone", "香港電話係 8 位數字，開頭 2/3/5/6/9");
    problems.push({ msg: "電話格式唔啱", focus: "#fPhone" });
  } else setFieldError("phone", "");

  if(!$("#fOccasion").value){
    setFieldError("occasion", "請揀場合");
    problems.push({ msg: "未揀場合", focus: "#fOccasion" });
  } else setFieldError("occasion", "");

  if(!date){
    setFieldError("date", "請揀送貨日期");
    problems.push({ msg: "未揀送貨日期", focus: "#fDate" });
  }else if(date < minDateStr()){
    setFieldError("date", "最少要 " + CONFIG.leadWorkingDays + " 個工作天前落單，最早係 " + leadDateStr());
    problems.push({ msg: "送貨日期太早", focus: "#fDate" });
  }else if(!isWorkingDay(new Date(date + "T00:00:00"))){
    setFieldError("date", "星期六、日及公眾假期唔送貨");
    problems.push({ msg: "送貨日期唔係工作天", focus: "#fDate" });
  } else setFieldError("date", "");

  if(!$("#fTime").value){
    setFieldError("time", "請揀送貨時間");
    problems.push({ msg: "未揀送貨時間", focus: "#fTime" });
  } else setFieldError("time", "");

  if(!$("#fDistrict").value){
    setFieldError("district", "請揀地區");
    problems.push({ msg: "未揀地區", focus: "#fDistrict" });
  } else setFieldError("district", "");

  const addrText = $("#fAddr").value.trim();
  if(ADDR.picked){
    setFieldError("addr", "");
  }else if(!ADDR.available){
    // 搜尋服務用唔到，退回手打
    if(addrText.length < 6){
      setFieldError("addr", "請填大廈同街道");
      problems.push({ msg: "地址未填清楚", focus: "#fAddr" });
    } else setFieldError("addr", "");
  }else if(!addrText){
    setFieldError("addr", "請填送貨地址");
    problems.push({ msg: "未填送貨地址", focus: "#fAddr" });
  }else{
    setFieldError("addr", "請喺下拉清單揀返個地址，咁我哋先確認到位置");
    problems.push({ msg: "地址未經確認", focus: "#fAddr" });
  }

  const unit = $("#fUnit").value.trim();
  if(!unit){
    setFieldError("unit", "請填樓層同單位");
    problems.push({ msg: "未填樓層／單位", focus: "#fUnit" });
  } else setFieldError("unit", "");

  if(!$("#fTerms").checked){
    setFieldError("terms", "請先閱讀並同意落單須知");
    problems.push({ msg: "未同意落單須知", focus: "#fTerms" });
  } else setFieldError("terms", "");

  // --- 顯示 ---
  const box = $("#errBox"), list = $("#errList");
  list.innerHTML = "";
  if(problems.length){
    problems.forEach(function(p){
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p.msg;
      b.addEventListener("click", function(){ jumpTo(p.focus); });
      li.appendChild(b);
      list.appendChild(li);
    });
    box.hidden = false;
    box.querySelector("h3").textContent =
      problems.length === 1 ? "仲有 1 樣要處理" : "仲有 " + problems.length + " 樣要處理";
    if(scroll) jumpTo(problems[0].focus);
  }else{
    box.hidden = true;
  }

  Object.keys(state.picked).forEach(paintRow);
  return problems.length === 0;
}

function jumpTo(sel){
  const el = document.querySelector(sel);
  if(!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if(el.matches("input,select,textarea")) setTimeout(function(){ el.focus({ preventScroll: true }); }, 300);
}

// 一填好就即時清走已經改好嘅錯誤
["#fName","#fPhone","#fOccasion","#fDate","#fTime","#fDistrict","#fAddr","#fUnit","#fTerms"].forEach(function(sel){
  document.querySelector(sel).addEventListener("input", function(){ if(state.submitted) validate(false); });
  document.querySelector(sel).addEventListener("change", function(){ if(state.submitted) validate(false); });
});
// 改日期 → 急單篩選可能改變
$("#fDate").addEventListener("change", renderMenu);
// 送上寫字樓 → 總數即時變
$("#fWalkup").addEventListener("change", function(e){
  $("#walkupNote").classList.toggle("on", e.target.checked);
  updateBar();
});

/* ============================================================
   10. 落單 → 確認頁
   ============================================================ */
function orderNo(){
  const d = new Date();
  const p = function(n){ return String(n).padStart(2, "0"); };
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return "NAN" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + rnd;
}

function orderLines(){
  return Object.keys(state.picked).map(function(id){
    const m = byId(id);
    const n = Number(state.picked[id]);
    // 標籤跟住訂單走：敏感（含堅果）同辣度一定要落到 WhatsApp
    const tags = (m.signature ? ["皇牌"] : []).concat(m.tags);
    return { id: id, name: m.name, cat: CAT[m.cat].label, portion: m.portion, qty: n,
             unit: m.price, amount: m.price * n, tags: tags };
  });
}

function buildMessage(o){
  const L = [];
  L.push("【" + CONFIG.shopName + " " + CONFIG.shopNameEn + " 到會落單】");
  L.push("單號：" + o.no);
  L.push("");
  L.push("── 食物（價錢為每份總價，已計 " + CONFIG.discountLabel + "）──");
  o.lines.forEach(function(l){
    L.push("• " + l.name + "（" + l.cat + "・" + l.portion + "）× " + l.qty + "　" + money(l.amount) +
           (l.tags.length ? "　[" + l.tags.join("・") + "]" : ""));
  });
  L.push("");
  L.push("小計：" + money(o.subtotal));
  L.push("運費：" + (o.fee === 0 ? "免費（滿 $1,500）" : money(o.fee)));
  if(o.walkup > 0) L.push("送上寫字樓：+" + money(o.walkup));
  L.push("總計：" + money(o.total));
  L.push("");
  L.push("── 送貨 ──");
  L.push("聯絡人：" + o.name);
  L.push("電話：" + o.phone);
  if(o.company) L.push("公司：" + o.company);
  L.push("場合：" + o.occasion);
  L.push("日期：" + o.date + " " + o.time + (o.rush ? "（急單）" : ""));
  L.push("地址：" + o.addr);
  L.push("樓層／單位：" + o.unit + (o.walkup > 0 ? "（送上寫字樓）" : "（地面交收）"));
  if(o.mapUrl) L.push("地圖：" + o.mapUrl);
  if(o.remark) L.push("備註：" + o.remark);
  L.push("");
  L.push("已同意：訂單確認後 " + CONFIG.paymentWorkingDays + " 個工作天內付款；確認後不可更改或取消；八號風球／黑雨當日取消可於 2 個月內改期。");
  L.push("請確認訂單同付款方法，唔該。");
  return L.join("\n");
}

let lastMessage = "";

$("#submitBtn").addEventListener("click", function(){
  state.submitted = true;
  if(!validate(true)) return;

  const t = totals();
  const payBy = addWorkingDays(new Date(), CONFIG.paymentWorkingDays);
  const o = {
    no: orderNo(),
    lines: orderLines(),
    subtotal: t.subtotal, saved: t.saved, fee: t.fee, walkup: t.walkup, total: t.total,
    name: $("#fName").value.trim(),
    phone: $("#fPhone").value.trim(),
    company: $("#fCompany").value.trim(),
    occasion: $("#fOccasion").value,
    date: $("#fDate").value,
    time: $("#fTime").value,
    rush: isRushDate($("#fDate").value),
    district: $("#fDistrict").value,
    addr: (ADDR.picked ? ADDR.picked.zh : $("#fAddr").value.trim().replace(/\s+/g, " ")),
    unit: $("#fUnit").value.trim(),
    mapUrl: mapLink(ADDR.picked),
    remark: $("#fRemark").value.trim(),
    payBy: ymd(payBy)
  };

  $("#oNo").textContent = o.no;
  $("#oItems").innerHTML = o.lines.map(function(l){
    return '<div class="srow"><span class="q">' + l.qty + "×</span><span>" + esc(l.name) +
           '</span><span class="l"></span><span class="v">' + money(l.amount) + "</span>" +
           '<span class="sub">' + esc(l.portion) +
           (l.tags.length ? "　" + l.tags.map(function(x){ return "[" + esc(x) + "]"; }).join(" ") : "") +
           "</span></div>";
  }).join("");
  $("#oSub").textContent = money(o.subtotal);
  $("#oFeeLbl").textContent = o.fee === 0 ? "運費（滿 $1,500 已免）" : "運費";
  $("#oFee").textContent = o.fee === 0 ? "$0" : money(o.fee);
  $("#oWalkRow").hidden = o.walkup === 0;
  $("#oWalk").textContent = "+" + money(o.walkup);
  $("#oTotal").textContent = money(o.total);
  $("#oPayBy").textContent = o.payBy;
  $("#oInfo").innerHTML =
    info("聯絡人", esc(o.name) + "　" + esc(o.phone) + (o.company ? "　" + esc(o.company) : "")) +
    info("場合", esc(o.occasion)) +
    info("時間", o.date + "　" + o.time + (o.rush ? "　<b>急單</b>" : "")) +
    info("地址", esc(o.addr) + "　" + esc(o.unit) +
      (o.mapUrl ? ' <a href="' + o.mapUrl + '" target="_blank" rel="noopener">地圖 ↗</a>' : "")) +
    info("交收", o.walkup > 0 ? "送上寫字樓（+" + money(o.walkup) + "）" : "地面交收") +
    (o.remark ? info("備註", esc(o.remark)) : "");

  lastMessage = buildMessage(o);
  $("#waBtn").href = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(lastMessage);

  $("#orderView").hidden = true;
  $("#orderbar").hidden = true;
  $("#doneView").hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
});

function info(k, v){
  return '<div class="info-line"><b>' + k + "</b><span>" + v + "</span></div>";
}

$("#backBtn").addEventListener("click", function(){
  $("#doneView").hidden = true;
  $("#orderView").hidden = false;
  $("#orderbar").hidden = false;
  window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
});

$("#copyBtn").addEventListener("click", function(){
  const btn = $("#copyBtn");
  const done = function(){ btn.textContent = "已複製"; setTimeout(function(){ btn.textContent = "複製訂單內容"; }, 1800); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(lastMessage).then(done).catch(fallback);
  }else{
    fallback();
  }
  function fallback(){
    const ta = document.createElement("textarea");
    ta.value = lastMessage;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); done(); }catch(err){ btn.textContent = "請手動複製"; }
    document.body.removeChild(ta);
  }
});

/* ============================================================
   10b. 地址搜尋 + 地圖
   用政府「地址搜尋服務」(ALS)：免費、免 API key、中英文齊、附座標。
   想轉用 Google Places？淨係要改 lookupAddress() 一個 function。
   ============================================================ */
const ADDR = {
  picked: null,        // {zh, en, lat, lng, region}
  items: [], cursor: -1, timer: null, ctrl: null,
  available: true,     // 搜尋服務通唔通；唔通就自動退回純手打
  map: null, marker: null
};
const REGION_ZH = { HK: "香港島", KLN: "九龍", NT: "新界" };

/* 將 ALS 一筆記錄砌成一行可讀地址 */
function alsFormat(rec){
  const p = rec && rec.Address && rec.Address.PremisesAddress;
  if(!p) return null;
  const c = p.ChiPremisesAddress || {};
  const e = p.EngPremisesAddress || {};
  const g = p.GeospatialInformation || {};

  const zh = [];
  if(c.Region) zh.push(c.Region);
  if(c.ChiDistrict && c.ChiDistrict.DcDistrict) zh.push(c.ChiDistrict.DcDistrict);
  if(c.ChiStreet && c.ChiStreet.StreetName){
    zh.push(c.ChiStreet.StreetName + (c.ChiStreet.BuildingNoFrom ? c.ChiStreet.BuildingNoFrom + "號" : ""));
  }
  if(c.ChiEstate && c.ChiEstate.EstateName) zh.push(c.ChiEstate.EstateName);
  if(c.ChiVillage && c.ChiVillage.VillageName) zh.push(c.ChiVillage.VillageName);
  if(c.BuildingName) zh.push(c.BuildingName);
  if(c.ChiBlock && c.ChiBlock.BlockDescriptor) zh.push(c.ChiBlock.BlockDescriptor);

  const en = [];
  if(e.BuildingName) en.push(e.BuildingName);
  if(e.EngStreet && e.EngStreet.StreetName){
    en.push([e.EngStreet.BuildingNoFrom, e.EngStreet.StreetName].filter(Boolean).join(" "));
  }
  if(e.EngEstate && e.EngEstate.EstateName) en.push(e.EngEstate.EstateName);
  if(e.Region) en.push(e.Region);

  const zhLine = zh.filter(Boolean).join(" ");
  const enLine = en.filter(Boolean).join(", ");
  if(!zhLine && !enLine) return null;

  const lat = g.Latitude !== undefined && g.Latitude !== null && g.Latitude !== "" ? Number(g.Latitude) : null;
  const lng = g.Longitude !== undefined && g.Longitude !== null && g.Longitude !== "" ? Number(g.Longitude) : null;
  return {
    zh: zhLine || enLine,
    en: enLine,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    region: REGION_ZH[e.Region] || c.Region || ""
  };
}

function mapLink(a){
  return (a && a.lat !== null && a.lng !== null)
    ? "https://www.google.com/maps/search/?api=1&query=" + a.lat + "," + a.lng
    : "";
}

/* 換 provider 就改呢度：回傳 [{zh,en,lat,lng,region}] 就得 */
function lookupAddress(q){
  if(ADDR.ctrl) ADDR.ctrl.abort();
  ADDR.ctrl = new AbortController();
  const url = "https://www.als.gov.hk/lookup?q=" + encodeURIComponent(q) + "&n=8";
  return fetch(url, { headers: { Accept: "application/json" }, signal: ADDR.ctrl.signal })
    .then(function(res){
      if(!res.ok) throw new Error("ALS " + res.status);
      return res.json();
    })
    .then(function(data){
      const list = (data && data.SuggestedAddress) || [];
      return list.map(alsFormat).filter(Boolean);
    });
}

function acNote(text){
  const box = $("#acList");
  box.innerHTML = '<div class="ac-note">' + text + "</div>";
  box.hidden = false;
}

function renderAc(list){
  const box = $("#acList");
  ADDR.items = list;
  ADDR.cursor = -1;
  if(!list.length){ acNote("搵唔到呢個地址，試下打大廈或者屋苑全名"); return; }
  box.innerHTML = "";
  list.forEach(function(a, i){
    const d = document.createElement("div");
    d.className = "ac-item";
    d.setAttribute("role", "option");
    d.innerHTML = "<span>" + a.zh + "</span>" + (a.en ? '<span class="en">' + a.en + "</span>" : "");
    d.addEventListener("mousedown", function(ev){ ev.preventDefault(); selectAddr(i); });
    box.appendChild(d);
  });
  box.hidden = false;
}

function moveCursor(step){
  const box = $("#acList");
  if(box.hidden || !ADDR.items.length) return;
  ADDR.cursor = (ADDR.cursor + step + ADDR.items.length) % ADDR.items.length;
  box.querySelectorAll(".ac-item").forEach(function(el, i){
    el.classList.toggle("on", i === ADDR.cursor);
    if(i === ADDR.cursor) el.scrollIntoView({ block: "nearest" });
  });
}

function selectAddr(i){
  const a = ADDR.items[i];
  if(!a) return;
  ADDR.picked = a;
  $("#fAddr").value = a.zh;
  $("#acList").hidden = true;

  const link = mapLink(a);
  $("#pickedAddr").innerHTML =
    "<div>" + a.zh + "</div>" +
    (a.en ? '<div class="en-line">' + a.en + "</div>" : "") +
    (link ? '<a href="' + link + '" target="_blank" rel="noopener">喺 Google 地圖睇 ↗</a>' : "");
  $("#pickedAddr").hidden = false;

  // 自動填地區，但用戶仍然改得
  if(a.region && !$("#fDistrict").value){
    const opt = Array.prototype.find.call($("#fDistrict").options, function(o){ return o.value === a.region; });
    if(opt) $("#fDistrict").value = a.region;
  }
  showMap(a);
  if(state.submitted) validate(false);
}

function clearPicked(){
  ADDR.picked = null;
  $("#pickedAddr").hidden = true;
  $("#map").hidden = true;
}

/* ---------- 地圖（Leaflet + OpenStreetMap，同樣免 key） ---------- */
function ensureLeaflet(){
  if(window.L) return Promise.resolve();
  if(ADDR.leafletPromise) return ADDR.leafletPromise;
  ADDR.leafletPromise = new Promise(function(resolve, reject){
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = resolve;
    js.onerror = function(){ reject(new Error("leaflet")); };
    document.head.appendChild(js);
  });
  return ADDR.leafletPromise;
}

function showMap(a){
  const el = $("#map");
  if(a.lat === null || a.lng === null){ el.hidden = true; return; }
  ensureLeaflet().then(function(){
    el.hidden = false;
    if(!ADDR.map){
      ADDR.map = L.map(el, { scrollWheelZoom: false }).setView([a.lat, a.lng], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap"
      }).addTo(ADDR.map);
      ADDR.marker = L.marker([a.lat, a.lng], { draggable: true }).addTo(ADDR.map);
      ADDR.marker.on("dragend", function(){
        const ll = ADDR.marker.getLatLng();
        if(ADDR.picked){
          ADDR.picked.lat = +ll.lat.toFixed(6);
          ADDR.picked.lng = +ll.lng.toFixed(6);
          const link = mapLink(ADDR.picked);
          const anchor = $("#pickedAddr").querySelector("a");
          if(anchor) anchor.href = link;
        }
      });
    }else{
      ADDR.map.setView([a.lat, a.lng], 17);
      ADDR.marker.setLatLng([a.lat, a.lng]);
    }
    setTimeout(function(){ ADDR.map.invalidateSize(); }, 60);
  }).catch(function(){
    el.hidden = true;   // 載入唔到地圖都唔阻住落單
  });
}

/* ---------- 接駁輸入框 ---------- */
function initAddress(){
  const input = $("#fAddr");
  const box = $("#acList");

  input.addEventListener("input", function(){
    clearPicked();
    const q = input.value.trim();
    clearTimeout(ADDR.timer);
    if(q.length < 2){ box.hidden = true; return; }
    if(!ADDR.available){ box.hidden = true; return; }
    acNote("搵緊…");
    ADDR.timer = setTimeout(function(){
      lookupAddress(q)
        .then(renderAc)
        .catch(function(err){
          if(err && err.name === "AbortError") return;
          ADDR.available = false;   // 一次失敗就轉做手打模式，唔會再煩住用戶
          box.hidden = true;
          setFieldError("addr", "");
          const hint = document.querySelector('.field[data-f="addr"] label .hint');
          if(hint) hint.textContent = "地址搜尋暫時用唔到，請自己打晒大廈同街道";
        });
    }, 280);
  });

  input.addEventListener("keydown", function(e){
    if(box.hidden) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); moveCursor(1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); moveCursor(-1); }
    else if(e.key === "Enter" && ADDR.cursor >= 0){ e.preventDefault(); selectAddr(ADDR.cursor); }
    else if(e.key === "Escape"){ box.hidden = true; }
  });

  input.addEventListener("blur", function(){ setTimeout(function(){ box.hidden = true; }, 120); });
}


/* ============================================================
   11. 開機
   ============================================================ */
(function init(){
  // 送貨時間選項
  const sel = $("#fTime");
  const toMin = function(s){ const a = s.split(":"); return Number(a[0]) * 60 + Number(a[1]); };
  for(let t = toMin(CONFIG.deliveryFrom); t <= toMin(CONFIG.deliveryTo); t += CONFIG.deliveryStepMin){
    const v = String(Math.floor(t / 60)).padStart(2,"0") + ":" + String(t % 60).padStart(2,"0");
    const op = document.createElement("option");
    op.value = v; op.textContent = v;
    sel.appendChild(op);
  }
  // 場合
  const occ = $("#fOccasion");
  OCCASIONS.forEach(function(o){
    const op = document.createElement("option");
    op.value = o; op.textContent = o;
    occ.appendChild(op);
  });
  // 日期下限：3 個工作天後（allowRushOrders 時可以早啲，但只見到急單款）
  const dEl = $("#fDate");
  dEl.min = minDateStr();
  dEl.value = leadDateStr();
  $("#dateHint").textContent = "最少 " + CONFIG.leadWorkingDays + " 個工作天前，星期一至五";

  buildFilters();
  initAddress();
  renderMenu();
})();
