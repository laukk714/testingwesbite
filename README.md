# 夜嚐野 Night After Night · 辦公室到會網上落單

A single-page Hong Kong office-catering (到會) ordering site. Customers browse the
糖水 / 小食 / 飲品 catalogue, tick dishes, set portions, fill in delivery details,
accept the terms, and the order is handed off to WhatsApp. No build step, no
framework, no server required.

Brand, catalogue and business rules follow the printed menu and
`NAN 辦公室到會MENU $$.xlsx` (see the spec: *Night After Night — 到會 Ordering System Spec*).

## Files

| File | What it is | Who edits it |
|---|---|---|
| `index.html` | Page structure, copy, 落單須知 | developer |
| `assets/styles.css` | All styling — design tokens at the top | developer |
| `assets/app.js` | Filtering, working-day maths, validation, address lookup, order flow | developer |
| `data/menu.js` | **Shop settings + the whole menu** | shop staff |
| `images/` | Dish photos | shop staff |

Everything the shop needs to change day to day lives in `data/menu.js`.

---

## 落單前一定要改 (change these before going live)

Open `data/menu.js`, the `CONFIG` block at the top:

```js
const CONFIG = {
  whatsappNumber: "85260733422",  // 國碼 + 號碼，唔要 + 同空格
  freeDeliveryAt: 1500,           // 全單滿呢個數免運費
  deliveryFee: 100,               // ⚠ 未定 — $1,500 以下嘅標準運費
  walkupSurcharge: 100,           // 地面交收；送上寫字樓 +$100
  minOrder: 0,                    // 最低消費，0 = 冇
  leadWorkingDays: 3,             // 最少 3 個工作天前落單
  paymentWorkingDays: 2,          // 確認後 2 個工作天內付款
  allowRushOrders: false,         // true = 容許急單，但只顯示 rush:true 嘅款
  holidays: [],                   // 公眾假期 "YYYY-MM-DD"，唔計工作天
  deliveryFrom: "08:00",          // ⚠ 未定 — 送貨時段
  deliveryTo: "18:00",
  ...
};
```

**Working day** = Monday–Friday, minus anything listed in `holidays`. Add the
public holidays for the coming year there, or the lead-time and payment-deadline
maths will count them as working days.

---

## 點樣改餐單 (how to update the menu)

Each dish is one entry in the `MENU` array in `data/menu.js`:

```js
{id:"S01", cat:"snack", name:"瑞士雞翼", portion:"1份（10隻）",
 list:88, price:78,           // 原價 / 9折價 — 落單用 price
 signature:false,             // 皇牌
 tags:[],                     // 微辣 / 素食/可走葷 / 含堅果 / 凍食佳 / 免餐具 / 低糖
 rush:false,                  // 急單做唔做
 hue:20}                      // 冇相時嘅佔位顏色
```

Rules that matter:

- `id` must be unique. 楊枝甘露 exists in both 糖水 (`D01`) and 飲品 (`B05`) at
  different prices — they are two SKUs, keep them separate.
- `cat` must be `dessert`, `snack` or `drink` (the keys in `CATEGORIES`).
- Prices are **per 份, whole numbers**. Store both `list` and `price`; the site
  shows the list price struck through and charges `price`.
- `portion` is required for snacks. Desserts and drinks default to `1杯（350ml）`.
- `tags` are informational only — they never change the price, but they are
  printed on the card, the confirmation slip and the WhatsApp message, so
  allergen (含堅果) and spice (微辣) info travels with the order.
- Filter chips come from `CATEGORIES` and `DIETS`; nothing else to update.

### 加相 (adding photos)

Without an `img` field, the site draws a placeholder. To use a real photo, drop
the file in `images/` and add:

```js
{id:"S01", ..., img:"images/swiss-wings.jpg"}
```

**Resize photos before committing them.** About 800px wide, WebP or JPEG, aim for
100–150 KB each. Images are lazy-loaded.

---

## Business rules implemented

- `line_total = 9折價 × 份數`, `subtotal = Σ line_total`
- Delivery: `subtotal ≥ $1,500 → $0`, otherwise `CONFIG.deliveryFee`
- Ground-floor handover by default; the "送上寫字樓" toggle adds `+$100`
- Delivery date must be ≥ `leadWorkingDays` working days out and itself a working day
- If `allowRushOrders` is on, earlier dates are allowed but only `rush:true`
  items are shown, and non-rush items already in the basket block submission
- Payment deadline (order date + 2 working days) is shown on the confirmation
- A terms checkbox (no amendment/cancellation, non-refundable, T8/black-rain
  reschedule within 2 months) is required before 落單

---

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

The address autocomplete needs a real domain to work properly (see below), but
everything else works offline.

---

## Deploying (Cloudflare Pages)

1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pick this repo. **Framework preset: None. Build command: blank. Output
   directory: `/`** — there is no build step.
4. Deploy. You get `your-project.pages.dev` with HTTPS.
5. Custom domain: Pages project → Custom Domains → add it.

Every `git push` to `main` redeploys. Other branches get preview URLs.

---

## Address lookup

The delivery address field autocompletes using the Hong Kong government's
**Address Lookup Service** (`als.gov.hk`) — free, no API key, Chinese and English
addresses, with coordinates. The picked coordinates become a Google Maps link in
the WhatsApp message so the driver can navigate in one tap.

**If it stops returning results on your live domain**, the likely cause is CORS.
The site degrades gracefully — after one failed request it switches to plain
manual address entry and customers can still order. To fix it properly, put a
small proxy in front of it (a Cloudflare Worker forwarding `?q=`) and change the
URL inside `lookupAddress()` in `assets/app.js`.

The mini-map uses Leaflet + OpenStreetMap, also key-free.

---

## Still to confirm with the kitchen

- Standard delivery fee under $1,500 (`CONFIG.deliveryFee`, placeholder `100`)
- Remote-district surcharge — not implemented; quote manually over WhatsApp
- Delivery time window (`deliveryFrom` / `deliveryTo`, placeholder 08:00–18:00)
- Public holiday list (`CONFIG.holidays`)
- Which items are `rush: true`, and whether to switch `allowRushOrders` on
- Minimum order value, if any
- **Prices on 一口麻辣皮蛋花甲米線 / 一口芝士肉醬焗意粉 / 涼拌麻醬低溫慢煮雞絲粉皮** —
  poster and spreadsheet disagree; spreadsheet values are loaded
- 芥末蝦球配炸饅頭底 — 皇牌 on the poster, not in the spreadsheet (currently not)
- Dietary tags per SKU — only the ones obvious from the name are filled in
- 咖哩三重奏 — fixed components or customer-selectable (currently fixed)

## Known limits

- **Nothing is stored.** If the customer never taps send in WhatsApp, you never
  see the order. The admin views in the spec (production sheet, delivery
  manifest, payment chasing, weather-cancellation bulk action) and the
  `reschedule` action need a backend — a Cloudflare Worker + D1 is the natural
  next step.
- Prices and totals are calculated in the browser, so treat the WhatsApp message
  as a request, not a confirmed invoice. Confirm before you cook.
