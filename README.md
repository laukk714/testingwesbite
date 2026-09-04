# 和味到會 · 網上落單 (Wo Mei Catering — online ordering)

A single-page Hong Kong 到會 (party catering) ordering site. Customers browse the
catalogue, tick dishes, set quantities, fill in delivery details, and the order is
handed off to WhatsApp. No build step, no framework, no server required.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `index.html` | Page structure | developer |
| `assets/styles.css` | All styling | developer |
| `assets/app.js` | Filtering, validation, address lookup, order flow | developer |
| `data/menu.js` | **Shop settings + the whole menu** | shop staff |
| `images/` | Dish photos | shop staff |

Everything the shop needs to change day to day lives in `data/menu.js`.

---

## 落單前一定要改 (change these before going live)

Open `data/menu.js`, the `CONFIG` block at the top:

```js
const CONFIG = {
  shopName: "和味到會",
  whatsappNumber: "85223456789",  // ← 換成你嘅號碼，國碼 + 號碼，唔要 + 同空格
  minOrder: 800,                  // 最低消費
  freeDeliveryAt: 1500,           // 幾多錢免運費
  deliveryFee: 80,
  leadDays: 2,                    // 最少幾多日前落單
  maxQty: 99
};
```

---

## 點樣改餐單 (how to update the menu)

Each dish is one entry in the `MENU` array in `data/menu.js`:

```js
{id:"R1", cat:"燒味", name:"蜜汁叉燒", price:188, serves:6, hue:8,
 types:["經典到會"],          // 邊個 tab 見到，可以填多過一個
 occ:["家庭聚會"],            // 場景 chip，要喺 OCCASIONS 入面有
 tags:["招牌","熱食"],
 desc:"半肥瘦梅頭，即叫即斬"}
```

Rules that matter:

- `id` must be unique. Anything is fine — `R1`, `bbq-wings`, `2026-01`.
- `cat` must be one of the values in `CATEGORIES`, or the dish will not appear.
- `types` must match a key in `TYPES` (`經典到會` / `BBQ` / `小朋友生日`).
- `occ` values must exist in `OCCASIONS`.
- `serves` drives the 人數 filter chips **and** the "份量可能唔夠" warning against
  the customer's headcount, so keep it roughly honest.
- Filter chips are generated from whatever the menu actually contains, so adding a
  dish in a new category makes its chip appear automatically. Nothing else to update.

### 加相 (adding photos)

Without an `img` field, the site draws a placeholder plate. To use a real photo,
drop the file in `images/` and add:

```js
{id:"R1", ..., img:"images/char-siu.jpg"}
```

**Resize photos before committing them.** About 800px wide, WebP or JPEG, aim for
100–150 KB each. Straight-off-the-phone photos are 2–4 MB and will make the
catalogue painful on mobile data. Images are lazy-loaded, so only what the customer
scrolls to gets downloaded.

---

## Local preview

No server needed — double-click `index.html`, or:

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
5. Custom domain: Pages project → Custom Domains → add it. Cloudflare creates the
   DNS record itself; you do not hand-write an A record.

Every `git push` to `main` redeploys. Other branches get preview URLs.

---

## Address lookup

The delivery address field autocompletes using the Hong Kong government's
**Address Lookup Service** (`als.gov.hk`) — free, no API key, Chinese and English
addresses, with coordinates. The picked coordinates become a Google Maps link in
the WhatsApp message so the driver can navigate in one tap.

**If it stops returning results on your live domain**, the likely cause is CORS.
The site degrades gracefully on its own — after one failed request it switches to
plain manual address entry and customers can still order. To fix it properly, put a
small proxy in front of it (a Cloudflare Worker forwarding `?q=`) and change the URL
inside `lookupAddress()` in `assets/app.js`.

To swap to Google Places instead, `lookupAddress()` is the only function to rewrite.
It must return `[{zh, en, lat, lng, region}]`. Note that Google requires an API key
and a billing account, and the key must be restricted by HTTP referrer.

The mini-map uses Leaflet + OpenStreetMap, also key-free.

---

## Known limits

- **Nothing is stored.** If the customer never taps send in WhatsApp, you never see
  the order. Adding a Cloudflare Worker + D1 to capture orders server-side is the
  natural next step.
- Prices and totals are calculated in the browser, so treat the WhatsApp message as
  a request, not a confirmed invoice. Confirm before you cook.
