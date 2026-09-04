/* ============================================================
   3. 相片位 — 有真相就用 item.img，冇就畫個碟
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
MENU.forEach(function(m){ if(!m.img) m.img = placeholder(m.hue); });

/* ============================================================
   4. 狀態
   ============================================================ */
const state = {
  picked: {},          // {id: 數量}
  type: "經典到會",    // 到會類型 tab
  heads: new Set(),    // 人數
  occs: new Set(),     // 場景
  cats: new Set(),     // 單點美食分類
  diets: new Set(),    // 飲食需要
  q: "",
  priceMax: 3000,
  onlyPicked: false,
  submitted: false     // 撳過落單之後先即時顯示錯誤
};

const $ = function(s){ return document.querySelector(s); };
const money = function(n){ return "$" + n.toLocaleString("en-US"); };

/* ============================================================
   5. 篩選側欄
   ============================================================ */
function poolForType(){
  return MENU.filter(function(m){ return m.types.indexOf(state.type) !== -1; });
}

/* 一組 chip；多過 6 個就摺埋，用「展示更多」打開 */
function chipGroup(el, values, set){
  el.innerHTML = "";
  el.classList.remove("open");
  if(!values.length){
    el.innerHTML = '<span class="serves">呢個類型暫時冇呢類選項</span>';
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "chips";
  values.forEach(function(v, i){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (i >= 6 ? " extra" : "");
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

  if(values.length > 6){
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more";
    more.setAttribute("aria-expanded", "false");
    more.innerHTML = '<span class="caret">⌄</span> 展示更多';
    more.addEventListener("click", function(){
      const open = el.classList.toggle("open");
      more.setAttribute("aria-expanded", String(open));
      more.innerHTML = '<span class="caret">⌄</span> ' + (open ? "收起" : "展示更多");
    });
    el.appendChild(more);
  }
}

/* chip 選項由「當前類型有嘅食物」推算出嚟，唔會出現揀完零結果嘅死選項 */
function buildChips(){
  const pool = poolForType();

  const heads = HEADCOUNTS
    .filter(function(h){ return pool.some(function(m){ return m.serves >= h.min && m.serves <= h.max; }); })
    .map(function(h){ return { key: h.label, label: h.label }; });

  const occs = OCCASIONS
    .filter(function(o){ return pool.some(function(m){ return m.occ.indexOf(o) !== -1; }); })
    .map(function(o){ return { key: o, label: o }; });

  const cats = CATEGORIES
    .filter(function(c){ return c.indexOf("套餐") === -1 && pool.some(function(m){ return m.cat === c; }); })
    .map(function(c){ return { key: c, label: c }; });

  const diets = DIETS.map(function(d){ return { key: d.key, label: d.label }; });

  chipGroup($("#headOpts"), heads, state.heads);
  chipGroup($("#occOpts"), occs, state.occs);
  chipGroup($("#catOpts"), cats, state.cats);
  chipGroup($("#dietOpts"), diets, state.diets);
}

function buildTabs(){
  const box = $("#typeTabs");
  box.innerHTML = "";
  TYPES.forEach(function(t){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ttab";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(t.key === state.type));
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + t.icon + "</svg><span>" + t.label + "</span>";
    b.addEventListener("click", function(){
      if(state.type === t.key) return;
      state.type = t.key;
      state.heads.clear(); state.occs.clear(); state.cats.clear();
      box.querySelectorAll(".ttab").forEach(function(x, i){
        x.setAttribute("aria-selected", String(TYPES[i].key === state.type));
      });
      buildChips();
      renderMenu();
    });
    box.appendChild(b);
  });
}

function buildFilters(){
  buildTabs();
  buildChips();

  $("#q").addEventListener("input", function(e){ state.q = e.target.value.trim(); renderMenu(); });

  $("#priceMax").addEventListener("input", function(e){
    state.priceMax = +e.target.value;
    $("#priceLbl").textContent = state.priceMax >= 3000 ? "唔限價錢" : money(state.priceMax) + " 或以下";
    renderMenu();
  });

  $("#onlyPicked").addEventListener("change", function(e){ state.onlyPicked = e.target.checked; renderMenu(); });

  $("#reset").addEventListener("click", function(){
    state.cats.clear(); state.diets.clear(); state.heads.clear(); state.occs.clear();
    state.q = ""; state.priceMax = 3000; state.onlyPicked = false;
    $("#q").value = ""; $("#priceMax").value = 3000; $("#priceLbl").textContent = "唔限價錢";
    $("#onlyPicked").checked = false;
    buildChips();
    renderMenu();
  });

  $("#fToggle").addEventListener("click", function(){
    const open = $("#fpanel").classList.toggle("open");
    $("#fToggle").setAttribute("aria-expanded", String(open));
  });

  // 度身定製 → 直接開 WhatsApp
  const custom = "想度身定製一個到會餐單：\n人數：\n日期／時間：\n預算：\n特別要求：";
  $("#customCta").href = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(custom);
}

function visibleItems(){
  // 「只睇已揀」跨類型顯示，唔會被其他篩選遮住
  if(state.onlyPicked){
    return MENU.filter(function(m){ return m.id in state.picked; });
  }
  return MENU.filter(function(m){
    if(m.types.indexOf(state.type) === -1) return false;
    if(state.cats.size && !state.cats.has(m.cat)) return false;
    if(state.occs.size && !m.occ.some(function(o){ return state.occs.has(o); })) return false;
    if(state.heads.size){
      const fits = HEADCOUNTS.some(function(h){
        return state.heads.has(h.label) && m.serves >= h.min && m.serves <= h.max;
      });
      if(!fits) return false;
    }
    if(m.price > state.priceMax) return false;
    if(state.q){
      const hay = m.name + m.desc + m.cat + m.tags.join("") + m.occ.join("");
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
function tagClass(t){
  if(t === "素食") return "tag veg";
  if(t === "辣") return "tag hot";
  if(t === "招牌") return "tag star";
  return "tag";
}

function renderMenu(){
  const wrap = $("#menu");
  const items = visibleItems();
  wrap.innerHTML = "";

  if(!items.length){
    wrap.innerHTML = '<div class="empty"><b>冇食物合到呢啲條件</b>試下放寬價錢，或者清除篩選。</div>';
    updateBar();
    return;
  }

  CATEGORIES.forEach(function(cat){
    const inCat = items.filter(function(m){ return m.cat === cat; });
    if(!inCat.length) return;

    const sec = document.createElement("section");
    sec.className = "course";
    sec.innerHTML =
      '<div class="course-head"><h2>' + cat + '</h2>' +
      '<span class="note">' + inCat.length + ' 款</span></div>';

    inCat.forEach(function(m){
      const on = m.id in state.picked;
      const row = document.createElement("article");
      row.className = "dish" + (on ? " on" : "");
      row.id = "dish-" + m.id;
      row.innerHTML =
        '<img src="' + m.img + '" alt="' + m.name + '" loading="lazy">' +
        '<div class="dish-body">' +
          '<div class="dish-line">' +
            '<span class="dish-name">' + m.name + '</span>' +
            '<span class="leader"></span>' +
            '<span class="price">' + money(m.price) + '</span>' +
          '</div>' +
          '<p class="desc">' + m.desc + '</p>' +
          '<div class="meta">' +
            '<span class="serves">約 ' + m.serves + ' 位</span>' +
            m.tags.map(function(t){ return '<span class="' + tagClass(t) + '">' + t + '</span>'; }).join("") +
          '</div>' +
        '</div>' +
        '<div class="pick">' +
          '<label class="tick"><input type="checkbox" data-pick="' + m.id + '"' + (on ? " checked" : "") + '>' +
            '<span>' + (on ? "已揀" : "揀呢款") + '</span></label>' +
          '<div class="qty"' + (on ? "" : " hidden") + '>' +
            '<button type="button" data-step="-1" data-id="' + m.id + '" aria-label="減少 ' + m.name + '">−</button>' +
            '<input type="number" data-qty="' + m.id + '" value="' + (on ? state.picked[m.id] : 1) +
              '" min="1" max="' + CONFIG.maxQty + '" inputmode="numeric" aria-label="' + m.name + ' 數量">' +
            '<button type="button" data-step="1" data-id="' + m.id + '" aria-label="增加 ' + m.name + '">+</button>' +
          '</div>' +
          '<span class="line-total"></span>' +
        '</div>' +
        '<div class="dish-err"></div>';
      sec.appendChild(row);
      paintRow(m.id);
    });

    wrap.appendChild(sec);
  });

  updateBar();
}

/* 只更新一行，唔洗成個餐單重畫（唔會搶走 input 個焦點） */
function paintRow(id){
  const row = document.getElementById("dish-" + id);
  if(!row) return;
  const m = MENU.find(function(x){ return x.id === id; });
  const on = id in state.picked;
  const qtyBox = row.querySelector(".qty");
  const input = row.querySelector("[data-qty]");
  const minus = row.querySelector('[data-step="-1"]');
  const plus = row.querySelector('[data-step="1"]');
  const lineTotal = row.querySelector(".line-total");
  const label = row.querySelector(".tick span");
  const errBox = row.querySelector(".dish-err");

  row.classList.toggle("on", on);
  qtyBox.hidden = !on;
  label.textContent = on ? "已揀" : "揀呢款";

  if(!on){
    lineTotal.textContent = "";
    errBox.textContent = "";
    row.classList.remove("bad");
    qtyBox.classList.remove("bad");
    return;
  }

  const raw = state.picked[id];
  const err = qtyError(raw);
  minus.disabled = !(raw > 1);
  plus.disabled = !(raw < CONFIG.maxQty);

  if(err){
    lineTotal.textContent = "";
    errBox.textContent = err;
    row.classList.toggle("bad", state.submitted);
    qtyBox.classList.toggle("bad", state.submitted);
  }else{
    lineTotal.textContent = raw + " × " + money(m.price) + " = " + money(raw * m.price);
    errBox.textContent = "";
    row.classList.remove("bad");
    qtyBox.classList.remove("bad");
  }
}

/* ============================================================
   7. 數量 / 剔選 事件（用事件委派，行數少啲）
   ============================================================ */
function qtyError(v){
  if(v === "" || v === null || typeof v === "undefined") return "請填數量";
  const n = Number(v);
  if(!Number.isInteger(n)) return "數量要係整數";
  if(n < 1) return "數量最少 1 份";
  if(n > CONFIG.maxQty) return "單一款最多 " + CONFIG.maxQty + " 份，多過呢個數請致電落單";
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
    const input = document.querySelector('[data-qty="' + id + '"]');
    if(input) input.value = next;
    paintRow(id);
    updateBar();
    if(state.submitted) validate(false);
  }
});

/* ============================================================
   8. 埋單計數
   ============================================================ */
function totals(){
  let subtotal = 0, count = 0, servings = 0;
  Object.keys(state.picked).forEach(function(id){
    const n = Number(state.picked[id]);
    if(!Number.isInteger(n) || n < 1) return;
    const m = MENU.find(function(x){ return x.id === id; });
    subtotal += m.price * n;
    servings += m.serves * n;
    count += n;
  });
  const fee = (subtotal === 0 || subtotal >= CONFIG.freeDeliveryAt) ? 0 : CONFIG.deliveryFee;
  return { subtotal: subtotal, fee: fee, total: subtotal + fee, count: count, servings: servings,
           kinds: Object.keys(state.picked).length };
}

function updateBar(){
  const t = totals();
  $("#pickedN").textContent = t.kinds;
  $("#barCnt").textContent = t.kinds === 0 ? "未揀食物" : "已揀 " + t.kinds + " 款 · 共 " + t.count + " 份";
  $("#barAmt").textContent = money(t.total);

  let b = "";
  if(t.subtotal > 0){
    b = "小計 <span>" + money(t.subtotal) + "</span>";
    if(t.subtotal < CONFIG.minOrder){
      b += "<br>距最低消費仲差 <span>" + money(CONFIG.minOrder - t.subtotal) + "</span>";
    }else if(t.fee > 0){
      b += "<br>運費 <span>" + money(t.fee) + "</span>，再加 <span>" +
           money(CONFIG.freeDeliveryAt - t.subtotal) + "</span> 免運";
    }else{
      b += "<br>免運費";
    }
  }
  $("#barBreak").innerHTML = b;
  checkServes();
}

function checkServes(){
  const t = totals();
  const guests = Number($("#fGuests").value);
  const box = $("#servesWarn");
  if(!guests || t.servings === 0){ box.hidden = true; return; }
  if(t.servings < guests){
    box.hidden = false;
    box.innerHTML = "以 <b>" + guests + " 位</b>計，而家嘅份量大約夠 <b>" + t.servings +
      " 位</b>。落單冇問題，不過建議加多一兩款。";
  }else{
    box.hidden = true;
  }
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

function minDateStr(){
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + CONFIG.leadDays);
  return d.toISOString().slice(0,10);
}

function validate(scroll){
  const problems = []; // {msg, focus}
  const t = totals();

  // --- 食物 ---
  if(t.kinds === 0){
    problems.push({ msg: "請至少揀一款食物", focus: "#menu" });
  }
  Object.keys(state.picked).forEach(function(id){
    const err = qtyError(state.picked[id]);
    if(err){
      const m = MENU.find(function(x){ return x.id === id; });
      problems.push({ msg: m.name + "：" + err, focus: "#dish-" + id });
    }
  });
  if(t.kinds > 0 && t.subtotal > 0 && t.subtotal < CONFIG.minOrder){
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

  const date = $("#fDate").value;
  if(!date){
    setFieldError("date", "請揀送貨日期");
    problems.push({ msg: "未揀送貨日期", focus: "#fDate" });
  }else if(date < minDateStr()){
    setFieldError("date", "最少要 " + CONFIG.leadDays + " 日前落單，最早係 " + minDateStr());
    problems.push({ msg: "送貨日期太早", focus: "#fDate" });
  } else setFieldError("date", "");

  if(!$("#fTime").value){
    setFieldError("time", "請揀送貨時間");
    problems.push({ msg: "未揀送貨時間", focus: "#fTime" });
  } else setFieldError("time", "");

  const guests = $("#fGuests").value.trim();
  const gn = Number(guests);
  if(!guests){
    setFieldError("guests", "請填人數");
    problems.push({ msg: "未填出席人數", focus: "#fGuests" });
  }else if(!Number.isInteger(gn) || gn < 1 || gn > 300){
    setFieldError("guests", "人數要係 1 至 300");
    problems.push({ msg: "人數唔啱", focus: "#fGuests" });
  } else setFieldError("guests", "");

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
["#fName","#fPhone","#fDate","#fTime","#fGuests","#fDistrict","#fAddr","#fUnit"].forEach(function(sel){
  document.querySelector(sel).addEventListener("input", function(){ if(state.submitted) validate(false); });
  document.querySelector(sel).addEventListener("change", function(){ if(state.submitted) validate(false); });
});
$("#fGuests").addEventListener("input", checkServes);

/* ============================================================
   10. 落單 → 確認頁
   ============================================================ */
function orderNo(){
  const d = new Date();
  const p = function(n){ return String(n).padStart(2, "0"); };
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return "WM" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + rnd;
}

function orderLines(){
  return Object.keys(state.picked).map(function(id){
    const m = MENU.find(function(x){ return x.id === id; });
    const n = Number(state.picked[id]);
    return { name: m.name, qty: n, amount: m.price * n };
  });
}

function buildMessage(o){
  const L = [];
  L.push("【" + CONFIG.shopName + " 落單】");
  L.push("單號：" + o.no);
  L.push("");
  L.push("── 食物 ──");
  o.lines.forEach(function(l){ L.push("• " + l.name + " × " + l.qty + "　" + money(l.amount)); });
  L.push("");
  L.push("小計：" + money(o.subtotal));
  L.push("運費：" + (o.fee === 0 ? "免費" : money(o.fee)));
  L.push("總計：" + money(o.total));
  L.push("");
  L.push("── 送貨 ──");
  L.push("姓名：" + o.name);
  L.push("電話：" + o.phone);
  L.push("日期：" + o.date + " " + o.time);
  L.push("人數：" + o.guests + " 位");
  L.push("地址：" + o.addr);
  L.push("樓層／單位：" + o.unit);
  if(o.mapUrl) L.push("地圖：" + o.mapUrl);
  if(o.remark) L.push("備註：" + o.remark);
  L.push("");
  L.push("請確認貨期同付款方法，唔該。");
  return L.join("\n");
}

let lastMessage = "";

$("#submitBtn").addEventListener("click", function(){
  state.submitted = true;
  if(!validate(true)) return;

  const t = totals();
  const o = {
    no: orderNo(),
    lines: orderLines(),
    subtotal: t.subtotal, fee: t.fee, total: t.total,
    name: $("#fName").value.trim(),
    phone: $("#fPhone").value.trim(),
    date: $("#fDate").value,
    time: $("#fTime").value,
    guests: $("#fGuests").value.trim(),
    district: $("#fDistrict").value,
    addr: (ADDR.picked ? ADDR.picked.zh : $("#fAddr").value.trim().replace(/\s+/g, " ")),
    unit: $("#fUnit").value.trim(),
    mapUrl: mapLink(ADDR.picked),
    remark: $("#fRemark").value.trim()
  };

  $("#oNo").textContent = o.no;
  $("#oItems").innerHTML = o.lines.map(function(l){
    return '<div class="srow"><span class="q">' + l.qty + "×</span><span>" + l.name +
           '</span><span class="l"></span><span class="v">' + money(l.amount) + "</span></div>";
  }).join("");
  $("#oSub").textContent = money(o.subtotal);
  $("#oFeeLbl").textContent = o.fee === 0 ? "運費（已免）" : "運費";
  $("#oFee").textContent = o.fee === 0 ? "$0" : money(o.fee);
  $("#oTotal").textContent = money(o.total);
  $("#oInfo").innerHTML =
    info("收件人", o.name + "　" + o.phone) +
    info("時間", o.date + "　" + o.time) +
    info("地址", o.addr + "　" + o.unit +
      (o.mapUrl ? ' <a href="' + o.mapUrl + '" target="_blank" rel="noopener">地圖 ↗</a>' : "")) +
    info("人數", o.guests + " 位") +
    (o.remark ? info("備註", o.remark) : "");

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
  for(let h = 11; h <= 20; h++){
    ["00","30"].forEach(function(mm){
      const v = String(h).padStart(2,"0") + ":" + mm;
      const op = document.createElement("option");
      op.value = v; op.textContent = v;
      sel.appendChild(op);
    });
  }
  // 日期下限
  const dEl = $("#fDate");
  dEl.min = minDateStr();
  dEl.value = minDateStr();

  buildFilters();
  initAddress();
  renderMenu();
})();
