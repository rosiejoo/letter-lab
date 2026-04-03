/* IGAWorks Newsletter Editor v220 — 순살 스타일 */
(function(){
"use strict";

function qs(s){return document.querySelector(s);}
function qsa(s){return document.querySelectorAll(s);}
/* null-safe 이벤트 리스너 — 요소 없어도 크래시 안 남 */
function on(sel,evt,fn){var el=(typeof sel==='string')?qs(sel):sel;if(el)el.addEventListener(evt,fn);}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function today(){var d=new Date();return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');}
function selectedDate(){var el=qs('#nl-date');if(el&&el.value){var p=el.value.split('-');return p[0]+'.'+p[1]+'.'+p[2];}return today();}
/* 날짜 입력 기본값 설정 */
(function(){var d=new Date();var el=document.getElementById('nl-date');if(el)el.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
function getKey(){var el=qs('#api-key-input');var v=(el&&el.value)?el.value.trim():'';return v||localStorage.getItem('gemini-api-key')||'';}
function toast(m){var t=qs('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(function(){t.classList.add('hidden');},2500);}
function showErr(m){var e=qs('#error-msg');e.textContent=m;e.classList.remove('hidden');}
function hideErr(){qs('#error-msg').classList.add('hidden');}
function rgbToHex(rgb){if(!rgb)return'';if(rgb.charAt(0)==='#')return rgb;var m=rgb.match(/(\d+)/g);if(!m||m.length<3)return'';return'#'+((1<<24)+(+m[0]<<16)+(+m[1]<<8)+(+m[2])).toString(16).slice(1);}
function stripMd(s){return s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
function cleanBr(s){return(s||'').replace(/<br\s*\/?>/gi,'').trim();}
/* 라벨 이모지 + 테두리 색상 매핑 */
var labelStyleMap={
  '수치':  {emoji:'📊',border:'#3B82F6'},
  '데이터':{emoji:'📊',border:'#3B82F6'},
  '스토리':{emoji:'📖',border:'#F59E0B'},
  '질문':  {emoji:'❓',border:'#8B5CF6'},
  '문제':  {emoji:'⚡',border:'#EF4444'},
  '반전':  {emoji:'🔄',border:'#10B981'},
  '실용':  {emoji:'🛠',border:'#6366F1'},
  '감성':  {emoji:'💛',border:'#F59E0B'},
  '후킹':  {emoji:'🎯',border:'#EF4444'},
  '전략':  {emoji:'🧭',border:'#0EA5E9'},
  '트렌드':{emoji:'📈',border:'#10B981'},
  '비교':  {emoji:'⚖️',border:'#8B5CF6'},
  '핵심':  {emoji:'💡',border:'#F59E0B'},
  '요약':  {emoji:'📋',border:'#64748B'}
};
function getLabelStyle(label){
  var keys=Object.keys(labelStyleMap);
  for(var i=0;i<keys.length;i++){if(label.indexOf(keys[i])!==-1)return labelStyleMap[keys[i]];}
  return{emoji:'✏️',border:'#94A3B8'};
}
function classify(t){
  var l=t.toLowerCase();
  if(l.indexOf('디파이너리')!==-1||l.indexOf('definery')!==-1||l.indexOf('crm')!==-1)return'디파이너리';
  if(l.indexOf('트레이딩웍스')!==-1||l.indexOf('tradingworks')!==-1)return'트레이딩웍스360';
  if(l.indexOf('모바일인덱스')!==-1||l.indexOf('mobileindex')!==-1||l.indexOf('앱 순위')!==-1)return'모바일인덱스INSIGHT';
  if(l.indexOf('tvindex')!==-1||l.indexOf('시청률')!==-1)return'TVIndex';
  if(l.indexOf('fixfolio')!==-1||l.indexOf('픽스폴리오')!==-1)return'Fixfolio';
  if(l.indexOf('아이지에이웍스')!==-1||l.indexOf('igaworks')!==-1||l.indexOf('igaworksblog')!==-1)return'아이지에이웍스';
  return'모바일인덱스INSIGHT';
}

/* State */
var isEditable=false,isComparing=false;
var editingImg=null,editingBtn=null,editingBox=null;
var lastGenUrls=[];
var nlHistory=[];try{nlHistory=JSON.parse(localStorage.getItem('nl-history')||'[]');}catch(e){nlHistory=[];}
var NL=qs('#newsletter-output'),origOut=qs('#original-output');
var panels=qs('#panels'),toolbar=qs('#editor-toolbar'),loading=qs('#loading');
var genBtn=qs('#generate-btn'),urlList=qs('#url-list'),sidebar=qs('#sidebar');

/* Sidebar */
on('#menu-btn','click',function(){sidebar.classList.toggle('open');});
on('#sidebar-toggle','click',function(){sidebar.classList.remove('open');});

/* Sidebar tabs */
qsa('.sidebar-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    qsa('.sidebar-tab').forEach(function(t){t.classList.remove('active');});
    tab.classList.add('active');
    var which=tab.dataset.tab;
    qs('#history-list').style.display=which==='history'?'':'none';
    qs('#drafts-list').style.display=which==='drafts'?'':'none';
  });
});

/* API Key */
(function(){
  var inp=qs('#api-key-input');
  var saved=localStorage.getItem('gemini-api-key');if(saved)inp.value=saved;
  qs('#api-key-save').addEventListener('click',function(){
    var k=inp.value.trim();
    if(k){localStorage.setItem('gemini-api-key',k);qs('#api-key-status').textContent='저장됨';toast('API 키 저장됨');}
    else qs('#api-key-status').textContent='키를 입력하세요';
  });
})();

/* imgbb API Key */
(function(){
  var inp=qs('#imgbb-key-input');
  var saved=localStorage.getItem('imgbb-api-key');if(saved)inp.value=saved;
  qs('#imgbb-key-save').addEventListener('click',function(){
    var k=inp.value.trim();
    if(k){localStorage.setItem('imgbb-api-key',k);qs('#imgbb-key-status').textContent='저장됨';toast('imgbb API 키 저장됨');}
    else qs('#imgbb-key-status').textContent='키를 입력하세요';
  });
})();
function getImgbbKey(){return localStorage.getItem('imgbb-api-key')||'17ad7af8657ecc93989b221c0698e893';}

/* Settings */
on('#settings-toggle','click',function(){
  /* 저장된 키 불러오기 */
  var gemKey=localStorage.getItem('gemini-api-key');
  var imgKey=localStorage.getItem('imgbb-api-key');
  if(gemKey)qs('#api-key-input').value=gemKey;
  if(imgKey)qs('#imgbb-key-input').value=imgKey;
  qs('#settings-modal').classList.remove('hidden');
});
on('#settings-close','click',function(){qs('#settings-modal').classList.add('hidden');});

/* Guide — 통합 가이드 모달 (탭 전환) */
function openGuideModal(tab){
  var modal=qs('#guide-modal');
  if(!modal)return;
  // 탭 활성화
  var targetTab=tab||(document.body.classList.contains('sns-mode')?'sns':'newsletter');
  qsa('.guide-tab').forEach(function(b){b.classList.toggle('active',b.dataset.gtab===targetTab);});
  qsa('.guide-tab-content').forEach(function(c){c.style.display=c.dataset.gtab===targetTab?'':'none';});
  modal.classList.remove('hidden');
}
function closeGuideModal(){var m=qs('#guide-modal');if(m)m.classList.add('hidden');}

on('#guide-toggle','click',function(){openGuideModal();});
on('#guide-close','click',closeGuideModal);
var gcTop=qs('#guide-close-top');if(gcTop)gcTop.addEventListener('click',closeGuideModal);

/* 가이드 탭 전환 */
qsa('.guide-tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    var tab=btn.dataset.gtab;
    qsa('.guide-tab').forEach(function(b){b.classList.toggle('active',b===btn);});
    qsa('.guide-tab-content').forEach(function(c){c.style.display=c.dataset.gtab===tab?'':'none';});
  });
});

/* Home */
function goHome(){
  var hero=qs('#hero-section');if(hero)hero.classList.remove('hidden');
  panels.classList.add('hidden');toolbar.classList.add('hidden');
  qs('#back-btn').classList.add('hidden');
  var tcdd=qs('#title-candidates-dropdown');if(tcdd)tcdd.classList.add('hidden');
  if(isEditable){isEditable=false;NL.contentEditable=false;NL.classList.remove('editable');qs('#edit-toggle').classList.remove('active');qs('#edit-toggle').innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';var ep=qs('#edit-panel');if(ep)ep.classList.remove('open');qs('.main-content').classList.remove('ep-open');}
  isComparing=false;
}
on('#home-btn','click',goHome);
on('#back-btn','click',goHome);

function showEditor(){
  panels.classList.remove('hidden');toolbar.classList.remove('hidden');
  var hero=qs('#hero-section');if(hero)hero.classList.add('hidden');
  qs('#back-btn').classList.remove('hidden');
}
function makeUrlRow(){
  var d=document.createElement('div');d.className='url-row';
  d.innerHTML='<span class="url-drag-handle"></span>'
    +'<div class="url-row-inner">'
    +'<div class="url-row-top">'
    +'<div class="url-row-main"><span class="url-icon">&#128196;</span><input type="url" class="url-field" placeholder="뉴스레터로 작성할 콘텐츠 URL을 입력하세요"></div>'
    +'<button class="url-remove-btn">&#10005;</button>'
    +'</div>'
    +'<div style="display:flex;gap:6px;align-items:center">'
    +'<select class="url-tag-select"><option value="auto">🏷 플랫폼 자동분류</option><option value="아이지에이웍스">아이지에이웍스</option><option value="디파이너리">디파이너리</option><option value="트레이딩웍스360">트레이딩웍스360</option><option value="모바일인덱스INSIGHT">모바일인덱스INSIGHT</option><option value="TVIndex">TVIndex</option><option value="Fixfolio">Fixfolio</option><option value="Fixtype">Fixtype</option></select>'
    +'<select class="url-style-select"><option value="subtitle">📝 소제목형</option><option value="prose">📄 줄글형</option></select>'
    +'<input type="text" class="url-volume-input" placeholder="분량 (예: 소제목 3개)">'
    +'</div>'
    +'<input type="url" class="url-tracking-input" placeholder="&#128279; 트래킹 링크 (이미지 클릭 시 이동 URL)">'
    +'</div>';
  return d;
}
on('#add-url-btn','click',function(){urlList.appendChild(makeUrlRow());});
urlList.addEventListener('click',function(e){if(e.target.classList.contains('url-remove-btn')&&urlList.querySelectorAll('.url-row').length>1)e.target.closest('.url-row').remove();});

/* URL 드래그 순서 변경 */
(function(){
  var dragRow=null;
  urlList.addEventListener('dragstart',function(e){
    var row=e.target.closest('.url-row');if(!row)return;
    dragRow=row;row.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','url');
  });
  urlList.addEventListener('dragover',function(e){
    if(!dragRow)return;e.preventDefault();e.dataTransfer.dropEffect='move';
    var target=e.target.closest('.url-row');
    if(target&&target!==dragRow){
      var rect=target.getBoundingClientRect();
      var mid=rect.top+rect.height/2;
      if(e.clientY<mid)urlList.insertBefore(dragRow,target);
      else if(target.nextSibling)urlList.insertBefore(dragRow,target.nextSibling);
      else urlList.appendChild(dragRow);
    }
  });
  urlList.addEventListener('dragend',function(){if(dragRow){dragRow.classList.remove('dragging');dragRow=null;}});
  /* 기존+새 row에 draggable 부여 */
  new MutationObserver(function(){urlList.querySelectorAll('.url-row').forEach(function(r){if(!r.draggable)r.draggable=true;});}).observe(urlList,{childList:true});
  urlList.querySelectorAll('.url-row').forEach(function(r){r.draggable=true;});
})();
function getUrls(){
  var r=[];urlList.querySelectorAll('.url-row').forEach(function(row){
    var u=row.querySelector('.url-field').value.trim(),tag=row.querySelector('.url-tag-select').value;
    var customVol=row.querySelector('.url-volume-input');
    var volText=customVol?customVol.value.trim():'';
    var trackInput=row.querySelector('.url-tracking-input');
    var trackUrl=trackInput?trackInput.value.trim():'';
    var styleSelect=row.querySelector('.url-style-select');
    var writeStyle=styleSelect?styleSelect.value:'subtitle';
    if(u&&u.indexOf('http')===0)r.push({url:u,tag:tag,volumeText:volText,trackingUrl:trackUrl,writeStyle:writeStyle});
  });return r;
}

/* Fetch */
function fetchUrl(url){
  var px=[
    {base:'https://api.allorigins.win/get?url=',json:true,field:'contents'},
    {base:'https://api.allorigins.win/raw?url='},
    {base:'https://corsproxy.io/?url='},
    {base:'https://api.codetabs.com/v1/proxy?quest='},
    {base:'https://corsproxy.org/?'}
  ];
  return new Promise(function(resolve,reject){
    var i=0;
    function next(){
      if(i>=px.length){reject(new Error('PROXY_FAIL'));return;}
      var p=px[i];i++;var c=new AbortController(),t=setTimeout(function(){c.abort();},30000);
      var fetchUrl=p.base+encodeURIComponent(url);
      console.log('Proxy attempt',i+'/',px.length,fetchUrl.substring(0,80));
      fetch(fetchUrl,{signal:c.signal}).then(function(r){clearTimeout(t);if(!r.ok){console.warn('Proxy',i,'status',r.status);next();return;}
        if(p.json)r.json().then(function(j){if(j[p.field]&&j[p.field].length>200){console.log('Proxy',i,'OK, length:',j[p.field].length);resolve(j[p.field]);}else next();}).catch(next);
        else r.text().then(function(h){if(h.length>200){console.log('Proxy',i,'OK, length:',h.length);resolve(h);}else next();}).catch(next);
      }).catch(function(err){clearTimeout(t);console.warn('Proxy',i,'error:',err.message);next();});
    }next();
  });
}

/* Extract */
function extract(html,baseUrl){
  var doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(e){e.setAttribute('data-keep','1');});
  doc.querySelectorAll('script:not([data-keep]),style,nav,footer,iframe,noscript,aside,.sidebar,.ad,.banner,[role="navigation"]').forEach(function(e){e.remove();});
  var root=doc.querySelector('article')||doc.querySelector('[role="main"]')||doc.querySelector('main')||doc.querySelector('.post-content,.entry-content,.article-body');
  if(!root){var best=null,bl=0;doc.querySelectorAll('div,section').forEach(function(el){var l=0;el.querySelectorAll('p,h1,h2,h3,h4,li,blockquote,span').forEach(function(c){l+=c.textContent.trim().length;});if(l>bl){bl=l;best=el;}});root=best||doc.body;}
  var imgs=[];
  /* OG 이미지는 본문 이미지와 중복되는 경우가 많아 제외 */
  root.querySelectorAll('img').forEach(function(img){if(imgs.length>=5)return;
    /* 고해상도 원본 URL 우선: data-original, data-src, srcset, data-lazy-src, src 순 */
    var s=img.getAttribute('data-original')||img.getAttribute('data-full-src')||img.getAttribute('data-src')||img.getAttribute('data-lazy-src')||'';
    /* srcset에서 가장 큰 이미지 추출 */
    if(!s){
      var srcset=img.getAttribute('srcset')||img.getAttribute('data-srcset')||'';
      if(srcset){var parts=srcset.split(',').map(function(p){return p.trim().split(/\s+/);});parts.sort(function(a,b){return(parseInt(b[1])||0)-(parseInt(a[1])||0);});if(parts[0]&&parts[0][0])s=parts[0][0];}
    }
    if(!s)s=img.getAttribute('src')||'';
    if(!s||s.indexOf('.svg')!==-1||s.indexOf('data:')===0)return;
    /* Wix 이미지: fill 파라미터를 큰 사이즈로 교체 */
    /* Wix 이미지: 원본 그대로 사용 (리사이즈하면 잘리거나 뿌옇게 됨) */
    /* WordPress: -NNNxNNN 썸네일 제거 */
    s=s.replace(/-\d{2,4}x\d{2,4}(\.\w+)$/,'$1');
    /* 작은 이미지, 아이콘 제외 */
    var w=parseInt(img.getAttribute('width'))||0,h=parseInt(img.getAttribute('height'))||0;
    if((w>0&&w<150)||(h>0&&h<150))return;
    /* 정사각형에 가까운 작은 이미지 = 로고일 확률 높음 */
    if(w>0&&h>0&&w<300&&Math.abs(w-h)<50)return;
    if(/logo|icon|badge|avatar|pixel|tracking|spacer|blank|1x1|btn_|button|igaworks|아이지에이|iga_|igaw/i.test(s))return;
    /* alt 텍스트에 로고/브랜드 관련 키워드 있으면 제외 */
    var imgAlt=(img.getAttribute('alt')||'').toLowerCase();
    if(/logo|로고|아이지에이|igaworks|brand|브랜드|회사/.test(imgAlt))return;
    try{var f=s.indexOf('http')===0?s:new URL(s,baseUrl).href;if(imgs.indexOf(f)===-1)imgs.push(f);}catch(e){}});
  var ogT=doc.querySelector('meta[property="og:title"]');
  var title=(ogT?ogT.getAttribute('content'):'')||(root.querySelector('h1')?root.querySelector('h1').textContent.trim():'')||(doc.querySelector('title')?doc.querySelector('title').textContent.trim():'제목 없음');
  var paras=[],seen={};

  /* 1차: 일반 블록 요소에서 추출 */
  root.querySelectorAll('p,h1,h2,h3,h4,li,blockquote').forEach(function(el){
    var t=el.textContent.trim();if(t.length<8||seen[t])return;
    if(/^(수신거부|Unsubscribe|copyright|©|Privacy|Terms)/i.test(t))return;
    seen[t]=true;paras.push({text:t,isH:['H1','H2','H3','H4'].indexOf(el.tagName)!==-1});
  });

  /* 2차: div/span에서 추출 */
  if(paras.length<3){
    root.querySelectorAll('div,span').forEach(function(el){
      if(el.querySelector('p,h1,h2,h3,h4,blockquote,ul,ol,table'))return;
      var t=el.textContent.trim();if(t.length<8||seen[t])return;
      if(/^(수신거부|Unsubscribe|copyright|©|Privacy|Terms)/i.test(t))return;
      seen[t]=true;paras.push({text:t,isH:false});
    });
  }

  /* 3차: body 전체 텍스트에서 추출 */
  if(paras.length<3){
    var bodyText=(doc.body?doc.body.textContent:'')||'';
    var lines=bodyText.split(/\n+/).map(function(s){return s.trim();}).filter(function(s){return s.length>=15&&!seen[s];});
    for(var li=0;li<lines.length;li++){
      if(!seen[lines[li]]){seen[lines[li]]=true;paras.push({text:lines[li],isH:false});}
    }
  }

  /* 4차: HTML 원문에서 직접 텍스트 추출 (Wix 등 JS 렌더링 사이트) */
  if(paras.length<10){
    var rawTexts=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,'\n').split(/\n+/);
    var merged='',mergedCount=0;
    for(var ri=0;ri<rawTexts.length;ri++){
      var rt=rawTexts[ri].trim();
      if(!rt||rt.length<3)continue;
      /* CSS/JS/코드 필터링 — 강화 */
      if(/^[\s{}\[\]();,<>\/\\=+\-*&|!~`@#$%^_.]+$/.test(rt))continue;
      if(/[{};]/.test(rt)&&/[:,]/.test(rt)&&/(px|em|rem|rgb|rgba|var\(|solid|none|flex|block|grid|absolute|relative|margin|padding|border|background|font|color|display|position|width|height|overflow|align|justify|opacity|transform|transition|animation|z-index|cursor|outline|text-decoration|letter-spacing|line-height|white-space|box-shadow)/.test(rt))continue;
      if(/^\.[a-zA-Z0-9_-]+[\s{]/.test(rt))continue;
      if(/^(function|var |const |let |if\s*\(|return |import |export |window\.|document\.|this\.|new |typeof |@media|@keyframes|@font-face|@import)/.test(rt))continue;
      if(/^(https?:\/\/|data:|blob:)/.test(rt))continue;
      /* 한글이 하나도 없고 30자 넘는 건 코드 */
      if(rt.length>30&&!/[\uAC00-\uD7AF]/.test(rt))continue;
      /* 짧은 조각은 합치기 */
      if(rt.length<15){
        merged+=(merged?' ':'')+rt;
        mergedCount++;
        if(merged.length>=30||mergedCount>=5){
          if(!seen[merged]){seen[merged]=true;paras.push({text:merged,isH:false});}
          merged='';mergedCount=0;
        }
      } else {
        if(merged.length>=15&&!seen[merged]){seen[merged]=true;paras.push({text:merged,isH:false});}
        merged='';mergedCount=0;
        if(!seen[rt]){seen[rt]=true;paras.push({text:rt,isH:false});}
      }
    }
    if(merged.length>=15&&!seen[merged]){seen[merged]=true;paras.push({text:merged,isH:false});}
  }

  /* 5차: JSON-LD에서 articleBody 추출 */
  if(paras.length<10){
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(function(el){
      try{
        var j=JSON.parse(el.textContent);
        var body=j.articleBody||j.text||j.description||(j.mainEntity&&j.mainEntity.text)||'';
        if(body.length>50){
          var jLines=body.split(/[.!?]\s+/).filter(function(s){return s.trim().length>=15;});
          for(var ji=0;ji<jLines.length;ji++){
            var jt=jLines[ji].trim();
            if(!seen[jt]){seen[jt]=true;paras.push({text:jt,isH:false});}
          }
        }
      }catch(e){}
    });
  }

  console.log('Extracted paragraphs:',paras.length,'from',baseUrl);
  return{title:title,paras:paras,imgs:imgs};
}

/* ===== AI ===== */
function buildPrompt(volText){
  var g;
  if(volText){
    g='★★★ 사용자 지정 분량: '+volText+'. 이 분량을 반드시 지켜! ★★★\n'
      +'- "소제목 3개"면 [본문] 3개만 작성. 각 [본문]에 소제목:본문 형식.\n'
      +'- "소제목 5개"면 [본문] 5개 작성.\n'
      +'- "5줄"이면 [본문] 태그 없이 핵심 내용만 5줄로 작성.\n'
      +'- "3줄"이면 가장 중요한 포인트 3줄만.\n'
      +'- "500자"면 전체 본문을 500자 이내로.\n'
      +'- 지정 분량이 짧으면 [본문] 개수를 줄이고, 소제목도 생략 가능.\n'
      +'- 분량 지시가 있으면 기본 5~6개 규칙보다 분량 지시가 우선!';
  } else {
    g='[본문] 5~6개, 각 3~4문장. 원문 대비 50~60% 분량으로 압축.';
  }
  return '너는 IGAWorks 뉴스레터 작성자야.\n\n'
    +'# 1단계: 원문 분석 (먼저 이걸 해)\n'
    +'원문을 읽고 아래를 먼저 파악해:\n'
    +'- 이 콘텐츠의 유형은? (데이터 분석 / 솔루션 소개 / 트렌드 리포트 / 케이스 스터디)\n'
    +'- 독자(B2B 마케터)가 가장 관심 가질 핵심 수치 3개\n'
    +'- 독자가 "오 이건 몰랐네" 할 만한 인사이트 2개\n\n'
    +'# 2단계: 콘텐츠 유형별 톤\n'
    +'- 데이터 분석: 수치를 전면에. "~로 나타났습니다", "~% 증가했습니다"\n'
    +'- 솔루션 소개: 문제→해결 구조. "이런 고민이 있다면", "~로 해결할 수 있습니다"\n'
    +'- 트렌드 리포트: 변화 강조. "~가 달라지고 있습니다", "주목할 점은"\n'
    +'- 케이스 스터디: 성과 중심. "~를 달성했습니다", "비결은"\n\n'
    +'# 3단계: 뉴스레터 작성\n'
    +'1단계 분석을 기반으로 작성해.\n\n'
    +'# 규칙\n'
    +'- 원문에 없는 내용 창작 절대 금지. 원문 수치/사례만 사용.\n'
    +'- 원문 문장 그대로 복사 금지. 캐주얼하게 리라이팅.\n'
    +'- ~습니다체. "~했습니다", "~확인됩니다", "~나타났습니다" 같은 격식체. ~해요/~거든요/~잖아요 금지.\n'
    +'- 불릿 기호(◾■▪•) 절대 금지. 번호(1. 2. 3. 또는 1번 2번) 절대 금지. 자연스러운 문장으로만.\n'
    +'- 중요 키워드는 <strong>키워드</strong>로 감싸기.\n'
    +'- "발송 대상", "채널 친구", "마케팅 수신", "테스트 발송", "친구톡", "알림톡", "카카오 브랜드 메시지", "수신 동의자" 등 이메일/메시지 발송 관련 메타 정보는 절대 본문에 포함하지 마. 원문의 실제 콘텐츠만 다뤄.\n'
    +'- ★ 핵심 압축: 원문의 모든 문장을 옮기지 마. 각 주제에서 가장 임팩트 있는 수치 1~2개와 핵심 메시지만 뽑아서 3~4문장으로 압축해. 원문 대비 50~60% 분량이 목표야.\n'
    +'- ★ 앞쪽 [본문] 2~3개에서는 핵심 수치와 데이터를 구체적으로 언급하고, 뒤쪽 [본문]으로 갈수록 "더 자세한 내용은 원문에서" 느낌으로 궁금증을 남겨. 모든 데이터를 다 풀지 마.\n\n'
    +'# 분량\n'+g+'\n\n'
    +'# 출력 형식 (태그와 내용을 반드시 같은 줄에!)\n\n'
    +'[제목] 후킹하는 제목 2줄 (이모지 1개). 반드시 줄바꿈(<br>)으로 2줄 구성. 1줄은 핵심 수치나 충격적 사실, 2줄은 궁금증 유발. 클릭하고 싶게 만들어! 예: "📊 MAU 1538만 명, 역대 최고!<br>증권 앱에 무슨 일이 벌어진 걸까?"\n'
    +'[제목B] 데이터 강조형 제목 2줄. 핵심 수치를 제목에 넣어. 반드시 작성! 예: "📊 MAU 1538만 명 돌파!<br>증권 앱 시장이 폭발했습니다"\n'
    +'[제목C] 클릭 유도형 제목 2줄. 궁금증/질문 형식. 반드시 작성! 예: "🤔 가상화폐 앱 사용시간이 60% 줄었다?<br>투자자들은 어디로 갔을까"\n'
    +'[소제목] 핵심을 한 문장으로\n'
    +'[도입] 3~5문장. "안녕하세요, 아이지에이웍스입니다."로 시작하지 마! 인사는 별도로 들어감. 바로 시장/업계 배경 상황부터 시작. 이런 상황이라 이번에 이런 데이터를 분석해봤다 → 어떤 변화가 있었는지 확인해보세요! 형식. 구체적 수치는 넣지 말고 궁금증만 유발.\n'
    +'[본문] 이모지 소제목: 본문 내용 (★ 이모지는 반드시 소제목 맨 앞에! 예: "🔥 코스피 6000 돌파" (O), "코스피 6000 돌파🔥" (X). 콜론 뒤에 바로 본문 3~4문장. 핵심 수치 1~2개만 포함. 군더더기 없이 압축!)\n'
    +'※ 소제목:내용 형식은 내용이 길거나 주제가 뚜렷할 때만 사용. 짧은 내용이면 소제목 없이 자연스러운 문장으로 이어도 됨.\n'
    +'※ 각 [본문]은 이전 [본문]과 자연스럽게 이어지게 작성. "한편", "반면", "그런데" 등 연결어 활용.\n'
    +'[본문] 소제목: 본문 내용\n'
    +'[본문] 소제목: 본문 내용\n'
    +'[본문] 소제목: 본문 내용\n'
    +'[본문] 소제목: 본문 내용\n'
    +'[인사이트] 원문에서 더 궁금해지는 포인트를 2~3문장으로. "그렇다면 ~은 어떨까요?" 같은 질문 형식 + 원문을 보면 더 선명하게 보인다는 유도. 예: "그렇다면 어떤 세대에서 가상화폐 업종을 가장 크게 빠져나갔을까요? 앱별 상세 비교와 부동산 시장 흐름까지 함께 보면 이번 상승장의 투자 심리 이동이 훨씬 선명하게 보입니다."\n'
    +'[유도] 원문 클릭 유도 1문장\n'
    +'[한줄] 이모지 | 소제목 | 핵심 요약 2문장 이내\n'
    +'[통계] 가장 임팩트 있는 수치 1개 | 설명\n\n'
    +'# [도입] 작성법\n'
    +'★ "안녕하세요, 아이지에이웍스입니다" 절대 넣지 마! 인사는 HTML에서 별도로 들어감.\n'
    +'시장/업계 배경 상황 1~2문장 → 그래서 이번에 이런 데이터를 분석했다 1문장 → 궁금증 유발 질문 1문장.\n'
    +'예시: "최근 글로벌 분쟁과 전쟁 리스크로 투자 심리가 요동치는 혼돈의 시기를 지나고 있는데요. 이런 상황 속에서 투자자들이 실제로 어디로 향하고 있는지, 증권·가상화폐·부동산 앱 데이터를 분석해봤습니다. 코스피 6000 돌파 전후로 과연 어떤 변화가 있었을까요?"\n\n'
    +'# [본문] 작성법\n'
    +'원문의 주요 주제를 5~6개로 나눠서 각각 소제목을 붙여.\n'
    +'★ 각 [본문]은 3~4문장으로 압축! 원문의 모든 세부사항을 옮기지 마. 가장 중요한 수치 1~2개와 핵심 포인트만.\n'
    +'예시: 원문이 증권/가상화폐/부동산을 다루면 → 증권 2개, 가상화폐 2개, 부동산 1개.\n'
    +'마지막 [본문]은 가볍게 마무리하는 톤으로.\n\n'
    +'# 실제 완성 예시 (이 수준으로 써줘!)\n\n'
    +'[제목] 💰 코스피 6000 시대!<br>투자 지형이 확 바뀌었어요!\n'
    +'[소제목] 코스피 상승장 속, 증권 앱은 뜨겁고 가상화폐 앱은 잠잠해졌대요!\n'
    +'[도입] 최근 글로벌 분쟁과 전쟁 리스크로 투자 심리가 요동치는 혼돈의 시기를 지나고 있습니다. 이런 상황 속에서 투자자들이 실제로 어디로 향하고 있는지, 증권·가상화폐·부동산 앱 데이터를 분석해봤습니다. 코스피 6000 돌파 전후로 과연 어떤 변화가 있었을까요?\n'
    +'[본문] 🔥 코스피 6000 돌파, 증권 앱이 폭발했습니다: 코스피가 5000선을 넘어 18거래일 만에 6000선까지 돌파했습니다. 증권 앱 사용 시간이 전년 대비 <strong>123%</strong> 늘었고, MAU도 1247만→1538만 명으로 약 23% 증가했습니다. 증권 앱 시장 전체가 폭발적으로 성장한 것을 확인할 수 있습니다.\n'
    +'[본문] 🚀 4050 세대가 주식 시장의 큰 손입니다: 이번 상승장의 주역은 <strong>4050 세대</strong>였습니다. 40대 여성 사용시간이 1539만→2322만 시간으로 급증했고, 신규 설치도 40대 여성이 약 31만 건으로 1위를 차지했습니다.\n'
    +'[본문] 💡 MAU는 미래에셋, 활동성은 키움증권입니다: 2026년 1월 미래에셋 M-STOCK이 MAU 318만 명으로 영웅문S#(312만)을 앞섰지만, 사용시간·사용률 등 활동 강도에서는 키움증권이 여전히 강세를 보였습니다.\n'
    +'[본문] 🚨 가상화폐 앱은 정반대, 사용시간 60% 급감: 가상화폐 앱은 MAU는 700만대로 유지했지만, 사용 시간이 5558만→2283만 시간으로 약 <strong>60%</strong> 줄었습니다. 3040 남성의 이탈이 특히 두드러졌습니다.\n'
    +'[본문] 🏠 부동산 앱은 잠잠했습니다: 부동산 앱은 MAU·사용시간·설치 모두 비슷한 수준을 유지했습니다. 정부 정책 영향이 큰 시장이라 코스피 상승장과는 별개의 흐름이었습니다.\n'
    +'[인사이트] 그렇다면 어떤 세대에서 가상화폐 업종을 가장 크게 빠져나갔을까요? 앱별 상세 비교와 부동산 시장 흐름까지 함께 보면 이번 상승장의 투자 심리 이동이 훨씬 선명하게 보입니다.\n'
    +'[유도] 더 자세한 수치와 분석이 궁금하다면 원문에서 확인해보세요!\n'
    +'[한줄] 💰 | 투자 지형 변화 | 코스피 6000 돌파 후 증권 앱 MAU 23% 증가, 가상화폐 앱은 사용시간 60% 감소\n'
    +'[통계] MAU 1538만 명 | 코스피 6000 돌파 후 증권 앱 월간 활성 사용자\n\n'
    +'★ 위 예시는 참고용이야. 원문 내용에 맞게 동일한 수준과 형식으로 새로 써줘!';
}

function buildProsePrompt(volText){
  var g;
  if(volText){
    g='★★★ 사용자 지정 분량: '+volText+'. 이 분량을 반드시 지켜! ★★★';
  } else {
    g='원문 대비 50~60% 분량으로 압축. 큰 주제 3~5개를 ❶ ❷ ❸ 번호로 구분.';
  }
  return '너는 IGAWorks 뉴스레터 작성자야. 독자가 끝까지 읽고 싶게 만드는 글을 써.\n\n'
    +'# 1단계: 원문 분석 (먼저 이걸 해)\n'
    +'원문을 읽고 아래를 먼저 파악해:\n'
    +'- 이 콘텐츠의 유형은? (데이터 분석 / 솔루션 소개 / 트렌드 리포트 / 케이스 스터디)\n'
    +'- 독자(B2B 마케터)가 가장 관심 가질 핵심 수치 3개\n'
    +'- 독자가 "오 이건 몰랐네" 할 만한 인사이트 2개\n\n'
    +'# 2단계: 콘텐츠 유형별 톤\n'
    +'- 데이터 분석: 수치를 전면에. "~로 나타났습니다", "~% 증가했습니다"\n'
    +'- 솔루션 소개: 문제→해결 구조. "이런 고민이 있다면", "~로 해결할 수 있습니다"\n'
    +'- 트렌드 리포트: 변화 강조. "~가 달라지고 있습니다", "주목할 점은"\n'
    +'- 케이스 스터디: 성과 중심. "~를 달성했습니다", "비결은"\n\n'
    +'# 3단계: 뉴스레터 작성\n'
    +'1단계 분석을 기반으로 작성해.\n\n'
    +'# 톤 & 스타일\n'
    +'- ~습니다체 기반이지만 딱딱하지 않게.\n'
    +'- 독자에게 말을 거는 느낌. "과연 어떤 변화가 있었을까요?", "여기서 주목할 점은" 같은 표현 활용.\n'
    +'- 데이터를 나열하지 말고 스토리로 풀어. "A가 B한 배경에는 C가 있었습니다" 식으로.\n'
    +'- 문단 시작을 다양하게. 질문, 반전, 비유로 시작해봐.\n'
    +'- 중요 키워드만 <strong>키워드</strong>로 감싸기. 남발 금지.\n\n'
    +'# 규칙\n'
    +'- 원문에 없는 내용 창작 절대 금지.\n'
    +'- 원문 문장 그대로 복사 금지.\n'
    +'- 불릿/번호 절대 금지. ❶ ❷ ❸ 번호만 주제 전환 시 사용.\n'
    +'- 이메일 발송 메타 정보 포함 금지.\n'
    +'- ★ 각 문단은 5~7문장으로! 충분히 내용을 전개하되 너무 길어지지 않게.\n'
    +'- ★ 수치를 한꺼번에 나열하지 마. 한 문단에 핵심 수치 1~2개만. 나머지는 다음 문단에서.\n\n'
    +'# 줄글 구조\n'
    +'- 소제목 없이 자연스러운 문단. 이모지 소제목:본문 형식 절대 금지!\n'
    +'- 큰 주제 전환 시에만 ❶ ❷ ❸ 번호. 번호 뒤에 짧은 제목 (10자 이내).\n'
    +'- 앞쪽은 핵심 수치 구체적으로, 뒤쪽은 궁금증 남겨서 원문 유도.\n'
    +'- 문단과 문단 사이는 자연스러운 연결어로. "한편", "그런데 여기서 주목할 점이 있습니다", "반면" 등.\n\n'
    +'# 분량\n'+g+'\n\n'
    +'# 출력 형식 (★ 모든 태그 필수! 하나도 빠뜨리지 마!)\n\n'
    +'[제목] 후킹 제목 2줄. <br>로 구분. 이모지 1개.\n'
    +'[제목B] 데이터 강조형 2줄. 반드시 작성!\n'
    +'[제목C] 클릭 유도형 2줄. 반드시 작성!\n'
    +'[소제목] 짧고 임팩트 있게! 15자 이내. 예: "증권 앱 MAU 역대 최고!", "팬덤이 곧 구매력이다"\n'
    +'[도입] ★★★ 반드시 작성! ★★★ 2~3문장. 인사 넣지 마. 시장/업계 배경 → 이번에 분석한 이유 → 궁금증 유발 질문. 이 태그를 빼면 안 돼!\n'
    +'[본문] ❶ 짧은 제목 (10자 이내)\n5~7문장 스토리텔링. 핵심 수치 1~2개. ★ 반드시 ❶부터 시작!\n'
    +'[강조] 본문 내용에서 도출되는 시사점이나 인사이트 한 문장. 수치 나열이 아니라 "이것이 왜 중요한지" 해석하는 문장. 50자 이내. 예: "특정 이벤트가 얼마나 강력한 사용자 유입 효과를 가져올 수 있는지 명확히 보여줍니다", "팬덤의 충성도가 곧 구매력으로 이어진다는 것을 데이터가 증명합니다". 마케팅 전략이나 실무 시사점이 있을 때만 작성.\n'
    +'[본문] ❷ 짧은 제목\n5~7문장. 앞과 자연스럽게 연결.\n'
    +'[본문] ❸ 짧은 제목\n5~7문장.\n'
    +'[본문] 마무리 2~3문장.\n'
    +'[인사이트] ★ 뉴스레터에서 다루지 않은 원문의 궁금한 포인트를 질문 형태로 2~3개. 각각 별도 줄! 예:\n글로벌 아미의 모바일 기기 언어 설정 데이터에서 발견된 놀라운 점은?\n팬덤 깊이에 따라 어떤 메시지로 마케팅 캠페인을 진행해야 효과적일까요?\n트레이딩웍스360이 제안하는 BTS 팬덤 타겟 마케팅 시나리오 5가지는?\n'
    +'[유도] 1~2문장. 원문 클릭 유도. 예: "BTS 팬덤 데이터가 가진 막강한 마케팅 잠재력을 더 깊이 파고들어보고 싶다면, 지금 바로 원문에서 상세한 분석과 전략을 확인해보세요!"\n'
    +'[한줄] 전체 관통 인사이트 1문장.\n'
    +'[통계] 임팩트 수치 1개 | 설명\n\n'
    +'★ 줄글 형식! 이모지 소제목 금지!\n'
    +'★ [강조]는 각 주제 뒤 1개씩.\n'
    +'★ [본문]은 반드시 ❶부터 순서대로! ❷부터 시작하면 안 돼!\n'
    +'★ [도입]을 빼먹으면 안 돼! 반드시 작성!\n'
    +'★ [인사이트]의 질문들은 반드시 줄바꿈(\\n)으로 분리!\n\n'
    +'# 실제 완성 예시 (이 수준과 형식으로 써줘!)\n\n'
    +'[제목] 💰 토스 vs 시중은행, 진짜 승자는?<br>금융 앱 전쟁의 숨겨진 데이터\n'
    +'[제목B] 📊 KB금융 통합 MAU 1,851만 명!<br>토스와의 격차가 좁혀지고 있습니다\n'
    +'[제목C] 🤔 토스가 정말 압도적 1위일까?<br>관점을 바꾸면 다른 그림이 보입니다\n'
    +'[소제목] 토스 vs 금융그룹, 진짜 승부는 지금부터!\n'
    +'[도입] 국내 금융 앱 1위는 늘 토스입니다. 하지만 보통 금융 앱 사용자는 은행, 카드, 증권 앱을 넘나들며 금융 생활을 하죠. 그런데 앱 하나하나를 따로 떼어놓고 숫자를 비교하는 게 정말 의미가 있을까요? 그래서 이번에는 관점을 완전히 바꿔봤습니다. 개별 앱이라는 틀을 벗어나, 각 시중은행의 계열사 앱들을 하나의 금융 그룹으로 묶어 토스와 정면으로 비교해 보았습니다. 과연 각 그룹의 계열사 앱들이 힘을 합치면 토스와의 격차를 얼마나 줄일 수 있을까요?\n'
    +'[본문] ❶ 통합 MAU 비교\\n금융그룹의 영향력을 평가할 때, 개별 앱의 MAU만 볼 경우 실제 규모를 제대로 비교하기 어렵습니다. 금융 업종 사용자는 하나의 앱만 사용하기보다, 뱅킹에서 시작해 투자·카드·보험 등 여러 앱을 오가며 금융 활동을 이어가기 때문입니다. 따라서 여러 계열 앱을 보유한 금융그룹의 경우, 중복 사용자를 제거한 그룹별 통합 MAU로 보는 것이 보다 정확한 기준이 됩니다. 통합 MAU 관점에서 바라본 각 그룹의 사용자 기반은 토스와 충분히 경쟁할 수 있는 수준으로 나타났습니다. 특히 <strong>KB금융그룹</strong>은 2025년 1월 1,725만 명에서 2026년 1월 <strong>1,851만 명</strong>으로 확대되며 시중 금융그룹 중 토스(2,094만 명)의 체급에 가장 바짝 다가선 것을 확인할 수 있습니다.\n'
    +'[강조] 통합 MAU로 보면, 금융그룹과 토스의 격차는 생각보다 가깝습니다\n'
    +'[본문] ❷ 교차 사용률 비교\\n그런데 여기서 주목할 점이 있습니다. 각 금융그룹 사용자 중 토스를 함께 사용하는 비율이 상당히 높았습니다. 이는 토스가 단순한 경쟁자가 아니라 금융 생활의 보조 도구로 자리잡았음을 시사합니다. 반면 토스 사용자 중 시중은행 앱을 함께 쓰는 비율은 상대적으로 낮아, 토스 중심의 금융 생활이 점점 굳어지고 있는 모습입니다. 체류시간 점유율에서도 토스의 압도적 우위가 확인되었습니다.\n'
    +'[본문] ❸ 전략적 요충지\\n그렇다면 시중 금융그룹이 토스와의 격차를 좁히려면 어디에 집중해야 할까요? 데이터는 명확한 답을 보여줍니다. 2030 세대의 금융 앱 사용 패턴에서 토스 의존도가 가장 높게 나타났고, 이 세대를 잡는 것이 향후 금융 시장의 판도를 결정할 핵심 변수가 될 것으로 보입니다.\n'
    +'[강조] 2030 세대를 잡는 금융그룹이 토스의 대항마가 됩니다\n'
    +'[본문] 금융 앱 시장의 경쟁은 단순한 MAU 싸움이 아닙니다. 사용자가 어떤 맥락에서, 얼마나 오래, 어떤 조합으로 앱을 사용하는지를 입체적으로 들여다봐야 진짜 경쟁력이 보입니다.\n'
    +'[인사이트] 각 금융그룹의 MZ 세대 공략 전략은 어떤 성과를 내고 있을까요?\\n체류시간 점유율에서 토스를 위협하는 금융그룹은 어디일까요?\\n금융그룹 간 교차 사용 패턴에서 발견되는 의외의 조합은?\n'
    +'[유도] 금융 앱 시장의 숨겨진 경쟁 구도가 궁금하다면, 지금 바로 원문에서 상세한 분석과 전략을 확인해보세요!\n'
    +'[한줄] 개별 앱이 아닌 금융그룹으로 보면, 토스와의 격차는 생각보다 가깝습니다\n'
    +'[통계] 통합 MAU 1,851만 명 | KB금융그룹의 2026년 1월 그룹별 통합 사용자 수\n\n'
    +'★ 위 예시는 참고용이야. 원문 내용에 맞게 동일한 수준과 형식으로 새로 써줘!';
}


function aiRewrite(paras,title,volumeText,writeStyle,url){
  var key=getKey();if(!key)return Promise.reject(new Error('NO_KEY'));
  localStorage.setItem('gemini-api-key',key);
  var sysPrompt=(writeStyle==='prose')?buildProsePrompt(volumeText):buildPrompt(volumeText);
  var volInstruction=volumeText?'\n\n★★★ 분량 지시: '+volumeText+'. 이 분량을 반드시 지켜주세요! 기본 규칙보다 이 분량이 우선입니다. ★★★':'';
  /* URL이 있으면 Gemini가 직접 읽도록 URL만 전달, 없으면 파싱 텍스트 fallback */
  var userMsg=url
    ?'다음 URL의 원문을 직접 읽고 뉴스레터를 작성해주세요.\nURL: '+url+'\n\n★ 앞쪽 본문에서 핵심 수치를 구체적으로 언급하고, 뒤쪽으로 갈수록 궁금증을 남겨서 원문 클릭을 유도하세요.'+volInstruction
    :(function(){
        var orig=paras.map(function(p){return(p.isH?'## ':'')+p.text;}).join('\n\n');
        if(orig.length>15000)orig=orig.substring(0,15000)+'\n\n[... 원문 일부 생략 ...]';
        return '원문 제목: '+title+'\n\n원문:\n'+orig+'\n\n★ 앞쪽 본문에서 핵심 수치를 구체적으로 언급하고, 뒤쪽으로 갈수록 궁금증을 남겨서 원문 클릭을 유도하세요.'+volInstruction;
      })();
  /* 모델별로 body를 만들어서 시도 — system_instruction 지원 여부에 따라 분기 */
  var models=['gemini-2.5-flash'];
  var urlTools=url?[{"urlContext":{}}]:[];
  function makeBody(useSystemInstruction){
    if(useSystemInstruction){
      return JSON.stringify({system_instruction:{parts:[{text:sysPrompt}]},contents:[{parts:[{text:userMsg}]}],generationConfig:{temperature:0.7,maxOutputTokens:32768},tools:urlTools});
    } else {
      return JSON.stringify({contents:[{parts:[{text:sysPrompt+'\n\n---\n\n'+userMsg}]}],generationConfig:{temperature:0.7,maxOutputTokens:32768},tools:urlTools});
    }
  }
  function tryM(i,triedWithoutSys){
    if(i>=models.length)return Promise.reject(new Error('사용 가능한 AI 모델 없음'));
    var body=makeBody(!triedWithoutSys);
    var u='https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key;
    console.log('Trying model:',models[i],'systemInstruction:',!triedWithoutSys);
    return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:body}).then(function(r){
      if(r.status===404||r.status===403){console.warn(models[i]+' fail '+r.status);return tryM(i+1,false);}
      if(r.status===400){
        /* 400일 때 system_instruction 미지원일 수 있음 — 없이 재시도 */
        if(!triedWithoutSys){console.warn(models[i]+' 400 — retrying without system_instruction');return tryM(i,true);}
        console.warn(models[i]+' fail 400 even without sys');return tryM(i+1,false);
      }
      if(!r.ok)return r.json().catch(function(){return{};}).then(function(b){throw new Error('API('+r.status+'): '+((b.error&&b.error.message)||r.statusText));});
      return r.json().then(function(d){
        var c=d.candidates&&d.candidates[0];
        if(!c||!c.content||!c.content.parts){
          console.warn('No candidates from',models[i],'finishReason:',c&&c.finishReason);
          /* SAFETY 등으로 빈 응답이면 다음 모델 시도 */
          if(c&&c.finishReason&&c.finishReason!=='STOP')return tryM(i+1,false);
          throw new Error('AI 응답 구조 오류');
        }
        if(c.finishReason)console.log('finishReason:',c.finishReason);
        var parts=c.content.parts,txt='';
        for(var j=0;j<parts.length;j++){if(parts[j].text)txt+=parts[j].text;}
        if(!txt){console.warn('Empty text from',models[i]);return tryM(i+1,false);}
        console.log('Model:',models[i],'Response length:',txt.length);
        var parsed=parseAI(txt,title);
        console.log('=== PARSE RESULT ===');
        console.log('Title:',parsed.title);
        console.log('Body count:',parsed.body.length);
        if(parsed.body.length>0)console.log('Body[0] preview:',parsed.body[0].substring(0,100));
        console.log('Insight:',parsed.insightBox?parsed.insightBox.substring(0,80):'(없음)');
        if(parsed.body.length===0){console.warn('⚠️ 0 body — trying next model');return tryM(i+1,false);}
        return parsed;
      });
    }).catch(function(err){
      console.error('Model',models[i],'error:',err.message);
      if(i<models.length-1)return tryM(i+1,false);
      throw err;
    });
  }
  return tryM(0,false);
}

function parseAI(text,title){
  var r={title:'',titleB:'',titleC:'',subtitle:'',intro:'',body:[],redirect:'',insightBox:'',oneliner:'',stat:null};
  console.log('=== AI RAW RESPONSE ===');
  console.log(text);
  console.log('=== END RAW ===');
  var lines=text.split('\n');
  var lastTag=''; /* 마지막으로 만난 태그 추적 */
  for(var li=0;li<lines.length;li++){
    var t=lines[li].trim();
    if(!t)continue;
    /* 인사이트 감지를 최우선으로 — 본문에 섞이는 것 방지 */
    if(t.indexOf('[인사이트]')===0){r.insightBox+=(r.insightBox?'\n':'')+t.replace('[인사이트]','').trim();lastTag='인사이트';}
    else if(t.indexOf('**인사이트')!==-1||t.indexOf('💡 인사이트')!==-1||t.indexOf('💡인사이트')!==-1||t.indexOf('[인사이트 요약]')===0||t.indexOf('인사이트 요약')===0){
      var cleaned=t.replace(/\*\*/g,'').replace(/💡/g,'').replace('[인사이트 요약]','').replace('인사이트 요약','').replace('인사이트','').trim();
      if(cleaned.length>5){r.insightBox+=(r.insightBox?'\n':'')+cleaned;}
      lastTag='인사이트';
    }
    else if(t.indexOf('[제목C]')===0){r.titleC=t.replace('[제목C]','').trim();lastTag='제목C';}
    else if(t.indexOf('[제목B]')===0){r.titleB=t.replace('[제목B]','').trim();lastTag='제목B';}
    else if(t.indexOf('[제목]')===0){r.title=t.replace('[제목]','').trim();lastTag='제목';}
    else if(t.indexOf('[소제목]')===0){r.subtitle=t.replace('[소제목]','').trim();lastTag='소제목';}
    else if(t.indexOf('[도입]')===0){
      var introText=t.replace('[도입]','').trim();
      /* ❶이 도입에 섞여있으면 분리 */
      var circleInIntro=introText.search(/[❶❷❸❹❺❻❼❽❾❿\u2776-\u277F\u2460-\u2473]/);
      if(circleInIntro>0){
        r.intro+=(r.intro?'\n':'')+introText.substring(0,circleInIntro).trim();
        r.body.push(introText.substring(circleInIntro).trim());
        lastTag='본문';
      } else {
        r.intro+=(r.intro?'\n':'')+introText;
        lastTag='도입';
      }
    }
    else if(t.indexOf('[본문]')===0){
      var btext=t.replace('[본문]','').trim();
      r.body.push(btext);
      lastTag='본문';
    }
    else if(t.indexOf('[강조]')===0){
      r.body.push('__HIGHLIGHT__'+t.replace('[강조]','').trim());
      lastTag='강조';
    }
    else if(t.indexOf('[유도]')===0){r.redirect=t.replace('[유도]','').trim();lastTag='유도';}
    else if(t.indexOf('[한줄]')===0){r.oneliner=t.replace('[한줄]','').trim();lastTag='한줄';}
    else if(t.indexOf('[통계]')===0){var sp=t.replace('[통계]','').trim().split('|');r.stat={num:(sp[0]||'').trim(),label:(sp[1]||'').trim()};lastTag='통계';}
    /* 태그 없는 줄 → 직전 태그에 이어붙이기 */
    else if(t.charAt(0)!=='['&&t.length>5){
      if(lastTag==='본문'&&r.body.length>0){
        r.body[r.body.length-1]+=(r.body[r.body.length-1]?' ':'')+t;
      } else if(lastTag==='강조'&&r.body.length>0){
        r.body[r.body.length-1]+=' '+t;
      } else if(lastTag==='도입'){
        r.intro+=' '+t;
      } else if(lastTag==='인사이트'){
        r.insightBox+=' '+t;
      } else if(r.body.length>0){
        /* 어떤 태그 뒤든 본문이 있으면 마지막 본문에 이어붙이기 */
        r.body[r.body.length-1]+=' '+t;
      }
    }
  }
  /* 빈 본문 항목 제거 */
  r.body=r.body.filter(function(b){return b.trim().length>0;});
  /* 본문 안에 "인사이트 요약"이 섞여 들어간 경우 분리 */
  if(!r.insightBox){
    for(var bi=r.body.length-1;bi>=0;bi--){
      var raw=r.body[bi].replace(/<[^>]+>/g,'');
      var insIdx=raw.indexOf('인사이트 요약');
      if(insIdx===-1)insIdx=raw.indexOf('💡 인사이트');
      if(insIdx===-1)insIdx=raw.indexOf('💡인사이트');
      if(insIdx!==-1){
        var before=r.body[bi].substring(0,insIdx).trim();
        var after=raw.substring(insIdx).replace(/^💡\s*/,'').replace(/^인사이트 요약/,'').replace(/^인사이트/,'').trim();
        if(after.length>10)r.insightBox=after;
        if(before.length>10)r.body[bi]=before;else r.body.splice(bi,1);
        break;
      }
    }
  }
  /* 인사이트가 여전히 없으면 마지막 본문에서 자동 생성 */
  if(!r.insightBox&&r.body.length>0){
    var lastBody=r.body[r.body.length-1].replace(/<[^>]+>/g,'');
    if(lastBody.length>60)r.insightBox=lastBody.substring(0,200);
  }
  console.log('Parsed body count:',r.body.length);
  if(!r.title)r.title=title;if(!r.subtitle)r.subtitle=title;
  r.title=stripMd(r.title);r.titleB=stripMd(r.titleB||'');r.titleC=stripMd(r.titleC||'');r.subtitle=stripMd(r.subtitle);r.intro=stripMd(r.intro);
  r.body=r.body.map(stripMd);r.redirect=stripMd(r.redirect);r.insightBox=stripMd(r.insightBox);r.oneliner=stripMd(r.oneliner);
  return r;
}

function fallback(paras,title){
  var f=paras.filter(function(p){return!p.isH&&p.text.length>40;});
  return{title:title,subtitle:title,intro:'',
    body:f.slice(0,3).map(function(p){return p.text.substring(0,200);}),redirect:'자세한 내용은 원문에서 확인해보세요.',
    insightBox:'',oneliner:title,stat:null};
}

/* ===== Build Newsletter HTML (순살 스타일) ===== */
function buildNL(sections){
  var ds=selectedDate();
  var mainTitle=sections[0].ai.title;
  var ff="font-family:'Noto Sans KR','Pretendard',sans-serif;letter-spacing:-0.2px;";
  var S='';

  /* === HEADER === */
  S+='<div style="text-align:center;padding:28px 0 24px;border-bottom:3px solid #111">';
  S+='<div style="font-size:11px;letter-spacing:-0.27px;color:#3B48CC;text-transform:uppercase;font-weight:600;margin-bottom:6px;font-family:\'Nanum Gothic\',sans-serif;font-style:italic">IGAWorks Newsletter</div>';
  S+='<div style="font-size:22px;font-weight:900;color:#111;line-height:1.4;margin-bottom:6px;word-break:keep-all;'+ff+'">'+mainTitle+'</div>';
  S+='<div style="font-size:12px;color:#999;'+ff+'">'+ds+'</div>';
  S+='</div>';

  /* === 인트로 + 이번 주 주요 인사이트 통합 박스 (순살크립토 스타일) === */
  S+='<div data-src-idx="intro" data-el="box" style="background:#FBFBFF;padding:24px 20px 20px;border-radius:10px;margin:28px 0 0;border:1px solid #E5E7EB;color:#222;'+ff+'">';

  /* 인사 + AI 도입 */
  S+='<div style="color:#111;margin-bottom:18px;font-size:16px;line-height:1.8">안녕하세요, 아이지에이웍스입니다!</div>';

  /* AI가 생성한 도입 텍스트 — 인사 중복 제거 */
  var introText='';
  var firstIntro='';
  var otherIntros=[];
  for(var ii=0;ii<sections.length;ii++){
    if(sections[ii].ai.intro){
      var cleaned=sections[ii].ai.intro.replace(/안녕하세요[,.]?\s*(아이지에이웍스|IGAWorks)[^.!]*[.!]?\s*/gi,'').trim();
      if(!cleaned)continue;
      if(!firstIntro)firstIntro=cleaned;
      else otherIntros.push(sections[ii].ai.title||sections[ii].tag);
    }
  }
  if(firstIntro){
    var introLines=firstIntro.split('\n').filter(function(l){return l.trim();});
    for(var il=0;il<introLines.length;il++){
      S+='<div style="margin-bottom:12px;color:#222;font-size:16px;line-height:1.8">'+introLines[il].trim()+'</div>';
    }
  }
  if(otherIntros.length>0){
    S+='<div style="margin-bottom:12px;color:#222;font-size:16px;line-height:1.8">이번 주에는 '+otherIntros.map(function(t){return'<b>'+esc(cleanBr(t))+'</b>';}).join(', ')+' 소식도 함께 준비했습니다.</div>';
  }

  /* 구분선 */
  S+='<div style="border-top:1px solid #D5D2CA;margin:20px 0 18px"></div>';

  /* 이번 주 주요 인사이트 목차 — div 기반 (편집 가능) */
  S+='<div>';
  S+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><div style="width:3px;height:18px;background:#3B48CC;border-radius:2px;flex-shrink:0"></div><div style="font-size:14px;font-weight:800;color:#111">이번 주 주요 인사이트</div></div>';
  /* 같은 태그 중복 제거 — 태그별로 첫 번째 제목만 표시 */
  var tocSeen={};
  for(var ti=0;ti<sections.length;ti++){
    var tocTag=sections[ti].tag;
    if(tocSeen[tocTag])continue;
    tocSeen[tocTag]=true;
    var tocTitle=sections[ti].ai.title||sections[ti].ai.subtitle;
    S+='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:4px;border:1px solid #D5D2CA;border-radius:6px">';
    S+='<span style="font-size:11px;font-weight:700;color:#fff;background:#3B48CC;padding:3px 10px;border-radius:4px;white-space:nowrap;flex-shrink:0">'+esc(tocTag)+'</span>';
    S+='<span style="font-size:13px;color:#333;line-height:1.5;word-break:keep-all">'+cleanBr(tocTitle)+'</span>';
    S+='</div>';
  }

  S+='</div>';
  S+='</div>';

  /* === SECTIONS === */
  for(var si=0;si<sections.length;si++){
    var sec=sections[si],ai=sec.ai,data=sec.data;

    /* 섹션 래퍼 (드래그 순서 변경용) */
    S+='<div data-section="'+si+'" data-track-url="'+esc(sec.trackingUrl||'')+'" style="position:relative">';

    /* 구분선 + 태그 라인 */
    S+='<div style="border-top:1px solid #D5D2CA;margin:36px 0 0;padding-top:20px">';
    S+='<div style="display:inline-block;font-size:11px;font-weight:700;color:#3B48CC;background:#FBFBFF;padding:4px 12px;border-radius:4px;letter-spacing:0.5px;margin-bottom:16px;border:1px solid #E5E7EB">'+esc(sec.tag);
    S+='</div></div>';

    /* 이모지 + 제목 */

    var secTrackLink=sec.trackingUrl||'';

    /* 썸네일 1개만 (첫 번째 이미지) */
    var validImgs=data.imgs.filter(function(s){return s&&s.indexOf('http')===0;});
    if(validImgs.length>0){
      var thumbTag='<img src="'+validImgs[0]+'" alt="" onerror="this.remove()" style="width:100%;max-width:100%;height:auto;border-radius:8px;margin:0 0 20px;display:block">';
      if(secTrackLink)thumbTag='<a href="'+esc(secTrackLink)+'" target="_blank" style="display:block">'+thumbTag+'</a>';
      S+=thumbTag;
    }

    /* 본문 */
    var isProse=(sec.writeStyle==='prose');
    for(var bi=0;bi<ai.body.length;bi++){
      var bodyText=ai.body[bi];
      /* ◾■▪ 불릿 + 번호 제거 */
      bodyText=bodyText.replace(/^[◾■▪]\s*/,'');
      bodyText=bodyText.replace(/^\d+[.)\]번]\s*/,'');
      /* 전체가 <strong>으로 감싸진 경우 제거 */
      var rawText=bodyText.replace(/<[^>]+>/g,'');
      bodyText=bodyText.replace(/^<strong>(.+)<\/strong>$/,'$1');
      /* 본문의 70% 이상이 <strong>이면 모두 제거 */
      var plainLen=rawText.length;
      var strongContent=bodyText.match(/<strong>(.+?)<\/strong>/g);
      var strongLen=0;if(strongContent)strongContent.forEach(function(s){strongLen+=s.replace(/<[^>]+>/g,'').length;});
      if(plainLen>0&&strongLen/plainLen>0.7)bodyText=bodyText.replace(/<\/?strong>/g,'');

      if(isProse){
        /* 강조 박스 — 80자 초과면 일반 본문으로 */
        if(bodyText.indexOf('__HIGHLIGHT__')===0){
          var hlText=bodyText.replace('__HIGHLIGHT__','').trim();
          var hlPlain=hlText.replace(/<[^>]+>/g,'');
          if(hlPlain.length<=80){
            S+='<div data-src-idx="s'+si+'b'+bi+'" data-el="box" style="background:linear-gradient(135deg,#F8F7FF 0%,#F0EEFF 100%);padding:12px 18px 12px 16px;border-radius:10px;margin:14px 0;border:1px solid #E0DEFF;color:#3B48CC;font-size:14px;line-height:1.7;font-weight:600;display:flex;align-items:flex-start;gap:8px;'+ff+'"><span style="font-size:16px;flex-shrink:0">💡</span><span>'+hlText.replace(/<\/?strong>/g,'')+'</span></div>';
          } else {
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:16px;line-height:1.8;font-weight:400">'+hlText.replace(/<\/?strong>/g,'')+'</p>';
          }
          continue;
        }
        /* 본문 안에 ❶❷❸ 번호가 중간에 섞여있으면 분리 */
        var circleRx=/[\u2776-\u277F\u2460-\u2473\u24EB-\u24FF❶❷❸❹❺❻❼❽❾❿]/;
        var plainBody=bodyText.replace(/<[^>]+>/g,'');
        var firstCirclePos=plainBody.search(circleRx);
        /* 번호가 맨 앞이 아니라 중간에 있으면 앞부분을 먼저 일반 본문으로 출력 */
        if(firstCirclePos>10){
          /* HTML에서 해당 위치 찾기 */
          var htmlPos=0,charCnt=0;
          for(htmlPos=0;htmlPos<bodyText.length;htmlPos++){
            if(bodyText[htmlPos]==='<'){while(htmlPos<bodyText.length&&bodyText[htmlPos]!=='>')htmlPos++;continue;}
            if(charCnt===firstCirclePos)break;
            charCnt++;
          }
          var beforeCircle=bodyText.substring(0,htmlPos).trim();
          var afterCircle=bodyText.substring(htmlPos).trim();
          if(beforeCircle){
            S+='<p data-src-idx="s'+si+'b'+bi+'a" style="color:#222;margin:0 0 20px;font-size:16px;line-height:1.8;font-weight:400">'+beforeCircle.replace(/<\/?strong>/g,'')+'</p>';
          }
          bodyText=afterCircle;
        }
        /* 줄글형: ❶❷❸ 번호가 있으면 번호 제목 + 문단으로 분리 */
        var circleMatch=bodyText.match(/^([\u2776-\u277F\u2460-\u2473\u24EB-\u24FF❶❷❸❹❺❻❼❽❾❿])\s*(.+)/);
        if(circleMatch){
          var numTitle=circleMatch[2];
          var nlIdx=numTitle.indexOf('\\n');
          if(nlIdx===-1)nlIdx=numTitle.indexOf('\n');
          /* 줄바꿈이 없으면 첫 문장까지를 제목으로 분리 */
          if(nlIdx===-1){
            var plainNum=numTitle.replace(/<[^>]+>/g,'');
            /* 한국어: "다." "요." "까?" "죠." 등 뒤에 공백 또는 다음 문자 */
            var sentEnd=-1;
            var sentRx=/[다요죠음됨임까니][\.\?!]/g;
            var sentMatch;
            while((sentMatch=sentRx.exec(plainNum))!==null){
              if(sentMatch.index>5&&sentMatch.index<100){
                sentEnd=sentMatch.index+2;
                break;
              }
            }
            if(sentEnd>0){
              /* HTML 태그 고려해서 실제 위치 찾기 */
              var charCount=0;
              for(var ci=0;ci<numTitle.length;ci++){
                if(numTitle[ci]==='<'){while(ci<numTitle.length&&numTitle[ci]!=='>')ci++;continue;}
                if(charCount===sentEnd){nlIdx=ci;break;}
                charCount++;
              }
            }
          }
          if(nlIdx>0){
            var pTitle=circleMatch[1]+' '+numTitle.substring(0,nlIdx).replace(/\\n/,'').trim();
            var pBody=numTitle.substring(nlIdx).replace(/^\\?n?\s*/,'').trim();
            /* 구분선 (첫 번째 본문 제외) */
            if(bi>0)S+='<hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0">';
            S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 24px">';
            S+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:12px;'+ff+'">'+pTitle+'</div>';
            if(pBody){
              pBody=pBody.replace(/<\/?strong>/g,'');
              S+='<p style="color:#222;margin:0;font-size:16px;line-height:1.8;font-weight:400">'+pBody+'</p>';
            }
            S+='</div>';
          } else {
            /* 번호는 있지만 분리 안 됨 → 전체를 일반 본문으로 */
            var fullText=(circleMatch[1]+' '+numTitle).replace(/<\/?strong>/g,'');
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:16px;line-height:1.8;font-weight:400">'+fullText+'</p>';
          }
        } else {
          /* 줄글형 일반 본문: strong 태그 제거 */
          var proseBody=bodyText.replace(/<\/?strong>/g,'');
          S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:16px;line-height:1.8;font-weight:400">'+proseBody+'</p>';
        }
      } else {
      bodyText=bodyText.replace(/^<strong>(.+)<\/strong>$/,'$1');
      /* 본문의 70% 이상이 <strong>이면 모두 제거 (키워드만 볼드여야 함) */
      var plainLen=rawText.length;
      var strongContent=bodyText.match(/<strong>(.+?)<\/strong>/g);
      var strongLen=0;if(strongContent)strongContent.forEach(function(s){strongLen+=s.replace(/<[^>]+>/g,'').length;});
      if(plainLen>0&&strongLen/plainLen>0.7)bodyText=bodyText.replace(/<\/?strong>/g,'');
      /* 소제목 판별: 이모지로 시작하고 콜론이 있으면 소제목:본문 분리 */
      /* 이모지로 시작하면 무조건 소제목 */
      var emojiRegex=/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}\u{200D}]/u;
      var plainStart=bodyText.replace(/<[^>]+>/g,'').trim();
      var hasEmoji=emojiRegex.test(plainStart);
      var colonIdx=bodyText.indexOf(':');
      var subTitle='',bodyContent=bodyText;
      if(hasEmoji&&colonIdx>3&&colonIdx<50){
        var before=bodyText.substring(0,colonIdx).replace(/<[^>]+>/g,'').trim();
        var after=bodyText.substring(colonIdx+1).trim();
        if(after.length>20){subTitle=before;bodyContent=after;}
      } else if(hasEmoji&&colonIdx===-1){
        /* 콜론 없이 이모지로 시작하는 짧은 줄 = 소제목만 (본문은 다음 [본문]에) */
        if(plainStart.length<60){subTitle=plainStart;bodyContent='';}
      }
      if(subTitle){
        S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 20px">';
        S+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;'+ff+'">'+esc(subTitle)+'</div>';
        if(bodyContent)S+='<p style="color:#222;margin:0;font-size:16px;line-height:1.8">'+bodyContent+'</p>';
        S+='</div>';
      } else {
        S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:16px;line-height:1.8">'+bodyText+'</p>';
      }
      } /* end isProse else */
    }

    /* 인사이트 요약 박스 */
    if(ai.insightBox){
      if(isProse){
        /* 줄글형: 유도 + 인사이트를 하나로 합침 */
        S+='<div data-el="box" contenteditable="inherit" style="background:linear-gradient(135deg,#F8F7FF 0%,#F0EEFF 100%);border:1px solid #E0DEFF;padding:20px 24px;border-radius:12px;margin:20px 0;color:#222;'+ff+'">';
        /* 제목 */
        S+='<div style="font-size:16px;font-weight:700;color:#3B48CC;margin-bottom:14px">📎 더 자세히 알아보기</div>';
        /* 불릿 질문 */
        var insightRaw=ai.insightBox.replace(/🤔\s*/g,'').replace(/리포트\s*본문에서\s*직접\s*확인[^•\n]*/gi,'').trim();
        var redirectText=(ai.redirect||'').replace(/<\/?strong>/g,'').replace(/리포트\s*본문에서[^.]*[.!]?\s*/gi,'').trim();
        /* * · • \n 또는 ? 뒤 공백으로 분리 */
        var insightLines=insightRaw.split(/[•·*\n]|(?<=\?)\s+/).filter(function(l){return l.trim().length>5&&!/리포트.*본문|확인.*보세요/i.test(l);});
        if(insightLines.length>0){
          for(var il=0;il<insightLines.length;il++){
            var iLine=insightLines[il].trim().replace(/^[•·\-]\s*/,'');
            S+='<div style="margin-bottom:10px;font-size:15px;line-height:1.7;padding-left:20px;position:relative"><span style="position:absolute;left:0;color:#111;font-size:16px">•</span>'+iLine+'</div>';
          }
        }
        /* 마무리 문장 */
        if(redirectText&&redirectText.length>10){
          S+='<div style="font-size:15px;line-height:1.7;margin-top:14px;color:#475569">'+redirectText+'</div>';
        }
        var origLink=secTrackLink||sec.url;
        S+='<div style="margin-top:16px;text-align:right"><a href="'+esc(origLink)+'" target="_blank" style="font-size:16px;color:#3B48CC;text-decoration:none;font-weight:600">확인하기 →</a></div>';
        S+='</div>';
      } else {
        /* 소제목형: 기존 스타일 */
        S+='<div data-el="box" contenteditable="inherit" style="background:#FBFBFF;border:1px solid #E5E7EB;border-left:4px solid #3B48CC;padding:20px 24px;border-radius:0 10px 10px 0;margin:20px 0;color:#222;'+ff+'">';
        S+='<div style="font-weight:700;color:#3B48CC;margin-bottom:10px">💡 더 깊이 들여다보기</div>';
        var insightLines=ai.insightBox.split('\n').filter(function(l){return l.trim();});
        for(var il=0;il<insightLines.length;il++){
          S+='<div style="margin-bottom:6px;font-size:16px;line-height:1.8">'+insightLines[il].trim()+'</div>';
        }
        var origLink=secTrackLink||sec.url;
        S+='<div style="margin-top:12px;text-align:right"><a href="'+esc(origLink)+'" target="_blank" style="font-size:18px;color:#3B48CC;text-decoration:none;font-weight:600">&#128206; 원문 보기 &rarr;</a></div>';
        S+='</div>';
      }
    }

    /* 유도 → 인사이트 요약 안의 원문 보기로 대체, 별도 유도 텍스트 제거 */

    S+='</div>'; /* data-section 닫기 */
  }

  /* === 더 많은 아티클 CTA === */
  S+='<div data-el="box" style="text-align:center;margin:36px 0 8px;padding:20px 20px;background:#FBFBFF;border-radius:10px;border:1px solid #E5E7EB">';
  S+='<div style="font-size:16px;font-weight:700;color:#111;margin-bottom:4px;'+ff+'">더 많은 아티클이 궁금하다면?</div>';
  S+='<div style="font-size:12px;color:#999;margin-bottom:14px">아이지에이웍스 블로그에서 더 다양한 인사이트를 확인해보세요.</div>';
  S+='<a data-el="btn" href="https://igaworks.ap2.dfn.link/api/v1/click/ZtZYQmIYEEue0fG6fSRQrA" target="_blank" style="display:inline-block;font-size:14px;font-weight:600;color:#3B48CC;background:#fff;border:1.5px solid #3B48CC;padding:10px 28px;border-radius:4px;text-decoration:none;'+ff+'">블로그 아티클 바로가기 →</a>';
  S+='</div>';

  /* === 솔루션별 한줄 요약 카드 === */
  S+='<div style="height:32px"></div>';

  /* === FOOTER === */
  S+='<div style="background:#fff;padding:28px 24px;border-top:1px solid #E5E7EB;margin-top:0;font-size:12px;line-height:1.8;color:#999;text-align:center">';
  S+='본 메일은 '+ds+' 기준 마케팅수신활용 거부에 해당되지 않는 분들에게 제공됩니다.<br>';
  S+='수신을 원하지 않을 경우 하단의 수신거부를 눌러주세요.<br>';
  S+='<a href="mailto:marketing@igaworks.com" style="color:#3B48CC;text-decoration:underline">marketing@igaworks.com</a><br>';
  S+='<a href="https://page.stibee.com/unsubscribe/195858?token=MTk1ODU4LzMyNjc1NDUvMTU0MTg1Lw" style="color:#888;text-decoration:underline">수신거부 Unsubscribe</a>';
  S+='</div>';

  return{html:S,tag:(sections[0]&&sections[0].tag)||'#INSIGHT'};
}

/* ===== Original Panel ===== */
function buildOrigSections(sections){
  var h='';
  /* 여러 섹션이면 탭 UI */
  if(sections.length>1){
    h+='<div style="display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid #E2E8F0;margin-bottom:12px">';
    for(var ti=0;ti<sections.length;ti++){
      h+='<button class="orig-tab" data-ot="'+ti+'" style="padding:6px 12px;border:none;border-bottom:2px solid '+(ti===0?'#1E293B':'transparent')+';background:none;font-size:11px;font-weight:'+(ti===0?'700':'500')+';color:'+(ti===0?'#1E293B':'#94A3B8')+';cursor:pointer">'+esc(sections[ti].tag)+'</button>';
    }
    h+='</div>';
  }
  for(var si=0;si<sections.length;si++){
    var sec=sections[si];
    h+='<div class="orig-section" data-os="'+si+'" style="'+(si>0?'display:none;':'')+'margin-bottom:28px;padding-bottom:20px">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 12px;background:#FBFBFF;border-radius:8px">';
    h+='<span style="font-size:13px;font-weight:700;color:#3B48CC">'+esc(sec.tag)+'</span>';
    h+='<a href="'+esc(sec.url)+'" target="_blank" style="font-size:12px;color:#888;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">'+esc(sec.url)+'</a></div>';
    h+='<div style="font-size:15px;font-weight:700;color:#111;margin-bottom:12px">'+esc(sec.data.title)+'</div>';
    for(var pi=0;pi<sec.data.paras.length;pi++){
      var p=sec.data.paras[pi],idx=sec._origStart+pi,tag=p.isH?'h4':'p';
      h+='<'+tag+' data-orig-idx="'+idx+'" style="margin-bottom:10px;line-height:1.8;font-size:14px;cursor:pointer;padding:4px 6px">'+esc(p.text)+'</'+tag+'>';
    }
    h+='</div>';
  }
  return h;
}

/* ===== Highlighting ===== */
function clearHL(){document.querySelectorAll('.hl-active').forEach(function(el){el.classList.remove('hl-active');});}
function getBigrams(text){var w=text.replace(/<[^>]+>/g,'').trim().split(/\s+/).filter(function(x){return x.length>1;});var bg=[];for(var i=0;i<w.length-1;i++)bg.push(w[i]+' '+w[i+1]);return bg;}
function getKeywords(text){return text.replace(/<[^>]+>/g,'').trim().split(/\s+/).filter(function(x){return x.length>2;});}
function findBestMatch(src,targets){
  var sb=getBigrams(src),sk=getKeywords(src);
  if(sb.length<1&&sk.length<1)return null;
  var best=null,bs=0;
  targets.forEach(function(el){
    var tb=getBigrams(el.textContent),tk=getKeywords(el.textContent);
    /* bigram 매칭 */
    var ov=0;
    if(sb.length>0&&tb.length>0){for(var i=0;i<sb.length;i++)if(tb.indexOf(sb[i])!==-1)ov++;var sc=ov/Math.min(sb.length,tb.length);if(sc>bs){bs=sc;best=el;}}
    /* 키워드 매칭 (한국어 보완) */
    if(sk.length>0&&tk.length>0){var kOv=0;for(var j=0;j<sk.length;j++)if(tk.indexOf(sk[j])!==-1)kOv++;var kSc=kOv/Math.min(sk.length,tk.length);if(kSc>bs){bs=kSc;best=el;}}
  });
  return bs>=0.08?best:null;
}
/* 여러 원본 단락과 매칭 (상위 매칭 모두 하이라이트) */
function findTopMatches(src,targets,maxCount){
  var sb=getBigrams(src),sk=getKeywords(src);
  if(sb.length<1&&sk.length<1)return[];
  var scores=[];
  targets.forEach(function(el){
    var tb=getBigrams(el.textContent),tk=getKeywords(el.textContent);
    var sc=0;
    if(sb.length>0&&tb.length>0){var ov=0;for(var i=0;i<sb.length;i++)if(tb.indexOf(sb[i])!==-1)ov++;sc=ov/Math.min(sb.length,tb.length);}
    if(sk.length>0&&tk.length>0){var kOv=0;for(var j=0;j<sk.length;j++)if(tk.indexOf(sk[j])!==-1)kOv++;var kSc=kOv/Math.min(sk.length,tk.length);if(kSc>sc)sc=kSc;}
    if(sc>=0.05)scores.push({el:el,sc:sc});
  });
  scores.sort(function(a,b){return b.sc-a.sc;});
  return scores.slice(0,maxCount||5);
}
function setupHL(){
  var nlEls=NL.querySelectorAll('[data-src-idx]');
  var origEls=origOut.querySelectorAll('[data-orig-idx]');
  nlEls.forEach(function(el){
    el.addEventListener('click',function(e){
      if(isEditable)return;e.stopPropagation();clearHL();
      el.classList.add('hl-active');
      /* 원본에서 상위 매칭 단락들 모두 하이라이트 */
      var matches=findTopMatches(el.textContent,origEls,5);
      if(matches.length>0){
        matches.forEach(function(m){m.el.classList.add('hl-active');});
        matches[0].el.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
  });
  origEls.forEach(function(el){
    el.addEventListener('click',function(){
      clearHL();el.classList.add('hl-active');
      var matches=findTopMatches(el.textContent,nlEls,3);
      if(matches.length>0){
        matches.forEach(function(m){m.el.classList.add('hl-active');});
        matches[0].el.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
  });
}

/* ===== Edit ===== */
var hasOrigData=false;
on('#edit-toggle','click',function(){
  isEditable=!isEditable;NL.contentEditable=isEditable;
  NL.classList.toggle('editable',isEditable);this.classList.toggle('active',isEditable);
  this.innerHTML=isEditable?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 편집 완료':'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
  var ep=qs('#edit-panel');
  ep.classList.toggle('open',isEditable);
  if(isEditable){clearHL();syncToolbar();}
});
/* 도구 패널 X 닫기 */
on('#ep-close','click',function(){
  isEditable=false;NL.contentEditable=false;
  NL.classList.remove('editable');qs('#edit-toggle').classList.remove('active');
  qs('#edit-toggle').innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
  qs('#edit-panel').classList.remove('open');
});

/* 툴바 셀렉터를 NL의 현재 스타일에 동기화 */
function syncToolbar(){
  /* 커서 위치의 요소 또는 NL 전체에서 스타일 읽기 */
  var target=NL;
  var sel=window.getSelection();
  if(sel.rangeCount>0){var node=sel.anchorNode;if(node){if(node.nodeType===3)node=node.parentNode;if(node&&NL.contains(node))target=node;}}
  var cs=window.getComputedStyle(target);
  /* line-height */
  var lh=target.style.lineHeight||NL.style.lineHeight||'';
  if(!lh||lh==='normal'){var lhPx=parseFloat(cs.lineHeight);var fsPx=parseFloat(cs.fontSize)||16;lh=String(Math.round(lhPx/fsPx*10)/10);}
  if(lh.indexOf('px')!==-1){var fsPx2=parseFloat(cs.fontSize)||16;lh=String(Math.round(parseFloat(lh)/fsPx2*10)/10);}
  var lhSel=qs('#line-height-select');
  for(var i=0;i<lhSel.options.length;i++){if(lhSel.options[i].value===lh){lhSel.selectedIndex=i;break;}}
  /* letter-spacing */
  var ls=target.style.letterSpacing||NL.style.letterSpacing||cs.letterSpacing;
  var lsSel=qs('#letter-spacing-select');
  for(var j=0;j<lsSel.options.length;j++){if(lsSel.options[j].value===ls){lsSel.selectedIndex=j;break;}}
  /* font-size */
  var fsVal=String(parseInt(target.style.fontSize||NL.style.fontSize||cs.fontSize)||16);
  var fsSel=qs('#font-size');
  for(var k=0;k<fsSel.options.length;k++){if(fsSel.options[k].value===fsVal){fsSel.selectedIndex=k;break;}}
}

/* ===== Stibee Export ===== */
function stibeeHTML(){
  var clone=NL.cloneNode(true);
  clone.querySelectorAll('[data-src-idx]').forEach(function(el){el.removeAttribute('data-src-idx');});
  clone.querySelectorAll('[data-el]').forEach(function(el){el.removeAttribute('data-el');});
  clone.querySelectorAll('[contenteditable]').forEach(function(el){el.removeAttribute('contenteditable');});
  clone.querySelectorAll('[style*="user-select"]').forEach(function(el){el.style.userSelect='';});
  clone.querySelectorAll('.hl-active').forEach(function(el){el.classList.remove('hl-active');el.style.background='';});
  clone.querySelectorAll('[onerror]').forEach(function(el){el.removeAttribute('onerror');});
  /* base64 이미지 제거 + 경고 */
  var hasBase64=false;
  var hasBadUrl=false;
  clone.querySelectorAll('img').forEach(function(img){
    if(img.src&&img.src.indexOf('data:')===0){hasBase64=true;img.remove();return;}
    /* ibb.co 페이지 링크 감지 (i.ibb.co가 아닌 ibb.co) */
    if(img.src&&img.src.indexOf('ibb.co')!==-1&&img.src.indexOf('i.ibb.co')===-1){hasBadUrl=true;}
    /* max-width 보장 */
    if(!img.style.maxWidth)img.style.maxWidth='100%';
    if(!img.style.height||img.style.height==='auto')img.style.height='auto';
  });
  if(hasBase64)toast('⚠️ base64 이미지는 제거됐어요. 파일 업로드 시 자동 URL 변환을 이용하세요.');
  if(hasBadUrl)toast('⚠️ ibb.co 페이지 링크가 있어요. 이미지가 안 보일 수 있어요. i.ibb.co 직접 링크를 사용하세요.');
  /* 불필요한 속성 정리 (HTML 크기 줄이기) */
  clone.querySelectorAll('[class]').forEach(function(el){el.removeAttribute('class');});
  clone.querySelectorAll('[tabindex]').forEach(function(el){el.removeAttribute('tabindex');});
  clone.querySelectorAll('[spellcheck]').forEach(function(el){el.removeAttribute('spellcheck');});
  /* NL에 적용된 inline style 반영 */
  var nlColor=NL.style.color||'#222';
  var nlLH=NL.style.lineHeight||'1.8';
  var nlLS=NL.style.letterSpacing||'-0.27px';
  var nlFS=NL.style.fontSize||'16px';
  var inner=clone.innerHTML;
  /* HTML 크기 체크 */
  var sizeKB=Math.round(inner.length/1024);
  if(sizeKB>90)toast('⚠️ HTML '+sizeKB+'KB — Gmail은 102KB 넘으면 잘려요!');
  return'<div style="font-family:Noto Sans KR,Pretendard,Apple SD Gothic Neo,sans-serif;letter-spacing:'+nlLS+';line-height:'+nlLH+';font-size:'+nlFS+';color:'+nlColor+';max-width:600px;margin:0 auto;background:#fff;padding:40px 24px;width:100%;box-sizing:border-box">'+inner+'</div>';
}
on('#copy-html-btn','click',function(){
  var html=stibeeHTML();
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(html).then(function(){toast('HTML 복사됨!');});
  else{var ta=document.createElement('textarea');ta.value=html;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('HTML 복사됨!');}
});

/* ===== 스티비로 보내기 (HTML 복사 + 새 탭) ===== */
on('#stibee-upload-btn','click',function(){
  var html=stibeeHTML();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(html).then(function(){
      qs('#stibee-modal').classList.remove('hidden');
    });
  } else {
    var ta=document.createElement('textarea');ta.value=html;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    qs('#stibee-modal').classList.remove('hidden');
  }
});
on('#stibee-open','click',function(){
  window.open('https://stibee.com/app/emails/new','_blank');
  qs('#stibee-modal').classList.add('hidden');
  toast('스티비에서 HTML 상자에 붙여넣기 하세요');
});
on('#stibee-close','click',function(){qs('#stibee-modal').classList.add('hidden');});

/* ===== Undo ===== */
var undoStack=[];
function saveUndo(){undoStack.push(NL.innerHTML);if(undoStack.length>30)undoStack.shift();}
/* 편집 시 자동 저장 (debounced) */
var undoTimer=null;
NL.addEventListener('input',function(){clearTimeout(undoTimer);undoTimer=setTimeout(saveUndo,800);});

/* ===== 뉴스레터 줌 컨트롤 ===== */
(function(){
  var zoomLevels=[60,75,90,100];
  var zoomIdx=3; // 기본 100%
  function applyZoom(){
    var z=zoomLevels[zoomIdx];
    var NLout=qs('#newsletter-output');
    if(NLout){NLout.style.transform='scale('+z/100+')';NLout.style.marginBottom=-(100-z)*6.8+'px';}
    var lbl=qs('#zoom-label');
    if(lbl)lbl.textContent=z+'%';
  }
  qs('#zoom-in-btn').addEventListener('click',function(){if(zoomIdx<zoomLevels.length-1){zoomIdx++;applyZoom();}});
  qs('#zoom-out-btn').addEventListener('click',function(){if(zoomIdx>0){zoomIdx--;applyZoom();}});
})();

/* ===== Email Preview ===== */
on('#preview-btn','click',function(){
  var html=stibeeHTML();
  var frame=qs('#preview-frame');
  frame.innerHTML=html;
  qs('#preview-modal').classList.remove('hidden');
});
on('#preview-close','click',function(){qs('#preview-modal').classList.add('hidden');});

/* ===== 원본 대조 토글 ===== */
on('#compare-toggle','click',function(){
  if(!hasOrigData){toast('최신 생성 뉴스레터에만 가능합니다');return;}
  isComparing=!isComparing;
  var op=qs('#original-panel'),dv=qs('#panel-divider'),btn=qs('#compare-toggle');
  if(isComparing){
    op.classList.remove('hidden');dv.classList.remove('hidden');
    btn.classList.add('active');
  } else {
    op.classList.add('hidden');dv.classList.add('hidden');
    btn.classList.remove('active');
  }
});

/* ===== Drafts (임시저장) ===== */
function getDrafts(){try{return JSON.parse(localStorage.getItem('nl-drafts')||'[]');}catch(e){return[];}}
function saveDrafts(d){localStorage.setItem('nl-drafts',JSON.stringify(d));}
function renderDrafts(){
  var dl=qs('#drafts-list');if(!dl)return;
  var drafts=getDrafts();
  if(!drafts.length){dl.innerHTML='<p class="history-empty">임시저장된 뉴스레터가 없습니다.</p>';return;}
  dl.innerHTML=drafts.map(function(d,i){
    return'<div class="history-item" data-di="'+i+'"><div style="display:flex;justify-content:space-between;align-items:start"><div class="hi-title">'+esc(d.name)+'</div><button class="draft-del" data-dd="'+i+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">✕</button></div><div class="hi-date">'+d.date+'</div><span class="hi-tag" style="background:#6366F1">임시저장</span></div>';
  }).join('');
}
var currentDraftName=null;
on('#save-draft-btn','click',function(){
  var name=currentDraftName||prompt('임시저장 이름:');
  if(!name)return;
  var drafts=getDrafts();
  /* 같은 이름 있으면 덮어쓰기 */
  var existIdx=-1;
  for(var i=0;i<drafts.length;i++){if(drafts[i].name===name){existIdx=i;break;}}
  if(existIdx>=0){drafts[existIdx].html=NL.innerHTML;drafts[existIdx].date=today();}
  else{drafts.unshift({name:name,date:today(),html:NL.innerHTML});if(drafts.length>10)drafts.length=10;}
  currentDraftName=name;
  saveDrafts(drafts);renderDrafts();toast('임시저장 완료: '+name);
});
on('#drafts-list','click',function(e){
  var del=e.target.closest('.draft-del');
  if(del){e.stopPropagation();var drafts=getDrafts();var delName=drafts[+del.dataset.dd]&&drafts[+del.dataset.dd].name;drafts.splice(+del.dataset.dd,1);saveDrafts(drafts);renderDrafts();if(currentDraftName===delName)currentDraftName=null;toast('임시저장 삭제됨');return;}
  var item=e.target.closest('[data-di]');
  if(item){var drafts=getDrafts();var idx=+item.dataset.di;if(drafts[idx]){saveUndo();NL.innerHTML=drafts[idx].html;currentDraftName=drafts[idx].name;hasOrigData=false;showEditor();sidebar.classList.remove('open');rebuildSectionChips();toast('임시저장 불러옴: '+drafts[idx].name);}}
});

/* ===== Toolbar ===== */
/* 서식 버튼 mousedown에서 선택 유지 */
qsa('.ep-fmt[data-cmd]').forEach(function(btn){
  btn.addEventListener('mousedown',function(e){e.preventDefault();});
  btn.addEventListener('click',function(){
    if(!isEditable)return;
    if(colorSavedRange){var sel=window.getSelection();sel.removeAllRanges();sel.addRange(colorSavedRange.cloneRange());}
    var cmd=btn.dataset.cmd;
    /* 버튼(data-el="btn") 정렬: 부모 div의 text-align 변경 */
    if(cmd.indexOf('justify')===0){
      var sel=window.getSelection();
      if(sel.rangeCount){
        var node=sel.anchorNode;if(node&&node.nodeType===3)node=node.parentNode;
        var btnEl=node?node.closest('[data-el="btn"]'):null;
        if(btnEl){
          var align=cmd==='justifyLeft'?'left':cmd==='justifyCenter'?'center':'right';
          var parent=btnEl.parentNode;
          if(parent&&parent!==NL)parent.style.textAlign=align;
          else{var wrap=document.createElement('div');wrap.style.textAlign=align;btnEl.parentNode.insertBefore(wrap,btnEl);wrap.appendChild(btnEl);}
          return;
        }
      }
    }
    document.execCommand(cmd,false,null);
  });
});
on('#font-family','change',function(e){if(isEditable)document.execCommand('fontName',false,e.target.value);});
on('#font-size','change',function(e){
  if(!isEditable)return;
  var size=e.target.value+'px';
  var sel=window.getSelection();if(!sel.rangeCount)return;
  if(sel.isCollapsed){
    /* 선택 없으면 전체 적용 */
    NL.style.fontSize=size;
  } else {
    var range=sel.getRangeAt(0);
    var span=document.createElement('span');
    span.style.fontSize=size;
    try{range.surroundContents(span);}catch(ex){
      var frag=range.extractContents();span.appendChild(frag);range.insertNode(span);
    }
    sel.removeAllRanges();var nr=document.createRange();nr.selectNodeContents(span);sel.addRange(nr);
  }
  NL.focus();
});
/* 색상 변경 시 선택 영역 보존 — 선택 변경 시 자동 저장 + 현재 색상 반영 */
var colorSavedRange=null;
document.addEventListener('selectionchange',function(){
  if(!isEditable)return;
  var sel=window.getSelection();
  if(sel.rangeCount>0&&!sel.isCollapsed&&NL.contains(sel.anchorNode)){
    colorSavedRange=sel.getRangeAt(0).cloneRange();
    /* 선택된 텍스트의 현재 색상을 피커에 반영 */
    var node=sel.anchorNode;if(node.nodeType===3)node=node.parentNode;
    if(node){
      var cs=window.getComputedStyle(node);
      var fc=rgbToHex(cs.color)||'#333333';
      var bc=rgbToHex(cs.backgroundColor);
      qs('#font-color').value=fc;
      qs('#font-color-hex').value=fc;
      /* 배경이 투명이면 기본값 */
      if(bc&&bc!=='#000000'&&bc!=='#ffffff'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent'){
        qs('#bg-color').value=bc;
        qs('#bg-color-hex').value=bc;
      } else {
        qs('#bg-color').value='#ffffff';
        qs('#bg-color-hex').value='';
      }
    }
  } else {
    /* 선택 해제 시 기본값 */
    qs('#font-color').value='#333333';
    qs('#font-color-hex').value='#333333';
    qs('#bg-color').value='#ffffff';
    qs('#bg-color-hex').value='';
  }
});

on('#font-color','input',function(e){
  if(!isEditable)return;
  var color=e.target.value;
  qs('#font-color-hex').value=color;
  var sel=window.getSelection();
  if(colorSavedRange){try{sel.removeAllRanges();sel.addRange(colorSavedRange.cloneRange());}catch(ex){}}
  if(!sel.rangeCount||sel.isCollapsed){
    NL.style.color=color;
  } else {
    document.execCommand('foreColor',false,color);
    if(sel.rangeCount>0)colorSavedRange=sel.getRangeAt(0).cloneRange();
  }
});
on('#font-color-hex','change',function(e){
  var v=e.target.value.trim();
  if(v&&v.charAt(0)!=='#')v='#'+v;
  if(/^#[0-9A-Fa-f]{6}$/.test(v)){qs('#font-color').value=v;qs('#font-color').dispatchEvent(new Event('input'));}
});
/* 배경색 */
on('#bg-color','input',function(e){
  if(!isEditable)return;
  var bg=e.target.value;
  qs('#bg-color-hex').value=bg;
  var sel=window.getSelection();
  if(colorSavedRange){try{sel.removeAllRanges();sel.addRange(colorSavedRange.cloneRange());}catch(ex){}}
  if(!sel.rangeCount||sel.isCollapsed)return;
  document.execCommand('hiliteColor',false,bg);
  if(sel.rangeCount>0)colorSavedRange=sel.getRangeAt(0).cloneRange();
});
on('#bg-color-hex','change',function(e){
  var v=e.target.value.trim();
  if(v&&v.charAt(0)!=='#')v='#'+v;
  if(/^#[0-9A-Fa-f]{6}$/.test(v)){qs('#bg-color').value=v;qs('#bg-color').dispatchEvent(new Event('input'));}
});
on('#line-height-select','change',function(e){
  if(!isEditable)return;
  var val=e.target.value;
  var sel=window.getSelection();
  if(!sel.rangeCount||sel.isCollapsed){
    /* 선택 없으면 전체 적용 — 내부 블록 요소도 모두 변경 */
    NL.style.lineHeight=val;
    NL.querySelectorAll('p,div,li,blockquote').forEach(function(el){
      if(el.closest('[data-el="btn"]'))return;
      if(el.style.lineHeight)el.style.lineHeight=val;
    });
  } else {
    /* 선택 있으면 가장 가까운 블록 요소에 적용 */
    var node=sel.anchorNode;if(node&&node.nodeType===3)node=node.parentNode;
    while(node&&node!==NL&&window.getComputedStyle(node).display==='inline')node=node.parentNode;
    if(node&&node!==NL)node.style.lineHeight=val;
    else NL.style.lineHeight=val;
  }
});
on('#letter-spacing-select','change',function(e){
  if(!isEditable)return;
  var val=e.target.value;
  var sel=window.getSelection();
  if(!sel.rangeCount||sel.isCollapsed){
    /* 선택 없으면 전체 적용 — 내부 요소도 모두 변경 */
    NL.style.letterSpacing=val;
    NL.querySelectorAll('p,div,span,li,blockquote').forEach(function(el){
      if(el.closest('[data-el="btn"]'))return;
      if(el.style.letterSpacing)el.style.letterSpacing=val;
    });
  } else {
    var node=sel.anchorNode;if(node&&node.nodeType===3)node=node.parentNode;
    while(node&&node!==NL&&window.getComputedStyle(node).display==='inline')node=node.parentNode;
    if(node&&node!==NL)node.style.letterSpacing=val;
    else NL.style.letterSpacing=val;
  }
});
/* Insert tools — click fallback */
function ensureCursorInNL(){
  var sel=window.getSelection();
  if(sel.rangeCount>0&&NL.contains(sel.anchorNode))return;
  /* 커서가 NL 밖이면 NL 끝으로 이동 */
  var range=document.createRange();
  range.selectNodeContents(NL);range.collapse(false);
  sel.removeAllRanges();sel.addRange(range);
  NL.focus();
}
document.querySelectorAll('[data-insert-type]').forEach(function(btn){
  btn.addEventListener('click',function(){
    if(!isEditable)return;
    ensureCursorInNL();
    var type=btn.dataset.insertType;
    var html='';
    if(type==='hr')html='<hr style="border:none;border-top:1px solid #D5D2CA;margin:24px 0">';
    else if(type==='spacer'){editingSpacer=null;qs('#spacer-height').value='32';qs('#spacer-height-val').textContent='32';qs('#spacer-modal').classList.remove('hidden');return;}
    else if(type==='box')html='<div data-el="box" style="background:#FBFBFF;border:1px solid #E5E7EB;padding:16px 20px;border-radius:10px;margin:16px 0">여기에 내용을 입력하세요.</div><p><br></p>';
    if(html)document.execCommand('insertHTML',false,html);
    NL.focus();
  });
});
/* Spacer */
var editingSpacer=null;
on('#spacer-cancel','click',function(){qs('#spacer-modal').classList.add('hidden');editingSpacer=null;});
on('#spacer-delete','click',function(){if(editingSpacer){editingSpacer.remove();editingSpacer=null;}qs('#spacer-modal').classList.add('hidden');toast('공백 삭제됨');});
on('#spacer-confirm','click',function(){
  var h=parseInt(qs('#spacer-height').value)||32;
  if(editingSpacer){editingSpacer.style.height=h+'px';}
  else{restoreSelection();document.execCommand('insertHTML',false,'<div data-el="spacer" style="height:'+h+'px;line-height:0;font-size:0">&nbsp;</div>');}
  qs('#spacer-modal').classList.add('hidden');editingSpacer=null;NL.focus();
});
/* Spacer 슬라이더 실시간 반영 */
on('#spacer-height','input',function(e){
  var v=e.target.value;
  qs('#spacer-height-val').textContent=v;
  if(editingSpacer)editingSpacer.style.height=v+'px';
});

/* 이미지 드래그 리사이즈 */
(function(){
  var resizing=null,startX=0,startW=0;
  var tooltip=document.createElement('div');
  tooltip.style.cssText='position:fixed;background:#0F172A;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;pointer-events:none;z-index:999;display:none;white-space:nowrap';
  document.body.appendChild(tooltip);

  NL.addEventListener('mousedown',function(e){
    if(!isEditable)return;
    var img=e.target;
    if(img.tagName!=='IMG')return;
    var rect=img.getBoundingClientRect();
    if(e.clientX>rect.right-24&&e.clientY>rect.bottom-24){
      e.preventDefault();
      resizing=img;startX=e.clientX;startW=img.offsetWidth;
      img.classList.add('resizing');
    }
  });
  document.addEventListener('mousemove',function(e){
    if(!resizing)return;
    e.preventDefault();
    var maxW=NL.offsetWidth-40;
    var newW=Math.max(50,startW+(e.clientX-startX));
    if(newW>maxW)newW=maxW;

    /* 스냅 가이드: 25%, 33%, 50%, 100% */
    var pct=Math.round(newW/maxW*100);
    var snaps=[{p:25,w:maxW*0.25},{p:33,w:maxW*0.33},{p:50,w:maxW*0.5},{p:100,w:maxW}];
    var snapped=false;
    for(var i=0;i<snaps.length;i++){
      if(Math.abs(newW-snaps[i].w)<12){newW=snaps[i].w;pct=snaps[i].p;snapped=true;break;}
    }

    resizing.style.width=newW+'px';
    resizing.style.maxWidth='100%';
    resizing.style.height='auto';

    /* 툴팁 표시 */
    tooltip.style.display='block';
    tooltip.style.left=(e.clientX+12)+'px';
    tooltip.style.top=(e.clientY-30)+'px';
    tooltip.textContent=Math.round(newW)+'px ('+pct+'%)'+(snapped?' ✓':'');
    tooltip.style.background=snapped?'#4F46E5':'#0F172A';
  });
  document.addEventListener('mouseup',function(){
    if(resizing){resizing.classList.remove('resizing');resizing=null;tooltip.style.display='none';}
  });
})();

/* 범용 드래그 이동 (mousedown 기반 — HR, spacer, IMG만) */
(function(){
  var dragEl=null;
  var indicator=document.createElement('div');
  indicator.className='nl-drop-indicator';
  indicator.style.display='none';
  var isDragging=false;

  /* 이미지 기본 드래그 방지 */
  NL.addEventListener('dragstart',function(e){
    if(isEditable&&e.target.tagName==='IMG'){e.preventDefault();}
  });

  NL.addEventListener('mousedown',function(e){
    if(!isEditable)return;
    var el=null;
    if(e.target.tagName==='HR')el=e.target;
    else if(e.target.tagName==='IMG'||e.target.closest('img')){
      var img=e.target.tagName==='IMG'?e.target:e.target.closest('img');
      var rect=img.getBoundingClientRect();
      if(e.clientX>rect.right-24&&e.clientY>rect.bottom-24)return;
      /* 이미지가 링크로 감싸져 있으면 링크째로 이동 */
      el=img.parentNode&&img.parentNode.tagName==='A'?img.parentNode:img;
    }
    else{
      var sp=e.target.closest('[data-el="spacer"]');
      if(sp)el=sp;
    }
    if(!el||!NL.contains(el))return;
    e.preventDefault();
    dragEl=el;
    window._dragStartX=e.clientX;window._dragStartY=e.clientY;
    isDragging=false;
  });

  document.addEventListener('mousemove',function(e){
    if(!dragEl)return;
    /* 최소 8px 이동해야 드래그 시작 */
    if(!isDragging){
      var dx=Math.abs(e.clientX-window._dragStartX),dy=Math.abs(e.clientY-window._dragStartY);
      if(dx<4&&dy<4)return;
      isDragging=true;
      dragEl.style.opacity='0.4';
    }
    e.preventDefault();
    var target=document.elementFromPoint(e.clientX,e.clientY);
    if(target&&NL.contains(target)){
      while(target&&target.parentNode!==NL&&target!==NL)target=target.parentNode;
      if(target&&target!==dragEl&&target!==NL&&target!==indicator){
        var rect=target.getBoundingClientRect();
        indicator.style.display='block';
        if(e.clientY<rect.top+rect.height/2)NL.insertBefore(indicator,target);
        else if(target.nextSibling)NL.insertBefore(indicator,target.nextSibling);
        else NL.appendChild(indicator);
      }
    }
  });

  document.addEventListener('mouseup',function(){
    if(!dragEl)return;
    dragEl.style.opacity='1';
    if(isDragging&&indicator.parentNode&&indicator.style.display!=='none'){
      indicator.parentNode.insertBefore(dragEl,indicator);
    }
    indicator.style.display='none';
    if(indicator.parentNode)indicator.remove();
    dragEl=null;isDragging=false;
  });
})();


/* Link Modal */
var savedRange=null;
function saveSelection(){var sel=window.getSelection();if(sel.rangeCount>0)savedRange=sel.getRangeAt(0).cloneRange();else savedRange=null;}
function restoreSelection(){if(!savedRange)return;var sel=window.getSelection();sel.removeAllRanges();sel.addRange(savedRange);}
on('#insert-link-btn','click',function(){if(!isEditable)return;var sel=window.getSelection();saveSelection();qs('#link-text').value=sel.toString()||'';qs('#link-url').value='';qs('#link-modal').classList.remove('hidden');});
on('#link-cancel','click',function(){qs('#link-modal').classList.add('hidden');});
on('#link-confirm','click',function(){
  var text=qs('#link-text').value.trim()||'링크',url=qs('#link-url').value.trim();
  if(!url){toast('URL을 입력해주세요.');return;}
  restoreSelection();
  document.execCommand('insertHTML',false,'<a data-el="link" href="'+url+'" target="_blank" style="color:#3B48CC;font-weight:bold;text-decoration:none">'+esc(text)+' ↗</a>');
  qs('#link-modal').classList.add('hidden');NL.focus();
});

/* Image Modal */
var imgFileInput=qs('#img-file-input');
/* 요소가 속한 섹션의 트래킹 링크 가져오기 */
function getTrackUrlForElement(el){
  if(!el)return '';
  var sec=el.closest('[data-section]');
  return sec?sec.getAttribute('data-track-url')||'':'';
}
on('#insert-img-btn','click',function(){
  if(!isEditable)return;
  ensureCursorInNL();
  var ph='<div data-el="img-placeholder" style="background:#F1F5F9;border:2px dashed #CBD5E1;border-radius:12px;padding:32px 16px;text-align:center;cursor:pointer;margin:12px 0"><div style="font-size:24px;color:#94A3B8;margin-bottom:6px">&#128444;</div><div style="font-size:12px;color:#94A3B8">클릭해서 이미지 추가</div></div>';
  document.execCommand('insertHTML',false,ph);
  NL.focus();
});
on('#img-file-btn','click',function(){imgFileInput.click();});
imgFileInput.addEventListener('change',function(e){
  var file=e.target.files[0];if(!file)return;
  /* 미리보기용 base64 먼저 표시 */
  var reader=new FileReader();
  reader.onload=function(ev){
    var base64=ev.target.result;
    qs('#img-preview').src=base64;
    qs('#img-preview-wrap').classList.remove('hidden');
    qs('#img-url').value='업로드 중...';
    /* 이미지 업로드 — 여러 서비스 시도 */
    var b64data=base64.split(',')[1];
    function tryImgbb(){
      var fd=new FormData();fd.append('image',b64data);
      return fetch('https://api.imgbb.com/1/upload?key='+getImgbbKey(),{method:'POST',body:fd})
        .then(function(r){return r.json();})
        .then(function(d){
          console.log('imgbb:',JSON.stringify(d).substring(0,300));
          var url=(d.success&&d.data)?(d.data.display_url||d.data.url):'';
          if(url&&url.indexOf('http')===0)return url;
          return null;
        }).catch(function(){return null;});
    }
    function tryFreeimage(){
      var fd=new FormData();fd.append('source',b64data);fd.append('type','base64');
      return fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5',{method:'POST',body:fd})
        .then(function(r){return r.json();})
        .then(function(d){
          console.log('freeimage:',JSON.stringify(d).substring(0,300));
          var url=(d.image)?(d.image.display_url||d.image.url):'';
          if(url&&url.indexOf('http')===0)return url;
          return null;
        }).catch(function(){return null;});
    }
    tryImgbb().then(function(url){
      if(url){qs('#img-url').value=url;qs('#img-preview').src=url;toast('✅ 이미지 업로드 완료!');return;}
      return tryFreeimage();
    }).then(function(url){
      if(url&&typeof url==='string'){qs('#img-url').value=url;qs('#img-preview').src=url;toast('✅ 이미지 업로드 완료!');return;}
      if(qs('#img-url').value==='업로드 중...'){qs('#img-url').value=base64;toast('⚠️ 자동 업로드 실패 — 이미지 URL을 직접 입력해주세요');}
    });
  };
  reader.readAsDataURL(file);imgFileInput.value='';
});
on('#img-url','input',function(e){var v=e.target.value.trim();if(v){qs('#img-preview').src=v;qs('#img-preview-wrap').classList.remove('hidden');}else qs('#img-preview-wrap').classList.add('hidden');});
on('#img-cancel','click',function(){qs('#img-modal').classList.add('hidden');editingImg=null;window._imgPlaceholder=null;});
on('#img-delete','click',function(){
  if(editingImg){
    var parent=editingImg.parentNode;
    if(editingImg.tagName==='A'&&editingImg.querySelector('img')){editingImg.remove();}
    else{editingImg.remove();}
    editingImg=null;
  }
  /* 플레이스홀더도 삭제 */
  if(window._imgPlaceholder){window._imgPlaceholder.remove();window._imgPlaceholder=null;}
  qs('#img-modal').classList.add('hidden');toast('이미지 삭제됨');
});
on('#img-confirm','click',function(){
  var src=qs('#img-url').value.trim();if(!src){toast('이미지 URL 또는 파일을 선택해주세요.');return;}
  var alt=qs('#img-alt').value.trim(),w=qs('#img-width').value.trim()||'100%',link=qs('#img-link').value.trim();
  /* 테두리 조합 */
  var bStyle=qs('#img-border-style').value;
  var bWidth=qs('#img-border-width').value||'1';
  var bColor=qs('#img-border-color').value||'#E5E7EB';
  var border=bStyle?bWidth+'px '+bStyle+' '+bColor:'';
  var borderCSS=border?'border:'+border+';':'';
  var isInline=(w!=='100%'&&w.indexOf('100%')===-1);
  var displayStyle=isInline?'display:inline-block;vertical-align:top;':'display:block;';
  /* 링크가 비어있으면 해당 섹션의 트래킹 링크 자동 적용 */
  if(!link){
    var cursor=editingImg||window._imgPlaceholder;
    if(cursor){
      var sec=cursor.closest('[data-section]');
      if(sec){
        var trackUrl=sec.getAttribute('data-track-url');
        if(trackUrl)link=trackUrl;
      }
    }
  }
  if(editingImg){
    var actualImg=editingImg.tagName==='IMG'?editingImg:editingImg.querySelector('img');
    if(actualImg){actualImg.src=src;actualImg.alt=alt;actualImg.style.width=w;actualImg.style.border=border||'none';actualImg.style.display=isInline?'inline-block':'block';if(isInline)actualImg.style.verticalAlign='top';}
    if(link){
      if(editingImg.tagName==='A'){editingImg.href=link;}
      else if(actualImg){var a=document.createElement('a');a.href=link;a.target='_blank';a.style.display=isInline?'inline-block':'block';actualImg.parentNode.insertBefore(a,actualImg);a.appendChild(actualImg);editingImg=a;}
    } else if(editingImg.tagName==='A'){
      var child=editingImg.querySelector('img');if(child){editingImg.parentNode.insertBefore(child,editingImg);editingImg.remove();editingImg=child;}
    }
  } else {
    var imgHtml='<img src="'+src+'" alt="'+esc(alt)+'" style="width:'+w+';max-width:100%;height:auto;border-radius:8px;margin:8px 0;'+displayStyle+borderCSS+'">';
    if(link)imgHtml='<a href="'+esc(link)+'" target="_blank" style="'+displayStyle+'">'+imgHtml+'</a>';
    /* 플레이스홀더 교체 */
    if(window._imgPlaceholder&&window._imgPlaceholder.parentNode){
      var temp=document.createElement('div');temp.innerHTML=imgHtml;
      window._imgPlaceholder.parentNode.replaceChild(temp.firstChild,window._imgPlaceholder);
      window._imgPlaceholder=null;
    } else {
      document.execCommand('insertHTML',false,imgHtml);
    }
  }
  qs('#img-modal').classList.add('hidden');editingImg=null;
  /* 스크롤 위치 복원 */
  if(window._nlScrollTop!==undefined)NL.scrollTop=window._nlScrollTop;
  NL.focus();
});
/* 이미지 레이아웃 버튼 */
qsa('.img-layout-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var pct=btn.dataset.layout;
    qs('#img-width').value=pct==='100'?'100%':pct+'%';
  });
});

/* 이미지 2단 배열 삽입 */
on('#insert-img-row-btn','click',function(){
  if(!isEditable)return;
  var ph='<div data-el="img-placeholder" style="background:#F1F5F9;border:2px dashed #CBD5E1;border-radius:12px;padding:32px 16px;text-align:center;cursor:pointer"><div style="font-size:24px;color:#94A3B8;margin-bottom:4px">&#128444;</div><div style="font-size:11px;color:#94A3B8">클릭해서 이미지 추가</div></div>';
  var html='<div style="margin:16px 0;display:flex;gap:8px">'
    +'<div style="flex:1">'+ph+'</div>'
    +'<div style="flex:1">'+ph+'</div>'
    +'</div>';
  document.execCommand('insertHTML',false,html);
  toast('2단 이미지 삽입됨 — 각 영역을 클릭해서 이미지를 설정하세요');
  NL.focus();
});

/* Button Modal */
on('#insert-btn-btn','click',function(){if(!isEditable)return;saveSelection();editingBtn=null;qs('#btn-text').value='블로그 아티클 바로가기';qs('#btn-url').value='';qs('#btn-bg').value='#ffffff';qs('#btn-fg').value='#4F46E5';qs('#btn-border-color').value='#4F46E5';qs('#btn-size').value='md';qs('#btn-radius').value='8px';qs('#btn-width').value='auto';qs('#btn-modal').classList.remove('hidden');});
on('#btn-cancel','click',function(){qs('#btn-modal').classList.add('hidden');editingBtn=null;});
on('#btn-delete','click',function(){if(editingBtn){editingBtn.remove();editingBtn=null;}qs('#btn-modal').classList.add('hidden');toast('버튼 삭제됨');});
on('#btn-confirm','click',function(){
  var text=qs('#btn-text').value.trim()||'바로가기',url=qs('#btn-url').value.trim()||'#';
  var bg=qs('#btn-bg').value,fg=qs('#btn-fg').value,bc=qs('#btn-border-color').value;
  var radius=qs('#btn-radius').value;
  var sizes={sm:'10px 20px;font-size:12px',md:'12px 28px;font-size:14px',lg:'16px 36px;font-size:16px'};
  var pad=sizes[qs('#btn-size').value]||sizes.md;
  var w=qs('#btn-width').value;
  var isInline=w==='48%';
  var widthCSS=w==='auto'?'':'width:'+w+';';
  var displayCSS=isInline?'display:inline-block;':'display:inline-block;';
  var borderCSS='border:1.5px solid '+bc+';';
  if(editingBtn){
    editingBtn.textContent=text;editingBtn.href=url;
    editingBtn.style.backgroundColor=bg;editingBtn.style.color=fg;
    editingBtn.style.borderRadius=radius;editingBtn.style.border='1.5px solid '+bc;
  } else {
    restoreSelection();ensureCursorInNL();
    var html='<a data-el="btn" href="'+esc(url)+'" target="_blank" style="'+displayCSS+widthCSS+'background:'+bg+';color:'+fg+';padding:'+pad+';border-radius:'+radius+';font-weight:600;text-decoration:none;text-align:center;margin:4px 2px;box-sizing:border-box;'+borderCSS+'">'+esc(text)+' &rarr;</a>';
    document.execCommand('insertHTML',false,html);
  }
  qs('#btn-modal').classList.add('hidden');editingBtn=null;NL.focus();
});
/* Button position */
qsa('.pos-btn').forEach(function(btn){btn.addEventListener('click',function(){
  if(!editingBtn)return;var dir=btn.dataset.pos,parent=editingBtn.parentNode;
  if(dir==='before'&&editingBtn.previousElementSibling)parent.insertBefore(editingBtn,editingBtn.previousElementSibling);
  else if(dir==='after'&&editingBtn.nextElementSibling){var next=editingBtn.nextElementSibling;if(next.nextElementSibling)parent.insertBefore(editingBtn,next.nextElementSibling);else parent.appendChild(editingBtn);}
});});

/* Box Modal */
on('#box-cancel','click',function(){qs('#box-modal').classList.add('hidden');editingBox=null;});
on('#box-delete','click',function(){
  if(editingBox){
    var parentA=editingBox.parentNode&&editingBox.parentNode.tagName==='A'&&editingBox.parentNode.getAttribute('data-box-link')?editingBox.parentNode:null;
    if(parentA)parentA.remove();else editingBox.remove();
    editingBox=null;
  }
  qs('#box-modal').classList.add('hidden');toast('박스 삭제됨');
});
on('#box-confirm','click',function(){
  if(editingBox){
    editingBox.style.backgroundColor=qs('#box-bg-edit').value;
    editingBox.style.borderLeftColor=qs('#box-border-edit').value;
    var outlineColor=qs('#box-outline-edit').value;
    editingBox.style.borderTopColor=outlineColor;
    editingBox.style.borderRightColor=outlineColor;
    editingBox.style.borderBottomColor=outlineColor;
    editingBox.style.color=qs('#box-text-color-edit').value;
    /* 링크 처리 */
    var boxLink=qs('#box-link-edit').value.trim();
    var existingA=editingBox.parentNode&&editingBox.parentNode.tagName==='A'&&editingBox.parentNode.getAttribute('data-box-link')?editingBox.parentNode:null;
    if(boxLink){
      if(existingA){existingA.href=boxLink;}
      else{var a=document.createElement('a');a.href=boxLink;a.target='_blank';a.style.textDecoration='none';a.style.color='inherit';a.style.display='block';a.setAttribute('data-box-link','1');editingBox.parentNode.insertBefore(a,editingBox);a.appendChild(editingBox);}
    } else if(existingA){
      existingA.parentNode.insertBefore(editingBox,existingA);existingA.remove();
    }
  }
  qs('#box-modal').classList.add('hidden');editingBox=null;
});

/* HR Modal */
on('#hr-cancel','click',function(){qs('#hr-modal').classList.add('hidden');clickedHr=null;});
on('#hr-delete','click',function(){
  if(clickedHr){clickedHr.remove();clickedHr=null;}
  qs('#hr-modal').classList.add('hidden');toast('구분선 삭제됨');
});
on('#hr-confirm','click',function(){
  if(clickedHr){
    var color=qs('#hr-color').value;
    var width=qs('#hr-width').value+'px';
    var style=qs('#hr-style').value;
    clickedHr.style.border='none';
    clickedHr.style.borderTop=width+' '+style+' '+color;
  }
  qs('#hr-modal').classList.add('hidden');clickedHr=null;
});
on('#hr-width','input',function(e){
  qs('#hr-width-val').textContent=e.target.value;
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=e.target.value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});
on('#hr-style','change',function(){
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=qs('#hr-width').value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});
on('#hr-color','input',function(){
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=qs('#hr-width').value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});

/* ===== Click-to-Edit in Newsletter ===== */
var clickedHr=null;
NL.addEventListener('click',function(e){
  if(!isEditable)return;
  syncToolbar();
  /* 이미지 플레이스홀더 클릭 → 이미지 모달 */
  var ph=e.target.closest('[data-el="img-placeholder"]');
  if(ph){e.preventDefault();editingImg=null;qs('#img-url').value='';qs('#img-alt').value='';qs('#img-width').value='100%';qs('#img-link').value=getTrackUrlForElement(ph);qs('#img-border-style').value='';qs('#img-border-width').value='1';qs('#img-border-color').value='#E2E8F0';qs('#img-preview-wrap').classList.add('hidden');
    /* 이미지 확정 시 플레이스홀더 교체 */
    window._imgPlaceholder=ph;window._nlScrollTop=NL.scrollTop;
    qs('#img-modal').classList.remove('hidden');return;}
  /* Image */
  var img=e.target.closest('img');
  if(img){e.preventDefault();var parentA=img.parentNode&&img.parentNode.tagName==='A'?img.parentNode:null;editingImg=parentA||img;qs('#img-url').value=img.src||'';qs('#img-alt').value=img.alt||'';qs('#img-width').value=img.style.width||'100%';qs('#img-link').value=parentA?parentA.href:getTrackUrlForElement(img);
    /* 테두리 값 불러오기 */
    qs('#img-border-style').value=img.style.borderStyle||img.style.borderTopStyle||'';
    qs('#img-border-width').value=parseFloat(img.style.borderWidth||img.style.borderTopWidth)||1;
    qs('#img-border-color').value=rgbToHex(img.style.borderColor||img.style.borderTopColor)||'#E5E7EB';
    if(img.src){qs('#img-preview').src=img.src;qs('#img-preview-wrap').classList.remove('hidden');}window._nlScrollTop=NL.scrollTop;qs('#img-modal').classList.remove('hidden');return;}
  /* Button */
  var btn=e.target.closest('[data-el="btn"]');
  if(btn){e.preventDefault();editingBtn=btn;qs('#btn-text').value=btn.textContent.replace(/\s*→$/,'').trim();qs('#btn-url').value=btn.href||'';qs('#btn-bg').value=rgbToHex(btn.style.backgroundColor)||'#ffffff';qs('#btn-fg').value=rgbToHex(btn.style.color)||'#4F46E5';qs('#btn-border-color').value=rgbToHex(btn.style.borderColor||btn.style.borderTopColor)||'#4F46E5';qs('#btn-radius').value=btn.style.borderRadius||'8px';qs('#btn-modal').classList.remove('hidden');return;}
  /* Box — 싱글클릭=텍스트편집, 더블클릭=박스모달 */
  var box=e.target.closest('[data-el="box"]');
  if(box){
    /* 박스 안 링크 클릭 시 링크 편집 모달 */
    var boxLink=e.target.closest('a');
    if(boxLink){e.preventDefault();qs('#link-text').value=boxLink.textContent.replace(/\s*↗$/,'').trim();qs('#link-url').value=boxLink.href||'';qs('#link-modal').classList.remove('hidden');return;}
    /* 박스 안 버튼 클릭 시 버튼 모달 */
    var boxBtn=e.target.closest('[data-el="btn"]');
    if(boxBtn){e.preventDefault();editingBtn=boxBtn;qs('#btn-text').value=boxBtn.textContent.trim();qs('#btn-url').value=boxBtn.href||'';qs('#btn-bg').value=rgbToHex(boxBtn.style.backgroundColor)||'#3B48CC';qs('#btn-fg').value=rgbToHex(boxBtn.style.color)||'#ffffff';qs('#btn-modal').classList.remove('hidden');return;}
    /* 싱글클릭 → 텍스트 편집 허용 */
    return;
  }
  /* Spacer */
  var spacer=e.target.closest('[data-el="spacer"]');
  if(spacer){e.preventDefault();editingSpacer=spacer;var curH=parseInt(spacer.style.height)||32;qs('#spacer-height').value=curH;qs('#spacer-height-val').textContent=curH;qs('#spacer-modal').classList.remove('hidden');return;}
  /* HR */
  if(e.target.tagName==='HR'){e.preventDefault();clickedHr=e.target;
    qs('#hr-color').value=rgbToHex(e.target.style.borderTopColor)||'#D5D2CA';
    var hrW=parseFloat(e.target.style.borderTopWidth)||1;
    qs('#hr-width').value=String(hrW);qs('#hr-width-val').textContent=String(hrW);
    var hrS=e.target.style.borderTopStyle||'solid';
    qs('#hr-style').value=hrS;
    qs('#hr-modal').classList.remove('hidden');return;}
  /* Link */
  var link=e.target.closest('[data-el="link"]');
  if(link){e.preventDefault();qs('#link-text').value=link.textContent.replace(/\s*↗$/,'').trim();qs('#link-url').value=link.href||'';qs('#link-modal').classList.remove('hidden');return;}
});
/* 박스 클릭 → 우측 패널에 설정 표시 */
function showBoxSettings(box){
  editingBox=box;
  var sec=qs('#ep-selected'),content=qs('#ep-selected-content');
  var ep=qs('#edit-panel');
  if(ep)ep.classList.add('open');
  sec.style.display='';
  /* 패널 상단으로 스크롤 + 깜빡임 */
  if(ep){ep.scrollTop=0;sec.style.animation='none';sec.offsetHeight;sec.style.animation='epFlash 0.6s ease';}
  var hasLeftBorder=box.style.borderLeftWidth&&parseFloat(box.style.borderLeftWidth)>2;
  if(!hasLeftBorder){var blw=window.getComputedStyle(box).borderLeftWidth;var brw=window.getComputedStyle(box).borderRightWidth;hasLeftBorder=parseFloat(blw)>parseFloat(brw);}
  var leftHtml='<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">'
    +'<label style="font-size:10px;color:#6B7280;flex-shrink:0">왼쪽 선</label>'
    +'<input type="checkbox" id="ep-box-left-toggle"'+(hasLeftBorder?' checked':'')+' style="cursor:pointer">'
    +'<input type="color" id="ep-box-left" value="'+rgbToHex(box.style.borderLeftColor||'#6366F1')+'" style="width:40px;height:24px;border:1px solid #DDD6FE;border-radius:4px;cursor:pointer;'+(hasLeftBorder?'':'opacity:0.3')+'">'
    +'</div>';
  content.innerHTML='<div style="background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:12px;padding:14px 16px">'
    +'<div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#4F46E5">📦 박스 설정</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    +'<div><div style="font-size:10px;color:#6B7280;margin-bottom:3px">배경색</div><input type="color" id="ep-box-bg" value="'+rgbToHex(box.style.backgroundColor||'#FBFBFF')+'" style="width:100%;height:28px;border:1px solid #DDD6FE;border-radius:6px;cursor:pointer"></div>'
    +'<div><div style="font-size:10px;color:#6B7280;margin-bottom:3px">테두리</div><input type="color" id="ep-box-outline" value="'+rgbToHex(box.style.borderRightColor||'#E5E7EB')+'" style="width:100%;height:28px;border:1px solid #DDD6FE;border-radius:6px;cursor:pointer"></div>'
    +'</div>'
    +leftHtml
    +'<div style="margin-bottom:10px"><div style="font-size:10px;color:#6B7280;margin-bottom:3px">링크 URL</div><input type="url" id="ep-box-link" value="'+(box.parentNode&&box.parentNode.tagName==='A'?box.parentNode.href:'')+'" placeholder="https://..." style="width:100%;padding:7px 10px;border:1px solid #DDD6FE;border-radius:8px;font-size:12px;outline:none;background:#fff"></div>'
    +'<div style="display:flex;gap:6px"><button id="ep-box-apply" style="flex:1;padding:7px;background:#4F46E5;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">적용</button><button id="ep-box-delete" style="padding:7px 14px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer">삭제</button></div>'
    +'</div>';
  /* 실시간 이벤트 */
  qs('#ep-box-bg').addEventListener('input',function(){if(editingBox)editingBox.style.backgroundColor=this.value;});
  var epBoxLeftToggle=qs('#ep-box-left-toggle');
  var epBoxLeft=qs('#ep-box-left');
  if(epBoxLeftToggle)epBoxLeftToggle.addEventListener('change',function(){
    if(!editingBox)return;
    if(this.checked){
      editingBox.style.borderLeft='4px solid '+(epBoxLeft?epBoxLeft.value:'#6366F1');
      editingBox.style.borderRadius='0 10px 10px 0';
      if(epBoxLeft)epBoxLeft.style.opacity='1';
    } else {
      editingBox.style.borderLeftWidth='1px';
      editingBox.style.borderLeftColor=qs('#ep-box-outline').value;
      editingBox.style.borderRadius='10px';
      if(epBoxLeft)epBoxLeft.style.opacity='0.3';
    }
  });
  if(epBoxLeft)epBoxLeft.addEventListener('input',function(){
    if(editingBox&&epBoxLeftToggle&&epBoxLeftToggle.checked)editingBox.style.borderLeftColor=this.value;
  });
  qs('#ep-box-outline').addEventListener('input',function(){if(editingBox){editingBox.style.borderTopColor=this.value;editingBox.style.borderRightColor=this.value;editingBox.style.borderBottomColor=this.value;if(epBoxLeftToggle&&!epBoxLeftToggle.checked)editingBox.style.borderLeftColor=this.value;}});
  qs('#ep-box-apply').addEventListener('click',function(){
    if(!editingBox)return;
    editingBox.style.backgroundColor=qs('#ep-box-bg').value;
    var epLeft=qs('#ep-box-left');
    var epLeftToggle=qs('#ep-box-left-toggle');
    if(epLeftToggle&&epLeftToggle.checked&&epLeft){
      editingBox.style.borderLeft='4px solid '+epLeft.value;
      editingBox.style.borderRadius='0 10px 10px 0';
    } else {
      editingBox.style.borderLeftWidth='1px';
      editingBox.style.borderRadius='10px';
    }
    var oc=qs('#ep-box-outline').value;
    editingBox.style.borderTopColor=oc;editingBox.style.borderRightColor=oc;editingBox.style.borderBottomColor=oc;
    if(!epLeftToggle||!epLeftToggle.checked)editingBox.style.borderLeftColor=oc;
    var link=qs('#ep-box-link').value.trim();
    var existA=editingBox.parentNode&&editingBox.parentNode.tagName==='A'&&editingBox.parentNode.getAttribute('data-box-link')?editingBox.parentNode:null;
    if(link){if(existA)existA.href=link;else{var a=document.createElement('a');a.href=link;a.target='_blank';a.style.textDecoration='none';a.style.color='inherit';a.style.display='block';a.setAttribute('data-box-link','1');editingBox.parentNode.insertBefore(a,editingBox);a.appendChild(editingBox);}}
    else if(existA){existA.parentNode.insertBefore(editingBox,existA);existA.remove();}
    toast('박스 설정 적용됨');
  });
  qs('#ep-box-delete').addEventListener('click',function(){
    if(!editingBox)return;
    var existA=editingBox.parentNode&&editingBox.parentNode.tagName==='A'&&editingBox.parentNode.getAttribute('data-box-link')?editingBox.parentNode:null;
    if(existA)existA.remove();else editingBox.remove();
    editingBox=null;sec.style.display='none';toast('박스 삭제됨');
  });
}
/* NL 클릭 시 박스 선택 → 우측 패널 */
NL.addEventListener('click',function checkBoxSelect(e){
  if(!isEditable)return;
  var box=e.target.closest('[data-el="box"]');
  var sec=qs('#ep-selected');
  if(box){showBoxSettings(box);}
  else if(sec){sec.style.display='none';editingBox=null;}
},{capture:true});

/* ===== 블록 컨트롤 (호버 시 우측 상단에 위아래+복사+삭제) ===== */
(function(){
  var ctrlWrap=document.createElement('div');
  ctrlWrap.style.cssText='position:absolute;top:-30px;right:0;display:flex;gap:3px;z-index:50;opacity:0;transition:opacity .12s;pointer-events:auto';
  ctrlWrap.innerHTML='<button class="block-ctrl-btn" data-bc="up" title="위로">▲</button>'
    +'<button class="block-ctrl-btn" data-bc="down" title="아래로">▼</button>'
    +'<button class="block-ctrl-btn" data-bc="copy" title="복사">❐</button>'
    +'<button class="block-ctrl-btn" data-bc="delete" title="삭제" style="color:#DC2626">✕</button>';
  var activeBlock=null;

  function getBlock(el){
    if(!el)return null;
    if(el.closest('[data-bc]')||el===ctrlWrap)return activeBlock;
    if(el.tagName==='HR')return el;
    if(el.tagName==='IMG'){var pa=el.parentNode;return(pa&&pa.tagName==='A')?pa:el;}
    return el.closest('[data-el="box"]')||el.closest('[data-el="btn"]')||el.closest('[data-el="spacer"]')||null;
  }
  function showControls(block){
    if(!block||!isEditable){hideControls();return;}
    activeBlock=block;
    block.style.position='relative';
    block.appendChild(ctrlWrap);
    ctrlWrap.style.opacity='1';
  }
  function hideControls(){
    activeBlock=null;
    ctrlWrap.style.opacity='0';
    if(ctrlWrap.parentNode)ctrlWrap.parentNode.removeChild(ctrlWrap);
  }

  NL.addEventListener('mouseover',function(e){
    if(!isEditable)return;
    var block=getBlock(e.target);
    if(block&&block!==activeBlock)showControls(block);
  });
  NL.addEventListener('mouseleave',function(e){
    if(!e.relatedTarget||!NL.contains(e.relatedTarget))hideControls();
  });

  function handleCtrl(e){
    var btn=e.target.closest('[data-bc]');if(!btn||!activeBlock)return;
    e.preventDefault();e.stopPropagation();
    saveUndo();
    var action=btn.dataset.bc;
    if(action==='up'&&activeBlock.previousElementSibling){
      activeBlock.parentNode.insertBefore(activeBlock,activeBlock.previousElementSibling);
      toast('위로 이동');
    } else if(action==='down'&&activeBlock.nextElementSibling){
      activeBlock.parentNode.insertBefore(activeBlock.nextElementSibling,activeBlock);
      toast('아래로 이동');
    } else if(action==='copy'){
      var clone=activeBlock.cloneNode(true);
      var oldCtrl=clone.querySelector('[data-bc]');
      if(oldCtrl&&oldCtrl.parentNode)oldCtrl.parentNode.remove();
      activeBlock.parentNode.insertBefore(clone,activeBlock.nextSibling);
      toast('복사됨');
    } else if(action==='delete'){
      activeBlock.remove();hideControls();toast('삭제됨');
    }
  }
  ctrlWrap.addEventListener('mousedown',handleCtrl);
})();

/* ===== Ctrl+Z 커스텀 Undo ===== */
NL.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key==='z'&&!e.shiftKey){
    if(undoStack.length>1){
      e.preventDefault();
      undoStack.pop();
      NL.innerHTML=undoStack[undoStack.length-1];
      toast('되돌리기');
    }
  }
});

/* ===== History ===== */
function renderHist(){
  var hl=qs('#history-list'),rl=qs('#recent-list');
  if(!nlHistory.length){hl.innerHTML='<p class="history-empty">아직 생성된 뉴스레터가 없습니다.</p>';if(rl)rl.innerHTML='';return;}
  hl.innerHTML='<div style="font-size:10px;color:#94A3B8;padding:4px 8px;margin-bottom:4px">최근 10개까지 저장됩니다 ('+nlHistory.length+'/10)</div>'+nlHistory.map(function(h,i){return'<div class="history-item" data-hi="'+i+'"><div style="display:flex;justify-content:space-between;align-items:start"><div class="hi-title">'+esc(h.title)+'</div><button class="hi-delete" data-hd="'+i+'" title="삭제" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">&#10005;</button></div><div class="hi-date">'+h.date+'</div><span class="hi-tag">'+esc(h.tag)+'</span></div>';}).join('');
  if(rl){
    var recentHtml=nlHistory.slice(0,5).map(function(h,i){return'<div class="recent-item" data-ri="'+i+'"><span class="ri-tag">'+esc(h.tag)+'</span><span class="ri-title">'+esc(h.title)+'</span><span class="ri-date">'+h.date+'</span></div>';}).join('');
    /* 임시저장 목록도 표시 */
    var drafts=getDrafts();
    if(drafts.length>0){
      recentHtml+='<div style="font-size:9px;color:#94A3B8;letter-spacing:1px;margin:12px 0 6px;text-transform:uppercase">임시저장</div>';
      recentHtml+=drafts.slice(0,3).map(function(d,i){
        /* HTML에서 텍스트 추출해서 미리보기 */
        var tmp=document.createElement('div');tmp.innerHTML=d.html||'';
        var preview=tmp.textContent.substring(0,80).trim();
        return'<div class="recent-item" data-di="'+i+'" style="flex-wrap:wrap">'
          +'<span class="ri-tag" style="background:#6366F1">임시저장</span>'
          +'<span class="ri-title">'+esc(d.name)+'</span>'
          +'<span class="ri-date">'+d.date+'</span>'
          +'<button class="recent-draft-del" data-rdd="'+i+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:12px;padding:2px 4px;flex-shrink:0" title="삭제">&#10005;</button>'
          +'<div style="width:100%;font-size:11px;color:#94A3B8;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(preview)+'</div>'
          +'</div>';
      }).join('');
    }
    rl.innerHTML=recentHtml;
  }
}
function saveHist(title,tag,html,titles){nlHistory.unshift({title:title,tag:tag,date:today(),html:html,titles:titles||[]});if(nlHistory.length>10)nlHistory.length=10;localStorage.setItem('nl-history',JSON.stringify(nlHistory));renderHist();}
function loadHist(idx){if(!nlHistory[idx])return;NL.innerHTML=nlHistory[idx].html;hasOrigData=false;origOut.innerHTML='';showEditor();
  /* 원본 대조 비활성화 */
  isComparing=false;
  /* NL에서 data-section 읽어서 섹션 순서 칩 복원 */
  rebuildSectionChips();
  /* 제목 후보 복원 */
  var btn=qs('#title-pick-btn');
  if(nlHistory[idx].titles&&nlHistory[idx].titles.length>0){
    _titleCandidates=nlHistory[idx].titles;
    if(btn)btn.style.display='';
    renderTitleDropdown(0);
  } else {
    _titleCandidates=[];
    if(btn)btn.style.display='none';
    var dd=qs('#title-candidates-dropdown');
    if(dd){dd.classList.add('hidden');dd.innerHTML='';}
  }
  toast('히스토리에서 불러옴');}
on('#history-list','click',function(e){
  /* 삭제 버튼 */
  var del=e.target.closest('.hi-delete');
  if(del){e.stopPropagation();var idx=+del.dataset.hd;nlHistory.splice(idx,1);localStorage.setItem('nl-history',JSON.stringify(nlHistory));renderHist();toast('히스토리 삭제됨');return;}
  var it=e.target.closest('.history-item');if(it)loadHist(+it.dataset.hi);
});
(function(){var rl=qs('#recent-list');if(rl)rl.addEventListener('click',function(e){
  /* 임시저장 삭제 */
  var del=e.target.closest('.recent-draft-del');
  if(del){e.stopPropagation();var drafts=getDrafts();drafts.splice(+del.dataset.rdd,1);saveDrafts(drafts);renderHist();renderDrafts();toast('임시저장 삭제됨');return;}
  var ri=e.target.closest('.recent-item[data-ri]');if(ri){loadHist(+ri.dataset.ri);return;}
  var di=e.target.closest('.recent-item[data-di]');if(di){var drafts=getDrafts();var idx=+di.dataset.di;if(drafts[idx]){saveUndo();NL.innerHTML=drafts[idx].html;currentDraftName=drafts[idx].name;hasOrigData=false;showEditor();rebuildSectionChips();toast('임시저장 불러옴: '+drafts[idx].name);}}
});})();

/* ===== Generate ===== */

genBtn.addEventListener('click',function(){
  var urls=getUrls();
  if(!urls.length){showErr('URL을 하나 이상 입력해주세요.');return;}
  if(!getKey()){showErr('Gemini API 키를 먼저 설정해주세요.');return;}
  hideErr();loading.classList.remove('hidden');genBtn.disabled=true;
  var sections=[],chain=Promise.resolve();
  for(var i=0;i<urls.length;i++){(function(item){
    chain=chain.then(function(){
      return fetchUrl(item.url).then(function(html){
        var data=extract(html,item.url);
        console.log('=== EXTRACT RESULT ===');
        console.log('Title:',data.title);
        console.log('Paragraphs:',data.paras.length);
        console.log('Images:',data.imgs.length);
        if(data.paras.length>0)console.log('First para:',data.paras[0].text.substring(0,100));
        var tag=item.tag==='auto'?classify(data.title+' '+data.paras.map(function(p){return p.text;}).join(' ')):item.tag;
        return aiRewrite(data.paras,data.title,item.volumeText,item.writeStyle,item.url).catch(function(err){
          if(err.message==='NO_KEY'){showErr('API 키를 설정해주세요.');return null;}
          console.error('AI err:',err);toast('AI 실패: '+err.message.substring(0,60));return fallback(data.paras,data.title);
        }).then(function(ai){if(ai)sections.push({url:item.url,tag:tag,data:data,ai:ai,trackingUrl:item.trackingUrl||'',writeStyle:item.writeStyle||'subtitle'});});
      }).catch(function(err){
        /* 프록시 실패해도 urlContext로 Gemini가 직접 읽으니까 계속 진행 */
        console.warn('Proxy failed, using urlContext fallback:',item.url);
        var tag=item.tag==='auto'?'아이지에이웍스':item.tag;
        var data={title:'',paras:[],imgs:[]};
        return aiRewrite(data.paras,data.title,item.volumeText,item.writeStyle,item.url).catch(function(err2){
          if(err2.message==='NO_KEY'){showErr('API 키를 설정해주세요.');return null;}
          console.error('AI err:',err2);toast('AI 실패: '+err2.message.substring(0,60));return null;
        }).then(function(ai){if(ai)sections.push({url:item.url,tag:tag,data:data,ai:ai,trackingUrl:item.trackingUrl||'',writeStyle:item.writeStyle||'subtitle'});});
      });
    });
  })(urls[i]);}
  chain.then(function(){
    if(!sections.length){loading.classList.add('hidden');genBtn.disabled=false;return;}
    var oi=0;for(var s=0;s<sections.length;s++){sections[s]._origStart=oi;oi+=sections[s].data.paras.length;}
    var result=buildNL(sections);

    NL.innerHTML=result.html;undoStack=[];saveUndo();origOut.innerHTML=buildOrigSections(sections);hasOrigData=true;
    showEditor();
    setupHL();
    /* 원본 대조 탭 클릭 */
    origOut.querySelectorAll('.orig-tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        origOut.querySelectorAll('.orig-tab').forEach(function(t){t.style.borderBottomColor='transparent';t.style.fontWeight='500';t.style.color='#94A3B8';});
        tab.style.borderBottomColor='#1E293B';tab.style.fontWeight='700';tab.style.color='#1E293B';
        origOut.querySelectorAll('.orig-section').forEach(function(s){s.style.display='none';});
        var target=origOut.querySelector('.orig-section[data-os="'+tab.dataset.ot+'"]');
        if(target)target.style.display='';
      });
    });
    var titleCandidates=[];
    if(sections[0]&&sections[0].ai){
      var ai0=sections[0].ai;
      if(ai0.title)titleCandidates.push({label:'🎯 기본',text:ai0.title});
      if(ai0.titleB)titleCandidates.push({label:'📊 데이터',text:ai0.titleB});
      if(ai0.titleC)titleCandidates.push({label:'🔥 클릭유도',text:ai0.titleC});
    }
    saveHist(cleanBr(sections[0].ai.title||'뉴스레터'),result.tag,result.html,titleCandidates);
    /* URL 칩을 우측 패널에 표시 */
    populateUrlChips(sections);
    populateTitleCandidates(sections);
    lastGenUrls=getUrls(); /* 재생성용 저장 */
    toast('뉴스레터 생성 완료!');
  }).catch(function(err){showErr('오류: '+err.message);console.error(err);}).then(function(){loading.classList.add('hidden');genBtn.disabled=false;});
});

/* ===== Title Candidates — 드롭다운 방식 ===== */
var _titleCandidates=[];

function populateTitleCandidates(sections){
  var epSec=qs('#ep-titles-section');if(epSec)epSec.style.display='none';
  var ai=sections[0]&&sections[0].ai;
  var btn=qs('#title-pick-btn');
  if(!ai||!ai.title){if(btn)btn.style.display='none';return;}
  _titleCandidates=[
    {label:'기본',text:ai.title},
    {label:'데이터 중심',text:ai.titleB||''},
    {label:'클릭 유도',text:ai.titleC||''}
  ].filter(function(t){return t.text;});
  if(btn)btn.style.display='';
  renderTitleDropdown(0); /* 첫 번째를 현재 적용 상태로 */
}

function renderTitleDropdown(activeIdx){
  var dd=qs('#title-candidates-dropdown');
  if(!dd)return;
  dd.innerHTML=_titleCandidates.map(function(t,i){
    return'<div class="title-cand-item'+(i===activeIdx?' active':'')+'" data-tidx="'+i+'">'
      +'<div class="title-cand-tag">'+t.label+'</div>'
      +'<div class="title-cand-text">'+cleanBr(t.text)+'</div>'
      +'</div>';
  }).join('');
  dd.onclick=function(e){
    var item=e.target.closest('.title-cand-item');
    if(!item)return;
    var idx=+item.dataset.tidx;
    var newTitle=_titleCandidates[idx].text;
    var headerDiv=NL.querySelector('div[style*="font-size:22px"]');
    if(headerDiv){headerDiv.innerHTML=newTitle;toast('제목 변경됨 ✓');}
    renderTitleDropdown(idx);
    dd.classList.add('hidden');
    qs('#title-pick-btn').classList.remove('active');
  };
}

/* 제목 후보 버튼 토글 */
(function(){
  var btn=qs('#title-pick-btn');
  var dd=qs('#title-candidates-dropdown');
  if(!btn||!dd)return;
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var isHidden=dd.classList.contains('hidden');
    dd.classList.toggle('hidden');
    btn.classList.toggle('active',isHidden);
  });
  document.addEventListener('click',function(e){
    if(!dd.contains(e.target)&&e.target!==btn){
      dd.classList.add('hidden');
      btn.classList.remove('active');
    }
  });
})();

/* ===== URL Chips (drag to insert) ===== */
/* 히스토리/임시저장에서 불러올 때 NL의 data-section으로 섹션 칩 복원 */
function rebuildSectionChips(){
  var secList=qs('#ep-section-list'),sec=qs('#ep-urls-section');
  if(!secList||!sec)return;
  var sectionEls=NL.querySelectorAll('[data-section]');
  if(sectionEls.length<2){sec.style.display='none';secList.innerHTML='';return;}
  sec.style.display='';
  secList.innerHTML='';
  sectionEls.forEach(function(el){
    var idx=el.getAttribute('data-section');
    /* 섹션 안에서 제목 추출 */
    var titleEl=el.querySelector('div[style*="font-size:18px"],div[style*="font-size:20px"],div[style*="font-weight:700"]');
    var title=titleEl?titleEl.textContent.trim().substring(0,30):'섹션 '+(+idx+1);
    var tagEl=el.querySelector('[data-src-idx]');
    var tag=tagEl?tagEl.getAttribute('data-src-idx').replace(/\d+/g,'').trim()||'섹션':'섹션';
    var chip=document.createElement('div');
    chip.className='ep-sec-chip';chip.draggable=true;chip.setAttribute('data-sec-idx',idx);
    chip.innerHTML='<span class="sec-handle">⋮⋮</span><span class="sec-tag">'+esc(tag)+'</span><span class="sec-title">'+esc(title)+'</span>';
    secList.appendChild(chip);
  });
  /* 드래그 순서 변경 */
  (function(){
    var dragChip=null;
    secList.addEventListener('dragstart',function(e){
      var chip=e.target.closest('.ep-sec-chip');if(!chip)return;
      dragChip=chip;chip.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','sec');
    });
    secList.addEventListener('dragover',function(e){
      if(!dragChip)return;e.preventDefault();
      var target=e.target.closest('.ep-sec-chip');
      if(target&&target!==dragChip){
        var rect=target.getBoundingClientRect();
        if(e.clientY<rect.top+rect.height/2)secList.insertBefore(dragChip,target);
        else if(target.nextSibling)secList.insertBefore(dragChip,target.nextSibling);
        else secList.appendChild(dragChip);
      }
    });
    secList.addEventListener('dragend',function(){
      if(!dragChip)return;
      dragChip.classList.remove('dragging');
      var chips=secList.querySelectorAll('.ep-sec-chip');
      var ctaEl=NL.querySelector('[data-el="box"][style*="text-align:center"]');
      var refNode=ctaEl||null;
      for(var ci=chips.length-1;ci>=0;ci--){
        var idx=chips[ci].dataset.secIdx;
        var secEl=NL.querySelector('[data-section="'+idx+'"]');
        if(secEl){
          if(refNode)NL.insertBefore(secEl,refNode);
          refNode=secEl;
        }
      }
      dragChip=null;
      toast('섹션 순서 변경됨');
    });
  })();
}

function populateUrlChips(sections){
  var wrap=qs('#ep-url-list'),secList=qs('#ep-section-list'),sec=qs('#ep-urls-section');
  if(!wrap||!sec)return;
  if(!sections||!sections.length){sec.style.display='none';return;}
  sec.style.display='';
  
  /* 섹션 순서 칩 */
  if(secList&&sections.length>1){
    secList.innerHTML=sections.map(function(s,i){
      return'<div class="ep-sec-chip" draggable="true" data-sec-idx="'+i+'">'
        +'<span class="sec-handle">⋮⋮</span>'
        +'<span class="sec-tag">'+esc(s.tag)+'</span>'
        +'<span class="sec-title">'+esc(cleanBr(s.ai.title||s.data.title))+'</span>'
        +'</div>';
    }).join('');
    /* 섹션 칩 드래그 순서 변경 */
    (function(){
      var dragChip=null;
      secList.addEventListener('dragstart',function(e){
        var chip=e.target.closest('.ep-sec-chip');if(!chip)return;
        dragChip=chip;chip.classList.add('dragging');
        e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','sec');
      });
      secList.addEventListener('dragover',function(e){
        if(!dragChip)return;e.preventDefault();
        var target=e.target.closest('.ep-sec-chip');
        if(target&&target!==dragChip){
          var rect=target.getBoundingClientRect();
          if(e.clientY<rect.top+rect.height/2)secList.insertBefore(dragChip,target);
          else if(target.nextSibling)secList.insertBefore(dragChip,target.nextSibling);
          else secList.appendChild(dragChip);
        }
      });
      secList.addEventListener('dragend',function(){
        if(!dragChip)return;
        dragChip.classList.remove('dragging');
        /* 칩 순서에 맞춰 NL의 data-section 순서 변경 */
        var chips=secList.querySelectorAll('.ep-sec-chip');
        var ctaEl=NL.querySelector('[data-el="box"][style*="text-align:center"]');
        var refNode=ctaEl||null;
        for(var ci=chips.length-1;ci>=0;ci--){
          var idx=chips[ci].dataset.secIdx;
          var secEl=NL.querySelector('[data-section="'+idx+'"]');
          if(secEl){
            if(refNode)NL.insertBefore(secEl,refNode);
            refNode=secEl;
          }
        }
        dragChip=null;
        toast('섹션 순서 변경됨');
      });
    })();
  } else if(secList){secList.innerHTML='';}

  /* URL 칩 */
  wrap.innerHTML=sections.map(function(s,i){
    var shortUrl=s.url.replace(/^https?:\/\//,'').substring(0,35)+'...';
    return'<div class="ep-url-chip" draggable="true" data-chip-url="'+esc(s.url)+'" data-chip-tag="'+esc(s.tag)+'" data-chip-title="'+esc(cleanBr(s.ai.title||s.data.title))+'">'
      +'<span class="chip-tag">'+esc(s.tag)+'</span>'
      +'<span class="chip-url" title="'+esc(s.url)+'">'+esc(shortUrl)+'</span>'
      +'</div>';
  }).join('');
}
/* URL chip drag → NL drop */
(function(){
  var dragChip=null;
  var dragInsert=null;
  document.addEventListener('dragstart',function(e){
    /* URL chip */
    var chip=e.target.closest('.ep-url-chip');
    if(chip){dragChip=chip;chip.classList.add('dragging');e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','url-chip');return;}
    /* Insert tool (구분선/공백/박스) */
    var tool=e.target.closest('[data-insert-type]');
    if(tool){dragInsert=tool.dataset.insertType;e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','insert-tool');return;}
  });
  document.addEventListener('dragend',function(){
    if(dragChip){dragChip.classList.remove('dragging');dragChip=null;}
    dragInsert=null;
  });
  NL.addEventListener('dragover',function(e){
    if(dragChip||dragInsert){e.preventDefault();e.dataTransfer.dropEffect='copy';}
  });
  NL.addEventListener('drop',function(e){
    /* Insert tool drop */
    if(dragInsert){
      e.preventDefault();
      var range=null;
      if(document.caretRangeFromPoint)range=document.caretRangeFromPoint(e.clientX,e.clientY);
      if(range){var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);}
      var html='';
      if(dragInsert==='hr')html='<hr style="border:none;border-top:1px solid #D5D2CA;margin:24px 0">';
      else if(dragInsert==='spacer')html='<div data-el="spacer" style="height:32px;line-height:0;font-size:0">&nbsp;</div>';
      else if(dragInsert==='box')html='<div data-el="box" style="background:#FBFBFF;border:1px solid #E5E7EB;padding:16px 20px;border-radius:10px;margin:16px 0">여기에 내용을 입력하세요.</div>';
      if(html)document.execCommand('insertHTML',false,html);
      dragInsert=null;NL.focus();return;
    }
    /* URL chip drop */
    if(!dragChip)return;
    e.preventDefault();
    var url=dragChip.getAttribute('data-chip-url');
    var tag=dragChip.getAttribute('data-chip-tag');
    var title=dragChip.getAttribute('data-chip-title');
    var range=null;
    if(document.caretRangeFromPoint)range=document.caretRangeFromPoint(e.clientX,e.clientY);
    if(range){
      var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
      var linkHtml='<a data-el="link" href="'+url+'" target="_blank" style="color:#3B48CC;font-weight:bold;text-decoration:none">'+esc(title||tag)+' ↗</a>';
      document.execCommand('insertHTML',false,linkHtml);
    }
    dragChip.classList.remove('dragging');dragChip=null;
    NL.focus();
  });
})();

/* ===== 부분 재생성 + 수정 요청 ===== */
(function(){
  var floatWrap=document.createElement('div');
  floatWrap.style.cssText='position:absolute;display:none;z-index:100';
  floatWrap.innerHTML='<button id="rewrite-edit-btn" class="rewrite-float" style="background:#111">&#9998; 수정 요청</button>';
  document.body.appendChild(floatWrap);
  var rewriteRange=null;

  /* 우측 패널에 수정 요청 UI 추가 */
  var epSec=qs('#ep-selected'),epContent=qs('#ep-selected-content');

  function showRewritePanel(){
    if(!epSec||!epContent)return;
    var ep=qs('#edit-panel');
    if(ep)ep.classList.add('open');
    epSec.style.display='';
    epContent.innerHTML='<div style="background:#F0EDFF;border:1.5px solid #6366F1;border-radius:14px;padding:16px;margin-bottom:4px">'
      +'<div style="font-size:13px;font-weight:800;color:#4F46E5;margin-bottom:6px">✏️ 수정 요청</div>'
      +'<div style="font-size:11px;color:#6B7280;margin-bottom:12px">선택한 텍스트를 어떻게 수정할까요?</div>'
      +'<input id="rewrite-instruction" type="text" placeholder="예: 더 짧게, 수치 강조, 톤 부드럽게..." style="width:100%;padding:9px 12px;border:1.5px solid #C7D2FE;border-radius:10px;font-size:11px;outline:none;margin-bottom:12px;background:#fff">'
      +'<div style="display:flex;gap:6px;justify-content:flex-end">'
      +'<button id="rewrite-panel-cancel" style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:6px 14px;font-size:11px;cursor:pointer;color:#94A3B8;font-weight:500">취소</button>'
      +'<button id="rewrite-panel-go" style="background:#4F46E5;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:11px;cursor:pointer;font-weight:700">적용</button>'
      +'</div>'
      +'</div>';
    setTimeout(function(){var inp=qs('#rewrite-instruction');if(inp)inp.focus();},50);
    qs('#rewrite-panel-go').addEventListener('click',function(){
      var inst=qs('#rewrite-instruction').value.trim();
      if(!inst){toast('수정 요청을 입력해주세요');return;}
      doRewrite(inst);
    });
    qs('#rewrite-panel-cancel').addEventListener('click',function(){
      epSec.style.display='none';
      floatWrap.style.display='none';
    });
    var inp=qs('#rewrite-instruction');
    if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();qs('#rewrite-panel-go').click();}});
  }

  var isFloatInteracting=false;
  floatWrap.addEventListener('mousedown',function(){isFloatInteracting=true;});
  floatWrap.addEventListener('mouseup',function(){setTimeout(function(){isFloatInteracting=false;},100);});

  document.addEventListener('selectionchange',function(){
    if(!isEditable){floatWrap.style.display='none';return;}
    if(isFloatInteracting)return;
    var sel=window.getSelection();
    if(!sel.rangeCount||sel.isCollapsed||!NL.contains(sel.anchorNode)){
      floatWrap.style.display='none';return;
    }
    var range=sel.getRangeAt(0);
    var text=sel.toString().trim();
    if(text.length<10){floatWrap.style.display='none';return;}
    rewriteRange=range.cloneRange();
    var rect=range.getBoundingClientRect();
    floatWrap.style.display='block';
    floatWrap.style.left=(rect.left+rect.width/2-80)+'px';
    floatWrap.style.top=(rect.bottom+window.scrollY+6)+'px';
  });

  function doRewrite(instruction){
    if(!rewriteRange){toast('텍스트를 먼저 선택해주세요');return;}
    var key=getKey();
    if(!key){toast('API 키를 설정해주세요');return;}
    var originalText=rewriteRange.toString().trim();
    if(originalText.length<10){toast('텍스트를 더 선택해주세요');return;}

    var marker=document.createElement('span');
    marker.style.cssText='background:#DBEAFE;border-radius:4px;';
    marker.setAttribute('data-rewriting','1');
    try{rewriteRange.surroundContents(marker);}catch(ex){
      var frag=rewriteRange.extractContents();marker.appendChild(frag);rewriteRange.insertNode(marker);
    }

    /* 로딩 표시 - 우측 패널에 */
    if(epContent)epContent.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:8px 0"><div class="spinner" style="width:14px;height:14px;border-width:2px"></div><span style="font-size:12px;color:#64748B">'+(instruction?'수정 요청 반영 중...':'재생성 중...')+'</span></div>';
    floatWrap.style.display='none';

    var sysText='너는 뉴스레터 리라이터야. 주어진 텍스트를 같은 톤과 스타일로 리라이팅해. ~습니다체, 핵심 수치 유지, 원문에 없는 내용 창작 금지. 소제목이 있으면 이모지+소제목 형식 유지. 리라이팅 결과만 출력해. 태그나 설명 없이 본문만.';
    var fullContext=NL.textContent.substring(0,2000);
    var userText=instruction
      ?'전체 뉴스레터 컨텍스트:\n'+fullContext+'\n\n---\n\n아래 선택된 부분을 다음 요청에 따라 수정해줘. 전체 뉴스레터의 다른 내용도 참고해서 작성해.\n\n수정 요청: '+instruction+'\n\n선택된 부분:\n'+originalText
      :'전체 뉴스레터 컨텍스트:\n'+fullContext+'\n\n---\n\n아래 선택된 부분만 리라이팅해줘. 전체 흐름에 맞게 작성해.\n\n선택된 부분:\n'+originalText;
    var models=['gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-flash'];

    function resetFloat(){
      floatWrap.style.display='none';
      if(epSec)epSec.style.display='none';
    }

    function tryModel(i,withoutSys){
      if(i>=models.length){toast('API 요청 한도 초과 — 30초 후 다시 시도해주세요');marker.outerHTML=marker.innerHTML;resetFloat();return;}
      var u='https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key;
      var body;
      if(!withoutSys){body=JSON.stringify({system_instruction:{parts:[{text:sysText}]},contents:[{parts:[{text:userText}]}],generationConfig:{temperature:0.4,maxOutputTokens:4096}});}
      else{body=JSON.stringify({contents:[{parts:[{text:sysText+'\n\n---\n\n'+userText}]}],generationConfig:{temperature:0.4,maxOutputTokens:4096}});}
      fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:body})
      .then(function(r){
        if(r.status===404||r.status===403){tryModel(i+1,false);return null;}
        if(r.status===429){toast('API 한도 초과 — 잠시 후 다시 시도해주세요');marker.outerHTML=marker.innerHTML;resetFloat();return null;}
        if(r.status===400&&!withoutSys){tryModel(i,true);return null;}
        if(!r.ok){tryModel(i+1,false);return null;}
        return r.json();
      })
      .then(function(d){
        if(!d)return;
        var c=d.candidates&&d.candidates[0];
        if(!c||!c.content||!c.content.parts){tryModel(i+1,false);return;}
        var newText=c.content.parts.map(function(p){return p.text||'';}).join('').trim().replace(/\*\*/g,'');
        if(!newText){toast('AI 응답이 비어있습니다');marker.outerHTML=marker.innerHTML;resetFloat();return;}
        if(i>0)toast('Gemini '+models[i]+' 사용 중');
        var lines=newText.split('\n').filter(function(l){return l.trim();});
        var html='';
        var emojiRx=/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}\u{200D}]/u;
        for(var li=0;li<lines.length;li++){
          var line=lines[li].trim();
          if(emojiRx.test(line)&&line.length<60){
            html+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px">'+line+'</div>';
          } else {
            html+='<p style="color:#222;margin:0 0 12px;font-size:16px;line-height:1.8">'+line+'</p>';
          }
        }
        marker.outerHTML=html||newText;
        toast(instruction?'수정 요청 반영 완료':'부분 재생성 완료');
        resetFloat();
      })
      .catch(function(err){console.error(err);tryModel(i+1,false);});
    }
    tryModel(0,false);
  }

  /* 플로팅 버튼 이벤트 */
  floatWrap.querySelector('#rewrite-edit-btn').addEventListener('click',function(e){
    e.stopPropagation();
    showRewritePanel();
  });
  floatWrap.querySelectorAll('button').forEach(function(b){b.addEventListener('mousedown',function(e){e.preventDefault();});});

  /* NL 밖 클릭 시 숨기기 */
  document.addEventListener('mousedown',function(e){
    if(!floatWrap.contains(e.target)){floatWrap.style.display='none';}
  });
})();

/* Init */
renderHist();
renderDrafts();

/* =============================================
   SNS 텍스트 생성 모듈
   ============================================= */
(function(){

/* 인스타그램 프로필 링크 매핑 */
var INSTA_LINKS={
  '모바일인덱스INSIGHT': '📈 모바일인덱스 리포트 tinyurl.com/yecj7zff',
  '트레이딩웍스360':    '🎯 트레이딩웍스360 블로그 tinyurl.com/2zhffz5v',
  '디파이너리':         '📮 디파이너리 블로그 tinyurl.com/49wk3exm',
  'TVIndex':            '📺 TV AD INDEX 블로그 tinyurl.com/4s8cyhv4',
  '아이지에이웍스':     '📈 모바일인덱스 리포트 tinyurl.com/yecj7zff',
  'Fixfolio':           '📈 모바일인덱스 리포트 tinyurl.com/yecj7zff',
  'Fixtype':            '📈 모바일인덱스 리포트 tinyurl.com/yecj7zff'
};

function getInstaLink(tag){
  return INSTA_LINKS[tag]||'📈 모바일인덱스 리포트 tinyurl.com/yecj7zff';
}

/* SNS 저장 목록 */
var snsSaved=[];
try{snsSaved=JSON.parse(localStorage.getItem('sns-saved')||'[]');}catch(e){snsSaved=[];}
function saveSnsStorage(){localStorage.setItem('sns-saved',JSON.stringify(snsSaved));}

/* 현재 활성 플랫폼 */
var snsActivePlatform='facebook';
/* 현재 생성된 후보들 { facebook:[], linkedin:[], instagram:[] } */
var snsCandidates={facebook:[],linkedin:[],instagram:[]};

/* ---- 모드 스위칭 ---- */
var currentMode='newsletter';
qsa('.mode-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    currentMode=btn.dataset.mode;
    qsa('.mode-btn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    if(currentMode==='newsletter'){
      showNewsletterMode();
    } else {
      showSnsMode();
    }
  });
});

function showNewsletterMode(){
  document.body.classList.remove('sns-mode');
  qs('#sidebar-newsletter').style.display='';
  qs('#sidebar-sns').style.display='none';
  var hero=qs('#hero-section');if(hero)hero.classList.remove('hidden');
  qs('#panels').classList.add('hidden');
  qs('#editor-toolbar').classList.add('hidden');
  qs('#back-btn').classList.add('hidden');
  var tcdd=qs('#title-candidates-dropdown');if(tcdd)tcdd.classList.add('hidden');
  qs('#sns-section').classList.add('hidden');
  qs('#sns-results').classList.add('hidden');
}

function showSnsMode(){
  document.body.classList.add('sns-mode');
  qs('#sidebar-newsletter').style.display='none';
  qs('#sidebar-sns').style.display='';
  renderSidebarSnsSaved();
  renderSidebarSnsHistory();
  var hero=qs('#hero-section');
  if(hero)hero.classList.add('hidden');
  qs('#panels').classList.add('hidden');
  qs('#editor-toolbar').classList.add('hidden');
  qs('#back-btn').classList.add('hidden');
  var tcdd=qs('#title-candidates-dropdown');if(tcdd)tcdd.classList.add('hidden');
  var snsSection=qs('#sns-section');
  if(snsSection)snsSection.classList.remove('hidden');
  qs('#sns-results').classList.add('hidden');
}

/* ---- URL 행 추가/제거 (SNS) ---- */
function makeSnsUrlRow(){
  var row=document.createElement('div');
  row.className='url-row';
  row.innerHTML='<div class="url-row-inner"><div class="url-row-top"><div class="url-row-main"><span class="url-icon">📎</span><input type="url" class="url-field sns-url-field" placeholder="SNS에 공유할 콘텐츠 URL을 입력하세요"></div><button class="url-remove-btn">✕</button></div></div>';
  row.querySelector('.url-remove-btn').addEventListener('click',function(){
    if(qs('#sns-url-list').querySelectorAll('.url-row').length>1)row.remove();
  });
  return row;
}

qs('#sns-url-list').querySelector('.url-remove-btn').addEventListener('click',function(){
  if(qs('#sns-url-list').querySelectorAll('.url-row').length>1)
    this.closest('.url-row').remove();
});

/* ---- SNS 입력 모드 탭 (URL 직접 / 뉴스레터 연동) ---- */
(function(){
  var tabs=qsa('.sns-input-tab');
  var urlWrap=qs('#sns-url-input-wrap');
  var nlWrap=qs('#sns-nl-import-wrap');

  function renderNlImport(){
    var list=qs('#sns-nl-url-list');
    if(!lastGenUrls||lastGenUrls.length===0){
      list.innerHTML='<p class="sns-nl-empty">뉴스레터를 먼저 생성하면<br>URL을 자동으로 불러올 수 있어요.</p>';
      return;
    }
    var html='';
    lastGenUrls.forEach(function(item,i){
      var tag=item.tag&&item.tag!=='auto'?item.tag:'자동분류';
      html+='<div class="sns-nl-url-item">'
        +'<div class="sns-nl-url-item-info">'
        +'<span class="sns-nl-url-item-tag">'+esc(tag)+'</span>'
        +'<div class="sns-nl-url-item-url" title="'+esc(item.url)+'">'+esc(item.url)+'</div>'
        +'</div>'
        +'<button class="sns-nl-use-btn" data-idx="'+i+'">사용</button>'
        +'</div>';
    });
    if(lastGenUrls.length>1){
      html+='<button class="sns-nl-use-all-btn">전체 URL 사용하기 ('+lastGenUrls.length+'개)</button>';
    }
    list.innerHTML=html;
    /* 개별 사용 */
    list.querySelectorAll('.sns-nl-use-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var idx=parseInt(btn.dataset.idx);
        var item=lastGenUrls[idx];
        /* SNS URL 탭으로 전환 후 해당 URL 넣기 */
        switchSnsInputTab('url');
        var urlList=qs('#sns-url-list');
        var fields=urlList.querySelectorAll('.sns-url-field');
        if(fields.length>0){fields[0].value=item.url;}
        toast('URL을 불러왔어요!');
      });
    });
    /* 전체 사용 */
    var allBtn=list.querySelector('.sns-nl-use-all-btn');
    if(allBtn){
      allBtn.addEventListener('click',function(){
        switchSnsInputTab('url');
        var urlList=qs('#sns-url-list');
        /* 기존 행 제거 후 새로 추가 */
        urlList.innerHTML='';
        lastGenUrls.forEach(function(item){
          var row=makeSnsUrlRow();
          row.querySelector('.sns-url-field').value=item.url;
          urlList.appendChild(row);
        });
        toast('전체 URL을 불러왔어요! ('+lastGenUrls.length+'개)');
      });
    }
  }

  function switchSnsInputTab(tab){
    tabs.forEach(function(b){b.classList.toggle('active',b.dataset.itab===tab);});
    urlWrap.style.display=tab==='url'?'':'none';
    nlWrap.style.display=tab==='nl'?'':'none';
    if(tab==='nl')renderNlImport();
  }

  tabs.forEach(function(btn){
    btn.addEventListener('click',function(){switchSnsInputTab(btn.dataset.itab);});
  });
})();

/* ---- 플랫폼 탭 전환 ---- */
qsa('.sns-ptab').forEach(function(tab){
  tab.addEventListener('click',function(){
    snsActivePlatform=tab.dataset.platform;
    qsa('.sns-ptab').forEach(function(t){t.classList.remove('active');});
    tab.classList.add('active');
    renderSnsCandidates();
  });
});

/* ---- 뒤로가기 ---- */
on('#sns-back-btn','click',function(){
  qs('#sns-results').classList.add('hidden');
  qs('#sns-section').classList.remove('hidden');
});

/* ---- 저장 패널 토글 ---- */
on('#sns-saved-toggle','click',function(){
  qs('#sns-history-panel').classList.add('hidden');
  var panel=qs('#sns-saved-panel');
  var isHidden=panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if(isHidden){
    renderSnsSavedList();
    /* 패널이 열릴 때 저장 목록 내용 새로고침 */
    var list=qs('#sns-saved-list');
    if(list&&snsSaved.length===0){
      list.innerHTML='<p style="color:var(--light);font-size:12px;text-align:center;padding:32px 12px">아직 저장된 텍스트가 없어요</p>';
    }
  }
});
on('#sns-saved-panel-close','click',function(){
  qs('#sns-saved-panel').classList.add('hidden');
});

/* ---- Gemini 호출 ---- */
function snsGenerate(urls){
  var key=getKey();
  if(!key)return Promise.reject(new Error('NO_KEY'));

  /* URL당 프롬프트 구성 */
  var urlLines=urls.map(function(u,i){
    return (i+1)+'. URL: '+u.url+'\n   솔루션: '+u.tag+'\n   인스타그램 프로필 링크: '+getInstaLink(u.tag);
  }).join('\n\n');

  var sysPrompt=[
    '당신은 B2B 마케팅 콘텐츠 전문가입니다. 주어진 URL들의 콘텐츠를 분석하여 각 SNS 플랫폼에 최적화된 공유 텍스트를 작성합니다.',
    '',
    '## 플랫폼별 가이드라인',
    '',
    '## 공통 규칙',
    '- **마크다운 문법 절대 사용 금지**: **, *, #, [] 등 사용하지 말 것',
    '- URL 링크 본문에 직접 삽입 금지 (모든 플랫폼)',
    '- 실제 URL 콘텐츠를 읽어서 구체적인 수치/사례 기반으로 작성',
    '',
    '### 페이스북',
    '다음 구조로 작성:',
    '1. 흥미를 유발하는 훅 문장 (데이터나 반전 포인트로 시작)',
    '2. 핵심 발견/인사이트를 2~3문장으로 자연스럽게 전개',
    '3. 소제목 + 불릿(-) 3~4개 (각 불릿은 핵심 수치나 인사이트)',
    '   - 소제목은 "■" 기호 대신 이모지(📌, 💡, 📊, 🔍, 🎯 등)를 사용해서 작성. 매번 다른 이모지를 골라. 예: "📊 2025년 증권 앱 시장 변화", "💡 MZ세대 투자 트렌드 3가지", "🎯 팬덤 오디언스 핵심 인사이트"',
    '4. CTA 1문장으로 마무리 (URL 없이)',
    '- 이모지는 글 전체에서 최대 2개만. 그 이상 절대 금지. 불릿에 이모지 넣지 마.',
    '- 3개 후보 중 1개는 반드시 이모지 없이 정적이고 전문적인 톤으로 작성.',
    '- ★ 750자 이내 필수! 절대 초과 금지. 간결하게 작성.',
    '',
    '### 링크드인',
    '다음 구조로 작성:',
    '1. 비즈니스적으로 날카로운 첫 문장 (질문형 또는 데이터 제시)',
    '2. 시장 상황이나 문제의식 2~3문장',
    '3. 핵심 인사이트 3개 불릿(-) 정리',
    '4. 마지막은 간결하게 마무리. "아티클 전문을 통해 확인해 보세요" 정도로 끝내. "청사진", "새로운 지평", "패러다임" 같은 거창한 단어 절대 금지. 장황한 마무리 금지. 딱 한 문장으로.',
    '- 350~500자 내외, B2B 전문가 톤, 이모지 최소화 (0~1개)',
    '',
    '### 인스타그램',
    '다음 구조로 작성:',
    '1. 첫 줄: [콘텐츠 제목] — 대괄호 꺽쇠 안에 원문 제목을 간결하게. 예: [BTS 광화문 공연, 135만 팬덤 데이터 분석]',
    '2. 본문: 5~6줄로 핵심 내용 작성. 짧고 임팩트 있는 문장 위주. 단락 사이에 빈 줄(\\n\\n)을 넣어서 가독성 높게.',
    '3. 마지막 문장은 반드시: "지금 바로 프로필 상단 링크 (📊아이지에이웍스 블로그)를 통해 확인해 보세요!" 로 끝낼 것. 이 문구 그대로 사용.',
    '- ★ 이모지 반드시 2개 사용! 제목 바로 뒤가 아닌, 본문 중간이나 CTA 앞 등 자연스러운 위치에 배치. 제목 줄에는 이모지 넣지 마.',
    '- 200~350자 내외',
    '',
    '## 출력 형식',
    'JSON만 출력. 설명 없이 JSON만. 각 후보에 label(특징 2~4자)과 text를 포함. 플랫폼당 3개씩.',
    'label 예시: "수치 강조", "스토리텔링", "질문형", "문제의식", "반전 포인트", "실용 전략", "데이터 중심", "감성 접근". label은 2~4자 특징만 간결하게. 부가 설명이나 부제 붙이지 마.',
    '원문 내용에 맞게 가장 적합한 3가지 각도를 AI가 자동 선택.',
    '```json',
    '{',
    '  "facebook": [{"label":"...","text":"..."},{"label":"...","text":"..."},{"label":"...","text":"..."}],',
    '  "linkedin": [{"label":"...","text":"..."},{"label":"...","text":"..."},{"label":"...","text":"..."}],',
    '  "instagram": [{"label":"...","text":"..."},{"label":"...","text":"..."},{"label":"...","text":"..."}]',
    '}',
    '```',
    '',
    '3개 후보가 서로 확실히 다른 각도/어조여야 해. URL 콘텐츠를 직접 읽어서 실제 내용 기반으로 작성. ★ 반드시 플랫폼당 정확히 3개만! 4개 이상 절대 금지.'
  ].join('\n');

  var userMsg='다음 URL들의 콘텐츠를 분석하여 SNS 공유 텍스트를 생성해주세요:\n\n'+urlLines;

  var body=JSON.stringify({
    system_instruction:{parts:[{text:sysPrompt}]},
    contents:[{parts:[{text:userMsg}]}],
    generationConfig:{temperature:0.8,maxOutputTokens:32768},
    tools:[{"urlContext":{}}]
  });

  return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:body
  }).then(function(r){return r.json();}).then(function(d){
    console.log('SNS API response:', d);
    var c=d.candidates&&d.candidates[0];
    if(!c||!c.content||!c.content.parts){
      console.error('Invalid response structure:', d);
      throw new Error('AI 응답 오류: '+(d.error&&d.error.message||'응답 구조 오류'));
    }
    var txt='';
    for(var i=0;i<c.content.parts.length;i++){if(c.content.parts[i].text)txt+=c.content.parts[i].text;}
    /* JSON 파싱 — 코드블록 우선 시도, 실패 시 raw 추출 */
    var jsonStr=null;
    var codeBlock=txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if(codeBlock){jsonStr=codeBlock[1].trim();}
    if(!jsonStr){
      /* 첫 { 부터 마지막 } 까지 추출 */
      var start=txt.indexOf('{');
      var end=txt.lastIndexOf('}');
      if(start!==-1&&end!==-1&&end>start){jsonStr=txt.substring(start,end+1);}
    }
    if(!jsonStr)throw new Error('AI가 올바른 형식으로 응답하지 않았습니다. 다시 시도해 보세요.');
    var result;
    try{result=JSON.parse(jsonStr);}catch(e){throw new Error('JSON 파싱 실패: '+e.message+'\n(다시 생성해 보세요)');}
    if(!result.facebook||!result.linkedin||!result.instagram)throw new Error('플랫폼 데이터 누락 — 다시 생성해 보세요.');
    /* 강제로 3개로 자르기 */
    result.facebook=result.facebook.slice(0,3);
    result.linkedin=result.linkedin.slice(0,3);
    result.instagram=result.instagram.slice(0,3);
    return result;
  });
}

/* ---- 생성 버튼 ---- */
on('#sns-generate-btn','click',function(){
  var key=getKey();
  if(!key){toast('⚙️ 설정에서 Gemini API 키를 먼저 입력하세요');qs('#settings-modal').classList.remove('hidden');return;}

  var rows=qsa('#sns-url-list .url-row');
  var urls=[];
  rows.forEach(function(row){
    var urlVal=(row.querySelector('.sns-url-field').value||'').trim();
    var tagEl=row.querySelector('.sns-tag-select');
    var tagVal=tagEl?tagEl.value:'auto';
    if(urlVal){
      var detectedTag=(tagVal==='auto')?classify(urlVal):tagVal;
      urls.push({url:urlVal,tag:detectedTag});
    }
  });
  if(urls.length===0){toast('URL을 입력하세요');return;}

  qs('#sns-loading').classList.remove('hidden');
  qs('#sns-error-msg').classList.add('hidden');
  qs('#sns-generate-btn').disabled=true;

  snsGenerate(urls).then(function(result){
    snsCandidates=result;
    snsLastUrls=urls;
    snsActivePlatform='facebook';
    qsa('.sns-ptab').forEach(function(t){t.classList.remove('active');});
    qs('[data-platform="facebook"]').classList.add('active');
    qs('#sns-loading').classList.add('hidden');
    qs('#sns-generate-btn').disabled=false;
    qs('#sns-section').classList.add('hidden');
    qs('#sns-results').classList.remove('hidden');
    renderSnsCandidates();
    addSnsHistory(result,urls);
  }).catch(function(err){
    qs('#sns-loading').classList.add('hidden');
    qs('#sns-generate-btn').disabled=false;
    var errEl=qs('#sns-error-msg');
    errEl.textContent='❌ '+err.message;
    errEl.classList.remove('hidden');
  });
});

/* ---- 후보 카드 렌더링 ---- */
function cleanSnsText(t){
  /* ** 마크다운 제거 */
  t=t.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1');
  /* 리포트 링크 줄 제거 */
  t=t.replace(/^.*리포트.*(?:링크|확인|바로가기).*$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
  /* 인스타 프로필 링크 줄 제거 (tinyurl 등) */
  t=t.replace(/^.*(?:tinyurl\.com|프로필\s*링크|상단\s*프로필).*$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
  return t;
}

function renderSnsCandidates(){
  var wrap=qs('#sns-candidates-wrap');
  wrap.innerHTML='<div class="sns-cards-inner" id="sns-cards-inner"></div>';
  var wrap=qs('#sns-cards-inner');
  var rawList=(snsCandidates[snsActivePlatform]||[]).slice(0,3);
  var labelColors=['sns-label-0','sns-label-1','sns-label-2','sns-label-3','sns-label-4'];

  rawList.forEach(function(item,idx){
    var isObj=(typeof item==='object'&&item.text);
    var text=isObj?item.text:item;
    var label=isObj&&item.label?item.label:'후보 '+(idx+1);
    text=cleanSnsText(text);

    var card=document.createElement('div');
    card.className='sns-card';

    var header=document.createElement('div');
    header.className='sns-card-header';
    var ls=getLabelStyle(label);
    header.innerHTML='<span class="sns-card-label" style="border-left-color:'+ls.border+'">'+ls.emoji+' '+esc(label)+'</span>'
      +'<div style="display:flex;gap:4px;align-items:center">'
      +'<button class="sns-icon-btn sns-preview-btn" title="미리보기" style="font-size:13px;line-height:1">🔎</button>'
      +'<button class="sns-icon-btn sns-copy-btn" title="복사"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>'
      +'<button class="sns-icon-btn sns-card-save-btn" title="저장"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>'
      +'<button class="sns-text-btn sns-edit-btn">수정</button>'
      +'</div>';

    var body=document.createElement('div');
    body.className='sns-card-body';
    var textEl=document.createElement('div');
    textEl.className='sns-card-text';
    textEl.textContent=text;
    body.appendChild(textEl);

    card.appendChild(header);card.appendChild(body);

    /* 복사 */
    header.querySelector('.sns-copy-btn').addEventListener('click',function(e){
      e.stopPropagation();
      var t=textEl.innerText||textEl.textContent;
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
      else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('복사됨!');}
    });

    /* 미리보기 */
    header.querySelector('.sns-preview-btn').addEventListener('click',function(e){
      e.stopPropagation();
      showSnsPreview(snsActivePlatform,textEl.innerText||textEl.textContent);
    });

    /* 카드 직접 저장 */
    var saveBtn=header.querySelector('.sns-card-save-btn');
    saveBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var t=textEl.innerText||textEl.textContent;
      if(this.classList.contains('saved')){
        /* 저장 취소 — 같은 텍스트 찾아서 삭제 */
        snsSaved=snsSaved.filter(function(s){return s.text!==t;});
        saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
        this.classList.remove('saved');
        this.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
        toast('저장 취소됨');
      } else {
        /* 저장 */
        snsSaved.unshift({id:Date.now(),platform:snsActivePlatform,text:t,label:label,date:today()});
        if(snsSaved.length>50)snsSaved=snsSaved.slice(0,50);
        saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
        this.classList.add('saved');
        this.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
        toast('저장됨!');
      }
    });

    /* 수정 → 모달 열기 */
    header.querySelector('.sns-edit-btn').addEventListener('click',function(e){
      e.stopPropagation();
      openCardModal(idx);
    });

    function openCardModal(ci){
      var item=snsCandidates[snsActivePlatform][ci];
      if(!item)return;
      var isObj=(typeof item==='object'&&item.text);
      var mText=isObj?item.text:(typeof item==='string'?item:'');
      var mLabel=isObj&&item.label?item.label:'후보 '+(ci+1);
      mText=cleanSnsText(mText);
      var bodyEl=qs('#sns-preview-body');
      bodyEl.style.background='#F8FAFC';
      var ls=getLabelStyle(mLabel);
      bodyEl.innerHTML='<div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="width:24px;height:24px;border-radius:50%;background:none;border:1px solid #E2E8F0;display:inline-flex;align-items:center;justify-content:center;color:#334155;font-size:13px;flex-shrink:0">'+platformIcons[snsActivePlatform]+'</span>'
        +'<span class="sns-card-label" style="font-size:12px;padding:5px 14px;border-left-color:'+ls.border+'">'+ls.emoji+' '+esc(mLabel)+'</span>'
        +'</div>'
        +'<span style="font-size:11px;color:#94A3B8">직접 수정하거나 재생성해보세요</span>'
        +'</div>'
        +'<div id="card-modal-text" contenteditable="true" style="background:#fff;border:1.5px solid #E2E8F0;border-radius:12px;padding:18px;font-size:14px;line-height:1.8;color:#1E293B;white-space:pre-wrap;outline:none;min-height:300px">'+esc(mText)+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">'
        +'<select id="card-modal-tone" class="sns-tone-select" style="font-size:12px;padding:6px 12px"><option value="">톤</option><option value="casual">캐주얼</option><option value="professional">전문적</option><option value="hooking">후킹</option></select>'
        +'<select id="card-modal-style" class="sns-style-select" style="font-size:12px;padding:6px 12px"><option value="">스타일</option><option value="data">수치 강조</option><option value="story">스토리텔링</option><option value="question">질문형</option><option value="problem">문제의식</option><option value="reversal">반전 포인트</option></select>'
        +'<button id="card-modal-regen" class="btn-primary btn-sm">재생성</button>'
        +'<div style="flex:1"></div>'
        +'<button id="card-modal-copy" class="sns-modal-icon-btn" title="복사"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>'
        +'<button id="card-modal-done" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:#2563EB;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s" title="수정 완료 후 카드에 반영">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        +'수정 완료</button>'
        +'</div>';
      qs('#sns-preview-modal').querySelector('h3').textContent='텍스트 편집';
      qs('#sns-preview-modal').classList.remove('hidden');

      var modalText=qs('#card-modal-text');

      /* 수정 완료 — 카드에 반영 후 모달 닫기 */
      function applyAndClose(){
        var t=modalText.innerText||modalText.textContent;
        if(t!==mText){
          snsCandidates[snsActivePlatform][ci]={label:mLabel,text:t};
          renderSnsCandidates();
          toast('수정이 반영되었어요 ✓');
        }
        qs('#sns-preview-modal').classList.add('hidden');
      }
      qs('#card-modal-done').addEventListener('click',applyAndClose);

      /* 복사 */
      qs('#card-modal-copy').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
      });

      /* 재생성 */
      qs('#card-modal-regen').addEventListener('click',function(){
        var tone=qs('#card-modal-tone').value;
        var style=qs('#card-modal-style').value;
        if(!tone&&!style){toast('톤 또는 스타일을 선택하세요');return;}
        var combined=tone&&style?tone+'+'+style:(tone||style);
        var btn=qs('#card-modal-regen');btn.disabled=true;btn.textContent='⏳';
        regenSingleCandidate(snsActivePlatform,ci,combined).then(function(result){
          var newText=cleanSnsText(result.text||'');
          modalText.textContent=newText;
          btn.disabled=false;btn.textContent='재생성';
          toast('재생성 완료!');
          /* 재생성 후 저장 확인 바 표시 */
          var existingBar=qs('.regen-save-bar');if(existingBar)existingBar.remove();
          var bar=document.createElement('div');
          bar.className='regen-save-bar';
          bar.innerHTML='<span>💾 이 버전으로 저장할까요?<br><small style="font-weight:400;font-size:11px;color:#60A5FA">저장하지 않으면 기존 버전이 유지됩니다</small></span><button class="regen-save-yes">저장</button><button class="regen-save-no">취소</button>';
          modalText.parentNode.insertBefore(bar,modalText.nextSibling);
          bar.querySelector('.regen-save-yes').onclick=function(){
            var t=modalText.innerText||modalText.textContent;
            snsCandidates[snsActivePlatform][ci]={label:result.label||mLabel,text:t};
            renderSnsCandidates();
            snsSaved.unshift({id:Date.now(),platform:snsActivePlatform,text:t,label:result.label||mLabel,date:today()});
            if(snsSaved.length>50)snsSaved=snsSaved.slice(0,50);
            saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
            toast('저장됨!');bar.remove();
          };
          bar.querySelector('.regen-save-no').onclick=function(){bar.remove();};
        }).catch(function(err){btn.disabled=false;btn.textContent='재생성';toast('실패: '+(err&&err.message||'오류'));});
      });

      /* X 닫기 버튼 — 저장 안 하고 닫기 (원래 텍스트 유지) */
      var closeBtn=qs('#sns-preview-close');
      var origClose=closeBtn.onclick;
      closeBtn.onclick=function(){
        qs('#sns-preview-modal').classList.add('hidden');
        closeBtn.onclick=origClose;
      };
    }

    textEl.addEventListener('input',function(){
      var len=textEl.textContent.length;
      header.querySelector('.sns-card-num').textContent='#'+(idx+1)+' / '+rawList.length+' · '+len+'자';
    });

    wrap.appendChild(card);
  });
}

/* ---- SNS 저장 목록 렌더링 ---- */
var platformColors={facebook:'#1877F2',linkedin:'#0A66C2',instagram:'#C13584'};
var platformNames={facebook:'페이스북',linkedin:'링크드인',instagram:'인스타그램'};
var platformIcons={facebook:'<i class="fa-brands fa-facebook"></i>',linkedin:'<i class="fa-brands fa-linkedin-in"></i>',instagram:'<i class="fa-brands fa-instagram"></i>'};

var snsFilterPlatform='all';

function renderSnsSavedList(){
  var list=qs('#sns-saved-list');
  /* 저장 카운트 업데이트 */
  var countEl=qs('#sns-saved-count');
  if(countEl)countEl.textContent=snsSaved.length>0?'('+snsSaved.length+')':'';
  if(!list)return;
  var filtered=snsFilterPlatform==='all'?snsSaved:snsSaved.filter(function(s){return s.platform===snsFilterPlatform;});
  if(filtered.length===0){
    list.innerHTML='<p style="color:var(--light);font-size:12px;text-align:center;padding:32px 12px">'+(snsFilterPlatform==='all'?'아직 저장된 텍스트가 없어요':'해당 플랫폼에 저장된 텍스트가 없어요')+'</p>';return;
  }
  list.innerHTML='';
  filtered.forEach(function(item){
    var el=document.createElement('div');
    el.className='sns-saved-item';
    var previewText=item.text.length>60?item.text.substring(0,60)+'...':item.text;
    var platformCircleColors={facebook:'#1877F2',linkedin:'#0A66C2',instagram:'#E4405F'};
    var circleColor=platformCircleColors[item.platform]||'#64748B';
    var labelTag=item.label?'<span style="font-size:10px;color:#334155;padding:3px 10px;border-radius:20px;border:1px solid #E2E8F0;background:none">'+esc(item.label)+'</span>':'';
    el.innerHTML='<div class="sns-saved-item-top">'+
      '<div style="display:flex;align-items:center;gap:8px">'+
      '<span style="width:20px;height:20px;border-radius:50%;background:none;border:1px solid #E2E8F0;display:inline-flex;align-items:center;justify-content:center;color:#334155;font-size:11px;flex-shrink:0">'+platformIcons[item.platform]+'</span>'+
      labelTag+
      '</div>'+
      '<button class="sns-saved-item-del">✕</button>'+
      '</div>'+
      '<div class="sns-saved-item-text" style="cursor:pointer">'+esc(previewText)+'</div>'+
      '<div class="sns-saved-item-date">'+item.date+' · <span class="sns-saved-view-link">편집</span></div>';
    /* 클릭 → 수정 모달 열기 (일반 수정과 동일한 UI) */
    function openSavedEdit(e){
      e.stopPropagation();
      var savedLs=item.label?getLabelStyle(item.label):{emoji:'',border:'#94A3B8'};
      var bodyEl=qs('#sns-preview-body');
      bodyEl.style.background='#F8FAFC';
      bodyEl.innerHTML='<div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="width:24px;height:24px;border-radius:50%;background:none;border:1px solid #E2E8F0;display:inline-flex;align-items:center;justify-content:center;color:#334155;font-size:13px;flex-shrink:0">'+platformIcons[item.platform]+'</span>'
        +(item.label?'<span class="sns-card-label" style="font-size:12px;padding:5px 14px;border-left-color:'+savedLs.border+'">'+savedLs.emoji+' '+esc(item.label)+'</span>':'')
        +'</div>'
        +'<span style="font-size:11px;color:#94A3B8">직접 수정하거나 재생성해보세요</span>'
        +'</div>'
        +'<div id="saved-edit-text" contenteditable="true" style="background:#fff;border:1.5px solid #E2E8F0;border-radius:12px;padding:18px;font-size:14px;line-height:1.8;color:#1E293B;white-space:pre-wrap;outline:none;min-height:300px">'+esc(item.text)+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">'
        +'<select id="saved-modal-tone" class="sns-tone-select" style="font-size:12px;padding:6px 12px"><option value="">톤</option><option value="casual">캐주얼</option><option value="professional">전문적</option><option value="hooking">후킹</option></select>'
        +'<select id="saved-modal-style" class="sns-style-select" style="font-size:12px;padding:6px 12px"><option value="">스타일</option><option value="data">수치 강조</option><option value="story">스토리텔링</option><option value="question">질문형</option><option value="problem">문제의식</option><option value="reversal">반전 포인트</option></select>'
        +'<button id="saved-modal-regen" class="btn-primary btn-sm">재생성</button>'
        +'<div style="flex:1"></div>'
        +'<button id="saved-modal-copy" class="sns-modal-icon-btn" title="복사"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>'
        +'<button id="saved-modal-done" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:#2563EB;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        +'수정 완료</button>'
        +'</div>';
      qs('#sns-preview-modal').querySelector('h3').textContent='저장된 텍스트 편집';
      qs('#sns-preview-modal').classList.remove('hidden');

      var modalText=qs('#saved-edit-text');

      /* 수정 완료 — 저장 목록에 반영 후 닫기 */
      qs('#saved-modal-done').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        item.text=t;
        saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
        qs('#sns-preview-modal').classList.add('hidden');
        toast('수정 내용이 저장되었어요 ✓');
      });

      /* 복사 */
      qs('#saved-modal-copy').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
      });

      /* 재생성 */
      qs('#saved-modal-regen').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        var tone=qs('#saved-modal-tone').value;
        var style=qs('#saved-modal-style').value;
        var key=getKey();if(!key){toast('API 키를 설정해주세요');return;}
        var btn=qs('#saved-modal-regen');btn.disabled=true;btn.textContent='⏳';
        var toneMap={casual:'조금 더 부드럽고 읽기 편하게 (과도한 변화 없이)',professional:'조금 더 격식있게 (기존 구조 유지)',hooking:'첫 문장만 더 임팩트 있게 (나머지 유지)'};
        var styleMap={data:'수치/데이터를 좀 더 전면에',story:'스토리텔링 흐름으로 살짝 재배치',question:'도입부를 질문형으로',problem:'도입부에서 문제의식 강조',reversal:'도입부에 반전 포인트 배치'};
        var sysP='아래 SNS 텍스트를 다시 작성해줘. 기존 구조와 톤을 최대한 유지하면서 아래 방향만 살짝 반영해.\n\n';
        if(tone)sysP+='톤: '+toneMap[tone]+'\n';
        if(style)sysP+='스타일: '+styleMap[style]+'\n';
        sysP+='★ 마크다운(**, * 등) 절대 금지\n★ 기존 불릿/구조 유지\n★ 단락 사이에 반드시 빈 줄(\\n\\n) 유지\n\n기존 텍스트:\n'+t+'\n\n새로운 텍스트만 출력. 설명 없이.';
        callGemini(key,[{role:'user',parts:[{text:sysP}]}]).then(function(res){
          var txt=(res&&res.candidates&&res.candidates[0]&&res.candidates[0].content&&res.candidates[0].content.parts&&res.candidates[0].content.parts[0]&&res.candidates[0].content.parts[0].text)||'';
          modalText.textContent=txt.trim();
          btn.disabled=false;btn.textContent='재생성';
          toast('재생성 완료!');
          var existingBar=qs('.regen-save-bar');if(existingBar)existingBar.remove();
          var bar=document.createElement('div');
          bar.className='regen-save-bar';
          bar.innerHTML='<div class="regen-save-bar-icon">✨</div><div class="regen-save-bar-text"><strong>재생성 완료! 이 버전으로 저장할까요?</strong><span>저장하지 않으면 기존 내용이 유지됩니다</span></div><button class="regen-save-yes">저장하기</button><button class="regen-save-no">취소</button>';
          modalText.parentNode.insertBefore(bar,modalText.nextSibling);
          bar.querySelector('.regen-save-yes').onclick=function(){
            var t2=modalText.innerText||modalText.textContent;
            item.text=t2;saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
            toast('저장됨! 🔖');bar.remove();
          };
          bar.querySelector('.regen-save-no').onclick=function(){bar.remove();};
        }).catch(function(err){btn.disabled=false;btn.textContent='재생성';toast('실패');});
      });
    }
    el.querySelector('.sns-saved-item-text').addEventListener('click',openSavedEdit);
    el.querySelector('.sns-saved-view-link').addEventListener('click',openSavedEdit);
    el.querySelector('.sns-saved-item-del').addEventListener('click',function(e){
      e.stopPropagation();
      snsSaved=snsSaved.filter(function(s){return s.id!==item.id;});
      saveSnsStorage();
      renderSnsSavedList();
      renderSidebarSnsSaved();
    });
    list.appendChild(el);
  });
}

renderSnsSavedList();

/* 저장 목록 필터 */
qsa('.sns-filter-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    qsa('.sns-filter-btn').forEach(function(b){b.classList.remove('active');b.style.background='none';b.style.color='var(--sub)';});
    btn.classList.add('active');btn.style.background='var(--brand)';btn.style.color='#fff';
    snsFilterPlatform=btn.dataset.filter;
    renderSnsSavedList();
  });
});

/* ---- SNS 히스토리 ---- */
var snsHistory=[];
try{snsHistory=JSON.parse(localStorage.getItem('sns-history')||'[]');}catch(e){snsHistory=[];}
function saveSnsHistory(){localStorage.setItem('sns-history',JSON.stringify(snsHistory));}

function addSnsHistory(candidates,urls){
  snsHistory.unshift({id:Date.now(),date:today(),urls:urls.map(function(u){return u.url;}),candidates:candidates});
  if(snsHistory.length>10)snsHistory=snsHistory.slice(0,10);
  saveSnsHistory();
  renderSnsHistoryList();
}

function renderSnsHistoryList(){
  var list=qs('#sns-history-list');
  var countEl=qs('#sns-history-count');
  if(countEl)countEl.textContent=snsHistory.length>0?'('+snsHistory.length+')':'';
  if(!list)return;
  if(snsHistory.length===0){
    list.innerHTML='<p style="color:var(--light);font-size:12px;text-align:center;padding:32px 12px">아직 히스토리가 없어요<br><span style="font-size:10px;color:#CBD5E1">최대 10개까지 자동 저장돼요</span></p>';return;
  }
  list.innerHTML='<p style="font-size:10px;color:#CBD5E1;text-align:center;padding:4px 0 8px;margin:0">최대 10개까지 자동 저장</p>';
  snsHistory.forEach(function(item,hi){
    var el=document.createElement('div');
    el.className='sns-saved-item';
    var urlPreview=item.urls[0]?item.urls[0].replace(/^https?:\/\//,'').substring(0,35)+'...':'';
    var fbPreview=(item.candidates.facebook&&item.candidates.facebook[0])?(typeof item.candidates.facebook[0]==='object'?item.candidates.facebook[0].text:item.candidates.facebook[0]):'';
    fbPreview=fbPreview.substring(0,60)+'...';
    el.innerHTML='<div class="sns-saved-item-top">'
      +'<span style="font-size:10px;font-weight:600;color:var(--text)">'+item.date+'</span>'
      +'<button class="sns-saved-item-del" data-shi="'+hi+'">✕</button>'
      +'</div>'
      +'<div style="font-size:10px;color:var(--light);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(urlPreview)+'</div>'
      +'<div class="sns-saved-item-text" style="cursor:pointer">'+esc(fbPreview)+'</div>';
    el.querySelector('.sns-saved-item-text').addEventListener('click',function(){
      snsCandidates=item.candidates;
      snsActivePlatform='facebook';
      qsa('.sns-ptab').forEach(function(t){t.classList.remove('active');});
      qs('[data-platform="facebook"]').classList.add('active');
      renderSnsCandidates();
      qs('#sns-history-panel').classList.add('hidden');
      toast('히스토리에서 불러옴');
    });
    el.querySelector('.sns-saved-item-del').addEventListener('click',function(e){
      e.stopPropagation();
      snsHistory.splice(hi,1);
      saveSnsHistory();
      renderSnsHistoryList();
    });
    list.appendChild(el);
  });
}
renderSnsHistoryList();

/* ---- SNS Recent (초기 화면) ---- */
function renderSnsRecent(){
  var el=qs('#sns-recent');if(!el)return;
  var hasHistory=snsHistory.length>0;
  var hasSaved=snsSaved.length>0;
  if(!hasHistory&&!hasSaved){el.innerHTML='';return;}
  var html='';
  if(hasHistory){
    html+='<div style="font-size:11px;font-weight:800;color:#1E293B;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase">RECENT</div>';
    snsHistory.slice(0,3).forEach(function(item,i){
      var fbPreview=(item.candidates.facebook&&item.candidates.facebook[0])?(typeof item.candidates.facebook[0]==='object'?item.candidates.facebook[0].text:item.candidates.facebook[0]):'';
      html+='<div class="recent-item" data-sns-ri="'+i+'"><span class="ri-tag">최근</span><span class="ri-title">'+esc(fbPreview.substring(0,45))+'...</span><span class="ri-date">'+item.date+'</span></div>';
    });
  }
  if(hasSaved){
    html+='<div style="font-size:9px;color:#94A3B8;letter-spacing:1px;margin:16px 0 6px;text-transform:uppercase">저장됨</div>';
    snsSaved.slice(0,3).forEach(function(item,i){
      html+='<div class="recent-item" data-sns-si="'+i+'"><span class="ri-tag">'+platformNames[item.platform]+'</span><span class="ri-title">'+esc(item.text.substring(0,45))+'...</span><span class="ri-date">'+item.date+'</span></div>';
    });
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-sns-ri]').forEach(function(r){
    r.addEventListener('click',function(){
      var idx=+r.dataset.snsRi;
      var item=snsHistory[idx];if(!item)return;
      snsCandidates=item.candidates;
      snsActivePlatform='facebook';
      qsa('.sns-ptab').forEach(function(t){t.classList.remove('active');});
      qs('[data-platform="facebook"]').classList.add('active');
      qs('#sns-section').classList.add('hidden');
      qs('#sns-results').classList.remove('hidden');
      renderSnsCandidates();
    });
  });
}
renderSnsRecent();

/* ---- 사이드바 SNS 탭 전환 ---- */
qsa('.sidebar-tab-sns').forEach(function(tab){
  tab.addEventListener('click',function(){
    qsa('.sidebar-tab-sns').forEach(function(t){t.classList.remove('active');});
    tab.classList.add('active');
    var which=tab.dataset.stab;
    qs('#sidebar-sns-saved').style.display=(which==='sns-saved')?'':'none';
    qs('#sidebar-sns-history').style.display=(which==='sns-history')?'':'none';
  });
});

/* ---- 사이드바 SNS 저장 목록 렌더링 ---- */
function renderSidebarSnsSaved(){
  var list=qs('#sidebar-sns-saved');if(!list)return;
  if(snsSaved.length===0){list.innerHTML='<p class="history-empty">아직 저장된 텍스트가 없어요</p>';return;}
  list.innerHTML='';
  snsSaved.forEach(function(item){
    var el=document.createElement('div');el.className='history-item';el.style.cursor='pointer';
    el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:start">'
      +'<div class="hi-title">'+esc((item.text||'').substring(0,50))+'</div>'
      +'<button class="hi-delete" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">✕</button>'
      +'</div>'
      +'<div class="hi-date">편집 · '+item.date+'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">'
      +'<span style="width:20px;height:20px;border-radius:50%;background:none;border:1px solid #E2E8F0;display:inline-flex;align-items:center;justify-content:center;color:#334155;font-size:11px;flex-shrink:0">'+platformIcons[item.platform]+'</span>'
      +(item.label?'<span style="font-size:10px;color:#334155;padding:3px 10px;border-radius:20px;border:1px solid #E2E8F0;background:none">'+esc(item.label)+'</span>':'')
      +'</div>';
    el.addEventListener('click',function(e){
      if(e.target.closest('.hi-delete'))return;
      /* 저장된 텍스트 수정 모달 바로 열기 (일반 수정과 동일한 UI) */
      var sidebarLs=item.label?getLabelStyle(item.label):{emoji:'',border:'#94A3B8'};
      var bodyEl=qs('#sns-preview-body');
      bodyEl.style.background='#F8FAFC';
      bodyEl.innerHTML='<div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="width:24px;height:24px;border-radius:50%;background:none;border:1px solid #E2E8F0;display:inline-flex;align-items:center;justify-content:center;color:#334155;font-size:13px;flex-shrink:0">'+platformIcons[item.platform]+'</span>'
        +(item.label?'<span class="sns-card-label" style="font-size:12px;padding:5px 14px;border-left-color:'+sidebarLs.border+'">'+sidebarLs.emoji+' '+esc(item.label)+'</span>':'')
        +'</div>'
        +'<span style="font-size:11px;color:#94A3B8">직접 수정하거나 재생성해보세요</span>'
        +'</div>'
        +'<div id="sidebar-saved-edit-text" contenteditable="true" style="background:#fff;border:1.5px solid #E2E8F0;border-radius:12px;padding:18px;font-size:14px;line-height:1.8;color:#1E293B;white-space:pre-wrap;outline:none;min-height:300px">'+esc(item.text)+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">'
        +'<select id="sidebar-saved-tone" class="sns-tone-select" style="font-size:12px;padding:6px 12px"><option value="">톤</option><option value="casual">캐주얼</option><option value="professional">전문적</option><option value="hooking">후킹</option></select>'
        +'<select id="sidebar-saved-style" class="sns-style-select" style="font-size:12px;padding:6px 12px"><option value="">스타일</option><option value="data">수치 강조</option><option value="story">스토리텔링</option><option value="question">질문형</option><option value="problem">문제의식</option><option value="reversal">반전 포인트</option></select>'
        +'<button id="sidebar-saved-regen" class="btn-primary btn-sm">재생성</button>'
        +'<div style="flex:1"></div>'
        +'<button id="sidebar-saved-copy" class="sns-modal-icon-btn" title="복사"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>'
        +'<button id="sidebar-saved-done" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:#2563EB;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        +'수정 완료</button>'
        +'</div>';
      qs('#sns-preview-modal').querySelector('h3').textContent='저장된 텍스트 편집';
      qs('#sns-preview-modal').classList.remove('hidden');
      qs('#sidebar').classList.remove('open');

      var modalText=qs('#sidebar-saved-edit-text');

      /* 복사 */
      qs('#sidebar-saved-copy').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
      });

      /* 수정 완료 — 저장 후 모달 닫기 */
      qs('#sidebar-saved-done').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        item.text=t;
        saveSnsStorage();
        renderSnsSavedList();
        renderSidebarSnsSaved();
        qs('#sns-preview-modal').classList.add('hidden');
        toast('수정 내용이 저장되었어요 ✓');
      });

      /* 재생성 */
      qs('#sidebar-saved-regen').addEventListener('click',function(){
        var t=modalText.innerText||modalText.textContent;
        var tone=qs('#sidebar-saved-tone').value;
        var style=qs('#sidebar-saved-style').value;
        var key=getKey();if(!key){toast('API 키를 설정해주세요');return;}
        var btn=qs('#sidebar-saved-regen');btn.disabled=true;btn.textContent='⏳';
        var toneMap={casual:'조금 더 부드럽고 읽기 편하게 (과도한 변화 없이)',professional:'조금 더 격식있게 (기존 구조 유지)',hooking:'첫 문장만 더 임팩트 있게 (나머지 유지)'};
        var styleMap={data:'수치/데이터를 좀 더 전면에',story:'스토리텔링 흐름으로 살짝 재배치',question:'도입부를 질문형으로',problem:'도입부에서 문제의식 강조',reversal:'도입부에 반전 포인트 배치'};
        var sysP='아래 SNS 텍스트를 다시 작성해줘. 기존 구조와 톤을 최대한 유지하면서 아래 방향만 살짝 반영해.\n\n';
        if(tone)sysP+='톤: '+toneMap[tone]+'\n';
        if(style)sysP+='스타일: '+styleMap[style]+'\n';
        sysP+='★ 마크다운(**, * 등) 절대 금지\n★ 기존 불릿/구조 유지\n★ 단락 사이에 반드시 빈 줄(\\n\\n) 유지\n\n기존 텍스트:\n'+t+'\n\n새로운 텍스트만 출력. 설명 없이.';
        callGemini(key,[{role:'user',parts:[{text:sysP}]}]).then(function(res){
          var txt=(res&&res.candidates&&res.candidates[0]&&res.candidates[0].content&&res.candidates[0].content.parts&&res.candidates[0].content.parts[0]&&res.candidates[0].content.parts[0].text)||'';
          modalText.textContent=txt.trim();
          btn.disabled=false;btn.textContent='재생성';
          toast('재생성 완료!');
          /* 재생성 후 저장 확인 바 표시 */
          var existingBar=qs('.regen-save-bar');if(existingBar)existingBar.remove();
          var bar=document.createElement('div');
          bar.className='regen-save-bar';
          bar.innerHTML='<span>💾 이 내용으로 저장할까요?</span><button class="regen-save-yes">저장</button><button class="regen-save-no">취소</button>';
          modalText.parentNode.insertBefore(bar,modalText.nextSibling);
          bar.querySelector('.regen-save-yes').onclick=function(){
            var found=snsSaved.find(function(s){return s.id===item.id;});
            if(found){found.text=txt.trim();saveSnsStorage();renderSidebarSnsSaved();renderSnsSavedList();toast('저장 완료!');}
            bar.remove();
          };
          bar.querySelector('.regen-save-no').onclick=function(){bar.remove();};
        }).catch(function(err){btn.disabled=false;btn.textContent='재생성';toast('실패: '+(err&&err.message||'오류'));});
      });
    });
    el.querySelector('.hi-delete').addEventListener('click',function(e){
      e.stopPropagation();
      snsSaved=snsSaved.filter(function(s){return s.id!==item.id;});
      saveSnsStorage();renderSidebarSnsSaved();renderSnsSavedList();
    });
    list.appendChild(el);
  });
}

/* ---- 사이드바 SNS 히스토리 렌더링 ---- */
function renderSidebarSnsHistory(){
  var list=qs('#sidebar-sns-history');if(!list)return;
  if(snsHistory.length===0){list.innerHTML='<p class="history-empty">아직 히스토리가 없어요<br><span style="font-size:10px;color:#CBD5E1">최대 10개까지 자동 저장돼요</span></p>';return;}
  list.innerHTML='';
  snsHistory.forEach(function(item,hi){
    var el=document.createElement('div');el.className='history-item';el.style.cursor='pointer';
    var urlPreview=item.urls&&item.urls[0]?item.urls[0].replace(/^https?:\/\//,'').substring(0,35)+'...':'';
    var fbPreview=(item.candidates.facebook&&item.candidates.facebook[0])?(typeof item.candidates.facebook[0]==='object'?item.candidates.facebook[0].text:item.candidates.facebook[0]):'';
    el.innerHTML='<div style="display:flex;justify-content:space-between;align-items:start">'
      +'<div class="hi-title">'+esc(fbPreview.substring(0,50))+'</div>'
      +'<button class="hi-delete" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">✕</button>'
      +'</div>'
      +'<div class="hi-date">'+item.date+' · '+esc(urlPreview)+'</div>';
    el.addEventListener('click',function(e){
      if(e.target.closest('.hi-delete'))return;
      snsCandidates=item.candidates;
      snsActivePlatform='facebook';
      qsa('.sns-ptab').forEach(function(t){t.classList.remove('active');});
      qs('[data-platform="facebook"]').classList.add('active');
      /* 뉴스레터 패널 숨기기 */
      qs('#panels').classList.add('hidden');
      qs('#editor-toolbar').classList.add('hidden');
      var hero=qs('#hero-section');if(hero)hero.classList.add('hidden');
      var tcdd=qs('#title-candidates-dropdown');if(tcdd)tcdd.classList.add('hidden');
      /* SNS 결과 보이기 */
      qs('#sns-section').classList.add('hidden');
      qs('#sns-results').classList.remove('hidden');
      renderSnsCandidates();
      qs('#sidebar').classList.remove('open');
      toast('히스토리에서 불러옴');
    });
    el.querySelector('.hi-delete').addEventListener('click',function(e){
      e.stopPropagation();
      snsHistory.splice(hi,1);saveSnsHistory();renderSidebarSnsHistory();renderSnsHistoryList();
    });
    list.appendChild(el);
  });
}

/* 히스토리 패널 토글 */
on('#sns-history-toggle','click',function(){
  var panel=qs('#sns-history-panel');
  qs('#sns-saved-panel').classList.add('hidden');
  panel.classList.toggle('hidden');
  renderSnsHistoryList();
});
on('#sns-history-panel-close','click',function(){
  qs('#sns-history-panel').classList.add('hidden');
});

/* ---- 조합함 (수동 선택 + AI 다듬기) ---- */
var snsMixItems=[];

function updateMixCount(){
  var el=qs('#sns-mix-count');
  if(el)el.textContent=snsMixItems.length>0?'('+snsMixItems.length+')':'';
}

/* 텍스트 선택 시 플로팅 버튼 */
var mixFloat=document.createElement('button');
mixFloat.className='rewrite-float';
mixFloat.textContent='🧩 조합함에 추가';
mixFloat.style.display='none';
document.body.appendChild(mixFloat);

document.addEventListener('mouseup',function(e){
  var wrap=qs('#sns-candidates-wrap');
  var preview=qs('#sns-preview-body');
  var inWrap=wrap&&wrap.contains(e.target);
  var inPreview=preview&&preview.contains(e.target);
  if(!inWrap&&!inPreview){mixFloat.style.display='none';return;}
  var sel=window.getSelection();
  if(!sel||sel.isCollapsed||!sel.toString().trim()){mixFloat.style.display='none';return;}
  var range=sel.getRangeAt(0);
  var rect=range.getBoundingClientRect();
  mixFloat.style.display='block';
  mixFloat.style.left=(rect.left+rect.width/2-60)+'px';
  mixFloat.style.top=(rect.top-36+window.scrollY)+'px';
  mixFloat._selectedText=sel.toString().trim();
});
mixFloat.addEventListener('mousedown',function(e){
  e.preventDefault();
  if(mixFloat._selectedText){
    snsMixItems.push({id:Date.now(),text:mixFloat._selectedText});
    updateMixCount();
    toast('🧩 조합함에 추가됨 ('+snsMixItems.length+'개)');
    window.getSelection().removeAllRanges();
  }
  mixFloat.style.display='none';
});
document.addEventListener('mousedown',function(e){if(e.target!==mixFloat)mixFloat.style.display='none';});

/* 조합 모달 */
on('#sns-mix-btn','click',function(){
  showMixModal();
});

function showMixModal(){
  var body=qs('#sns-preview-body');
  body.style.background='#F8FAFC';

  /* 비어있을 때 사용법 안내 */
  if(snsMixItems.length===0){
    body.innerHTML='<div style="text-align:center;padding:40px 20px">'
      +'<div style="font-size:48px;margin-bottom:16px">🧩</div>'
      +'<div style="font-size:16px;font-weight:700;color:#1E293B;margin-bottom:8px">조합함이 비어있어요</div>'
      +'<div style="font-size:13px;color:#64748B;line-height:1.8;margin-bottom:24px">여러 후보에서 마음에 드는 문장만 골라<br>나만의 텍스트를 만들어보세요!</div>'
      +'<div style="background:#fff;border:1.5px solid #E2E8F0;border-radius:14px;padding:20px;text-align:left;max-width:360px;margin:0 auto">'
      +'<div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:12px">사용 방법</div>'
      +'<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><span style="background:#F1F5F9;color:#334155;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px;flex-shrink:0">1</span><span style="font-size:12px;color:#334155;line-height:1.6">후보 카드에서 원하는 문장을 <strong>드래그로 선택</strong></span></div>'
      +'<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><span style="background:#F1F5F9;color:#334155;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px;flex-shrink:0">2</span><span style="font-size:12px;color:#334155;line-height:1.6">나타나는 <strong>"🧩 조합함에 추가"</strong> 버튼 클릭</span></div>'
      +'<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><span style="background:#F1F5F9;color:#334155;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px;flex-shrink:0">3</span><span style="font-size:12px;color:#334155;line-height:1.6">조합함에서 순서 조정 후 <strong>AI 다듬기</strong> 또는 그대로 복사</span></div>'
      +'</div>'
      +'<div style="margin-top:20px;font-size:11px;color:#94A3B8">💡 마음에 드는 도입부, 데이터 설명, 마무리 등 원하는 문단만 골라 담아보세요</div>'
      +'</div>';
    qs('#sns-preview-modal').querySelector('h3').textContent='🧩 조합함';
    qs('#sns-preview-modal').classList.remove('hidden');
    return;
  }

  var html='<div style="text-align:center;margin-bottom:16px"><div style="font-size:14px;font-weight:700;color:#1E293B;margin-bottom:4px">🧩 조합함</div><div style="font-size:12px;color:#64748B">드래그로 순서 변경 · 다 모았으면 AI 다듬기 또는 그대로 복사</div></div>';

  /* 문장 목록 */
  html+='<div id="mix-list">';
  snsMixItems.forEach(function(item,idx){
    html+='<div class="mix-item" data-midx="'+idx+'" draggable="true" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-bottom:6px;background:#fff;border:1.5px solid #E2E8F0;border-radius:10px;cursor:grab;transition:all .15s">'
      +'<span class="mix-drag-handle" style="color:#CBD5E1;font-size:14px;cursor:grab;flex-shrink:0;margin-top:2px">⋮⋮</span>'
      +'<span style="font-size:11px;color:#fff;background:#6366F1;font-weight:700;flex-shrink:0;padding:2px 8px;border-radius:6px">'+(idx+1)+'</span>'
      +'<div style="flex:1;font-size:12px;line-height:1.6;color:#334155">'+esc(item.text)+'</div>'
      +'<button class="mix-del" data-mid="'+item.id+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;flex-shrink:0;padding:0 2px">✕</button>'
      +'</div>';
  });
  html+='</div>';

  /* 미리보기 */
  html+='<div style="margin-top:14px;font-size:11px;font-weight:700;color:#94A3B8;margin-bottom:6px">미리보기</div>';
  html+='<div style="background:#fff;border:1.5px solid #E2E8F0;border-radius:12px;padding:16px;font-size:13px;line-height:1.8;color:#1E293B;white-space:pre-wrap" id="mix-preview">'+esc(snsMixItems.map(function(m){return m.text;}).join('\n\n'))+'</div>';

  /* 버튼들 */
  html+='<div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">'
    +'<button id="mix-ai-polish" class="btn-primary btn-sm" style="padding:10px 24px">✨ AI 다듬기</button>'
    +'<button id="mix-copy-raw" class="btn-primary btn-sm" style="padding:10px 24px;background:#475569">📋 그대로 복사</button>'
    +'<button id="mix-save" class="btn-primary btn-sm" style="padding:10px 24px;background:#1E293B">🔖 저장</button>'
    +'</div>';
  html+='<div id="mix-ai-result" style="display:none;margin-top:16px"></div>';

  body.innerHTML=html;
  qs('#sns-preview-modal').querySelector('h3').textContent='🧩 조합함';
  qs('#sns-preview-modal').classList.remove('hidden');

  /* 삭제 */
  body.querySelectorAll('.mix-del').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      snsMixItems=snsMixItems.filter(function(m){return m.id!==+btn.dataset.mid;});
      updateMixCount();
      if(snsMixItems.length===0){qs('#sns-preview-modal').classList.add('hidden');return;}
      showMixModal();
    });
  });

  /* 드래그 순서 변경 */
  var dragIdx=null;
  body.querySelectorAll('.mix-item').forEach(function(el){
    el.addEventListener('dragstart',function(e){dragIdx=+el.dataset.midx;el.style.opacity='0.4';e.dataTransfer.effectAllowed='move';});
    el.addEventListener('dragend',function(){el.style.opacity='1';dragIdx=null;});
    el.addEventListener('dragover',function(e){e.preventDefault();});
    el.addEventListener('drop',function(e){
      e.preventDefault();var dropIdx=+el.dataset.midx;
      if(dragIdx!==null&&dragIdx!==dropIdx){var moved=snsMixItems.splice(dragIdx,1)[0];snsMixItems.splice(dropIdx,0,moved);showMixModal();}
    });
  });

  /* 그대로 복사 */
  qs('#mix-copy-raw').addEventListener('click',function(){
    var t=snsMixItems.map(function(m){return m.text;}).join('\n\n');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
    else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('복사됨!');}
  });

  /* 저장 */
  qs('#mix-save').addEventListener('click',function(){
    var preview=qs('#mix-preview');
    var t=preview?(preview.innerText||preview.textContent):'';
    if(!t.trim()){toast('저장할 텍스트가 없어요');return;}
    snsSaved.unshift({id:Date.now(),platform:snsActivePlatform||'facebook',text:t.trim(),label:'🧩 조합',date:today()});
    if(snsSaved.length>50)snsSaved=snsSaved.slice(0,50);
    saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
    toast('저장 완료!');
  });

  /* AI 다듬기 — 내용 유지, 문맥만 자연스럽게 */
  qs('#mix-ai-polish').addEventListener('click',function(){
    var key=getKey();if(!key){toast('API 키를 설정해주세요');return;}
    var btn=qs('#mix-ai-polish');
    btn.disabled=true;btn.textContent='⏳ AI 다듬는 중...';
    var rawText=snsMixItems.map(function(m){return m.text;}).join('\n\n');
    var sysPrompt='아래 문장들을 하나의 자연스러운 SNS 포스트로 다듬어줘.\n\n'
      +'★ 핵심 규칙: 각 문장의 내용과 수치를 절대 변경하지 마. 있는 그대로 유지해.\n'
      +'★ 문장 간 연결만 자연스럽게 다듬어. 접속사 추가, 어색한 이음새 수정 정도만.\n'
      +'★ 문장을 삭제하거나 새로운 내용을 추가하지 마.\n'
      +'★ 마크다운(**, * 등) 절대 사용 금지\n'
      +'★ 플랫폼: '+snsActivePlatform+'\n\n'
      +'다듬어진 텍스트만 출력. 설명 없이.';
    var reqBody=JSON.stringify({
      system_instruction:{parts:[{text:sysPrompt}]},
      contents:[{parts:[{text:rawText}]}],
      generationConfig:{temperature:0.3,maxOutputTokens:4096}
    });
    fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
      method:'POST',headers:{'Content-Type':'application/json'},body:reqBody
    }).then(function(r){return r.json();}).then(function(d){
      var c=d.candidates&&d.candidates[0];
      if(!c||!c.content||!c.content.parts)throw new Error('AI 응답 오류');
      var txt='';for(var i=0;i<c.content.parts.length;i++){if(c.content.parts[i].text)txt+=c.content.parts[i].text;}
      txt=cleanSnsText(txt);
      var resultEl=qs('#mix-ai-result');
      resultEl.style.display='block';
      resultEl.innerHTML='<div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:16px">'
        +'<div style="font-size:11px;font-weight:700;color:#16A34A;margin-bottom:8px">✨ AI 다듬기 결과 (내용 동일, 문맥만 정리)</div>'
        +'<div style="font-size:13px;line-height:1.8;color:#1E293B;white-space:pre-wrap" id="mix-polished">'+esc(txt)+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
        +'<button id="mix-pol-copy" class="btn-primary btn-sm" style="padding:8px 24px">📋 복사</button>'
        +'<button id="mix-pol-save" class="btn-ghost" style="padding:8px 16px">⭐ 저장</button>'
        +'</div>';
      btn.disabled=false;btn.textContent='✨ AI 다듬기';
      qs('#mix-pol-copy').addEventListener('click',function(){
        var t=qs('#mix-polished').textContent;
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast('복사됨!');});
      });
      qs('#mix-pol-save').addEventListener('click',function(){
        var t=qs('#mix-polished').textContent;
        snsSaved.unshift({id:Date.now(),platform:snsActivePlatform,text:t,label:'AI 다듬기',date:today()});
        if(snsSaved.length>50)snsSaved=snsSaved.slice(0,50);
        saveSnsStorage();renderSnsSavedList();renderSidebarSnsSaved();
        toast('저장됨!');
      });
    }).catch(function(err){
      btn.disabled=false;btn.textContent='✨ AI 다듬기';
      toast('다듬기 실패: '+(err&&err.message||'오류'));
    });
  });
}

/* ---- SNS 미리보기 ---- */
function showSnsPreview(platform,text){
  var body=qs('#sns-preview-body');
  var escaped=esc(text).replace(/\n/g,'<br>');
  var html='';

  if(platform==='facebook'){
    html='<div style="background:#fff;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.1);max-width:540px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;overflow:hidden">'
      /* 헤더: 프로필 */
      +'<div style="display:flex;align-items:center;gap:10px;padding:12px 16px 0">'
      +'<div style="width:40px;height:40px;border-radius:50%;background:#1A1A2E;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden"><img src="https://igaworksblog.com/wp-content/uploads/2024/01/igaworks-logo-icon.png" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<span style=font-size:10px;font-weight:800;color:#fff;letter-spacing:0.5px>IGAW</span>\'"></div>'
      +'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:#050505;line-height:1.3">IGAWorks 아이지에이웍스</div><div style="display:flex;align-items:center;gap:4px;margin-top:1px"><span style="font-size:12px;color:#65676B">2시간</span><span style="font-size:12px;color:#65676B">·</span><svg width="12" height="12" viewBox="0 0 16 16" fill="#65676B"><path d="M8 0a8 8 0 108 8A8 8 0 008 0zm0 14.5A6.5 6.5 0 1114.5 8 6.508 6.508 0 018 14.5zM8 4a.75.75 0 00-.75.75v3.5a.75.75 0 00.37.65l2.5 1.5a.75.75 0 10.76-1.3L8.75 7.87V4.75A.75.75 0 008 4z"/></svg></div></div>'
      +'<div style="cursor:pointer;padding:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="#65676B"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></div>'
      +'</div>'
      /* 본문 */
      +'<div style="padding:8px 16px 12px;font-size:15px;line-height:1.65;color:#050505;white-space:pre-wrap;word-break:break-word">'+escaped+'</div>'
      /* 링크 카드 프리뷰 */
      +'<div style="border-top:1px solid #E4E6EB">'
      +'<div style="background:#F8F8F8;height:120px;display:flex;align-items:center;justify-content:center;color:#CBD5E1;font-size:11px;gap:6px;flex-direction:column"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>썸네일</span></div>'
      +'<div style="background:#F0F2F5;padding:8px 16px 10px;border-bottom:1px solid #E4E6EB">'
      +'<div style="font-size:11px;color:#65676B;text-transform:uppercase;letter-spacing:0.3px">IGAWORKSBLOG.COM</div>'
      +'<div style="font-size:14px;font-weight:600;color:#050505;margin-top:2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">콘텐츠 제목</div>'
      +'</div></div>'
      /* 게시물 홍보하기 바 */
      +'<div style="display:flex;align-items:center;padding:10px 16px;gap:8px;border-bottom:1px solid #E4E6EB">'
      +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65676B" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/></svg>'
      +'<span style="font-size:13px;color:#65676B;flex:1">게시물을 홍보하여 <b style="color:#050505">IGAWorks 아이지에이웍스</b>의 도달 범위를 늘려보세요.</span>'
      +'<span style="background:#1877F2;color:#fff;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;white-space:nowrap">게시물 홍보하기</span>'
      +'</div>'
      /* 리액션 & 액션 바 */
      +'<div style="display:flex;align-items:center;padding:8px 16px;gap:6px">'
      +'<span style="display:flex;align-items:center"><span style="width:20px;height:20px;border-radius:50%;background:#1877F2;display:inline-flex;align-items:center;justify-content:center;font-size:11px">👍</span><span style="width:20px;height:20px;border-radius:50%;background:#F0932B;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-left:-4px">😮</span></span>'
      +'<span style="font-size:13px;color:#65676B;margin-left:4px">1</span>'
      +'</div>'
      +'<div style="border-top:1px solid #E4E6EB;display:flex;padding:4px 16px">'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 0;cursor:default;border-radius:4px;transition:background .15s"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-6 0v1"/><path d="M18 14v-3a2 2 0 00-2-2H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2z"/></svg><span style="font-size:14px;font-weight:600;color:#65676B">좋아요</span></div>'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 0;cursor:default;border-radius:4px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span style="font-size:14px;font-weight:600;color:#65676B">댓글 달기</span></div>'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 0;cursor:default;border-radius:4px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg><span style="font-size:14px;font-weight:600;color:#65676B">공유하기</span></div>'
      +'</div></div>';

  } else if(platform==='linkedin'){
    html='<div style="background:#fff;border-radius:8px;border:1px solid #E0DFDC;max-width:540px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;overflow:hidden">'
      /* 헤더 */
      +'<div style="display:flex;align-items:flex-start;gap:8px;padding:12px 16px 0">'
      +'<div style="width:48px;height:48px;border-radius:50%;background:#1A1A2E;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden"><img src="https://igaworksblog.com/wp-content/uploads/2024/01/igaworks-logo-icon.png" style="width:48px;height:48px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<span style=font-size:11px;font-weight:800;color:#fff;letter-spacing:0.5px>IGAW</span>\'"></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:14px;font-weight:600;color:#000;line-height:1.3">IGAWorks 아이지에이웍스</div>'
      +'<div style="font-size:12px;color:#666;line-height:1.4">팔로워 1,019명</div>'
      +'<div style="display:flex;align-items:center;gap:4px;margin-top:1px"><span style="font-size:12px;color:#999">3주</span><span style="font-size:12px;color:#999">·</span><span style="font-size:12px;color:#999">수정됨</span><span style="font-size:12px;color:#999">·</span><svg width="14" height="14" viewBox="0 0 16 16" fill="#999"><path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011.54-3.61l.71.71A4 4 0 004 8a3.92 3.92 0 001.25 2.9l-.71.71A5 5 0 013 8zm5 5a5 5 0 01-3.61-1.54l.71-.71A4 4 0 008 12a3.92 3.92 0 002.9-1.25l.71.71A5 5 0 018 13zm3.61-1.54l-.71-.71A4 4 0 0012 8a3.92 3.92 0 00-1.25-2.9l.71-.71A5 5 0 0113 8a5 5 0 01-1.39 3.46z"/></svg></div>'
      +'</div>'
      +'</div>'
      /* 본문 */
      +'<div style="padding:8px 16px 12px;font-size:14px;line-height:1.65;color:#191919;white-space:pre-wrap;word-break:break-word">'+escaped+'</div>'
      /* 링크 카드 */
      +'<div style="margin:0 16px 12px;border:1px solid #E0DFDC;border-radius:2px;overflow:hidden">'
      +'<div style="background:#F8F8F8;height:100px;display:flex;align-items:center;justify-content:center;color:#CBD5E1;font-size:11px;gap:6px;flex-direction:column"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>썸네일</span></div>'
      +'<div style="background:#EDF3F8;padding:8px 12px">'
      +'<div style="font-size:13px;font-weight:600;color:#000;line-height:1.3">콘텐츠 제목</div>'
      +'<div style="font-size:12px;color:#666;margin-top:2px">igaworksblog.com</div>'
      +'</div></div>'
      /* 리액션 */
      +'<div style="display:flex;align-items:center;padding:0 16px 8px;gap:4px">'
      +'<span style="display:flex;align-items:center"><span style="width:18px;height:18px;border-radius:50%;background:#378FE9;display:inline-flex;align-items:center;justify-content:center;font-size:10px;border:2px solid #fff">👍</span><span style="width:18px;height:18px;border-radius:50%;background:#DF704D;display:inline-flex;align-items:center;justify-content:center;font-size:10px;margin-left:-4px;border:2px solid #fff">❤️</span></span>'
      +'<span style="font-size:12px;color:#666;margin-left:2px">2</span>'
      +'</div>'
      /* 구분선 + 액션 바 */
      +'<div style="border-top:1px solid #E0DFDC;display:flex;padding:4px 8px;margin:0 8px">'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 0;cursor:default;border-radius:4px">'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><path d="M7 22V11l-5 2V8l7-6h2l7 6v5l-5-2v11"/></svg>'
      +'<span style="font-size:13px;font-weight:600;color:#666">추천</span></div>'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 0;cursor:default;border-radius:4px">'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
      +'<span style="font-size:13px;font-weight:600;color:#666">댓글</span></div>'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 0;cursor:default;border-radius:4px">'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>'
      +'<span style="font-size:13px;font-weight:600;color:#666">퍼가기</span></div>'
      +'</div>'
      /* 하단 프로필 바 */
      +'<div style="border-top:1px solid #E0DFDC;display:flex;align-items:center;gap:8px;padding:8px 16px">'
      +'<div style="width:24px;height:24px;border-radius:50%;background:#1A1A2E;flex-shrink:0"></div>'
      +'<div style="flex:1;background:#EDF3F8;border:1px solid #C8D6E0;border-radius:20px;padding:6px 12px;font-size:12px;color:#999">댓글 추가...</div>'
      +'</div>'
      +'</div>';

  } else if(platform==='instagram'){
    html='<div style="background:#fff;border:1px solid #DBDBDB;border-radius:3px;max-width:470px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;overflow:hidden">'
      /* 헤더 */
      +'<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #EFEFEF">'
      +'<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:2px"><div style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;padding:1px"><div style="width:26px;height:26px;border-radius:50%;background:#1A1A2E;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;letter-spacing:0.3px">IGAW</div></div></div>'
      +'<div style="flex:1;font-size:14px;font-weight:600;color:#262626">igaworks_official</div>'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="#262626"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>'
      +'</div>'
      /* 이미지 영역 */
      +'<div style="background:#F8F8F8;height:200px;display:flex;align-items:center;justify-content:center;color:#CBD5E1;font-size:12px;gap:6px;flex-direction:column"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>썸네일</span></div>'
      /* 액션 아이콘 */
      +'<div style="display:flex;align-items:center;padding:10px 12px 6px">'
      +'<div style="display:flex;gap:14px;flex:1">'
      +'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
      +'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
      +'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
      +'</div>'
      +'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>'
      +'</div>'
      /* 좋아요 수 */
      +'<div style="padding:0 12px 6px;font-size:14px;font-weight:600;color:#262626">좋아요 42개</div>'
      /* 본문 */
      +'<div style="padding:0 12px 8px;font-size:14px;line-height:1.5;color:#262626;white-space:pre-wrap;word-break:break-word"><span style="font-weight:600">igaworks_official</span> '+escaped+'</div>'
      /* 시간 */
      +'<div style="padding:0 12px 12px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.2px">2시간 전</div>'
      /* 댓글 입력 */
      +'<div style="border-top:1px solid #EFEFEF;display:flex;align-items:center;padding:10px 12px;gap:10px">'
      +'<span style="font-size:22px">😊</span>'
      +'<span style="flex:1;font-size:14px;color:#999">댓글 달기...</span>'
      +'<span style="font-size:14px;font-weight:600;color:#B3DFFC">게시</span>'
      +'</div>'
      +'</div>';
  }

  body.innerHTML=html;
  body.style.background='#F0F2F5';
  qs('#sns-preview-modal').querySelector('h3').textContent='SNS 미리보기';
  qs('#sns-preview-modal').classList.remove('hidden');
}


on('#sns-preview-close','click',function(){
  qs('#sns-preview-modal').classList.add('hidden');
});

/* ---- 개별 후보 재생성 (톤 조절 포함) ---- */
var snsLastUrls=[];

function regenSingleCandidate(platform,idx,tone){
  var key=getKey();
  if(!key){toast('API 키를 설정해주세요');return Promise.reject();}
  var existing=snsCandidates[platform]||[];
  var current=existing[idx];
  var currentText=(typeof current==='object'&&current.text)?current.text:current;
  var toneGuide='';
  var parts=tone.split('+');
  var guides=[];
  parts.forEach(function(t){
    if(t==='casual')guides.push('현재 톤을 유지하되 조금 더 부드럽고 읽기 편하게. 과도한 이모지나 구어체는 피하고 자연스러운 친근함 정도로.');
    else if(t==='professional')guides.push('현재 구조를 유지하되 톤만 조금 더 격식있게. 줄글로 바꾸지 말고 기존 불릿/구조는 그대로 유지.');
    else if(t==='hooking')guides.push('첫 문장만 더 임팩트 있게 바꿔. 나머지 구조와 톤은 기존과 비슷하게 유지.');
    else if(t==='data')guides.push('기존 구조 유지하면서 수치와 데이터를 좀 더 전면에 배치. 전체 톤은 크게 바꾸지 마.');
    else if(t==='story')guides.push('기존 내용을 스토리텔링 흐름으로 살짝 재배치. 상황→발견→인사이트 순서로. 톤은 유지.');
    else if(t==='question')guides.push('도입부를 질문형으로 바꿔. 나머지 구조와 톤은 기존과 비슷하게.');
    else if(t==='problem')guides.push('도입부에서 문제의식을 좀 더 강조. 나머지는 기존 구조 유지.');
    else if(t==='reversal')guides.push('도입부에 의외의 사실이나 반전 포인트를 배치. 나머지는 기존 톤 유지.');
  });
  toneGuide=guides.length>0?guides.join(' 그리고 '):'다른 각도와 어조로 완전히 새롭게 작성.';

  var charLimit={facebook:750,linkedin:500,instagram:350};
  var limitGuide=charLimit[platform]?'★ '+charLimit[platform]+'자 이내 필수!\n':'';

  var sysPrompt='당신은 SNS 마케팅 전문가입니다. 아래 텍스트를 같은 플랫폼('+platform+')용으로 다시 작성해주세요.\n\n'
    +'★ '+toneGuide+'\n'
    +limitGuide
    +'★ 마크다운(**, * 등) 절대 사용 금지\n'
    +'★ label(특징 2~4자)과 text를 JSON으로 출력\n'
    +'★ 기존 내용의 핵심 메시지는 유지하되 표현과 구조를 바꿔\n'
    +'★ 단락과 단락 사이에 반드시 빈 줄(\\n\\n)을 넣어서 가독성 높게 작성\n'
    +(platform==='instagram'?'★ 마지막 문장은 반드시: "지금 바로 프로필 상단 링크 (📊아이지에이웍스 블로그)를 통해 확인해 보세요!" 로 끝낼 것\n★ 이모지 반드시 2개 사용\n':'')
    +'\n출력: {"label":"특징","text":"새 텍스트"}\n'
    +'JSON만 출력. 설명 없이.';

  var userMsg='기존 텍스트:\n'+currentText;

  var reqBody=JSON.stringify({
    system_instruction:{parts:[{text:sysPrompt}]},
    contents:[{parts:[{text:userMsg}]}],
    generationConfig:{temperature:0.9,maxOutputTokens:4096}
  });

  return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
    method:'POST',headers:{'Content-Type':'application/json'},body:reqBody
  }).then(function(r){return r.json();}).then(function(d){
    var c=d.candidates&&d.candidates[0];
    if(!c||!c.content||!c.content.parts){
      /* finishReason 확인 */
      var reason=c&&c.finishReason?c.finishReason:'UNKNOWN';
      console.warn('regenSingleCandidate: no content, reason:',reason);
      throw new Error('AI 응답 오류 ('+reason+')');
    }
    var txt='';
    for(var i=0;i<c.content.parts.length;i++){if(c.content.parts[i].text)txt+=c.content.parts[i].text;}
    var jsonStr=null;
    var cb=txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if(cb)jsonStr=cb[1].trim();
    if(!jsonStr){var s=txt.indexOf('{'),e=txt.lastIndexOf('}');if(s!==-1&&e>s)jsonStr=txt.substring(s,e+1);}
    if(jsonStr){
      try{return JSON.parse(jsonStr);}catch(pe){console.warn('JSON parse failed, using raw text');}
    }
    /* JSON 파싱 실패 시 텍스트 자체를 반환 */
    var cleanTxt=txt.replace(/```[\s\S]*?```/g,'').replace(/\{[\s\S]*\}/,'').trim();
    if(!cleanTxt)cleanTxt=txt;
    return{label:'재생성',text:cleanTxt};
  });
}

})();
/* ===== END SNS 모듈 ===== */

})();
