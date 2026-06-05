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

/* Settings */
on('#settings-toggle','click',function(){
  /* 저장된 키 불러오기 */
  var gemKey=localStorage.getItem('gemini-api-key');
  if(gemKey)qs('#api-key-input').value=gemKey;
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
  /* URL 필드 초기화 */
  urlList.querySelectorAll('.url-field').forEach(function(f){f.value='';});
  urlList.querySelectorAll('.url-tracking-input').forEach(function(f){f.value='';});
  urlList.querySelectorAll('.url-volume-input').forEach(function(f){f.value='';});
  var nlDate=qs('#nl-date');if(nlDate)nlDate.value='';
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
    +'<select class="url-style-select"><option value="report">📊 리포트형 (기본)</option><option value="subtitle">📝 소제목형</option><option value="magazine">📰 매거진형</option></select>'
    +'<input type="text" class="url-volume-input" placeholder="분량 (예: 소제목 3개)">'
    +'</div>'
    +'<input type="url" class="url-tracking-input" placeholder="&#128279; 트래킹 링크 (이미지 클릭 시 이동 URL)">'
    +'<input type="text" class="url-comment-input" placeholder="💬 지시사항 (예: 쿠팡 MAU 꼭 넣어줘, C커머스 강조)">'
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
    var commentInput=row.querySelector('.url-comment-input');
    var comment=commentInput?commentInput.value.trim():'';
    var styleSelect=row.querySelector('.url-style-select');
    var writeStyle=styleSelect?styleSelect.value:'subtitle';
    if(u&&u.indexOf('http')===0)r.push({url:u,tag:tag,volumeText:volText,trackingUrl:trackUrl,writeStyle:writeStyle,comment:comment});
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
/* ===== AI 프롬프트 — js/prompts.js로 분리됨 ===== */

function aiRewrite(paras,title,volumeText,writeStyle,url,totalUrls,comment){
  var key=getKey();if(!key)return Promise.reject(new Error('NO_KEY'));
  localStorage.setItem('gemini-api-key',key);
  var sysPrompt=(writeStyle==='prose')?buildProsePrompt(volumeText):(writeStyle==='story')?buildStoryPrompt(volumeText):(writeStyle==='magazine')?buildMagazinePrompt(volumeText):(writeStyle==='briefing')?buildBriefingPrompt(volumeText):(writeStyle==='report')?buildReportPrompt(volumeText):buildPrompt(volumeText);
  var volInstruction=volumeText?'\n\n★★★ 분량 지시: '+volumeText+'. 이 분량을 반드시 지켜주세요! 기본 규칙보다 이 분량이 우선입니다. ★★★':'';
  /* URL 개수에 따른 자동 분량 조절 (사용자 지정 분량이 없을 때만) */
  if(!volumeText&&totalUrls){
    if(totalUrls===1){
      if(writeStyle==='prose'||writeStyle==='story')volInstruction+='\n\n★★★ URL 1개 단독 콘텐츠입니다. [본문] 정확히 4개! 각 7~10문장으로 충분히 길게! ★★★';
      else if(writeStyle==='magazine')volInstruction+='\n\n★★★ URL 1개 단독 콘텐츠입니다. [라벨]+[본문]+[서브]+[통계]+[팁] 세트를 2~3개 작성! 각 [본문]은 1문단(4~5문장). 원문의 핵심 포인트별로 파트를 나눠! ★★★';
      else if(writeStyle==='report')volInstruction+='\n\n★★★ URL 1개 단독 콘텐츠입니다. [챕터] 3~5개 작성! 각 챕터에 [데이터]+[인사이트] 필수! ★★★';
      else volInstruction+='\n\n★★★ URL 1개 단독 콘텐츠입니다. [본문] 4개 이상 6개 이하로 작성! 각 [본문]은 4~6줄. ★★★';
    } else {
      if(writeStyle==='prose'||writeStyle==='story')volInstruction+='\n\n★★★ 여러 URL 중 하나입니다. [본문] 2~3개! 각 7~10문장. ★★★';
      else if(writeStyle==='magazine')volInstruction+='\n\n★★★ 여러 URL 중 하나입니다. [라벨]+[본문]+[서브]+[통계]+[팁] 세트를 1~2개만! 각 [본문]은 1문단(4~5문장). 짧고 핵심만! ★★★';
      else if(writeStyle==='report')volInstruction+='\n\n★★★ 여러 URL 중 하나입니다. [챕터] 2~3개만! 각 챕터에 [데이터]+[인사이트] 필수! ★★★';
      else volInstruction+='\n\n★★★ 여러 URL 중 하나입니다. [본문] 1개 이상 4개 이하로 작성! 각 [본문]은 3~4줄. ★★★';
    }
  }
  var styleHint=writeStyle==='prose'?'줄글(산문) 형식으로 작성해주세요. 이모지 소제목 금지.':writeStyle==='story'?'스토리텔링 형식으로 작성해주세요. 하나의 이야기처럼 자연스럽게 흘러가게.':writeStyle==='magazine'?'매거진/에디토리얼 형식으로 작성해주세요. 이모지 없이, 데이터 해석 중심의 깊이 있는 톤으로.':writeStyle==='briefing'?'데이터 브리핑 형식으로 작성해주세요. 업종/주제별로 핵심 수치+인사이트+액션 구조.':writeStyle==='report'?'데이터 리포트 형식으로 작성해주세요. 챕터별 구조 + 차트/테이블/카드 시각화 + 인사이트 박스.':'소제목+이모지 형식으로 작성해주세요.';
  /* URL이 있으면 Gemini가 직접 읽도록 URL만 전달, 없으면 파싱 텍스트 fallback */
  /* 프록시 텍스트 준비 — urlTools 결정보다 먼저 */
  var orig=paras.map(function(p){return(p.isH?'## ':'')+p.text;}).join('\n\n');
  if(orig.length>15000)orig=orig.substring(0,15000)+'\n\n[... 원문 일부 생략 ...]';
  var hasProxy=url&&orig.length>50;
  var userMsg;

  /* ===== 2단계 AI 호출: 1단계 분석 → 2단계 작성 ===== */
  function runAnalysis(){
    if(!hasProxy&&!url)return Promise.resolve(null);
    var analysisPrompt='너는 콘텐츠 분석기야. 아래 원문을 읽고 구조화된 JSON으로 정리해줘.\n\n'
      +'# 출력 형식 (JSON만 출력, 설명 금지)\n'
      +'{\n'
      +'  "type": "데이터분석|솔루션소개|트렌드리포트|케이스스터디|일반",\n'
      +'  "core_topic": "핵심 주제 한 문장",\n'
      +'  "key_numbers": [\n'
      +'    {"label": "지표명", "value": "수치", "context": "맥락 한 문장"},\n'
      +'    ...(최대 8개)\n'
      +'  ],\n'
      +'  "main_points": [\n'
      +'    {"heading": "소주제", "summary": "2~3문장 요약", "data": "관련 수치"},\n'
      +'    ...(3~6개)\n'
      +'  ],\n'
      +'  "images": ["본문 핵심 이미지 URL",...(최대 3개, 로고/아이콘 제외)],\n'
      +'  "insight": "이 콘텐츠에서 마케터가 가져갈 핵심 인사이트 2~3문장",\n'
      +'  "hook": "독자가 클릭하고 싶게 만드는 한 줄 (질문형 또는 반전형)"\n'
      +'}\n\n'
      +'★ 원문에 있는 수치/팩트만 추출. 창작 금지!\n'
      +'★ JSON만 출력. 마크다운 코드블록 없이.';

    var analysisUser=hasProxy
      ?'아래 원문을 분석해줘:\n\n제목: '+title+'\n\n'+orig
      :'다음 URL의 원문을 직접 읽고 분석해줘.\nURL: '+url;

    console.log('[1단계] 원문 분석 시작...');
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        system_instruction:{parts:[{text:analysisPrompt}]},
        contents:[{parts:[{text:analysisUser}]}],
        generationConfig:{temperature:0.2,maxOutputTokens:4096},
        tools:hasProxy?[]:(url?[{"urlContext":{}}]:[])
      })
    }).then(function(r){return r.json();}).then(function(d){
      var c=d.candidates&&d.candidates[0];
      if(!c||!c.content||!c.content.parts)return null;
      var txt='';for(var j=0;j<c.content.parts.length;j++){if(c.content.parts[j].text)txt+=c.content.parts[j].text;}
      console.log('[1단계] 분석 완료, 길이:',txt.length);
      try{
        var cleaned=txt.trim();
        if(cleaned.indexOf('```')===0)cleaned=cleaned.replace(/^```(?:json)?\n?/,'').replace(/\n?```$/,'');
        var start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
        if(start!==-1&&end!==-1)cleaned=cleaned.substring(start,end+1);
        return JSON.parse(cleaned);
      }catch(e){console.warn('[1단계] JSON 파싱 실패, 텍스트로 fallback');return{raw_analysis:txt};}
    }).catch(function(e){console.warn('[1단계] 분석 실패:',e.message);return null;});
  }

  return runAnalysis().then(function(analysis){
    /* 2단계: 분석 결과를 기반으로 뉴스레터 작성 */
    var analysisContext='';
    if(analysis&&!analysis.raw_analysis){
      console.log('[2단계] 구조화된 분석 데이터 사용');
      analysisContext='\n\n---\n# 원문 분석 결과 (이 데이터를 기반으로 작성해!)\n'
        +'콘텐츠 유형: '+(analysis.type||'')+'\n'
        +'핵심 주제: '+(analysis.core_topic||'')+'\n'
        +'독자 후킹: '+(analysis.hook||'')+'\n\n'
        +'## 핵심 수치\n'+(analysis.key_numbers||[]).map(function(n){return'- '+n.label+': '+n.value+(n.context?' ('+n.context+')':'');}).join('\n')
        +'\n\n## 주요 포인트\n'+(analysis.main_points||[]).map(function(p,i){return(i+1)+'. '+p.heading+': '+p.summary+(p.data?' [수치: '+p.data+']':'');}).join('\n')
        +'\n\n## 인사이트\n'+(analysis.insight||'')
        +'\n---';
    } else if(analysis&&analysis.raw_analysis){
      analysisContext='\n\n---\n# 원문 분석\n'+analysis.raw_analysis.substring(0,3000)+'\n---';
    }

    if(url){
      var proxyNote=hasProxy
        ?'\n\n---\n★ 아래는 직접 크롤링한 최신 본문입니다.\n\n원문 제목: '+title+'\n원문 URL: '+url+'\n\n'+orig+'\n---'
        :'';
      var commentNote=comment?'\n\n★★★ 사용자 지시사항 (반드시 반영!): '+comment+' ★★★':'';
      userMsg=(hasProxy?'아래 제공된 원문과 분석 결과를 기반으로 뉴스레터를 작성해주세요.':'다음 URL의 원문을 직접 읽고 뉴스레터를 작성해주세요.\nURL: '+url)
        +'\n작성 형식: '+styleHint+analysisContext+proxyNote+'\n\n★ 앞쪽 본문에서 핵심 수치를 구체적으로 언급하고, 뒤쪽으로 갈수록 궁금증을 남겨서 원문 클릭을 유도하세요.'+volInstruction+commentNote;
    } else {
      var commentNote=comment?'\n\n★★★ 사용자 지시사항 (반드시 반영!): '+comment+' ★★★':'';
      userMsg='원문 제목: '+title+'\n\n원문:\n'+orig+analysisContext+'\n\n★ 앞쪽 본문에서 핵심 수치를 구체적으로 언급하고, 뒤쪽으로 갈수록 궁금증을 남겨서 원문 클릭을 유도하세요.'+volInstruction+commentNote;
    }
  /* 프록시 성공 시 urlContext 불필요, 실패 시 urlContext fallback */
  var models=['gemini-2.5-flash','gemini-2.0-flash'];
  var urlTools=hasProxy?[]:(url?[{"urlContext":{}}]:[]);
  function makeBody(useSystemInstruction){
    if(useSystemInstruction){
      return JSON.stringify({system_instruction:{parts:[{text:sysPrompt}]},contents:[{parts:[{text:userMsg}]}],generationConfig:{temperature:0.5,maxOutputTokens:32768},tools:urlTools});
    } else {
      return JSON.stringify({contents:[{parts:[{text:sysPrompt+'\n\n---\n\n'+userMsg}]}],generationConfig:{temperature:0.5,maxOutputTokens:32768},tools:urlTools});
    }
  }
  function tryM(i,triedWithoutSys){
    if(i>=models.length)return Promise.reject(new Error('사용 가능한 AI 모델 없음'));
    var body=makeBody(!triedWithoutSys);
    var u='https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+key;
    console.log('Trying model:',models[i],'systemInstruction:',!triedWithoutSys);
    return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:body}).then(function(r){
      if(r.status===404||r.status===403||r.status===503){console.warn(models[i]+' fail '+r.status);return tryM(i+1,false);}
      if(r.status===400){
        if(!triedWithoutSys){console.warn(models[i]+' 400 — retrying without system_instruction');return tryM(i,true);}
        console.warn(models[i]+' fail 400 even without sys');return tryM(i+1,false);
      }
      if(!r.ok)return r.json().catch(function(){return{};}).then(function(b){throw new Error('API('+r.status+'): '+((b.error&&b.error.message)||r.statusText));});
      return r.json().then(function(d){
        var c=d.candidates&&d.candidates[0];
        if(!c||!c.content||!c.content.parts){
          console.warn('No candidates from',models[i],'finishReason:',c&&c.finishReason);
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
  }); /* end runAnalysis().then */
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
    if(t.indexOf('[인사이트]')===0){var insText=t.replace('[인사이트]','').trim();if(r.insightBox.split('\n').length<4)r.insightBox+=(r.insightBox?'\n':'')+insText;r.body.push('__INSIGHT__'+insText);lastTag='인사이트';}
    else if(t.indexOf('**인사이트')!==-1||t.indexOf('💡 인사이트')!==-1||t.indexOf('💡인사이트')!==-1||t.indexOf('[인사이트 요약]')===0||t.indexOf('인사이트 요약')===0){
      var cleaned=t.replace(/\*\*/g,'').replace(/💡/g,'').replace('[인사이트 요약]','').replace('인사이트 요약','').replace('인사이트','').trim();
      if(cleaned.length>5){r.insightBox+=(r.insightBox?'\n':'')+cleaned;}
      lastTag='인사이트';
    }
    else if(t.indexOf('[제목E]')===0){r.titleE=t.replace('[제목E]','').trim();lastTag='제목E';}
    else if(t.indexOf('[제목D]')===0){r.titleD=t.replace('[제목D]','').trim();lastTag='제목D';}
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
    else if(t.indexOf('[챕터]')===0){r.body.push('__CHAPTER__'+t.replace('[챕터]','').trim());lastTag='챕터';}
    else if(t.indexOf('[챕터설명]')===0){r.body.push('__CHAPDESC__'+t.replace('[챕터설명]','').trim());lastTag='챕터설명';}
    else if(t.indexOf('[데이터]')===0){r.body.push('__DATA__'+t.replace('[데이터]','').trim());lastTag='데이터';}
    else if(t.indexOf('[아웃룩]')===0){r.body.push('__OUTLOOK__'+t.replace('[아웃룩]','').trim());lastTag='아웃룩';}
    else if(t.indexOf('[출처]')===0){r.body.push('__SOURCE__'+t.replace('[출처]','').trim());lastTag='출처';}
    else if(t.indexOf('[원문유도]')===0){r.body.push('__MOREARTICLE__'+t.replace('[원문유도]','').trim());lastTag='원문유도';}
    else if(t.indexOf('[커스텀]')===0){r.body.push('__CUSTOM__'+t.replace('[커스텀]','').trim());lastTag='커스텀';}
    else if(t.indexOf('[한줄]')===0){r.oneliner=t.replace('[한줄]','').trim();lastTag='한줄';}
    else if(t.indexOf('[통계]')===0){var sp=t.replace('[통계]','').trim().split('|');r.stat={num:(sp[0]||'').trim(),label:(sp[1]||'').trim()};r.body.push('__STAT__'+(sp[0]||'').trim()+'|'+(sp[1]||'').trim());lastTag='통계';}
    else if(t.indexOf('[서브]')===0){r.body.push('__SUB__'+t.replace('[서브]','').trim());lastTag='서브';}
    else if(t.indexOf('[팁]')===0){r.body.push('__TIP__'+t.replace('[팁]','').trim());lastTag='팁';}
    else if(t.indexOf('[라벨]')===0){r.body.push('__LABEL__'+t.replace('[라벨]','').trim());lastTag='라벨';}
    /* 태그 없는 줄 → 직전 태그에 이어붙이기 (AI thinking 텍스트 필터링) */
    else if(t.charAt(0)!=='['&&t.length>5){
      /* Gemini thinking/planning 텍스트 무시 */
      if(/^(Let's|Key Metrics|Insights to|Newsletter Structure|This looks|I will now|Here'?s|Okay|Sure|Now|The |Based on|Looking at|Analyzing)/i.test(t))continue;
      if(/^\*\s*(제목|소제목|본문|도입|인사이트|유도|한줄|통계|강조)\s*[:：]/i.test(t))continue;
      if(lastTag==='본문'&&r.body.length>0){
        r.body[r.body.length-1]+=(r.body[r.body.length-1]?' ':'')+t;
      } else if(lastTag==='강조'&&r.body.length>0){
        r.body[r.body.length-1]+=' '+t;
      } else if(lastTag==='도입'){
        r.intro+=' '+t;
      } else if(lastTag==='인사이트'){
        if(!/^(유도|한줄|통계|제목|소제목|본문|강조|도입)\s*[:：]/i.test(t)&&!/이제 작성|작성하겠습니다|\[제목\]|\[본문\]/i.test(t))r.insightBox+=' '+t;
      } else if(r.body.length>0){
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
  S+='<div style="color:#111;margin-bottom:18px;font-size:16px;line-height:1.8">안녕하세요, 아이지에이웍스입니다.</div>';

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
    /* 문장 단위로 분리하여 각각 div로 렌더링 (줄글 방지) */
    var introLines=firstIntro.split('\n').filter(function(l){return l.trim();});
    /* \n으로 안 나뉘면 문장 단위로 분리 */
    if(introLines.length<=1){
      var introSentences=firstIntro.split(/(?<=[다요죠음됨임까니다][\.\?!])\s*/);
      introLines=introSentences.filter(function(s){return s.trim().length>5;});
    }
    for(var il=0;il<introLines.length;il++){
      S+='<div style="margin-bottom:20px;color:#222;font-size:16px;line-height:1.8">'+introLines[il].trim()+'</div>';
    }
  }
  if(otherIntros.length>0){
    S+='<div style="margin-bottom:12px;color:#222;font-size:16px;line-height:1.8">이번 주에는 '+otherIntros.map(function(t){return esc(cleanBr(t));}).join(', ')+' 소식도 함께 준비했습니다.</div>';
  }

  /* 구분선 — 리포트형/매거진형에서는 제외 (목차가 없으므로) */
  var _isMagMode=sections[0]&&sections[0].writeStyle==='magazine';
  var _isReportMode=sections[0]&&sections[0].writeStyle==='report';
  if(!_isMagMode&&!_isReportMode){
    S+='<div style="border-top:1px solid #D5D2CA;margin:20px 0 18px"></div>';
  }
  if(_isMagMode||_isReportMode){
    /* 매거진형/리포트형: 인트로 박스 여기서 닫기 */
    /* 리포트형: [출처] 태그가 있으면 인트로 박스 안에 삽입 */
    if(_isReportMode&&sections[0]&&sections[0].ai&&sections[0].ai.body){
      for(var sci=0;sci<sections[0].ai.body.length;sci++){
        if(sections[0].ai.body[sci].indexOf('__SOURCE__')===0){
          var srcContent=sections[0].ai.body[sci].replace('__SOURCE__','').trim();
          S+='<div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;line-height:1.7;color:#888;letter-spacing:-0.27px;">'+srcContent+'</div>';
          sections[0].ai.body[sci]='__SOURCE_RENDERED__'; /* 본문 루프에서 스킵하도록 마킹 */
          break;
        }
      }
    }
    S+='</div>';
  } else {
  S+='<div>';
  /* 이메일 호환: display:table 사용 (flex 대신) */
  S+='<div style="display:table;width:100%;border-collapse:collapse;margin-bottom:14px">';
  S+='<div style="display:table-cell;vertical-align:middle;width:3px;padding-right:8px"><div style="width:3px;height:18px;background:#3B48CC;border-radius:2px"></div></div>';
  S+='<div style="display:table-cell;vertical-align:middle;font-size:14px;font-weight:800;color:#111">이번 주 주요 인사이트</div>';
  S+='</div>';
  /* 같은 태그 중복 제거 — 태그별로 첫 번째 제목만 표시 */
  for(var ti=0;ti<sections.length;ti++){
    var tocTag=sections[ti].tag;
    /* TOC 제목은 간략하게: 소제목 우선, 없으면 제목의 첫 줄만 */
    var tocTitle=sections[ti].ai.subtitle||sections[ti].ai.oneliner||(sections[ti].ai.title||'').split(/<br\s*\/?>/i)[0]||sections[ti].data.title;
    S+='<div data-toc-idx="'+ti+'" style="padding:8px 0;margin-bottom:2px">';
    S+='<span style="display:table-cell;vertical-align:middle;font-size:11px;font-weight:700;color:#fff;background:#3B48CC;padding:3px 10px;border-radius:4px;white-space:nowrap;width:1%">'+esc(tocTag)+'</span>';
    S+='<span style="display:table-cell;vertical-align:middle;font-size:13px;color:#333;line-height:1.5;word-break:keep-all;padding-left:10px">'+cleanBr(tocTitle)+'</span>';
    S+='</div>';
  }

  S+='</div>';
  S+='</div>'; /* 인트로 박스 닫기 (비매거진) */
  } /* end if/else _isMagMode */

  /* === SECTIONS === */
  if(_isMagMode)window._magSectionIdx=0;
  for(var si=0;si<sections.length;si++){
    var sec=sections[si],ai=sec.ai,data=sec.data;

    /* 섹션 래퍼 (드래그 순서 변경용) */
    S+='<div data-section="'+si+'" data-track-url="'+esc(sec.trackingUrl||'')+'" style="position:relative">';

    /* 구분선 + 태그 라인 — 매거진형/리포트형에서는 제외 (자체 라벨 사용) */
    var _secIsMag=(sec.writeStyle==='magazine');
    var _secIsRpt=(sec.writeStyle==='report');
    if(!_secIsMag&&!_secIsRpt){
    S+='<div data-sec-hdr="1" style="border-top:1px solid #D5D2CA;margin:36px 0 0;padding-top:20px">';
    S+='<div style="display:inline-block;font-size:11px;font-weight:700;color:#3B48CC;background:#FBFBFF;padding:4px 12px;border-radius:4px;letter-spacing:0.5px;margin-bottom:16px;border:1px solid #E5E7EB">'+esc(sec.tag);
    S+='</div></div>';

    /* 섹션 제목 */
    var secTitle=ai.title||ai.subtitle||data.title||'';
    if(secTitle){
      S+='<div style="font-size:20px;font-weight:800;color:#111;line-height:1.4;margin:0 0 20px;word-break:keep-all">'+cleanBr(secTitle)+'</div>';
    }
    } /* end !isMagazine&&!isReport */

    var secTrackLink=sec.trackingUrl||'';

    /* 썸네일 제거 — 이미지 깨짐 방지 */

    /* 본문 */
    var isProse=(sec.writeStyle==='prose');
    var isStory=(sec.writeStyle==='story');
    var isMagazine=(sec.writeStyle==='magazine');
    var isReport=(sec.writeStyle==='report');
    var storyBannerColor='#3B48CC';
    if(isProse)window._proseBodyIdx=0;
    if(isMagazine&&!window._magSectionIdx)window._magSectionIdx=0;
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

      if(isReport){
        /* 데이터 리포트형 렌더링 */
        if(bodyText.indexOf('__CHAPTER__')===0){
          var chapRaw=bodyText.replace('__CHAPTER__','').trim();
          var chapParts=chapRaw.split('|');
          var chapNum=(chapParts[0]||'').trim();
          var chapTitle=(chapParts[1]||'').trim();
          /* 챕터 간 구분선 */
          if(bi>0)S+='<div style="height:0;border-bottom:1px solid #E5E7EB;margin:48px 0 48px 0;"></div>';
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin-top:'+(bi===0?'48px':'0')+';">';
          S+='<div style="font-size:10.5px;font-weight:700;letter-spacing:.2em;color:#A8A29E;margin-bottom:6px" class="stb-bold">'+esc(chapNum)+'</div>';
          S+='<div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#111;margin-bottom:16px;line-height:1.4;">'+esc(chapTitle)+'</div>';
        } else if(bodyText.indexOf('__CHAPDESC__')===0){
          var descText=bodyText.replace('__CHAPDESC__','').trim();
          S+='<div style="font-size:15px;line-height:1.8;color:#222;margin-bottom:24px;">'+descText+'</div>';
        } else if(bodyText.indexOf('__DATA__')===0){
          var dataRaw=bodyText.replace('__DATA__','').trim();
          var dataPipe=dataRaw.indexOf('|');
          var dataType=dataRaw.substring(0,dataPipe).trim().toLowerCase();
          var dataContent=dataRaw.substring(dataPipe+1).trim();
          if(secTrackLink)S+='<a href="'+esc(secTrackLink)+'" target="_blank" style="display:block;text-decoration:none;color:inherit;">';
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="border:1px solid #E5E7EB;border-radius:12px;padding:20px;background:#fff;margin-bottom:20px;">';
          if(dataType==='bar'){
            /* 바 차트 */
            var barItems=dataContent.split(',').map(function(item){var p=item.split(':');return{label:(p[0]||'').trim(),value:parseFloat(p[1])||0};});
            var maxVal=Math.max.apply(null,barItems.map(function(b){return b.value;}));
            S+='<div style="display:table;width:100%;height:160px;table-layout:fixed;">';
            for(var bri=0;bri<barItems.length;bri++){
              var barH=maxVal>0?Math.round((barItems[bri].value/maxVal)*160):10;
              var isLast=(bri===barItems.length-1);
              var barColor=isLast?'#5E6AD2':'#E5E7EB';
              var numColor=isLast?'#5E6AD2':'#666';
              var numWeight=isLast?'font-weight:700;':'';
              var lblColor=isLast?'color:#5E6AD2;font-weight:700;':'color:#999;';
              S+='<div style="display:table-cell;vertical-align:bottom;text-align:center;padding:0 4px;">';
              S+='<div style="font-size:11px;'+numColor+';'+numWeight+'margin-bottom:4px;">'+esc(String(barItems[bri].value))+'</div>';
              S+='<div style="width:100%;height:'+barH+'px;background:'+barColor+';border-radius:4px 4px 0 0;"></div>';
              S+='<div style="font-size:10px;'+lblColor+'margin-top:6px;">'+esc(barItems[bri].label)+'</div>';
              S+='</div>';
            }
            S+='</div>';
          } else if(dataType==='table'){
            /* 테이블 */
            var tableRows=dataContent.split('\\n');
            if(tableRows.length<2)tableRows=dataContent.split('\n');
            S+='<table style="width:100%;border-collapse:collapse;font-size:14px;">';
            /* 헤더 행 표시 */
            if(tableRows.length>0){
              var hdrCells=tableRows[0].split(',');
              S+='<thead><tr style="border-bottom:2px solid #E5E7EB;">';
              for(var hi=0;hi<hdrCells.length;hi++){
                var hStyle='padding:10px 8px;text-align:left;color:#999;font-size:12px;font-weight:700;letter-spacing:-0.27px;';
                if(hi===0)hStyle+='width:25%;';
                else if(hi===1)hStyle+='width:28%;';
                S+='<th style="'+hStyle+'" class="stb-bold">'+esc(hdrCells[hi].trim())+'</th>';
              }
              S+='</tr></thead>';
            }
            S+='<tbody>';
            for(var tri=1;tri<tableRows.length;tri++){
              var cells=tableRows[tri].split(',');
              var rowBg=(tri===3)?'background:#EEEEF9;':'';
              var isLastRow=(tri===tableRows.length-1);
              S+='<tr style="'+rowBg+(isLastRow?'':'border-bottom:1px solid #f0f0f0;')+'">';
              for(var ci=0;ci<cells.length;ci++){
                var cellStyle='padding:10px 8px;letter-spacing:-0.27px;line-height:1.8;';
                if(ci===0)cellStyle+='color:#555;font-weight:700;';
                else if(ci===1)cellStyle+='color:#111;font-weight:600;';
                else cellStyle+='color:#999;font-size:12px;letter-spacing:-0.27px;line-height:1.6;';
                if(tri===3){cellStyle+='color:#5E6AD2;font-weight:700;';}
                S+='<td style="'+cellStyle+'">'+esc(cells[ci].trim())+'</td>';
              }
              S+='</tr>';
            }
            S+='</tbody></table>';
          } else if(dataType==='card'){
            /* 수치 카드 — 이메일 호환 table 구조 */
            /* 카드 항목 분리: 콤마가 값 안에도 있을 수 있으므로 "라벨:값:설명" 패턴으로 분리 */
            var cardRaw=dataContent;
            var cardItems=[];
            /* 먼저 단순 콤마 분리 시도 후, 각 항목에 콜론이 있는지 확인 */
            var cardParts=cardRaw.split(',');
            var tempItem='';
            for(var cpi=0;cpi<cardParts.length;cpi++){
              tempItem+=(tempItem?',':'')+cardParts[cpi];
              /* 콜론이 최소 1개 있고, 다음 항목도 콜론이 있으면 현재 항목 완성 */
              var colonCount=(tempItem.match(/:/g)||[]).length;
              var nextHasColon=(cpi+1<cardParts.length&&cardParts[cpi+1].indexOf(':')!==-1);
              if(colonCount>=1&&(nextHasColon||cpi===cardParts.length-1)){
                var cp=tempItem.split(':');
                cardItems.push({label:(cp[0]||'').trim(),value:(cp[1]||'').trim(),desc:(cp.slice(2).join(':')||'').trim()});
                tempItem='';
              }
            }
            if(cardItems.length===0)cardItems=[{label:'',value:dataContent,desc:''}];
            /* 카드 2개까지만 표시 (이메일 레이아웃 제한) */
            if(cardItems.length>2)cardItems=cardItems.slice(0,2);
            S+='<table style="width:100%;border-collapse:collapse;"><tbody><tr>';
            for(var cdi=0;cdi<cardItems.length;cdi++){
              var padStyle=cdi===0?'padding:0 6px 0 0;':'padding:0 0 0 6px;';
              S+='<td style="width:'+(Math.floor(100/cardItems.length))+'%;'+padStyle+'vertical-align:top;">';
              S+='<div style="border:1px solid #E5E7EB;border-radius:12px;padding:18px 16px;">';
              S+='<div style="font-size:11px;color:#999;margin-bottom:6px;">'+esc(cardItems[cdi].label)+'</div>';
              S+='<div style="font-size:22px;font-weight:800;color:#111;">'+esc(cardItems[cdi].value)+'</div>';
              if(cardItems[cdi].desc)S+='<div style="font-size:12px;color:#5E6AD2;margin-top:4px;">'+esc(cardItems[cdi].desc)+'</div>';
              S+='</div></td>';
            }
            S+='</tr></tbody></table>';
          } else if(dataType==='hbar'){
            /* 수평 바 차트 */
            var hbarItems=dataContent.split(',').map(function(item){var p=item.split(':');return{label:(p[0]||'').trim(),value:(p[1]||'').trim()};});
            var hMaxVal=parseFloat(hbarItems[0]&&hbarItems[0].value)||100;
            var hbarColors=['#5E6AD2','#818CF8','#818CF8','#C4B5FD','#C4B5FD'];
            for(var hbi=0;hbi<hbarItems.length;hbi++){
              var hVal=parseFloat(hbarItems[hbi].value)||0;
              var hWidth=hMaxVal>0?Math.round((hVal/hMaxVal)*100):5;
              var hColor=hbarColors[hbi]||'#DDD6FE';
              var hFontColor=hbi===0?'color:#5E6AD2;font-weight:700;':'color:#666;font-weight:600;';
              S+='<div style="margin-bottom:12px;">';
              S+='<div style="display:table;width:100%;">';
              S+='<div style="display:table-cell;width:90px;font-size:12px;color:#333;vertical-align:middle;">'+esc(hbarItems[hbi].label)+'</div>';
              S+='<div style="display:table-cell;vertical-align:middle;padding-right:8px;"><div style="width:'+hWidth+'%;height:8px;background:'+hColor+';border-radius:4px;"></div></div>';
              S+='<div style="display:table-cell;width:45px;font-size:12px;'+hFontColor+'text-align:right;vertical-align:middle;">'+esc(hbarItems[hbi].value)+'</div>';
              S+='</div></div>';
            }
          }
          S+='</div>'; /* 데이터 박스 닫기 */
          if(secTrackLink)S+='</a>';
        } else if(bodyText.indexOf('__OUTLOOK__')===0){
          /* 아웃룩 섹션 */
          var outlookRaw=bodyText.replace('__OUTLOOK__','').trim();
          var outlookItems=outlookRaw.split('\\n');
          if(outlookItems.length<2)outlookItems=outlookRaw.split('\n');
          S+='<div style="height:0;border-bottom:1px solid #E5E7EB;margin:48px 0 48px 0;"></div>';
          S+='<div data-src-idx="s'+si+'b'+bi+'" data-el="outlook" style="margin-top:0;cursor:pointer;" title="클릭하여 편집">';
          S+='<div style="font-size:10.5px;font-weight:700;letter-spacing:.2em;color:#A8A29E;margin-bottom:6px;" class="stb-bold">OUTLOOK</div>';
          S+='<div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#111;margin-bottom:24px;line-height:1.4;">주목해야 할 '+outlookItems.length+'가지 시그널</div>';
          for(var oi=0;oi<outlookItems.length;oi++){
            var oParts=outlookItems[oi].split('|');
            var oTitle=(oParts[0]||'').trim();
            var oDesc=(oParts[1]||'').trim();
            S+='<div style="border:1px solid #E5E7EB;border-radius:12px;padding:20px;background:#fff;margin-bottom:12px;">';
            S+='<div style="display:table;width:100%;">';
            S+='<div style="display:table-cell;vertical-align:top;width:28px;"><div style="width:24px;height:24px;background:#5E6AD2;border-radius:50%;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:24px;" class="stb-bold">'+(oi+1)+'</div></div>';
            S+='<div style="display:table-cell;vertical-align:top;padding-left:12px;">';
            S+='<div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;" class="stb-bold">'+esc(oTitle)+'</div>';
            S+='<div style="font-size:13px;line-height:1.7;color:#555;">'+esc(oDesc)+'</div>';
            S+='</div></div></div>';
          }
          S+='</div>';
        } else if(bodyText.indexOf('__STAT__')===0||bodyText.indexOf('__SUB__')===0||bodyText.indexOf('__TIP__')===0||bodyText.indexOf('__LABEL__')===0||bodyText.indexOf('__HIGHLIGHT__')===0||bodyText.indexOf('__SOURCE_RENDERED__')===0){
          continue; /* 리포트형에서 사용하지 않는 태그 스킵 */
        } else if(bodyText.indexOf('__SOURCE__')===0){
          /* [출처] — 인트로 박스 하단 방법론/출처 설명 */
          var srcText=bodyText.replace('__SOURCE__','').trim();
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;line-height:1.7;color:#888;letter-spacing:-0.27px;">'+srcText+'</div>';
        } else if(bodyText.indexOf('__MOREARTICLE__')===0){
          /* [원문유도] — MORE IN THE ARTICLE 카드 리스트 */
          var moreRaw=bodyText.replace('__MOREARTICLE__','').trim();
          var moreItems=moreRaw.split('\\n');
          if(moreItems.length<2)moreItems=moreRaw.split('\n');
          var moreEmojis=['⚾','📍','🛒','📊','🎯'];
          S+='<div style="height:0;border-bottom:1px solid #E5E7EB;margin:48px 0;"></div>';
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 8px;">';
          S+='<div style="font-size:10.5px;font-weight:700;letter-spacing:0.2em;color:#A8A29E;margin-bottom:6px;line-height:1.8;" class="stb-bold">MORE IN THE ARTICLE</div>';
          S+='<div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#111;margin-bottom:8px;line-height:1.4;">원문에는 더 깊고 자세한 인사이트가 포함되어 있어요.</div>';
          S+='<div style="font-size:14px;color:#888;margin-bottom:20px;letter-spacing:-0.27px;line-height:1.8;">뉴스레터에 다 담지 못한 데이터를 원문에서 확인하세요.</div>';
          if(secTrackLink)S+='<a href="'+esc(secTrackLink)+'" target="_blank" style="display:block;text-decoration:none;color:inherit;">';
          for(var mi=0;mi<moreItems.length;mi++){
            var mParts=moreItems[mi].split('|');
            var mTitle=(mParts[0]||'').trim();
            var mDesc=(mParts[1]||'').trim();
            var mEmoji=moreEmojis[mi]||'📄';
            S+='<div style="border:1px solid #E5E7EB;border-radius:12px;padding:18px 20px;background:#fff;margin-bottom:10px;">';
            S+='<div style="display:table;width:100%;">';
            S+='<div style="display:table-cell;vertical-align:middle;width:36px;"><div style="width:32px;height:32px;background:#EEEEF9;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">'+mEmoji+'</div></div>';
            S+='<div style="display:table-cell;vertical-align:middle;padding-left:12px;">';
            S+='<div style="font-size:15px;font-weight:700;color:#111;letter-spacing:-0.27px;margin-bottom:3px;" class="stb-bold">'+esc(mTitle)+'</div>';
            if(mDesc)S+='<div style="font-size:13px;color:#555;letter-spacing:-0.27px;line-height:1.7;">'+esc(mDesc)+'</div>';
            S+='</div>';
            S+='<div style="display:table-cell;vertical-align:middle;width:20px;text-align:right;"><span style="font-size:16px;color:#c0c0c0;">›</span></div>';
            S+='</div></div>';
          }
          if(secTrackLink)S+='</a>';
          S+='</div>';
        } else if(bodyText.indexOf('__CUSTOM__')===0){
          /* [커스텀] — 자유형 카드 (구단별 성별 비율 등) */
          var custRaw=bodyText.replace('__CUSTOM__','').trim();
          var custItems=custRaw.split('\\n');
          if(custItems.length<2)custItems=custRaw.split('\n');
          for(var cui=0;cui<custItems.length;cui++){
            var cParts=custItems[cui].split('|');
            var cTitle=(cParts[0]||'').trim();
            /* 숫자만 추출 — "4050 남성" 같은 텍스트에서 순수 숫자만 */
            var cMaleRaw=(cParts[1]||'50').trim();
            var cFemaleRaw=(cParts[2]||'50').trim();
            var cMale=parseInt(cMaleRaw.replace(/[^0-9]/g,''))||50;
            var cFemale=parseInt(cFemaleRaw.replace(/[^0-9]/g,''))||50;
            /* 비율이 100을 넘으면 보정 (AI가 "4050"처럼 연령대를 넣은 경우) */
            if(cMale>100){cMale=50;cFemale=50;}
            if(cFemale>100){cMale=50;cFemale=50;}
            /* 합이 100이 아니면 보정 */
            if(cMale+cFemale!==100){var total=cMale+cFemale;if(total>0){cFemale=100-cMale;}else{cMale=50;cFemale=50;}}
            var cDesc=(cParts[3]||'').trim();
            S+='<div style="border:1px solid #E5E7EB;border-radius:12px;padding:20px;background:#fff;margin-bottom:12px;">';
            S+='<div style="font-size:13px;font-weight:700;color:#111;margin-bottom:14px;" class="stb-bold">'+esc(cTitle)+'</div>';
            S+='<div style="margin-bottom:8px;font-size:11px;color:#888;">성별 비율</div>';
            S+='<div style="display:table;width:100%;height:10px;border-radius:5px;overflow:hidden;">';
            S+='<div style="display:table-cell;width:'+cMale+'%;background:#1a1a1a;"></div>';
            S+='<div style="display:table-cell;width:'+cFemale+'%;background:#c4c4c4;"></div>';
            S+='</div>';
            S+='<div style="display:table;width:100%;margin-top:4px;">';
            S+='<div style="display:table-cell;font-size:10px;color:#1a1a1a;font-weight:700;" class="stb-bold">남 '+cMale+'%</div>';
            S+='<div style="display:table-cell;text-align:right;font-size:10px;color:#888;font-weight:700;" class="stb-bold">여 '+cFemale+'%</div>';
            S+='</div>';
            if(cDesc)S+='<div style="margin-top:12px;font-size:11px;color:#555;line-height:1.6;">핵심: '+esc(cDesc)+'</div>';
            S+='</div>';
          }
        } else if(bodyText.indexOf('__INSIGHT__')===0){
          /* [인사이트] — 챕터 인사이트 박스 */
          var rptInsight=bodyText.replace('__INSIGHT__','').trim();
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="border-left:3px solid #5E6AD2;padding:14px 16px;margin:20px 0 0;background:#fff;">';
          S+='<div style="font-size:12px;font-weight:700;color:#5E6AD2;margin-bottom:6px;" class="stb-bold">💡 INSIGHT</div>';
          S+='<div style="font-size:14px;line-height:1.8;color:#333;">'+rptInsight+'</div>';
          S+='</div></div>'; /* 챕터 div 닫기 */
        } else {
          /* 일반 본문 */
          S+='<p data-src-idx="s'+si+'b'+bi+'" style="font-size:15px;line-height:1.8;color:#222;margin:0 0 16px;">'+bodyText+'</p>';
        }
      } else if(isMagazine){
        /* 매거진형 렌더링 */
        if(bodyText.indexOf('__LABEL__')===0){
          /* [라벨] — 다음 본문의 업종 라벨로 저장 */
          window._magNextLabel=bodyText.replace('__LABEL__','').trim();
          continue;
        } else if(bodyText.indexOf('__SUB__')===0){
          /* [서브] — 수치 요약 라인 (소제목 바로 밑) */
          var subText=bodyText.replace('__SUB__','').trim();
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="font-size:13px;color:#888;margin:0 0 20px;font-style:italic;'+ff+'">'+subText+'</div>';
        } else if(bodyText.indexOf('__TIP__')===0){
          /* [팁] — Data-Forecast Point 박스 + 원문 링크 포함 */
          var tipText=bodyText.replace('__TIP__','').trim();
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:18px 0 28px;padding:16px 20px;background:#FBFBFF;border-radius:4px;border:1px solid #E5E7EB;position:relative;'+ff+'" class="mag-stat-box">';
          S+='<button class="mag-stat-del" onclick="this.parentElement.remove()" title="삭제" style="color:#3B48CC">✕</button>';
          S+='<div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#3B48CC;margin-bottom:8px">DATA-FORECAST POINT</div>';
          S+='<p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.9">'+tipText+'</p>';
          /* 원문 링크를 박스 안에 */
          if(sec.url){
            var tipLabel=window._magLastUsedLabel||sec.tag;
            S+='<div style="text-align:right;margin-top:12px"><a href="'+esc(sec.url)+'" target="_blank" style="font-size:12px;font-weight:700;color:#0a0a0a;text-decoration:none;letter-spacing:0.5px"><span style="color:#0a0a0a">🔗 '+esc(tipLabel)+' 업종 전체 데이터 확인하기 →</span></a></div>';
          }
          S+='</div>';
        } else if(bodyText.indexOf('__STAT__')===0){
          /* [통계] — 매거진형에서는 렌더링하지 않음 (서브헤드에 수치 이미 포함) */
          continue;
        } else {
          /* 일반 [본문] — 소제목 분리 */
          var magPlain=bodyText.replace(/<[^>]+>/g,'').trim();
          var magColonIdx=magPlain.indexOf(':');
          if(magColonIdx===-1)magColonIdx=magPlain.indexOf('：');
          var magSubTitle='',magBody=bodyText;
          if(magColonIdx>5&&magColonIdx<80){
            magSubTitle=magPlain.substring(0,magColonIdx).trim();
            /* HTML에서 콜론 위치 찾기 */
            var mhIdx=0,mcIdx=0;
            for(mhIdx=0;mhIdx<bodyText.length;mhIdx++){
              if(bodyText[mhIdx]==='<'){while(mhIdx<bodyText.length&&bodyText[mhIdx]!=='>')mhIdx++;continue;}
              if(mcIdx>=magColonIdx)break;
              mcIdx++;
            }
            magBody=bodyText.substring(mhIdx+1).replace(/^[:：]\s*/,'').trim();
          }
          if(magSubTitle){
            window._magSectionIdx++;
            var magNum=String(window._magSectionIdx).padStart(2,'0');
            var magLabel=window._magNextLabel||sec.tag;
            window._magNextLabel='';
            window._magLastUsedLabel=magLabel;
            S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:28px 0 0;padding-top:24px">';
            /* 라벨: 01 ─── 업종명 */
            S+='<div style="display:table;width:100%;margin-bottom:18px">';
            S+='<span style="display:table-cell;vertical-align:middle;font-size:11px;font-weight:800;color:#bbb;letter-spacing:2px;width:1%;white-space:nowrap;padding-right:10px">'+magNum+'</span>';
            S+='<span style="display:table-cell;vertical-align:middle;width:100%"><span style="display:block;height:1px;background:#e0e0e0"></span></span>';
            S+='<span style="display:table-cell;vertical-align:middle;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#888;white-space:nowrap;padding-left:10px">'+esc(magLabel).toUpperCase()+'</span>';
            S+='</div>';
            /* 소제목 (2줄 지원) */
            S+='<div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1.3;color:#0a0a0a;margin-bottom:6px;'+ff+'">'+magSubTitle+'</div>';
            /* [서브]가 다음에 있으면 소제목 바로 밑에 부제목으로 삽입 */
            if(bi+1<ai.body.length&&ai.body[bi+1]&&ai.body[bi+1].indexOf('__SUB__')===0){
              var nextSub=ai.body[bi+1].replace('__SUB__','').trim();
              S+='<div style="font-size:13px;color:#888;margin-bottom:20px;font-style:italic;'+ff+'">'+nextSub+'</div>';
              bi++; /* 다음 항목 스킵 */
            } else {
              S+='<div style="margin-bottom:20px"></div>';
            }
            /* 본문 */
            S+='<p style="font-size:15px;line-height:1.9;color:#333;margin:0 0 14px">'+magBody+'</p>';
            S+='</div>';
          } else {
            /* 소제목 없는 본문 (마무리 등) */
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="font-size:15px;line-height:1.9;color:#333;margin:0 0 14px">'+bodyText+'</p>';
          }
        }
      } else if(isProse){
        /* 강조 박스 — 80자 초과면 일반 본문으로 */
        if(bodyText.indexOf('__HIGHLIGHT__')===0){
          var hlText=bodyText.replace('__HIGHLIGHT__','').trim();
          var hlPlain=hlText.replace(/<[^>]+>/g,'');
          if(hlPlain.length<=80){
            S+='<div data-src-idx="s'+si+'b'+bi+'" data-el="box" style="background:#FBFBFF;padding:12px 18px 12px 16px;border-radius:10px;margin:14px 0;border:1px solid #E0DEFF;color:#3B48CC;font-size:14px;line-height:1.7;font-weight:600;display:flex;align-items:flex-start;gap:8px;'+ff+'"><span style="font-size:16px;flex-shrink:0">💡</span><span>'+hlText.replace(/<\/?strong>/g,'')+'</span></div>';
          } else {
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:15px;line-height:1.8;font-weight:400">'+hlText.replace(/<\/?strong>/g,'')+'</p>';
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
            S+='<p data-src-idx="s'+si+'b'+bi+'a" style="color:#222;margin:0 0 20px;font-size:15px;line-height:1.8;font-weight:400">'+beforeCircle.replace(/<\/?strong>/g,'')+'</p>';
          }
          bodyText=afterCircle;
        }
        /* 줄글형: ❶❷❸ 번호가 있으면 번호 제목 + 문단으로 분리 */
        var circleMatch=bodyText.match(/^([\u2776-\u277F\u2460-\u2473\u24EB-\u24FF❶❷❸❹❺❻❼❽❾❿])\s*(.+)/);
        if(circleMatch){
          var numTitle=circleMatch[2];
          var nlIdx=numTitle.indexOf('\\n');
          if(nlIdx===-1)nlIdx=numTitle.indexOf('\n');
          /* 콜론이 있으면 콜론에서 분리 */
          if(nlIdx===-1){
            var plainNum=numTitle.replace(/<[^>]+>/g,'');
            var colonPos=plainNum.indexOf(':');
            if(colonPos===-1)colonPos=plainNum.indexOf('：');
            if(colonPos>2&&colonPos<40){
              /* HTML에서 콜론 위치 찾기 */
              var cc=0;
              for(var ci=0;ci<numTitle.length;ci++){
                if(numTitle[ci]==='<'){while(ci<numTitle.length&&numTitle[ci]!=='>')ci++;continue;}
                if(cc>=colonPos){nlIdx=ci;break;}
                cc++;
              }
            }
          }
          /* 콜론도 없으면 첫 문장 끝에서 분리 */
          if(nlIdx===-1){
            var plainNum=numTitle.replace(/<[^>]+>/g,'');
            var sentEnd=-1;
            var sentRx=/[다요죠음됨임까니턴션][\.\?!]/g;
            var sentMatch;
            while((sentMatch=sentRx.exec(plainNum))!==null){
              if(sentMatch.index>3&&sentMatch.index<60){
                sentEnd=sentMatch.index+2;
                break;
              }
            }
            /* 그래도 못 찾으면 30자에서 강제 분리 */
            if(sentEnd<0&&plainNum.length>30)sentEnd=30;
            if(sentEnd>0){
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
            /* 줄글형 소제목에서 이모지만 제거 (❶❷❸ 번호는 유지) */
            pTitle=pTitle.replace(/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{2600}-\u{2763}\u{2765}-\u{2775}\u{2780}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,'').replace(/\s{2,}/g,' ').trim();
            /* 소제목 끝의 콜론 제거 */
            pTitle=pTitle.replace(/\s*[:：]\s*$/,'').trim();
            var pBody=numTitle.substring(nlIdx).replace(/^\\?n?\s*/,'').replace(/^[:：]\s*/,'').trim();
            /* 구분선 제거 */
            S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 24px">';
            S+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:12px;'+ff+'">'+pTitle+'</div>';
            if(pBody){
              pBody=pBody.replace(/<\/?strong>/g,'');
              S+='<p style="color:#222;margin:0;font-size:15px;line-height:1.8;font-weight:400">'+pBody+'</p>';
            }
            S+='</div>';
          } else {
            /* 번호는 있지만 분리 안 됨 → 전체를 일반 본문으로 */
            var fullText=(circleMatch[1]+' '+numTitle).replace(/<\/?strong>/g,'');
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:15px;line-height:1.8;font-weight:400">'+fullText+'</p>';
          }
        } else {
          /* 줄글형: ❶❷❸ 번호가 없으면 자동으로 붙여주기 */
          var circleNums=['❶','❷','❸','❹','❺','❻','❼','❽','❾','❿'];
          if(!window._proseBodyIdx)window._proseBodyIdx=0;
          var autoNum=circleNums[window._proseBodyIdx]||'';
          window._proseBodyIdx++;
          var proseBody=bodyText.replace(/<\/?strong>/g,'');
          /* 콜론이 앞쪽에 있으면 소제목 분리 */
          var proseColonIdx=proseBody.replace(/<[^>]+>/g,'').indexOf(':');
          if(proseColonIdx===-1)proseColonIdx=proseBody.replace(/<[^>]+>/g,'').indexOf('：');
          var prosePlain=proseBody.replace(/<[^>]+>/g,'').trim();
          if(proseColonIdx>3&&proseColonIdx<50&&prosePlain.length>proseColonIdx+20){
            var proseSubPlain=prosePlain.substring(0,proseColonIdx).trim();
            /* HTML에서 콜론 위치 찾기 */
            var hIdx=0,cIdx=0;
            for(hIdx=0;hIdx<proseBody.length;hIdx++){
              if(proseBody[hIdx]==='<'){while(hIdx<proseBody.length&&proseBody[hIdx]!=='>')hIdx++;continue;}
              if(cIdx>=proseColonIdx)break;
              cIdx++;
            }
            var proseAfter=proseBody.substring(hIdx+1).replace(/^[:：]\s*/,'').trim();
            S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 24px">';
            S+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:12px;'+ff+'">'+autoNum+(autoNum?' ':'')+esc(proseSubPlain)+'</div>';
            S+='<p style="color:#222;margin:0;font-size:15px;line-height:1.8;font-weight:400">'+proseAfter+'</p>';
            S+='</div>';
          } else {
            S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 20px;font-size:15px;line-height:1.8;font-weight:400">'+proseBody+'</p>';
          }
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
      if(colonIdx===-1)colonIdx=bodyText.indexOf('：'); /* 전각 콜론 */
      var subTitle='',bodyContent=bodyText;
      if(colonIdx>3&&colonIdx<60){
        /* 콜론 앞이 소제목, 뒤가 본문 */
        var before=bodyText.substring(0,colonIdx).replace(/<[^>]+>/g,'').trim();
        var after=bodyText.substring(colonIdx+1).trim();
        if(after.length>10){subTitle=before;bodyContent=after;}
      } else if(hasEmoji){
        /* 이모지 있고 콜론 없으면 첫 문장을 소제목으로 분리 */
        var sentEndMatch=plainStart.match(/^(.{5,55}?[다요죠음됨임까니][\.\?!:])\s*/);
        if(sentEndMatch){
          var titleLen=sentEndMatch[1].length;
          var hPos=0,cCnt=0;
          for(hPos=0;hPos<bodyText.length;hPos++){
            if(bodyText[hPos]==='<'){while(hPos<bodyText.length&&bodyText[hPos]!=='>')hPos++;continue;}
            if(cCnt>=titleLen)break;
            cCnt++;
          }
          subTitle=bodyText.substring(0,hPos).replace(/<[^>]+>/g,'').trim();
          bodyContent=bodyText.substring(hPos).trim();
        } else if(plainStart.length<60){
          subTitle=plainStart;bodyContent='';
        }
      }
      if(subTitle){
        if(isStory){
          /* 스토리텔링형: 카드 스타일 — 소제목 배너 + 본문 */
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 24px;border:1.5px solid #ebebeb;border-radius:12px;overflow:hidden">';
          S+='<div style="background:#FBFBFF;color:#3B48CC;font-size:15px;font-weight:800;padding:12px 20px;letter-spacing:-0.3px;'+ff+'">'+esc(subTitle)+'</div>';
          if(bodyContent)S+='<div style="padding:18px 20px"><p style="color:#222;margin:0;font-size:15px;line-height:1.8">'+bodyContent+'</p></div>';
          S+='</div>';
        } else {
          S+='<div data-src-idx="s'+si+'b'+bi+'" style="margin:0 0 28px">';
          S+='<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px;'+ff+'">'+esc(subTitle)+'</div>';
          if(bodyContent)S+='<p style="color:#222;margin:0;font-size:15px;line-height:1.8">'+bodyContent+'</p>';
          S+='</div>';
        }
      } else {
        if(isStory){
          /* 스토리텔링형: 소제목 없는 본문 (마무리 등) — 카드 없이 */
          S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 14px;font-size:15px;line-height:1.8">'+bodyText+'</p>';
        } else {
          S+='<p data-src-idx="s'+si+'b'+bi+'" style="color:#222;margin:0 0 14px;font-size:15px;line-height:1.8">'+bodyText+'</p>';
        }
      }
      } /* end isProse else */
    }

    /* 매거진형: 링크는 DATA-FORECAST POINT 박스 안에 포함됨 — 별도 렌더링 불필요 */

    /* 인사이트 요약 박스 — 매거진형/리포트형에서는 제외 */
    if(ai.insightBox&&!isMagazine&&!isReport){
      if(isProse){
        /* 줄글형 → 📂 더 자세히 알아보기 */
        S+='<div data-el="box" contenteditable="inherit" style="background-color:#FBFBFF;border:1px solid #E5E7EB;border-left:4px solid #3B48CC;border-radius:0 12px 12px 0;padding:20px 24px;margin:20px 0;color:#222;'+ff+'">';
        S+='<div style="font-size:16px;font-weight:700;color:#3B48CC;margin-bottom:14px">📂 더 자세히 알아보기</div>';
        var insightRaw=ai.insightBox.replace(/🤔\s*/g,'').replace(/리포트\s*본문에서\s*직접\s*확인[^•\n]*/gi,'').replace(/\\n/g,'\n').trim();
        var redirectText=(ai.redirect||'').replace(/<\/?strong>/g,'').replace(/리포트\s*본문에서[^.]*[.!]?\s*/gi,'').trim();
        var insightLines=insightRaw.split(/[•·*\n]|(?<=\?)\s/).filter(function(l){var t=l.trim();return t.length>5&&!/리포트.*본문|확인.*보세요/i.test(t)&&!/^(유도|한줄|통계|인사이트|제목|소제목|본문|강조|도입)\s*[:：]/i.test(t)&&!/이제 작성|작성하겠습니다|Let's|I will/i.test(t)&&!/^\[/.test(t);});
        if(insightLines.length>0){
          for(var il=0;il<insightLines.length;il++){
            var iLine=insightLines[il].trim().replace(/^[•·\-]\s*/,'');
            S+='<div style="margin-bottom:10px;font-size:16px;line-height:1.7;color:#222;padding-left:20px;position:relative"><span style="position:absolute;left:0;color:#111;font-size:16px">•</span>'+iLine+'</div>';
          }
        }
        if(redirectText&&redirectText.length>10){
          S+='<div style="font-size:16px;line-height:1.7;margin-top:14px;color:#222">'+redirectText+'</div>';
        }
        var origLink=secTrackLink||sec.url;
        S+='<div style="margin-top:16px;text-align:right"><a href="'+esc(origLink)+'" target="_blank" title="'+esc(origLink)+'" data-el="link" style="font-size:16px;color:#3B48CC;text-decoration:none;font-weight:600">🔗 원문 보기 →</a></div>';
        S+='</div>';
      } else {
        /* 소제목형 → 인용 스타일 인사이트 */
        S+='<div data-el="box" contenteditable="inherit" style="margin:28px 0;padding:24px 28px;position:relative;'+ff+'">';
        S+='<div style="font-size:36px;color:#E2E8F0;font-family:Georgia,serif;line-height:1;margin-bottom:8px">"</div>';
        var insightLines=ai.insightBox.split('\n').filter(function(l){return l.trim();}).slice(0,3);
        for(var il=0;il<insightLines.length;il++){
          var iLine=insightLines[il].trim().replace(/^[•·\-]\s*/,'');
          if(iLine.length>100)iLine=iLine.substring(0,100)+'…';
          S+='<div style="margin-bottom:8px;font-size:14px;line-height:1.8;color:#4B5563;font-style:italic">'+iLine+'</div>';
        }
        var origLink=secTrackLink||sec.url;
        S+='<div style="margin-top:16px;text-align:right"><a href="'+esc(origLink)+'" target="_blank" title="'+esc(origLink)+'" data-el="link" style="font-size:14px;color:#3B48CC;text-decoration:none;font-weight:600">원문에서 더 알아보기 →</a></div>';
        S+='</div>';
      }
    }

    /* 유도 → 인사이트 요약 안의 원문 보기로 대체, 별도 유도 텍스트 제거 */

    S+='</div>'; /* data-section 닫기 */
  }

  /* === 더 많은 아티클 CTA === */
  if(_isReportMode){
    /* 리포트형: 모바일인덱스 AI 리포트 CTA */
    S+='<div data-el="box" style="text-align:center;padding:24px 20px;border:1px solid #E5E7EB;border-radius:12px;background:#FBFBFF;margin-top:16px;">';
    S+='<div style="font-size:17px;font-weight:800;color:#111;margin-bottom:10px;line-height:1.4;'+ff+'">앱만 검색하면, 경쟁 데이터부터 전략까지.</div>';
    S+='<div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.7;'+ff+'">모바일인덱스 AI가 업종 포지션, 이탈 패턴, 사용자 구성을 분석하여 맞춤 리포트를 무료로 제공합니다.</div>';
    S+='<a data-el="btn" href="https://data.igaworks.com/" target="_blank" style="display:inline-block;background:#3B48CC;color:#fff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.2px;'+ff+'" class="stb-bold">무료 리포트 받기</a>';
    S+='</div>';
  } else {
  S+='<div data-el="box" style="text-align:center;margin:36px 0 8px;padding:20px 20px;background:#FBFBFF;border-radius:10px;border:1px solid #E5E7EB">';
  S+='<div style="font-size:16px;font-weight:700;color:#111;margin-bottom:4px;'+ff+'">더 많은 아티클이 궁금하다면?</div>';
  S+='<div style="font-size:12px;color:#999;margin-bottom:14px">아이지에이웍스 블로그에서 더 다양한 인사이트를 확인해보세요.</div>';
  S+='<a data-el="btn" href="https://igaworks.ap2.dfn.link/api/v1/click/ZtZYQmIYEEue0fG6fSRQrA" target="_blank" style="display:inline-block;font-size:14px;font-weight:600;color:#3B48CC;background:#fff;border:1.5px solid #3B48CC;padding:10px 28px;border-radius:4px;text-decoration:none;'+ff+'">블로그 아티클 바로가기 →</a>';
  S+='</div>';
  }

  /* === 솔루션별 한줄 요약 카드 === */
  S+='<div style="height:32px"></div>';

  /* === FOOTER === */
  S+='<div style="background:#fff;padding:28px 24px;border-top:1px solid #E5E7EB;margin-top:0;font-size:12px;line-height:1.8;color:#999;text-align:center">';
  S+='본 메일은 '+ds+' 기준 마케팅수신활용 거부에 해당되지 않는 분들에게 제공됩니다.<br>';
  S+='수신을 원하지 않을 경우 하단의 수신거부를 눌러주세요.<br>';
  S+='<a href="mailto:marketing@igaworks.com" style="color:#3B48CC;text-decoration:underline">marketing@igaworks.com</a><br>';
  S+='<a href="$%unsubscribe%$" style="color:#888;text-decoration:underline">수신거부 Unsubscribe</a>';
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
  if(isEditable)document.execCommand('defaultParagraphSeparator',false,'p');
  NL.classList.toggle('editable',isEditable);this.classList.toggle('active',isEditable);
  this.innerHTML=isEditable?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 편집 완료':'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
  var ep=qs('#edit-panel');
  ep.classList.toggle('open',isEditable);
  if(isEditable){clearHL();syncToolbar();}
});

/* 편집 중 브라우저가 넣는 빈 span 자동 정리 */
NL.addEventListener('input',function(){
  if(!isEditable)return;
  /* 스타일 없는 빈 span 제거 */
  NL.querySelectorAll('span:not([style]):not([class])').forEach(function(sp){
    sp.replaceWith(document.createTextNode(sp.textContent));
  });
  /* font-family만 다른 span 정리 */
  NL.querySelectorAll('span[style]').forEach(function(sp){
    var s=sp.getAttribute('style')||'';
    if(s.match(/^font-family:/i)&&!s.match(/font-size|color|font-weight|background/i)){
      sp.replaceWith(document.createTextNode(sp.textContent));
    }
  });
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
  clone.querySelectorAll('[data-ui-ctrl]').forEach(function(el){el.remove();});
  clone.querySelectorAll('.block-ctrl-btn').forEach(function(el){el.remove();});
  /* 블록 컨트롤 래퍼도 제거 (▲▼❐✕ 버튼 그룹) */
  clone.querySelectorAll('[style*="pointer-events:auto"]').forEach(function(el){if(el.querySelector('[data-bc]'))el.remove();});
  clone.querySelectorAll('[data-bc]').forEach(function(el){el.remove();});
  /* 편집 모드에서 숨겨진 섹션 헤더(태그 뱃지) 제거 */
  clone.querySelectorAll('[data-sec-hdr]').forEach(function(el){el.remove();});
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
  if(hasBadUrl)toast('⚠️ ibb.co 페이지 링크가 있어요. i.ibb.co 직접 링크를 사용하세요.');

  /* ===== 이메일 호환성 처리 ===== */
  /* 1. position:absolute 빈 div 제거 (블록 컨트롤 잔해) */
  clone.querySelectorAll('div').forEach(function(el){
    if(el.style.position==='absolute'||el.style.position==='fixed'){el.remove();}
  });
  /* 2. 빈 a 태그 제거 */
  clone.querySelectorAll('a').forEach(function(el){
    if(!el.textContent.trim()&&!el.querySelector('img'))el.remove();
  });
  /* 3. 링크 색상 강제 적용 — 이메일 클라이언트가 파란색으로 덮어씌우는 것 방지 */
  clone.querySelectorAll('a').forEach(function(el){
    if(!el.style.color)el.style.color='#0a0a0a';
    el.style.textDecoration='none';
  });
  /* 4. 섹션 래퍼 margin/padding 정리 */
  clone.querySelectorAll('[data-section]').forEach(function(el){
    el.style.margin='0';
    el.style.padding='0';
    el.removeAttribute('data-section');
    el.removeAttribute('data-track-url');
  });
  /* 불필요한 속성 정리 (HTML 크기 줄이기) */
  /* 매거진형 삭제 버튼 제거 (클래스 제거 전에 먼저!) */
  clone.querySelectorAll('.mag-stat-del').forEach(function(el){el.remove();});
  clone.querySelectorAll('.mag-stat-box').forEach(function(el){el.classList.remove('mag-stat-box');});
  clone.querySelectorAll('[class]').forEach(function(el){el.removeAttribute('class');});
  clone.querySelectorAll('[tabindex]').forEach(function(el){el.removeAttribute('tabindex');});
  clone.querySelectorAll('[spellcheck]').forEach(function(el){el.removeAttribute('spellcheck');});
  /* NL에 적용된 inline style 반영 */
  var nlColor=NL.style.color||'#222';
  var nlLH=NL.style.lineHeight||'1.8';
  var nlLS=NL.style.letterSpacing||'-0.27px';
  var nlFS=NL.style.fontSize||'15px';
  var nlFF='Noto Sans KR,Pretendard,Apple SD Gothic Neo,sans-serif';
  /* 이메일 클라이언트는 CSS 상속 미지원 → 텍스트 요소에 직접 주입 */
  clone.querySelectorAll('p,div,span,td,li,h1,h2,h3,h4,h5,h6').forEach(function(el){
    /* letter-spacing: 명시적으로 다른 값이 없으면 기본값 적용 */
    if(!el.style.letterSpacing||el.style.letterSpacing==='normal'||el.style.letterSpacing==='0px')
      el.style.letterSpacing=nlLS;
    if(!el.style.lineHeight||el.style.lineHeight==='normal')
      el.style.lineHeight=nlLH;
    if(!el.style.fontFamily)
      el.style.fontFamily=nlFF;
  });
  /* position:relative 잔류 스타일 제거 (showControls 흔적) */
  clone.querySelectorAll('[style*="position:relative"]').forEach(function(el){
    el.style.position='';
  });
  /* 소제목(18px 볼드) 뒤 간격 정규화 */
  clone.querySelectorAll('div').forEach(function(el){
    if(el.style.fontSize==='18px'&&(el.style.fontWeight==='700'||el.style.fontWeight==='bold')){
      el.style.marginBottom='0';
    }
  });
  var inner=clone.innerHTML;
  /* HTML 크기 체크 */
  var sizeKB=Math.round(inner.length/1024);
  if(sizeKB>90)toast('⚠️ HTML '+sizeKB+'KB — Gmail은 102KB 넘으면 잘려요!');
  return'<div style="font-family:'+nlFF+';letter-spacing:'+nlLS+';line-height:'+nlLH+';font-size:'+nlFS+';color:'+nlColor+';max-width:600px;margin:0 auto;background:#fff;padding:40px 24px;width:100%;box-sizing:border-box">'+inner+'</div>';
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
        /* 일반 텍스트 정렬: 가장 가까운 블록 요소의 textAlign 변경 */
        var align=cmd==='justifyLeft'?'left':cmd==='justifyCenter'?'center':'right';
        var block=node;
        while(block&&block!==NL&&window.getComputedStyle(block).display==='inline')block=block.parentNode;
        if(block&&block!==NL){
          block.style.textAlign=align;
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
    /* 선택 영역에 fontSize 적용 — execCommand 방식 */
    document.execCommand('fontSize',false,'7');
    /* fontSize 7 → 임시 font 태그 생성됨 → span으로 교체 */
    NL.querySelectorAll('font[size="7"]').forEach(function(font){
      var span=document.createElement('span');
      span.style.fontSize=size;
      span.innerHTML=font.innerHTML;
      font.parentNode.replaceChild(span,font);
    });
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
    /* 선택 없으면 전체 적용 — 모든 블록 요소 line-height 강제 변경 */
    NL.style.lineHeight=val;
    NL.querySelectorAll('p,div,li,blockquote,span').forEach(function(el){
      if(el.closest('[data-el="btn"]'))return;
      el.style.lineHeight=val;
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
    if(!isEditable){/* 자동으로 Edit 모드 활성화 */isEditable=true;NL.contentEditable=true;NL.classList.add('editable');var etBtn=qs('#edit-toggle');if(etBtn){etBtn.classList.add('active');etBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 편집중';var ep=qs('#edit-panel');if(ep)ep.classList.add('open');qs('.main-content').classList.add('ep-open');}}
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

/* ===== Card 편집 ===== */
var editingCardBox=null;
NL.addEventListener('click',function(e){
  if(!isEditable)return;
  /* 카드 박스 감지: table 안의 카드 구조 (border-radius:12px + 22px 볼드 숫자) */
  var td=e.target.closest('td');
  if(!td)return;
  var cardDiv=td.querySelector('div[style*="border-radius:12px"]')||td.querySelector('div[style*="border-radius: 12px"]');
  if(!cardDiv)return;
  /* 카드 내부 구조 확인: 라벨(11px) + 값(22px) + 설명(12px) */
  var children=cardDiv.querySelectorAll('div');
  if(children.length<2)return;
  var hasLargeNum=false;
  children.forEach(function(c){if(c.style.fontSize==='22px'||c.style.fontWeight==='800')hasLargeNum=true;});
  if(!hasLargeNum)return;

  e.stopPropagation();
  editingCardBox=td.closest('table')||td.closest('div[style*="border-radius:12px"]');
  if(!editingCardBox)editingCardBox=td.closest('div[style*="border:1px"]');

  /* 모든 카드 셀 수집 */
  var cells=editingCardBox.querySelectorAll('td');
  var fieldsHtml='';
  cells.forEach(function(cell,idx){
    var innerCard=cell.querySelector('div[style*="border-radius:12px"]')||cell.querySelector('div[style*="border-radius: 12px"]');
    if(!innerCard)return;
    var divs=innerCard.querySelectorAll('div');
    var label='',value='',desc='';
    divs.forEach(function(d){
      var fs=d.style.fontSize;
      if(fs==='11px')label=d.textContent.trim();
      else if(fs==='22px')value=d.textContent.trim();
      else if(fs==='12px')desc=d.textContent.trim();
    });
    fieldsHtml+='<div style="margin-bottom:16px;padding:12px;background:#F8F9FA;border-radius:8px;">';
    fieldsHtml+='<div style="font-size:11px;font-weight:700;color:#999;margin-bottom:8px;">카드 '+(idx+1)+'</div>';
    fieldsHtml+='<label style="font-size:12px;">라벨</label><input type="text" class="card-label-input" data-idx="'+idx+'" value="'+esc(label)+'" style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;margin-bottom:6px;">';
    fieldsHtml+='<label style="font-size:12px;">값</label><input type="text" class="card-value-input" data-idx="'+idx+'" value="'+esc(value)+'" style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;margin-bottom:6px;">';
    fieldsHtml+='<label style="font-size:12px;">설명</label><input type="text" class="card-desc-input" data-idx="'+idx+'" value="'+esc(desc)+'" style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;">';
    fieldsHtml+='</div>';
  });
  qs('#card-fields').innerHTML=fieldsHtml;
  qs('#card-modal').classList.remove('hidden');
});
on('#card-modal-close','click',function(){qs('#card-modal').classList.add('hidden');editingCardBox=null;});
on('#card-delete','click',function(){
  if(editingCardBox){editingCardBox.closest('div[style*="border:1px"]')?editingCardBox.closest('div[style*="border:1px"]').remove():editingCardBox.remove();}
  qs('#card-modal').classList.add('hidden');editingCardBox=null;toast('카드 삭제됨');
});
on('#card-confirm','click',function(){
  if(!editingCardBox){qs('#card-modal').classList.add('hidden');return;}
  var cells=editingCardBox.querySelectorAll('td');
  cells.forEach(function(cell,idx){
    var innerCard=cell.querySelector('div[style*="border-radius:12px"]')||cell.querySelector('div[style*="border-radius: 12px"]');
    if(!innerCard)return;
    var labelInput=qs('.card-label-input[data-idx="'+idx+'"]');
    var valueInput=qs('.card-value-input[data-idx="'+idx+'"]');
    var descInput=qs('.card-desc-input[data-idx="'+idx+'"]');
    if(!labelInput)return;
    var divs=innerCard.querySelectorAll('div');
    divs.forEach(function(d){
      if(d.style.fontSize==='11px')d.textContent=labelInput.value;
      else if(d.style.fontSize==='22px')d.textContent=valueInput.value;
      else if(d.style.fontSize==='12px')d.textContent=descInput.value;
    });
  });
  qs('#card-modal').classList.add('hidden');editingCardBox=null;toast('카드 수정됨');
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
on('#insert-link-btn','click',function(){if(!isEditable)return;var sel=window.getSelection();saveSelection();qs('#link-text').value=sel.toString()||'';var existingUrl='';if(sel.rangeCount>0){var node=sel.anchorNode;var a=node?(node.nodeType===1?node.closest('a'):node.parentElement?node.parentElement.closest('a'):null):null;if(a&&a.href)existingUrl=a.href;}qs('#link-url').value=existingUrl;qs('#link-modal').classList.remove('hidden');});
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
  var ph='<div data-el="img-placeholder" style="background:#FAFBFF;border:1.5px dashed #D1D5DB;border-radius:12px;padding:28px 16px;text-align:center;cursor:pointer;margin:12px 0;transition:border-color .15s"><div style="margin-bottom:6px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div><div style="font-size:12px;color:#94A3B8">클릭해서 이미지 추가</div></div>';
  document.execCommand('insertHTML',false,ph);
  NL.focus();
});
on('#img-file-btn','click',function(){imgFileInput.click();});
imgFileInput.addEventListener('change',function(e){
  var file=e.target.files[0];if(!file)return;
  /* 미리보기용 base64 표시 + URL 직접 입력 안내 */
  var reader=new FileReader();
  reader.onload=function(ev){
    var base64=ev.target.result;
    qs('#img-preview').src=base64;
    qs('#img-preview-wrap').classList.remove('hidden');
    qs('#img-url').value='';
    toast('이미지 URL을 직접 입력해주세요 (블로그 원문에서 이미지 주소 복사)');
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
  var ph='<div data-el="img-placeholder" style="background:#FAFBFF;border:1.5px dashed #D1D5DB;border-radius:12px;padding:24px 16px;text-align:center;cursor:pointer;transition:border-color .15s"><div style="margin-bottom:4px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div><div style="font-size:11px;color:#94A3B8">클릭해서 이미지 추가</div></div>';
  var html='<div style="margin:16px 0;display:flex;gap:8px">'
    +'<div style="flex:1">'+ph+'</div>'
    +'<div style="flex:1">'+ph+'</div>'
    +'</div>';
  document.execCommand('insertHTML',false,html);
  toast('2단 이미지 삽입됨 — 각 영역을 클릭해서 이미지를 설정하세요');
  NL.focus();
});

/* Button Modal */
function syncBtnSwatches(){
  ['bg','fg','border-color'].forEach(function(k){
    var inp=qs('#btn-'+k),sw=qs('#btn-'+k+'-swatch');
    if(inp&&sw)sw.style.background=inp.value;
  });
}
on('#btn-bg','input',function(){var s=qs('#btn-bg-swatch');if(s)s.style.background=this.value;});
on('#btn-fg','input',function(){var s=qs('#btn-fg-swatch');if(s)s.style.background=this.value;});
on('#btn-border-color','input',function(){var s=qs('#btn-border-color-swatch');if(s)s.style.background=this.value;});
on('#insert-btn-btn','click',function(){if(!isEditable)return;saveSelection();editingBtn=null;qs('#btn-text').value='블로그 아티클 바로가기';qs('#btn-url').value='';qs('#btn-bg').value='#ffffff';qs('#btn-fg').value='#4F46E5';qs('#btn-border-color').value='#4F46E5';qs('#btn-size').value='md';qs('#btn-radius').value='8px';qs('#btn-width').value='auto';syncBtnSwatches();qs('#btn-modal').classList.remove('hidden');});
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
  if(btn){e.preventDefault();editingBtn=btn;qs('#btn-text').value=btn.textContent.replace(/\s*→$/,'').trim();qs('#btn-url').value=btn.href||'';qs('#btn-bg').value=rgbToHex(btn.style.backgroundColor)||'#ffffff';qs('#btn-fg').value=rgbToHex(btn.style.color)||'#4F46E5';qs('#btn-border-color').value=rgbToHex(btn.style.borderColor||btn.style.borderTopColor)||'#4F46E5';qs('#btn-radius').value=btn.style.borderRadius||'8px';syncBtnSwatches();qs('#btn-modal').classList.remove('hidden');return;}
  /* Box — 싱글클릭=텍스트편집, 더블클릭=박스모달 */
  var box=e.target.closest('[data-el="box"]');
  if(box){
    /* 박스 안 링크 클릭 시 링크 편집 모달 */
    var boxLink=e.target.closest('a');
    if(boxLink){e.preventDefault();qs('#link-text').value=boxLink.textContent.replace(/\s*↗$/,'').trim();qs('#link-url').value=boxLink.href||'';qs('#link-modal').classList.remove('hidden');return;}
    /* 박스 안 버튼 클릭 시 버튼 모달 */
    var boxBtn=e.target.closest('[data-el="btn"]');
    if(boxBtn){e.preventDefault();editingBtn=boxBtn;qs('#btn-text').value=boxBtn.textContent.trim();qs('#btn-url').value=boxBtn.href||'';qs('#btn-bg').value=rgbToHex(boxBtn.style.backgroundColor)||'#3B48CC';qs('#btn-fg').value=rgbToHex(boxBtn.style.color)||'#ffffff';qs('#btn-border-color').value=rgbToHex(boxBtn.style.borderColor||boxBtn.style.borderTopColor)||'#3B48CC';syncBtnSwatches();qs('#btn-modal').classList.remove('hidden');return;}
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
  var bgVal=rgbToHex(box.style.backgroundColor)||rgbToHex(getComputedStyle(box).backgroundColor)||'#FBFBFF';
  var outlineVal=rgbToHex(box.style.borderRightColor)||rgbToHex(getComputedStyle(box).borderRightColor)||'#E5E7EB';
  var leftVal=rgbToHex(box.style.borderLeftColor)||rgbToHex(getComputedStyle(box).borderLeftColor)||'#3B48CC';
  var linkVal=(box.parentNode&&box.parentNode.tagName==='A'?box.parentNode.href:'');

  content.innerHTML=''
    +'<div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.04)">'

    /* 헤더 */
    +'<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #F3F4F6">'
    +'<div style="width:6px;height:6px;border-radius:50%;background:#3B48CC"></div>'
    +'<span style="font-size:13px;font-weight:700;color:#111;flex:1">박스 스타일</span>'
    +'<button id="ep-box-delete" title="삭제" style="background:none;border:none;cursor:pointer;font-size:11px;color:#aaa;padding:4px 8px;border-radius:6px">삭제</button>'
    +'</div>'

    /* 색상 — 배경 + 테두리 */
    +'<div style="padding:14px 16px 10px">'
    +'<div style="display:flex;gap:10px">'

    +'<label style="flex:1;cursor:pointer">'
    +'<div style="font-size:10px;color:#888;margin-bottom:4px;text-align:center;font-weight:600">배경</div>'
    +'<div id="ep-bg-swatch" style="height:34px;border-radius:8px;border:1.5px solid #E5E7EB;background:'+bgVal+';position:relative;overflow:hidden">'
    +'<input type="color" id="ep-box-bg" value="'+bgVal+'" style="position:absolute;inset:-10px;width:calc(100% + 20px);height:calc(100% + 20px);cursor:pointer;border:none;opacity:0">'
    +'</div></label>'

    +'<label style="flex:1;cursor:pointer">'
    +'<div style="font-size:10px;color:#888;margin-bottom:4px;text-align:center;font-weight:600">테두리</div>'
    +'<div id="ep-bd-swatch" style="height:34px;border-radius:8px;border:1.5px solid #E5E7EB;background:'+outlineVal+';position:relative;overflow:hidden">'
    +'<input type="color" id="ep-box-outline" value="'+outlineVal+'" style="position:absolute;inset:-10px;width:calc(100% + 20px);height:calc(100% + 20px);cursor:pointer;border:none;opacity:0">'
    +'</div></label>'

    +'</div></div>'

    /* 왼쪽 선 — 토글 + 색상 */
    +'<div style="padding:6px 16px 12px">'
    +'<div style="display:flex;align-items:center;gap:10px">'
    +'<div style="font-size:10px;color:#888;font-weight:600;flex-shrink:0">왼쪽 선</div>'
    /* 토글 스위치 */
    +'<label style="position:relative;width:36px;height:20px;flex-shrink:0;cursor:pointer">'
    +'<input type="checkbox" id="ep-box-left-toggle"'+(hasLeftBorder?' checked':'')+' style="opacity:0;width:0;height:0;position:absolute">'
    +'<div id="ep-left-track" style="position:absolute;inset:0;border-radius:10px;background:'+(hasLeftBorder?'#3B48CC':'#D1D5DB')+';transition:background .2s"></div>'
    +'<div id="ep-left-thumb" style="position:absolute;top:2px;left:'+(hasLeftBorder?'18':'2')+'px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s"></div>'
    +'</label>'
    /* 색상 선택 */
    +'<div id="ep-left-swatch" style="flex:1;height:28px;border-radius:8px;border:1.5px solid '+(hasLeftBorder?leftVal:'#E5E7EB')+';background:'+(hasLeftBorder?leftVal:'#F3F4F6')+';position:relative;overflow:hidden;opacity:'+(hasLeftBorder?'1':'0.4')+';transition:all .2s">'
    +'<input type="color" id="ep-box-left" value="'+leftVal+'" style="position:absolute;inset:-10px;width:calc(100% + 20px);height:calc(100% + 20px);cursor:pointer;border:none;opacity:0;'+(hasLeftBorder?'':'pointer-events:none')+'">'
    +'</div>'
    +'</div></div>'

    /* 구분선 */
    +'<div style="border-top:1px solid #F3F4F6;margin:0 16px"></div>'

    /* 링크 */
    +'<div style="padding:12px 16px">'
    +'<div style="font-size:10px;color:#888;margin-bottom:5px;font-weight:600">링크 URL</div>'
    +'<input type="url" id="ep-box-link" value="'+esc(linkVal)+'" placeholder="https://..." style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;outline:none;background:#FAFAFA">'
    +'</div>'

    /* 적용 */
    +'<div style="padding:4px 16px 14px">'
    +'<button id="ep-box-apply" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:10px;font-size:12px;cursor:pointer;font-weight:600;letter-spacing:0.3px">적용</button>'
    +'</div>'

    +'</div>';
  /* 실시간 이벤트 */
  var bgSwatch=qs('#ep-bg-swatch'),bdSwatch=qs('#ep-bd-swatch'),leftSwatch=qs('#ep-left-swatch');
  var epBoxLeftToggle=qs('#ep-box-left-toggle');
  var epBoxLeft=qs('#ep-box-left');
  var leftTrack=qs('#ep-left-track'),leftThumb=qs('#ep-left-thumb');

  qs('#ep-box-bg').addEventListener('input',function(){
    if(editingBox)editingBox.style.backgroundColor=this.value;
    if(bgSwatch)bgSwatch.style.background=this.value;
  });
  if(epBoxLeftToggle)epBoxLeftToggle.addEventListener('change',function(){
    if(!editingBox)return;
    if(this.checked){
      editingBox.style.borderLeft='4px solid '+(epBoxLeft?epBoxLeft.value:'#3B48CC');
      editingBox.style.borderRadius='0 10px 10px 0';
      if(epBoxLeft){epBoxLeft.style.pointerEvents='auto';}
      if(leftSwatch){leftSwatch.style.background=epBoxLeft?epBoxLeft.value:'#3B48CC';leftSwatch.style.borderColor=epBoxLeft?epBoxLeft.value:'#3B48CC';leftSwatch.style.opacity='1';}
      if(leftTrack)leftTrack.style.background='#3B48CC';
      if(leftThumb)leftThumb.style.left='18px';
    } else {
      editingBox.style.borderLeftWidth='1px';
      editingBox.style.borderLeftColor=qs('#ep-box-outline').value;
      editingBox.style.borderRadius='10px';
      if(epBoxLeft){epBoxLeft.style.pointerEvents='none';}
      if(leftSwatch){leftSwatch.style.background='#F3F4F6';leftSwatch.style.borderColor='#E5E7EB';leftSwatch.style.opacity='0.4';}
      if(leftTrack)leftTrack.style.background='#D1D5DB';
      if(leftThumb)leftThumb.style.left='2px';
    }
  });
  if(epBoxLeft)epBoxLeft.addEventListener('input',function(){
    if(editingBox&&epBoxLeftToggle&&epBoxLeftToggle.checked){editingBox.style.borderLeftColor=this.value;}
    if(leftSwatch){leftSwatch.style.background=this.value;leftSwatch.style.borderColor=this.value;}
  });
  qs('#ep-box-outline').addEventListener('input',function(){
    if(editingBox){editingBox.style.borderTopColor=this.value;editingBox.style.borderRightColor=this.value;editingBox.style.borderBottomColor=this.value;if(epBoxLeftToggle&&!epBoxLeftToggle.checked)editingBox.style.borderLeftColor=this.value;}
    if(bdSwatch)bdSwatch.style.background=this.value;
  });
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
  ctrlWrap.setAttribute('data-ui-ctrl','1');
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
    return el.closest('[data-el="outlook"]')||el.closest('[data-el="box"]')||el.closest('[data-el="btn"]')||el.closest('[data-el="spacer"]')||el.closest('[data-src-idx="intro"]')||el.closest('[data-src-idx]')||null;
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
/* ===== 붙여넣기: 외부 스타일 제거, 순수 텍스트만 삽입 ===== */
NL.addEventListener('paste',function(e){
  e.preventDefault();
  var text=(e.clipboardData||window.clipboardData).getData('text/plain');
  if(!text)return;
  document.execCommand('insertText',false,text);
});

/* ===== 공통 유틸: 커서가 소제목(20px title div) 안에 있는지 반환 ===== */
function getCaretTitleEl(){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount)return null;
  var node=sel.getRangeAt(0).startContainer;
  var el=node.nodeType===3?node.parentElement:node;
  while(el&&el!==NL){
    if(el.tagName==='DIV'&&el.style&&el.style.fontSize==='20px'
       &&el.parentElement&&el.parentElement.hasAttribute('data-section'))return el;
    el=el.parentElement;
  }
  return null;
}

/* ===== 디버그 로그 (임시) ===== */
(function(){
  var dbg=document.createElement('div');
  dbg.id='nl-debug';
  dbg.style.cssText='position:fixed;bottom:12px;right:12px;z-index:9999;background:rgba(0,0,0,.82);color:#7EE787;font-size:11px;font-family:monospace;padding:8px 12px;border-radius:8px;max-width:340px;word-break:break-all;display:none;pointer-events:none';
  document.body.appendChild(dbg);
  function dbLog(msg){
    if(!window._nlDebugOn)return;
    dbg.style.display='block';
    dbg.textContent=msg;
    clearTimeout(window._dbTimer);window._dbTimer=setTimeout(function(){dbg.style.display='none';},3000);
  }
  window._nlDbLog=dbLog;
  /* 디버그 활성화: 브라우저 콘솔에서 window._nlDebugOn=true 입력 */
})();

NL.addEventListener('keydown',function(e){
  if(window._nlDebugOn&&e.key.length===1){
    var sel=window.getSelection();
    var r=sel&&sel.rangeCount?sel.getRangeAt(0):null;
    var c=r?r.startContainer:null;
    var p=c&&c.nodeType===3?c.parentElement:c;
    window._nlDbLog('keydown key='+e.key+' | container=<'+( p?p.tagName:'?')+'>'+( p&&p.className?' .'+p.className:'')+'| offset='+( r?r.startOffset:'-'));
  }
  if((e.metaKey||e.ctrlKey)&&e.key==='z'&&!e.shiftKey){
    if(undoStack.length>1){
      e.preventDefault();
      undoStack.pop();
      NL.innerHTML=undoStack[undoStack.length-1];
      toast('되돌리기');
    }
  }

  /* Tab: 들여쓰기 방지 */
  if(e.key==='Tab'){e.preventDefault();return;}

  /* Backspace: 섹션 간 병합 차단 + Backspace 후 커서가 <strong> 안으로 들어가는 것 방지 */
  if(e.key==='Backspace'){
    var selBS=window.getSelection();
    if(selBS&&selBS.rangeCount){
      var rBS=selBS.getRangeAt(0);
      if(rBS.collapsed&&rBS.startOffset===0){
        var nodeBS=rBS.startContainer;
        var elBS=nodeBS.nodeType===3?nodeBS.parentElement:nodeBS;
        /* 섹션 경계 백스페이스 — 허용 (편집 자유도 우선) */
      }
    }
    /* Backspace 처리 후 커서가 <strong>/<b> 경계로 빠졌으면 바깥으로 이동 */
    setTimeout(function(){
      var selAB=window.getSelection();
      if(!selAB||!selAB.rangeCount||!selAB.isCollapsed)return;
      var rAB=selAB.getRangeAt(0);
      if(!NL.contains(rAB.startContainer))return;
      var cAB=rAB.startContainer;
      var pAB=cAB.nodeType===3?cAB.parentElement:cAB;
      /* 커서가 offset 0이고 <strong>/<b> 바로 안에 있으면 바깥으로 */
      if(rAB.startOffset===0&&(pAB.tagName==='STRONG'||pAB.tagName==='B')){
        var fixR=document.createRange();
        fixR.setStartBefore(pAB);fixR.collapse(true);
        selAB.removeAllRanges();selAB.addRange(fixR);
      }
      /* 소제목(18px 볼드) div 안에 본문 텍스트가 합쳐졌으면 분리 복원 */
      var titleDiv=pAB;
      while(titleDiv&&titleDiv!==NL){
        if(titleDiv.tagName==='DIV'&&titleDiv.style&&(titleDiv.style.fontSize==='18px'||titleDiv.style.fontSize==='20px')&&(titleDiv.style.fontWeight==='700'||titleDiv.style.fontWeight==='800'||titleDiv.style.fontWeight==='bold')){
          /* 소제목 div 안에 텍스트가 원래 소제목보다 길어졌으면 = 본문이 합쳐진 것 */
          var allText=titleDiv.textContent||'';
          if(allText.length>60){
            /* 소제목 div의 첫 번째 텍스트/요소만 남기고 나머지를 새 p로 분리 */
            var children=Array.from(titleDiv.childNodes);
            var splitIdx=-1;
            var charCount=0;
            for(var ci=0;ci<children.length;ci++){
              var cLen=(children[ci].textContent||'').length;
              charCount+=cLen;
              if(charCount>50&&ci>0){splitIdx=ci;break;}
            }
            if(splitIdx<0)splitIdx=1;
            var newP=document.createElement('p');
            newP.style.cssText='color:#222;margin:0;font-size:16px;line-height:1.8;font-weight:normal';
            while(titleDiv.childNodes.length>splitIdx){
              newP.appendChild(titleDiv.childNodes[splitIdx]);
            }
            titleDiv.parentNode.insertBefore(newP,titleDiv.nextSibling);
            /* 커서를 새 p 시작으로 */
            var newR=document.createRange();newR.setStart(newP,0);newR.collapse(true);
            selAB.removeAllRanges();selAB.addRange(newR);
          }
          break;
        }
        titleDiv=titleDiv.parentElement;
      }
    },10);
  }

  /* Delete: 소제목 끝에서 아래 본문이 소제목 안으로 빨려들어가는 것 방지 */
  if(e.key==='Delete'){
    var titleDel=getCaretTitleEl();
    if(titleDel){
      var selDel=window.getSelection();
      var rDel=selDel.getRangeAt(0);
      /* 커서가 소제목의 마지막 위치인지 확인 */
      var endR=document.createRange();
      endR.selectNodeContents(titleDel);endR.collapse(false);
      if(rDel.compareBoundaryPoints(Range.END_TO_END,endR)===0){
        e.preventDefault();return;
      }
    }
  }

  /* ===== Enter / Shift+Enter: 모두 <br> 삽입 — 행간 동일하게 유지 ===== */
  if(e.key==='Enter'){
    e.preventDefault();
    var selE=window.getSelection();
    if(!selE||!selE.rangeCount)return;

    /* 소제목(20px)에서 Enter → 다음 본문 시작으로 커서 이동 */
    var titleEl2=getCaretTitleEl();
    if(titleEl2){
      var nextBodyEl=titleEl2.nextElementSibling;
      if(nextBodyEl){
        var r2=document.createRange();
        r2.setStart(nextBodyEl,0);r2.collapse(true);
        selE.removeAllRanges();selE.addRange(r2);
      }
      return;
    }

    /* 그 외 모든 위치: <br> 삽입 (행간 = 기존 줄간격과 동일) */
    var rE=selE.getRangeAt(0);
    rE.deleteContents();

    /* <strong>/<b> 안에 있으면 먼저 빠져나오기 */
    var escNode=rE.startContainer;
    var escEl=escNode.nodeType===3?escNode.parentElement:escNode;
    while(escEl&&escEl!==NL){
      if(escEl.tagName==='STRONG'||escEl.tagName==='B'){
        /* 커서가 strong 맨 앞(offset 0)이면 strong 앞에 br 삽입 */
        if(rE.startOffset===0){
          var brBefore=document.createElement('br');
          escEl.parentNode.insertBefore(brBefore,escEl);
          var rBefore=document.createRange();rBefore.setStartBefore(escEl);rBefore.collapse(true);
          selE.removeAllRanges();selE.addRange(rBefore);
          return;
        }
        rE=document.createRange();
        rE.setStartAfter(escEl);rE.collapse(true);
        selE.removeAllRanges();selE.addRange(rE);
        break;
      }
      escEl=escEl.parentElement;
    }

    /* <br> 삽입 */
    rE=selE.getRangeAt(0);
    var brEl=document.createElement('br');
    rE.insertNode(brEl);
    /* 커서를 <br> 뒤로 — 다음 노드가 없으면 빈 텍스트 노드 추가 */
    if(!brEl.nextSibling){brEl.parentNode.appendChild(document.createTextNode(''));}
    var afterR=document.createRange();
    afterR.setStartAfter(brEl);afterR.collapse(true);
    selE.removeAllRanges();selE.addRange(afterR);
  }
});

/* ===== beforeinput: bold 컨텍스트에서 non-bold 영역 타이핑 방지 ===== */
NL.addEventListener('beforeinput',function(e){
  if(window._nlDebugOn&&e.inputType==='insertText'){
    var sel2=window.getSelection();
    var r2=sel2&&sel2.rangeCount?sel2.getRangeAt(0):null;
    var c2=r2?r2.startContainer:null;
    var p2=c2&&c2.nodeType===3?c2.parentElement:c2;
    window._nlDbLog('beforeinput data='+e.data+' | parent=<'+(p2?p2.tagName:'?')+'> offset='+(r2?r2.startOffset:'-')+' bold='+document.queryCommandState('bold'));
  }
  if(e.inputType!=='insertText')return;
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount||!sel.isCollapsed)return;
  var range=sel.getRangeAt(0);
  var c=range.startContainer;
  var p=c.nodeType===3?c.parentElement:c;

  /* Case 1: offset 0이고 <strong>/<b> 바로 안에 있으면 앞으로 빼서 non-bold 입력 */
  if(range.startOffset===0&&(p.tagName==='STRONG'||p.tagName==='B')){
    e.preventDefault();
    var nr=document.createRange();
    nr.setStartBefore(p);nr.collapse(true);
    sel.removeAllRanges();sel.addRange(nr);
    if(e.data)document.execCommand('insertText',false,e.data);
    return;
  }

  /* Case 2: 커서가 <strong>/<b> 직후 위치에 있어서 브라우저가 bold를 상속하는 경우만 처리
     → 커서 바로 앞 노드가 <strong>/<b>인지 정밀하게 확인 */
  var prevSib=null;
  if(c.nodeType===3){
    /* 텍스트 노드 맨 앞(offset 0)이면 이전 형제 확인 */
    if(range.startOffset===0)prevSib=c.previousSibling;
  } else {
    /* 요소 노드면 startOffset-1 위치 자식 확인 */
    prevSib=range.startOffset>0?range.startContainer.childNodes[range.startOffset-1]:null;
  }
  if(prevSib&&(prevSib.tagName==='STRONG'||prevSib.tagName==='B')&&document.queryCommandState('bold')){
    /* </strong> 직후 커서 → 일반 텍스트 노드로 강제 삽입 */
    e.preventDefault();
    var tn=document.createTextNode(e.data||'');
    range.insertNode(tn);
    var r3=document.createRange();
    r3.setStartAfter(tn);r3.collapse(true);
    sel.removeAllRanges();sel.addRange(r3);
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
        return aiRewrite(data.paras,data.title,item.volumeText,item.writeStyle,item.url,urls.length,item.comment).catch(function(err){
          if(err.message==='NO_KEY'){showErr('API 키를 설정해주세요.');return null;}
          console.error('AI err:',err);toast('AI 실패: '+err.message.substring(0,60));return fallback(data.paras,data.title);
        }).then(function(ai){if(ai)sections.push({url:item.url,tag:tag,data:data,ai:ai,trackingUrl:item.trackingUrl||'',writeStyle:item.writeStyle||'subtitle'});});
      }).catch(function(err){
        /* 프록시 실패해도 urlContext로 Gemini가 직접 읽으니까 계속 진행 */
        console.warn('Proxy failed, using urlContext fallback:',item.url);
        var tag=item.tag==='auto'?'아이지에이웍스':item.tag;
        var data={title:'',paras:[],imgs:[]};
        return aiRewrite(data.paras,data.title,item.volumeText,item.writeStyle,item.url,urls.length,item.comment).catch(function(err2){
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
    currentDraftName=null; /* 새 뉴스레터 생성 시 임시저장 이름 초기화 */
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
      if(ai0.title)titleCandidates.push({label:'🎯 호기심 갭',text:ai0.title});
      if(ai0.titleB)titleCandidates.push({label:'📊 숫자 충격',text:ai0.titleB});
      if(ai0.titleC)titleCandidates.push({label:'🤔 질문/반전',text:ai0.titleC});
      if(ai0.titleD)titleCandidates.push({label:'⚠️ 손실회피',text:ai0.titleD});
      if(ai0.titleE)titleCandidates.push({label:'💬 대화체',text:ai0.titleE});
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
    {label:'🎯 호기심 갭',text:ai.title},
    {label:'📊 숫자 충격',text:ai.titleB||''},
    {label:'🤔 질문/반전',text:ai.titleC||''},
    {label:'⚠️ 손실회피',text:ai.titleD||''},
    {label:'💬 대화체',text:ai.titleE||''}
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
      rebuildTOCOrder();
      toast('섹션 순서 변경됨');
    });
  })();
}

/* 섹션 순서 변경 시 이번 주 주요 인사이트 TOC도 같은 순서로 재정렬 */
function rebuildTOCOrder(){
  if(!NL)return;
  /* 현재 DOM에서 data-section 순서 읽기 */
  var sectionEls=NL.querySelectorAll('[data-section]');
  if(!sectionEls.length)return;
  /* TOC 컨테이너 찾기: "이번 주 주요 인사이트" 텍스트를 포함하는 div의 부모 */
  var tocItems=NL.querySelectorAll('[data-toc-idx]');
  if(!tocItems.length)return;
  var tocParent=tocItems[0].parentElement;
  if(!tocParent)return;
  /* 섹션 순서대로 TOC 아이템 재배치 */
  var orderedIdxs=[];
  sectionEls.forEach(function(el){orderedIdxs.push(el.getAttribute('data-section'));});
  orderedIdxs.forEach(function(idx){
    var tocEl=NL.querySelector('[data-toc-idx="'+idx+'"]');
    if(tocEl)tocParent.appendChild(tocEl);
  });
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
        rebuildTOCOrder();
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

/* ===== SNS 모듈 — js/sns.js로 분리됨 ===== */

/* 공유 함수를 전역으로 노출 (SNS 모듈 등 외부 파일에서 사용) */
window.qs=qs;window.qsa=qsa;window.on=on;window.esc=esc;window.toast=toast;
window.getKey=getKey;window.fetchUrl=fetchUrl;window.extract=extract;
window.showErr=showErr;window.hideErr=hideErr;window.classify=classify;
window.stripMd=stripMd;window.cleanBr=cleanBr;window.selectedDate=selectedDate;
window.today=today;window.getUrls=getUrls;window.rgbToHex=rgbToHex;

})();
