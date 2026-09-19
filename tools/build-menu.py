#!/usr/bin/env python3
"""
由《NAN 辦公室到會MENU.xlsx》生成 data/menu.js 入面嘅 MENU_ALL 陣列。

    python3 tools/build-menu.py            # 讀 xlsx，改寫 menu.js 嘅 MENU:BEGIN … MENU:END 之間
    python3 tools/build-menu.py --check    # 淨係列出問題（圖片搵唔到等），唔改檔

只用標準庫（唔使裝 openpyxl）。xlsx 第一張工作表要有呢啲欄（用標題名對，次序唔緊要）：
  項目編號  排序  大類  子分類  名稱  份量  每份數量  單位  起訂份數  原價  會員價
  皇牌推介  上架  凍食佳（唔使加熱）  免餐具（單手食得）  建議60分鐘內食用  含堅果  微辣  素食/可走葷
  產品描述  圖片檔名
可選欄：急單（Y/N）— 冇就全部當 N。
"""
import html, os, re, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "NAN 辦公室到會MENU.xlsx")
MENU_JS = os.path.join(ROOT, "data", "menu.js")
IMG_DIR = os.path.join(ROOT, "images")

CAT_KEY = {"糖水": "dessert", "小食": "snack", "飲品": "drink"}

# 欄名 → 標籤（Y 就加呢個 tag）
TAG_COLS = [
    ("凍食佳", "凍食佳"), ("免餐具", "免餐具"), ("建議60分鐘內食用", "建議60分鐘內食用"),
    ("含堅果", "含堅果"), ("微辣", "微辣"), ("素食/可走葷", "素食/可走葷"),
]


def read_sheet(path):
    """回傳 list of dict（第一行做 key）。"""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        x = z.read("xl/sharedStrings.xml").decode()
        for si in re.findall(r"<si>(.*?)</si>", x, re.S):
            shared.append(html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))))
    x = z.read("xl/worksheets/sheet1.xml").decode()
    rows = []
    for row in re.findall(r"<row[^>]*>(.*?)</row>", x, re.S):
        cells = {}
        for ref, attrs, body in re.findall(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>', row, re.S):
            v = re.search(r"<v>(.*?)</v>", body)
            t = re.search(r"<t[^>]*>(.*?)</t>", body, re.S)
            if v:
                val = v.group(1)
                if 't="s"' in attrs:
                    val = shared[int(val)]
            elif t:
                val = html.unescape(t.group(1))
            else:
                continue
            cells[ref] = str(val).strip()
        if cells:
            rows.append(cells)
    header = rows[0]
    out = []
    for r in rows[1:]:
        d = {}
        for col, name in header.items():
            d[name] = r.get(col, "")
        if d.get("項目編號"):
            out.append(d)
    return out


def col(d, prefix):
    """用標題開頭幾隻字對欄（例如「凍食佳」對「凍食佳（唔使加熱）」）。"""
    for k, v in d.items():
        if k.startswith(prefix):
            return v
    return ""


def yes(v):
    return str(v).strip().upper() in ("Y", "YES", "TRUE", "1", "是")


def num(v):
    v = str(v).strip()
    if v == "":
        return 0
    f = float(v)
    return int(f) if f == int(f) else f


def hue_of(s):
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) % 360
    return h


def js_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def build(rows):
    items, problems = [], []
    seen = set()
    for d in sorted(rows, key=lambda r: num(r.get("排序") or 0)):
        pid = d["項目編號"]
        if pid in seen:
            problems.append(f"{pid}：項目編號重複")
        seen.add(pid)
        cat = CAT_KEY.get(d.get("大類", ""))
        if not cat:
            problems.append(f"{pid} {d.get('名稱')}：大類「{d.get('大類')}」唔識，要係 糖水／小食／飲品")
            continue
        tags = [tag for prefix, tag in TAG_COLS if yes(col(d, prefix))]
        img = d.get("圖片檔名", "").strip()
        img_path = ""
        if img:
            if os.path.exists(os.path.join(IMG_DIR, img)):
                img_path = "images/" + img
            else:
                # 試下去咗 _2 之類後綴嘅版本
                alt = re.sub(r"_\d+(\.\w+)$", r"\1", img)
                if alt != img and os.path.exists(os.path.join(IMG_DIR, alt)):
                    img_path = "images/" + alt
                    problems.append(f"{pid} {d['名稱']}：圖片檔名「{img}」唔存在，改用「{alt}」")
                else:
                    problems.append(f"{pid} {d['名稱']}：圖片檔名「{img}」喺 images/ 搵唔到，會用佔位圖")
        items.append({
            "id": pid,
            "cat": cat,
            "sub": d.get("子分類", ""),
            "name": d.get("名稱", ""),
            "portion": d.get("份量", ""),
            "perQty": num(d.get("每份數量") or 0),      # 一份有幾多（5 件、10 隻、350 ml）
            "unit": d.get("單位", ""),
            "minQty": num(d.get("起訂份數") or 1) or 1,
            "list": num(d.get("原價")),
            "price": num(d.get("會員價")),
            "signature": yes(d.get("皇牌推介")),
            "active": yes(d.get("上架")) if d.get("上架", "") != "" else True,
            "rush": yes(d.get("急單")) if d.get("急單", "") != "" else False,
            "tags": tags,
            "desc": d.get("產品描述", ""),
            "img": img_path,
            "hue": hue_of(pid + d.get("名稱", "")),
        })
    # 冇用到嘅圖片
    used = {os.path.basename(i["img"]) for i in items if i["img"]}
    for f in sorted(os.listdir(IMG_DIR)):
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) and f not in used:
            problems.append(f"images/{f}：冇任何產品用到")
    return items, problems


def render(items):
    lines = []
    cur = None
    label = {v: k for k, v in CAT_KEY.items()}
    for m in items:
        if m["cat"] != cur:
            cur = m["cat"]
            lines.append(f"  /* ---------- {label[cur]} ---------- */")
        parts = [
            f'id:{js_str(m["id"])}',
            f'cat:{js_str(m["cat"])}',
            f'sub:{js_str(m["sub"])}',
            f'name:{js_str(m["name"])}',
            f'portion:{js_str(m["portion"])}',
            f'perQty:{m["perQty"]}',
            f'unit:{js_str(m["unit"])}',
            f'minQty:{m["minQty"]}',
            f'list:{m["list"]}',
            f'price:{m["price"]}',
            f'signature:{"true" if m["signature"] else "false"}',
            f'active:{"true" if m["active"] else "false"}',
            f'rush:{"true" if m["rush"] else "false"}',
            "tags:[" + ",".join(js_str(t) for t in m["tags"]) + "]",
        ]
        if m["desc"]:
            parts.append(f'desc:{js_str(m["desc"])}')
        if m["img"]:
            parts.append(f'img:{js_str(m["img"])}')
        else:
            parts.append(f'hue:{m["hue"]}')
        lines.append("  {" + ", ".join(parts) + "},")
    return "\n".join(lines)


def main():
    check = "--check" in sys.argv
    rows = read_sheet(XLSX)
    items, problems = build(rows)
    for p in problems:
        print("⚠ " + p)
    print(f"{len(items)} 款（上架 {sum(1 for i in items if i['active'])}，有相 {sum(1 for i in items if i['img'])}）")
    if check:
        return
    src = open(MENU_JS, encoding="utf-8").read()
    begin, end = "/* MENU:BEGIN */", "/* MENU:END */"
    a, b = src.index(begin) + len(begin), src.index(end)
    body = "\nconst MENU_ALL = [\n" + render(items) + "\n];\n"
    open(MENU_JS, "w", encoding="utf-8").write(src[:a] + body + src[b:])
    print("已更新 data/menu.js")


if __name__ == "__main__":
    main()
