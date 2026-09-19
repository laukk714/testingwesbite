# 夜嚐野 Night After Night · 辦公室到會網上落單

A single-page Hong Kong office-catering (到會) ordering site. Customers browse the
糖水 / 小食 / 飲品 catalogue, tick dishes, set portions, fill in delivery details,
accept the terms, and the order is handed off to WhatsApp. No build step, no
framework, no server required.

Brand and business rules follow the printed menu; **the catalogue comes from
`NAN 辦公室到會MENU.xlsx`** in the repo root (see the spec: *Night After Night — 到會
Ordering System Spec*).

## Files

| File | What it is | Who edits it |
|---|---|---|
| `index.html` | Page structure, copy, 落單須知 | developer |
| `assets/styles.css` | All styling — design tokens at the top | developer |
| `assets/app.js` | Filtering, working-day maths, validation, address lookup, order flow | developer |
| `NAN 辦公室到會MENU.xlsx` | **The product list** — one row per SKU | shop staff |
| `data/menu.js` | Shop settings (`CONFIG`) + the menu array *generated from the xlsx* | staff edit `CONFIG`; menu block is generated |
| `tools/build-menu.py` | Reads the xlsx and rewrites the menu block in `data/menu.js` | developer |
| `images/` | Web-sized dish photos (≤1000px, ~50–100 KB) | shop staff |
| `raw/photos/` | Camera originals, git-ignored | shop staff |

Day to day: edit the spreadsheet, drop photos in `raw/photos/`, run the two
commands under *點樣改餐單*.

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

The menu is **not** edited by hand. Edit `NAN 辦公室到會MENU.xlsx` (first sheet),
then regenerate:

```bash
python3 tools/build-menu.py
```

It rewrites only the block between `/* MENU:BEGIN */` and `/* MENU:END */` in
`data/menu.js`, prints any problems, and leaves `CONFIG`, categories and tags
alone. `--check` prints the problems without writing. No extra packages needed.

Spreadsheet columns the site uses (matched by header text, order doesn't matter):

| Column | Becomes | Notes |
|---|---|---|
| 項目編號 | `id` | must be unique. 楊枝甘露 is `DS01` (糖水) and `DR05` (飲品) — two SKUs |
| 排序 | row order | numeric |
| 大類 | `cat` | 糖水 / 小食 / 飲品 only |
| 子分類 | `sub` | shown nowhere yet, kept for grouping later |
| 名稱, 份量 | `name`, `portion` | printed verbatim |
| 起訂份數 | `minQty` | stored; the site currently enforces min 1 |
| 原價, 會員價 | `list`, `price` | whole numbers; `price` is what is charged |
| 皇牌推介 | `signature` | Y/N |
| 上架 | `active` | N hides the dish from the site (row stays in the data) |
| 凍食佳 / 免餐具 / 建議60分鐘內食用 / 含堅果 / 微辣 / 素食/可走葷 | `tags` | Y adds the tag; informational only, travels with the order |
| 產品描述 | `desc` | optional |
| 圖片檔名 | `img` | file name inside `images/`; blank = placeholder drawing |
| 急單 (optional) | `rush` | Y = can be made inside the lead time; absent = N |

Filter groups and where they come from:

| Filter group | Source |
|---|---|
| 分類 | `CATEGORIES` in `data/menu.js` (大類) |
| 系列 | 子分類 column — chips are built from the data, and narrow to the chosen 分類 |
| 只睇皇牌 | 皇牌推介 |
| 飲食需要 | `DIETS` in `data/menu.js` ↔ 素食/可走葷 · 微辣 · 含堅果 columns |
| 食用需要 | `SERVING` in `data/menu.js` ↔ 凍食佳 · 免餐具 · 建議60分鐘內食用 columns (可以放耐啲 = hide the 60-minute items) |
| 每份價錢上限 | 會員價 |

To add a new Y/N column as a filter: add the tag mapping in `tools/build-menu.py`
(`TAG_COLS`) and a row in `DIETS` or `SERVING`.

### 加相 (adding photos)

1. Put the camera original in `raw/photos/` (git-ignored, any size).
2. Make the web copy — max 1000px, JPEG ~80%:
   ```bash
   sips -Z 1000 -s format jpeg -s formatOptions 80 "raw/photos/楊枝甘露.JPG" --out "images/楊枝甘露.JPG"
   ```
3. Put the file name in the 圖片檔名 column and run `tools/build-menu.py`.

Keep `images/` to files the spreadsheet references; the build script warns
about any photo nothing uses, and about names in the sheet it can't find.

---

## Header & announcement banner

The sticky header holds the **logo placeholder** (`.logo` in `index.html` — drop
`<img src="images/logo.png" alt="">` inside it and the dashed box disappears),
the **shop name**, and round icons on the right:

- **Search / filter (funnel)** — phones only (≤880px), step 1 only. Opens the
  搵食物／篩選 popup. There is only one set of controls (`#fpanel`: search box,
  分類 / 系列 / 皇牌 / 飲食需要 / 食用需要 chips, price slider, 只睇已揀, 清除篩選): on wide screens it
  lives in the left sidebar and the funnel is hidden; on phones the sidebar is
  hidden and the funnel moves the panel into the dialog while open. Badge =
  number of active filters (search counts as one); the button at the bottom
  shows how many dishes match. While any filter is active an orange
  **clear-filters** icon appears to the left of the funnel — one tap resets
  everything (same as 清除篩選 in the panel).
- **Cart** — every layout, every step. Badge = number of dishes picked; opens
  the 已揀食物 dialog.

(`body[data-view]` is set by `showStep()` and drives the per-step visibility.)

Under it is `#banner`, currently a **placeholder announcement bar** showing the
four standing terms (全單9折 / 滿 $1,500 免運 / 3 個工作天前落單 / 送上寫字樓 +$100).

Current behaviour — deliberately simple until the Shopify question is settled:

| | Now |
|---|---|
| Show | always, every page load (hard-coded in `index.html`) |
| Collapse | arrow → the whole bar folds away; only a small ▾ tab stays hanging under the header to re-expand it. Remembered for the browser session (`sessionStorage.bannerCollapsed`) |
| Reappear | expanded again on next visit / new tab |
| Schedule | none |

**To do once the Shopify direction is decided** (mirror whatever the Shopify
announcement bar will do, so both channels behave the same):

- Move the text into `CONFIG` (`bannerText`, `bannerFrom`, `bannerTo`) so staff
  edit it in `data/menu.js`, and hide the bar when the text is empty or outside
  the date window.
- Decide collapse memory: session (now), per device (`localStorage`), or re-show
  after N days.
- Decide position: Shopify's native announcement bar sits *above* the header and
  is not dismissible or schedulable out of the box (needs a snippet or an app
  such as Hextom Quick Announcement Bar for × / date range / "hide for N days").
- The four standing terms are also in 落單須知 and the order bar, so the banner
  can become a real promo slot without losing them.

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

(Claude Code's browser pane uses the `static` config in `.claude/launch.json`,
same server on port 8765.)

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
- Announcement banner rules — see *Header & announcement banner*; depends on
  whether the site migrates to Shopify or runs alongside it
- 一口麻辣皮蛋花甲米線 — sheet names the photo `…_2.JPG`, folder has `….JPG`;
  the build uses the latter (fix the sheet or rename the file)
- 清補涼 / 紅豆冰 / 菠蘿冰 — photos supplied but no row in the sheet; kept in
  `raw/photos/` only
- 17 SKUs still have no photo (placeholder drawing shown)
- 咖哩三重奏 — fixed components or customer-selectable (currently fixed)

## Known limits

- **Nothing is stored.** If the customer never taps send in WhatsApp, you never
  see the order. The admin views in the spec (production sheet, delivery
  manifest, payment chasing, weather-cancellation bulk action) and the
  `reschedule` action need a backend — a Cloudflare Worker + D1 is the natural
  next step.
- Prices and totals are calculated in the browser, so treat the WhatsApp message
  as a request, not a confirmed invoice. Confirm before you cook.
