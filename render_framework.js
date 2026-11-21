/* ============================================================
 * 品类趋势框架 · 渲染逻辑
 * 结构：地区 × 品类 × 月度 → 用户总量 / 付费总量
 * 【框架演示】当前数据为示例占位，接入真实数据时替换
 *    FRAMEWORK_DATA（保持同结构即可）
 * ============================================================ */
var REGIONS = ['中国大陆','中国港澳台','海外 Tier 1','海外 Tier 2','其他'];
var MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];

var CATEGORIES = [
  {name:'角色扮演', color:'#ef4444'},
  {name:'射击',       color:'#10b981'},
  {name:'竞技',       color:'#3b82f6'},
  {name:'策略 SLG',   color:'#8b5cf6'},
  {name:'消除',       color:'#f59e0b'},
  {name:'棋牌·休闲',  color:'#14b8a6'},
  {name:'塔防',       color:'#0ea5e9'},
  {name:'二合',       color:'#ec4899'},
  {name:'三合',       color:'#f97316'},
  {name:'模拟经营',   color:'#6366f1'},
  {name:'Roguelike',  color:'#84cc16'},
  {name:'女性向',     color:'#a855f7'}
];

/* ---- 示例数据：每品类给定基准值，按地区系数 + 月度趋势 + 确定性波动生成 ----
 * 仅用于框架演示，非真实数据。 */
var CAT_BASE = {  // [用户基准(万), 付费基准(亿元)]
  '角色扮演':[8200, 46], '射击':[9200, 51], '竞技':[11800, 62],
  '策略 SLG':[4100, 55], '消除':[9000, 13], '棋牌·休闲':[7200, 20],
  '塔防':[5100, 8], '二合':[3100, 6], '三合':[2100, 4],
  '模拟经营':[3600, 7], 'Roguelike':[2600, 5], '女性向':[1600, 10]
};
var REGION_FACTOR = {  // 各地区体量系数（示例）
  '中国大陆':1.0, '中国港澳台':0.18, '海外 Tier 1':0.65, '海外 Tier 2':0.30, '其他':0.12
};
function detNoise(i, j){ return Math.sin((i+1)*3.7 + (j+1)*1.3)*0.5 + Math.cos((i+1)*1.1)*0.3; }

function buildFrameworkData(){
  var data = {};
  REGIONS.forEach(function(region){
    data[region] = {};
    CATEGORIES.forEach(function(cat){
      var b = CAT_BASE[cat.name];
      var f = REGION_FACTOR[region];
      var users = [], pays = [];
      for(var m=0; m<MONTHS.length; m++){
        var trend = 1 + m*0.008;             // 缓慢增长趋势
        var u = b[0] * f * trend * (1 + detNoise(CATEGORIES.indexOf(cat), m)*0.03);
        var p = b[1] * f * trend * (1 + detNoise(CATEGORIES.indexOf(cat)+2, m)*0.05);
        users.push(Math.round(u));
        pays.push(Math.round(p*10)/10);
      }
      data[region][cat.name] = { users: users, pays: pays };
    });
  });
  return data;
}
var FRAMEWORK_DATA = buildFrameworkData();

/* ---------------- 全局状态 ---------------- */
var curRegion = 0;
var detailCat = CATEGORIES[0].name;
var detailMode = 'users';
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

/* ---------------- 主趋势图 ---------------- */
function lineData(metric){
  var region=REGIONS[curRegion];
  return CATEGORIES.map(function(cat){
    return { name:cat.name, type:'line', smooth:true, symbolSize:6,
      lineStyle:{width:2.5}, itemStyle:{color:cat.color},
      data: FRAMEWORK_DATA[region][cat.name][metric] };
  });
}
function bigLineChart(id, metric){
  if(document.getElementById(id)._c) document.getElementById(id)._c.dispose();
  var c=init(id);
  var region=REGIONS[curRegion];
  var isUser = metric==='users';
  c.setOption({
    color: CATEGORIES.map(function(x){return x.color;}),
    tooltip:{trigger:'axis', valueFormatter:function(v){return isUser? (v+' 万') : (v+' 亿元');}},
    legend:{top:4, type:'scroll', textStyle:{fontSize:11}},
    grid:{left:64, right:24, top:44, bottom:34},
    xAxis:{type:'category', data:MONTHS, boundaryGap:false},
    yAxis:{type:'value', name: isUser?'万':'亿元', axisLabel:{formatter:function(v){return v;}}},
    series: lineData(metric)
  });
  document.getElementById(id)._c=c;
}

/* ---------------- 单品类 × 地区对比 ---------------- */
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
  var mode=document.getElementById('detailMode');
  ['detailUsers','detailPays'].forEach(function(id){ document.getElementById(id).className=document.getElementById(id).className.replace(' active',''); });
  var active = detailMode==='users' ? 'detailUsers' : 'detailPays';
  document.getElementById(active).className += ' active';
  if(document.getElementById('chartDetail')._c) document.getElementById('chartDetail')._c.dispose();
  var c=init('chartDetail');
  var isUser = detailMode==='users';
  var series = REGIONS.map(function(r,i){
    var pal=['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6'];
    return { name:r, type:'line', smooth:true, symbolSize:6, lineStyle:{width:2.5},
      itemStyle:{color:pal[i]}, data: FRAMEWORK_DATA[r][detailCat][detailMode] };
  });
  c.setOption({
    title:{text: detailCat+' · '+(isUser?'用户总量':'付费总量')+' · 分地区', left:'center', textStyle:{fontSize:14}},
    color:['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6'],
    tooltip:{trigger:'axis', valueFormatter:function(v){return isUser? (v+' 万'):(v+' 亿元');}},
    legend:{top:30},
    grid:{left:64, right:24, top:70, bottom:34},
    xAxis:{type:'category', data:MONTHS, boundaryGap:false},
    yAxis:{type:'value', name: isUser?'万':'亿元'},
    series: series
  });
  document.getElementById('chartDetail')._c=c;
}

/* ---------------- 汇总 ---------------- */
function refresh(){
  renderRegionTabs();
  bigLineChart('chartUsers','users');
  bigLineChart('chartPays','pays');
}
function renderAll(){
  // 数据说明徽标
  document.getElementById('flag').textContent = '框架演示 · 示例数据（非真实）';
  renderRegionTabs();
  renderDetailTabs();
  refresh();
  renderDetail();
}
window.addEventListener('resize',function(){ instances.forEach(function(c){c.resize();}); });
renderAll();
