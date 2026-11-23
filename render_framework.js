/* ============================================================
 * 品类趋势框架 · 渲染逻辑
 * 结构：地区 × 品类 × 月度 → 用户总量 / 付费总量
 * 【框架演示】当前数据为示例占位，接入真实数据时替换 FRAMEWORK_DATA
 * 新增：① 各品类按最小二乘线性外推的预测虚线段
 *       ② 各地区各品类代表产品矩阵
 * ============================================================ */
var REGIONS = ['中国大陆','中国港澳台','海外 Tier 1','海外 Tier 2','其他'];
var MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];
var FORECAST_N = 3;                              // 预测未来 3 个月
var MONTHS_EXT = MONTHS.concat(['预测+1','预测+2','预测+3']);

var CATEGORIES = [
  {name:'角色扮演', color:'#ed5c45'},
  {name:'射击',       color:'#a77011'},
  {name:'竞技',       color:'#d6ed45'},
  {name:'策略 SLG',   color:'#48a711'},
  {name:'消除',       color:'#45ed5c'},
  {name:'棋牌·休闲',  color:'#11a770'},
  {name:'塔防',       color:'#45d6ed'},
  {name:'二合',       color:'#1148a7'},
  {name:'三合',       color:'#5c45ed'},
  {name:'模拟经营',   color:'#7011a7'},
  {name:'Roguelike',  color:'#ed45d6'},
  {name:'女性向',     color:'#a71148'}
];

/* ---- 示例数据：每品类给定基准值，按地区系数 + 月度趋势 + 确定性波动生成 ---- */
var CAT_BASE = {
  '角色扮演':[8200, 46], '射击':[9200, 51], '竞技':[11800, 62],
  '策略 SLG':[4100, 55], '消除':[9000, 13], '棋牌·休闲':[7200, 20],
  '塔防':[5100, 8], '二合':[3100, 6], '三合':[2100, 4],
  '模拟经营':[3600, 7], 'Roguelike':[2600, 5], '女性向':[1600, 10]
};
var REGION_FACTOR = { '中国大陆':1.0, '中国港澳台':0.18, '海外 Tier 1':0.65, '海外 Tier 2':0.30, '其他':0.12 };
function detNoise(i, j){ return Math.sin((i+1)*3.7 + (j+1)*1.3)*0.5 + Math.cos((i+1)*1.1)*0.3; }

function buildFrameworkData(){
  var data = {};
  REGIONS.forEach(function(region){
    data[region] = {};
    CATEGORIES.forEach(function(cat){
      var b = CAT_BASE[cat.name], f = REGION_FACTOR[region];
      var users = [], pays = [];
      for(var m=0; m<MONTHS.length; m++){
        var trend = 1 + m*0.008;
        users.push(Math.round(b[0]*f*trend*(1 + detNoise(CATEGORIES.indexOf(cat), m)*0.03)));
        pays.push(Math.round(b[1]*f*trend*(1 + detNoise(CATEGORIES.indexOf(cat)+2, m)*0.05)*10)/10);
      }
      data[region][cat.name] = { users: users, pays: pays };
    });
  });
  return data;
}
var FRAMEWORK_DATA = buildFrameworkData();

/* ---- 最小二乘线性外推（预测段）---- */
function linearForecast(arr, n){
  var len = arr.length, sx=0, sy=0, sxy=0, sxx=0;
  for(var i=0;i<len;i++){ sx+=i; sy+=arr[i]; sxy+=i*arr[i]; sxx+=i*i; }
  var slope = (len*sxy - sx*sy) / (len*sxx - sx*sx);
  var icept = (sy - slope*sx) / len;
  var out = [];
  for(var k=1;k<=n;k++){
    var isInt = Math.abs(arr[0] - Math.round(arr[0])) < 1e-9;
    var v = icept + slope*(len-1+k);
    out.push(isInt ? Math.round(v) : Math.round(v*10)/10);
  }
  return out;
}

/* ---- 代表产品（示例：cn 中文区 / os 海外区，港澳台暂用 cn）---- */
var CAT_PRODUCTS = {
  '角色扮演':  { cn:['原神','崩坏：星穹铁道','梦幻西游'],            os:['Genshin Impact','Honkai: Star Rail','Ni no Kuni'] },
  '射击':      { cn:['和平精英','三角洲行动','穿越火线'],            os:['PUBG Mobile','Call of Duty Mobile','Free Fire'] },
  '竞技':      { cn:['王者荣耀','英雄联盟手游','蛋仔派对'],          os:['Honor of Kings','Wild Rift','Brawl Stars'] },
  '策略 SLG': { cn:['无尽冬日','三国志·战略版','率土之滨'],          os:['Whiteout Survival','Evony','Age of Origins'] },
  '消除':      { cn:['开心消消乐','梦幻家园','开心水族箱'],          os:['Candy Crush Saga','Royal Match','Toon Blast'] },
  '棋牌·休闲':{ cn:['欢乐斗地主','欢乐麻将','德州扑克'],            os:['Solitaire Grand Harvest','Zynga Poker','PokerStars'] },
  '塔防':      { cn:['明日方舟','向僵尸开炮','植物大战僵尸2'],      os:['Arknights','Kingdom Rush','Plants vs Zombies'] },
  '二合':      { cn:['Travel Town','Gossip Harbor','Merge Cooking'],os:['Travel Town','Gossip Harbor','Merge Inn'] },
  '三合':      { cn:['Merge Mansion','EverMerge','Merge Dragons'],  os:['Merge Mansion','EverMerge','Merge Dragons'] },
  '模拟经营':  { cn:['时尚百货城','我的花园世界','疯狂水世界'],     os:['Township','Hay Day','SimCity BuildIt'] },
  'Roguelike': { cn:['向僵尸开炮','元气骑士','死亡细胞'],           os:['Vampire Survivors','Dead Cells','Slay the Spire'] },
  '女性向':    { cn:['光与夜之恋','恋与制作人','未定事件簿'],       os:['Love and Deepspace','Tears of Themis','Mr Love'] }
};
function getProds(region, cat){
  var d = CAT_PRODUCTS[cat] || {cn:[], os:[]};
  var overseas = (region==='海外 Tier 1' || region==='海外 Tier 2' || region==='其他');
  return overseas ? (d.os||[]) : (d.cn||[]);
}

/* ---------------- 全局状态 ---------------- */
var curRegion = 0, detailCat = CATEGORIES[0].name, detailMode = 'users';
var instances = [];
function init(id){ var c=echarts.init(document.getElementById(id)); instances.push(c); return c; }

/* ---------------- 地区 Tab ---------------- */
function renderRegionTabs(){
  var el=document.getElementById('regionTabs'); el.innerHTML='';
  REGIONS.forEach(function(r,i){
    var d=document.createElement('div');
    d.className='tab'+(i===curRegion?' active':'');
    d.textContent=r;
    d.onclick=function(){ curRegion=i; refresh(); };
    el.appendChild(d);
  });
}

/* ---------------- 主趋势图（实线 + 预测虚线）---------------- */
function forecastSeries(metric){
  var region=REGIONS[curRegion];
  var out = [];
  CATEGORIES.forEach(function(cat){
    var real = FRAMEWORK_DATA[region][cat.name][metric];
    var pred = linearForecast(real, FORECAST_N);
    // 实线：真实值 + 预测段占位 null
    var realData = real.concat([null,null,null]);
    // 虚线：真实段 null + 预测值
    var predData = [null,null,null,null,null,null,null,null,null,null,null].concat(pred);
    out.push({ name:cat.name, type:'line', smooth:true, symbolSize:6,
      lineStyle:{width:2.5}, itemStyle:{color:cat.color}, data:realData });
    out.push({ name:cat.name, type:'line', smooth:true, symbol:'emptyCircle', symbolSize:6,
      lineStyle:{width:2.5, type:'dashed'}, itemStyle:{color:cat.color}, data:predData });
  });
  return out;
}
function bigLineChart(id, metric){
  if(document.getElementById(id)._c) document.getElementById(id)._c.dispose();
  var c=init(id);
  var isUser = metric==='users';
  c.setOption({
    color: CATEGORIES.map(function(x){return x.color;}),
    tooltip:{trigger:'axis', valueFormatter:function(v){return isUser? (v+' 万') : (v+' 亿元');}},
    legend:{top:4, type:'scroll', textStyle:{fontSize:11}},
    grid:{left:64, right:24, top:44, bottom:34},
    xAxis:{type:'category', data:MONTHS_EXT, boundaryGap:false},
    yAxis:{type:'value', name: isUser?'万':'亿元'},
    series: forecastSeries(metric)
  });
  document.getElementById(id)._c=c;
}

/* ---------------- 单品类 × 地区对比（含预测）---------------- */
function renderDetailTabs(){
  var el=document.getElementById('detailCatTabs'); el.innerHTML='';
  CATEGORIES.forEach(function(cat){
    var d=document.createElement('span');
    d.className='ctab'+(cat.name===detailCat?' active':'');
    d.textContent=cat.name;
    d.onclick=function(){ detailCat=cat.name; renderDetail(); };
    el.appendChild(d);
  });
}
function renderDetail(){
  ['detailUsers','detailPays'].forEach(function(id){ document.getElementById(id).className=document.getElementById(id).className.replace(' active',''); });
  document.getElementById(detailMode==='users'?'detailUsers':'detailPays').className += ' active';
  if(document.getElementById('chartDetail')._c) document.getElementById('chartDetail')._c.dispose();
  var c=init('chartDetail');
  var isUser = detailMode==='users';
  var pal=['#6f412a','#4d6f2a','#2a6f58','#2a306f','#6f2a63'];
  var series = [];
  REGIONS.forEach(function(r,i){
    var real = FRAMEWORK_DATA[r][detailCat][detailMode];
    var pred = linearForecast(real, FORECAST_N);
    series.push({ name:r, type:'line', smooth:true, symbolSize:6, lineStyle:{width:2.5},
      itemStyle:{color:pal[i]}, data: real.concat([null,null,null]) });
    series.push({ name:r, type:'line', smooth:true, symbol:'emptyCircle', symbolSize:6,
      lineStyle:{width:2.5, type:'dashed'}, itemStyle:{color:pal[i]},
      data:[null,null,null,null,null,null,null,null,null,null,null].concat(pred) });
  });
  c.setOption({
    title:{text: detailCat+' · '+(isUser?'用户总量':'付费总量')+' · 分地区', left:'center', textStyle:{fontSize:14}},
    color:pal,
    tooltip:{trigger:'axis', valueFormatter:function(v){return isUser? (v+' 万'):(v+' 亿元');}},
    legend:{top:30},
    grid:{left:64, right:24, top:70, bottom:34},
    xAxis:{type:'category', data:MONTHS_EXT, boundaryGap:false},
    yAxis:{type:'value', name: isUser?'万':'亿元'},
    series: series
  });
  document.getElementById('chartDetail')._c=c;
}

/* ---------------- 代表产品矩阵 ---------------- */
function renderProducts(){
  var el=document.getElementById('prodTableWrap');
  var html='<table class="prodtable"><thead><tr><th>品类</th>';
  REGIONS.forEach(function(r){ html+='<th>'+r+'</th>'; });
  html+='</tr></thead><tbody>';
  CATEGORIES.forEach(function(cat){
    html+='<tr><td class="catcell" style="color:'+cat.color+';font-weight:700">'+cat.name+'</td>';
    REGIONS.forEach(function(region){
      var prods = getProds(region, cat.name);
      html+='<td>'+prods.map(function(p){return '<span class="prod">'+p+'</span>';}).join('')+'</td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}

/* ---------------- 汇总 ---------------- */
function refresh(){
  renderRegionTabs();
  bigLineChart('chartUsers','users');
  bigLineChart('chartPays','pays');
}
function renderAll(){
  document.getElementById('flag').textContent = '框架演示 · 示例数据（非真实）';
  renderRegionTabs();
  renderDetailTabs();
  refresh();
  renderDetail();
  renderProducts();
}
window.addEventListener('resize',function(){ instances.forEach(function(c){c.resize();}); });
renderAll();
