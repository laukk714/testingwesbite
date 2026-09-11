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
  {key:"dessert", label:"糖水", note:"每杯 350ml"},
  {key:"snack",   label:"小食", note:"價錢為每「份」總價・已列明份量", foot:"建議60分鐘內食用"},
  {key:"drink",   label:"飲品", note:"每杯 350ml"}
];

/* 標籤只係資訊，唔影響價錢；會跟住訂單去 WhatsApp */
const TAG_STYLE = {
  "皇牌":"star", "微辣":"hot", "素食/可走葷":"veg", "含堅果":"warn",
  "凍食佳":"", "免餐具":"", "低糖":"", "建議60分鐘內食用":""
};

// 飲食需要篩選：include = 只睇有呢個標籤嘅；exclude = 隱藏有呢個標籤嘅
const DIETS = [
  {key:"素食/可走葷", label:"只睇素食／可走葷", mode:"include"},
  {key:"微辣",        label:"免辣",             mode:"exclude"},
  {key:"含堅果",      label:"免堅果",           mode:"exclude"}
];

/* ============================================================
   3. 餐單資料 — 來源：NAN 辦公室到會MENU $$.xlsx
      list = 原價，price = 9折價（落單用 price）
      加 img 屬性就可以換真相，例：img:"images/yeung-chi.jpg"

      ⚠ 上線前要同廚房確認：
        - 三款 一口／涼拌 嘅價錢，海報同 Excel 唔同（用咗 Excel）
        - 芥末蝦球 海報係皇牌，Excel 唔係（暫時唔係）
        - 微辣／素食／含堅果／凍食佳 標籤只有海報有，下面只填咗由名可以肯定嘅
   ============================================================ */
const MENU = [
  /* ---------- 糖水 · 350ml ---------- */
  {id:"D01", cat:"dessert", name:"楊枝甘露",         list:43, price:38, signature:true,  hue:38,  tags:["凍食佳"], rush:false},
  {id:"D02", cat:"dessert", name:"芒果西米小丸子",   list:38, price:34, signature:false, hue:42,  tags:["凍食佳"], rush:false},
  {id:"D03", cat:"dessert", name:"芒果西米三色芋圓", list:38, price:34, signature:false, hue:44,  tags:["凍食佳"], rush:false},
  {id:"D04", cat:"dessert", name:"椰汁斑斕大滿貫",   list:43, price:38, signature:false, hue:95,  tags:[],         rush:false},
  {id:"D05", cat:"dessert", name:"椰汁桃膠馬蹄爆爆珠", list:38, price:34, signature:false, hue:60, tags:[],        rush:false},
  {id:"D06", cat:"dessert", name:"椰汁桃膠三色芋圓", list:38, price:34, signature:false, hue:300, tags:[],         rush:false},
  {id:"D07", cat:"dessert", name:"真打開心果糊",     list:45, price:40, signature:false, hue:80,  tags:["含堅果"], rush:false},
  {id:"D08", cat:"dessert", name:"真打芝麻糊",       list:33, price:30, signature:false, hue:0,   tags:[],         rush:false},
  {id:"D09", cat:"dessert", name:"冬瓜雪梨海底椰",   list:33, price:30, signature:true,  hue:110, tags:[],         rush:false},

  /* ---------- 小食 · 價錢為每份總價 ---------- */
  {id:"S01", cat:"snack", name:"瑞士雞翼",           portion:"1份（10隻）", list:88,  price:78,  signature:false, hue:20, tags:[], rush:false},
  {id:"S02", cat:"snack", name:"爆蒜雞中翼",         portion:"1份（10隻）", list:98,  price:88,  signature:false, hue:24, tags:[], rush:false},
  {id:"S03", cat:"snack", name:"爆蒜雞翼尖",         portion:"1份（20隻）", list:52,  price:48,  signature:false, hue:26, tags:[], rush:false},
  {id:"S04", cat:"snack", name:"咖哩三重奏",         portion:"1份（麵筋10件 / 魚蛋20粒 / 蘿蔔10件）", list:120, price:108, signature:true, hue:40, tags:["微辣"], rush:false},
  {id:"S05", cat:"snack", name:"麻辣鮮花椒乾撈鮑魚", portion:"1份（10件）", list:360, price:320, signature:false, hue:8,  tags:["微辣"], rush:false},
  {id:"S06", cat:"snack", name:"一口乾坤咕嚕肉",     portion:"1人份（10粒）", list:138, price:120, signature:true, hue:14, tags:[], rush:false},
  {id:"S07", cat:"snack", name:"芥末蝦球配炸饅頭底", portion:"1人份（5件起）", list:158, price:138, signature:false, hue:30, tags:[], rush:false},  // 皇牌？海報有、Excel 冇
  {id:"S08", cat:"snack", name:"懷舊手工百花釀蟹鉗", portion:"1人份（5件起）", list:368, price:328, signature:true, hue:18, tags:[], rush:false},
  {id:"S09", cat:"snack", name:"炸豆卜豬肉丸",       portion:"15粒",          list:88,  price:80,  signature:false, hue:36, tags:[], rush:false},
  {id:"S10", cat:"snack", name:"炸腐皮韭菜餃",       portion:"15粒",          list:98,  price:88,  signature:false, hue:48, tags:[], rush:false},
  {id:"S11", cat:"snack", name:"一口柱侯牛肋條撈陳村粉", portion:"1份（5杯）", list:98, price:88,  signature:true,  hue:16, tags:["免餐具"], rush:false},
  {id:"S12", cat:"snack", name:"一口鹽水鴨胸撈陳村粉",   portion:"1份（5杯）", list:98, price:88,  signature:false, hue:22, tags:["免餐具"], rush:false},
  {id:"S13", cat:"snack", name:"一口麻辣皮蛋花甲米線",   portion:"1份（10杯）", list:248, price:220, signature:false, hue:6, tags:["微辣","免餐具"], rush:false},  // ⚠ 海報 120/108
  {id:"S14", cat:"snack", name:"一口芝士肉醬焗意粉",     portion:"1份（10杯）", list:200, price:180, signature:false, hue:28, tags:["免餐具"], rush:false},       // ⚠ 海報 98/88
  {id:"S15", cat:"snack", name:"涼拌麻醬低溫慢煮雞絲粉皮", portion:"1份（10杯）", list:248, price:220, signature:false, hue:52, tags:["凍食佳","免餐具"], rush:false}, // ⚠ 海報 120/108

  /* ---------- 飲品 · 350ml ---------- */
  {id:"B01", cat:"drink", name:"菊花馬蹄爽",         list:28, price:26, signature:false, hue:50,  tags:["低糖"], rush:false},
  {id:"B02", cat:"drink", name:"竹蔗茅根檸檬水",     list:28, price:26, signature:false, hue:70,  tags:["低糖"], rush:false},
  {id:"B03", cat:"drink", name:"雪梨白涼粉冬瓜茶",   list:32, price:28, signature:true,  hue:100, tags:[],       rush:false},
  {id:"B04", cat:"drink", name:"椰汁西米斑斕凍",     list:34, price:30, signature:false, hue:90,  tags:[],       rush:false},
  {id:"B05", cat:"drink", name:"楊枝甘露",           list:38, price:34, signature:false, hue:38,  tags:[],       rush:false},  // 同糖水版係兩個唔同 SKU
  {id:"B06", cat:"drink", name:"紅豆芋泥椰汁",       list:38, price:34, signature:false, hue:320, tags:[],       rush:false},
  {id:"B07", cat:"drink", name:"桃膠椰汁西米",       list:38, price:34, signature:false, hue:56,  tags:[],       rush:false},
  {id:"B08", cat:"drink", name:"菠蘿脆皮椰汁",       list:38, price:34, signature:false, hue:46,  tags:[],       rush:false}
];

/* 落單時揀嘅場合（唔係篩選） */
const OCCASIONS = ["會議茶點", "午餐到會", "公司活動", "培訓聚會", "其他"];
