/* ============================================================
   1. 設定 — 落單前改呢度
   ============================================================ */
const CONFIG = {
  shopName: "夜嚐野",
  shopNameEn: "Night After Night",
  whatsappNumber: "85260733422",  // 國碼 + 號碼，唔要 + 同空格
  whatsappDisplay: "6073 3422",

  discountLabel: "全單9折",       // 顯示用；價錢已經喺下面每款寫死
  freeDeliveryAt: 1500,           // 全單滿呢個數免運費
  deliveryFee: 100,               // ⚠ 未定：$1,500 以下嘅標準運費，Menu 冇印，同廚房確認
  walkupSurcharge: 100,           // 地面交收；送上寫字樓 +$100
  minOrder: 0,                    // 最低消費（未定，0 = 冇）

  leadWorkingDays: 3,             // 最少 3 個工作天前落單
  paymentWorkingDays: 2,          // 確認後 2 個工作天內付款
  allowRushOrders: false,         // true = 3 個工作天內都落到單，但只見到 rush:true 嘅款
  holidays: [],                   // 公眾假期 "YYYY-MM-DD"，唔計工作天。例："2026-12-25"

  deliveryFrom: "08:00",          // ⚠ 未定：送貨時段
  deliveryTo: "18:00",
  deliveryStepMin: 30,

  maxQty: 99
};

/* ============================================================
   2. 分類 — 餐單上嘅排列次序
   ============================================================ */
const CATEGORIES = [
  {key:"dessert", label:"糖水", note:"每碗 350ml"},
  {key:"snack",   label:"小食", note:"價錢為每「份」總價・已列明份量"},   // 「建議60分鐘內食用」而家係每款自己嘅標籤
  {key:"drink",   label:"飲品", note:"每杯 350ml"}
];

/* 標籤只係資訊，唔影響價錢；會跟住訂單去 WhatsApp */
const TAG_STYLE = {
  "皇牌":"star", "微辣":"hot", "素食/可走葷":"veg", "含堅果":"warn",
  "凍食佳":"", "免餐具":"", "低糖":"", "建議60分鐘內食用":""
};

// 標籤篩選：include = 只睇有呢個標籤嘅；exclude = 隱藏有呢個標籤嘅
// 飲食需要（xlsx：素食/可走葷・微辣・含堅果 欄）
const DIETS = [
  {key:"素食/可走葷", label:"只睇素食／可走葷", mode:"include"},
  {key:"微辣",        label:"免辣",             mode:"exclude"},
  {key:"含堅果",      label:"免堅果",           mode:"exclude"}
];
// 食用需要（xlsx：凍食佳・免餐具・建議60分鐘內食用 欄）
const SERVING = [
  {key:"凍食佳",           label:"唔使加熱",         mode:"include"},
  {key:"免餐具",           label:"免餐具・單手食得", mode:"include"},
  {key:"建議60分鐘內食用", label:"可以放耐啲",       mode:"exclude"}
];
// 系列（xlsx：子分類 欄）唔使喺度列，由餐單資料自動抽出嚟

/* ============================================================
   3. 餐單資料 — 由《NAN 辦公室到會MENU.xlsx》生成，唔好手改
      改咗 xlsx 之後行：  python3 tools/build-menu.py
      （會改寫下面 MENU:BEGIN … MENU:END 之間，其他部分唔郁）

      每款：id 項目編號 / cat 大類 / sub 子分類 / name / portion 份量
            perQty 每份數量 + unit 單位（1 份 = 5 件；350 ml 就當 1 杯）
            minQty 起訂份數 / list 原價 / price 會員價（落單用）
            signature 皇牌 / active 上架 / rush 急單（xlsx 冇呢欄就 false）
            tags 由 凍食佳・免餐具・建議60分鐘內食用・含堅果・微辣・素食/可走葷 欄嚟
            img 圖片檔名（images/ 入面）；冇相就有 hue 畫佔位圖
   ============================================================ */
/* MENU:BEGIN */
const MENU_ALL = [
  /* ---------- 糖水 ---------- */
  {id:"DS01", cat:"dessert", sub:"芒果系列", name:"楊枝甘露", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:43, price:38, signature:true, active:true, rush:false, tags:["凍食佳"], img:"images/楊枝甘露.JPG"},
  {id:"DS02", cat:"dessert", sub:"芒果系列", name:"芒果西米小丸子", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:["凍食佳"], hue:184},
  {id:"DS03", cat:"dessert", sub:"芒果系列", name:"芒果西米三色芋圓", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:["凍食佳"], hue:89},
  {id:"DS04", cat:"dessert", sub:"椰汁系列", name:"椰汁斑斕大滿貫", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:43, price:38, signature:false, active:true, rush:false, tags:["凍食佳"], hue:227},
  {id:"DS05", cat:"dessert", sub:"椰汁系列", name:"椰汁桃膠馬蹄爆爆珠", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:["凍食佳"], hue:22},
  {id:"DS06", cat:"dessert", sub:"椰汁系列", name:"椰汁桃膠三色芋圓", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:["凍食佳"], hue:260},
  {id:"DS07", cat:"dessert", sub:"真打系列/其他", name:"真打開心果糊", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:45, price:40, signature:false, active:true, rush:false, tags:["凍食佳","含堅果"], hue:8},
  {id:"DS08", cat:"dessert", sub:"真打系列/其他", name:"真打芝麻糊", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:33, price:30, signature:false, active:true, rush:false, tags:["凍食佳"], hue:89},
  {id:"DS09", cat:"dessert", sub:"真打系列/其他", name:"冬瓜雪梨海底椰", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:33, price:30, signature:true, active:true, rush:false, tags:["凍食佳"], hue:340},
  /* ---------- 飲品 ---------- */
  {id:"DR01", cat:"drink", sub:"低糖系列", name:"菊花馬蹄爽(低糖)", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:28, price:26, signature:false, active:true, rush:false, tags:[], img:"images/菊花馬蹄爽.JPG"},
  {id:"DR02", cat:"drink", sub:"低糖系列", name:"竹蔗茅根檸檬水(低糖)", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:28, price:26, signature:false, active:true, rush:false, tags:[], img:"images/竹蔗茅根水.JPG"},
  {id:"DR03", cat:"drink", sub:"涼茶系列", name:"雪梨白涼粉冬瓜茶", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:32, price:28, signature:true, active:true, rush:false, tags:[], img:"images/雪梨白涼粉冬瓜茶.JPG"},
  {id:"DR04", cat:"drink", sub:"椰汁系列", name:"椰汁西米斑斕凍", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:34, price:30, signature:false, active:true, rush:false, tags:[], img:"images/椰汁斑蘭凍.JPG"},
  {id:"DR05", cat:"drink", sub:"芒果系列", name:"楊枝甘露", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:[], img:"images/楊枝甘露.JPG"},
  {id:"DR06", cat:"drink", sub:"椰汁系列", name:"紅豆芋泥椰汁", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:[], img:"images/紅豆芋泥椰汁.JPG"},
  {id:"DR07", cat:"drink", sub:"椰汁系列", name:"桃膠椰汁西米", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:[], img:"images/桃膠椰汁西米.JPG"},
  {id:"DR08", cat:"drink", sub:"椰汁系列", name:"菠蘿脆皮椰汁", portion:"350ml", perQty:350, unit:"ml", minQty:1, list:38, price:34, signature:false, active:true, rush:false, tags:[], hue:14},
  /* ---------- 小食 ---------- */
  {id:"SN01", cat:"snack", sub:"雞翼系列", name:"瑞士雞翼", portion:"1份(10隻)", perQty:10, unit:"隻", minQty:1, list:88, price:78, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], hue:207},
  {id:"SN02", cat:"snack", sub:"雞翼系列", name:"爆蒜雞中翼", portion:"1份(10隻)", perQty:10, unit:"隻", minQty:1, list:98, price:88, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], hue:146},
  {id:"SN03", cat:"snack", sub:"雞翼系列", name:"爆蒜雞翼尖", portion:"1份(20隻)", perQty:20, unit:"隻", minQty:1, list:52, price:48, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], hue:108},
  {id:"SN04", cat:"snack", sub:"咖哩系列", name:"咖哩三重奏", portion:"1份 = 40件（麵筋10・魚蛋20・蘿蔔10）", perQty:40, unit:"件", minQty:1, list:120, price:108, signature:true, active:true, rush:false, tags:["微辣","素食/可走葷"], hue:217},
  {id:"SN05", cat:"snack", sub:"海鮮系列", name:"麻辣鮮花椒乾撈鮑魚", portion:"1份(10隻)", perQty:10, unit:"隻", minQty:1, list:360, price:320, signature:false, active:true, rush:false, tags:["凍食佳","微辣"], img:"images/麻辣鮮花椒乾撈鮑魚.JPG"},
  {id:"SN06", cat:"snack", sub:"炸物系列", name:"一口乾坤咕嚕肉", portion:"1人份(10粒)", perQty:10, unit:"粒", minQty:1, list:138, price:120, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], img:"images/一口乾坤咕嚕肉.JPG"},
  {id:"SN07", cat:"snack", sub:"海鮮系列", name:"芥末蝦球配炸饅頭底", portion:"1人份(5件起)", perQty:5, unit:"件", minQty:1, list:158, price:138, signature:true, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], img:"images/芥末蝦球配炸饅頭底.JPG"},
  {id:"SN08", cat:"snack", sub:"海鮮系列", name:"懷舊手工百花釀蟹鉗", portion:"1人份(5件起)", perQty:5, unit:"件", minQty:1, list:368, price:328, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], img:"images/懷舊手工百花釀蟹鉗.JPG"},
  {id:"SN09", cat:"snack", sub:"炸物系列", name:"炸豆卜豬肉丸", portion:"1份(15粒)", perQty:15, unit:"粒", minQty:1, list:88, price:80, signature:false, active:true, rush:false, tags:["免餐具","建議60分鐘內食用"], hue:289},
  {id:"SN10", cat:"snack", sub:"炸物系列", name:"炸腐皮韭菜餃", portion:"1份(15粒)", perQty:15, unit:"粒", minQty:1, list:98, price:88, signature:false, active:true, rush:false, tags:["免餐具","素食/可走葷"], hue:120},
  {id:"SN11", cat:"snack", sub:"一口杯系列", name:"一口柱侯牛肋條撈陳村粉", portion:"1份(5杯)", perQty:5, unit:"杯", minQty:1, list:98, price:88, signature:true, active:true, rush:false, tags:["凍食佳"], hue:284},
  {id:"SN12", cat:"snack", sub:"一口杯系列", name:"一口鹽水鴨胸撈陳村粉", portion:"1份(5杯)", perQty:5, unit:"杯", minQty:1, list:98, price:88, signature:false, active:true, rush:false, tags:["凍食佳"], hue:225},
  {id:"SN13", cat:"snack", sub:"一口杯系列", name:"一口麻辣皮蛋花甲米線", portion:"1份(10杯)", perQty:10, unit:"杯", minQty:1, list:120, price:108, signature:false, active:true, rush:false, tags:["微辣"], img:"images/一口麻辣皮蛋花甲米線.JPG"},
  {id:"SN14", cat:"snack", sub:"一口杯系列", name:"一口芝士肉醬焗意粉", portion:"1份(10杯)", perQty:10, unit:"杯", minQty:1, list:98, price:88, signature:false, active:true, rush:false, tags:["建議60分鐘內食用"], img:"images/一口芝士肉醬焗意粉.JPG"},
  {id:"SN15", cat:"snack", sub:"一口杯系列", name:"涼拌麻醬低溫慢煮雞絲粉皮", portion:"1份(10杯)", perQty:10, unit:"杯", minQty:1, list:120, price:108, signature:false, active:true, rush:false, tags:["凍食佳"], img:"images/涼拌麻醬低溫慢煮雞絲粉皮.JPG"},
];
/* MENU:END */

