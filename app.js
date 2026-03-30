/* IGAWorks Newsletter Editor v4 — 순살 스타일 */
(function(){
"use strict";

function qs(s){return document.querySelector(s);}
function qsa(s){return document.querySelectorAll(s);}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function today(){var d=new Date();return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');}
function getKey(){var el=qs('#api-key-input');var v=(el&&el.value)?el.value.trim():'';return v||localStorage.getItem('gemini-api-key')||'';}
function toast(m){var t=qs('#toast');t.textContent=m;t.classList.remove('hidden');setTimeout(function(){t.classList.add('hidden');},2500);}
function showErr(m){var e=qs('#error-msg');e.textContent=m;e.classList.remove('hidden');}
function hideErr(){qs('#error-msg').classList.add('hidden');}
function rgbToHex(rgb){if(!rgb)return'';if(rgb.charAt(0)==='#')return rgb;var m=rgb.match(/(\d+)/g);if(!m||m.length<3)return'';return'#'+((1<<24)+(+m[0]<<16)+(+m[1]<<8)+(+m[2])).toString(16).slice(1);}
function stripMd(s){return s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
function cleanBr(s){return(s||'').replace(/<br\s*\/?>/gi,'').trim();}
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
qs('#menu-btn').addEventListener('click',function(){sidebar.classList.toggle('open');});
qs('#sidebar-toggle').addEventListener('click',function(){sidebar.classList.remove('open');});

/* Sidebar tabs */
qsa('.sidebar-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    qsa('.sidebar-tab').forEach(function(t){t.classList.remove('active');});
    tab.classList.add('active');
    var which=tab.dataset.tab;
    qs('#history-list').style.display=which==='history'?'':'none';
    qs('#drafts-list').style.display=which==='drafts'?'':'none';
    var dl=qs('#designs-list');if(dl)dl.style.display=which==='designs'?'':'none';
    if(which==='designs')renderDesigns();
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
qs('#settings-toggle').addEventListener('click',function(){
  /* 저장된 키 불러오기 */
  var gemKey=localStorage.getItem('gemini-api-key');
  var imgKey=localStorage.getItem('imgbb-api-key');
  if(gemKey)qs('#api-key-input').value=gemKey;
  if(imgKey)qs('#imgbb-key-input').value=imgKey;
  qs('#settings-modal').classList.remove('hidden');
});
qs('#settings-close').addEventListener('click',function(){qs('#settings-modal').classList.add('hidden');});

/* Guide */
qs('#guide-toggle').addEventListener('click',function(){qs('#guide-modal').classList.remove('hidden');});
qs('#guide-close').addEventListener('click',function(){qs('#guide-modal').classList.add('hidden');});

/* Home */
function goHome(){
  var hero=qs('#hero-section');if(hero)hero.classList.remove('hidden');
  panels.classList.add('hidden');toolbar.classList.add('hidden');
  qs('#back-btn').classList.add('hidden');
  var tc=qs('#title-candidates');if(tc)tc.classList.add('hidden');
  if(isEditable){isEditable=false;NL.contentEditable=false;NL.classList.remove('editable');qs('#edit-toggle').classList.remove('active');qs('#edit-toggle').textContent='✏️ Edit';var ep=qs('#edit-panel');if(ep)ep.classList.remove('open');qs('.main-content').classList.remove('ep-open');}
  if(isComparing){isComparing=false;qs('#compare-toggle').classList.remove('active');qs('#original-panel').classList.add('hidden');qs('#panel-divider').classList.add('hidden');}
}
qs('#home-btn').addEventListener('click',goHome);
qs('#back-btn').addEventListener('click',goHome);

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
    +'<div class="url-row-main"><span class="url-icon">&#128196;</span><input type="url" class="url-field" placeholder="분석할 리포트 URL을 입력하세요"></div>'
    +'<select class="url-tag-select"><option value="auto">플랫폼 AI 자동분류</option><option value="디파이너리">디파이너리</option><option value="트레이딩웍스360">트레이딩웍스360</option><option value="모바일인덱스INSIGHT">모바일인덱스INSIGHT</option><option value="TVIndex">TVIndex</option><option value="Fixfolio">Fixfolio</option><option value="아이지에이웍스">아이지에이웍스</option></select>'
    +'<input type="text" class="url-volume-input" placeholder="예: 소제목 3개, 5줄" value="" style="width:100px">'
    +'<button class="url-remove-btn">&#10005;</button>'
    +'</div>'
    +'<input type="url" class="url-tracking-input" placeholder="&#128279; 트래킹 링크 (이미지 클릭 시 이동 URL)">'
    +'</div>';
  return d;
}
qs('#add-url-btn').addEventListener('click',function(){urlList.appendChild(makeUrlRow());});
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
    if(u&&u.indexOf('http')===0)r.push({url:u,tag:tag,volumeText:volText,trackingUrl:trackUrl});
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
  return '너는 IGAWorks 뉴스레터 작성자야. 원문을 읽고 핵심만 뽑아서 리라이팅해.\n\n'
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
    +'[제목B] 데이터 강조형 제목 2줄. 핵심 수치를 제목에 넣어. 예: "📊 MAU 1538만 명 돌파!<br>증권 앱 시장이 폭발했습니다"\n'
    +'[제목C] 클릭 유도형 제목 2줄. 궁금증/질문 형식. 예: "🤔 가상화폐 앱 사용시간이 60% 줄었다?<br>투자자들은 어디로 갔을까"\n'
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

function aiRewrite(paras,title,volumeText){
  var key=getKey();if(!key)return Promise.reject(new Error('NO_KEY'));
  localStorage.setItem('gemini-api-key',key);
  var orig=paras.map(function(p){return(p.isH?'## ':'')+p.text;}).join('\n\n');
  if(orig.length>15000)orig=orig.substring(0,15000)+'\n\n[... 원문 일부 생략 ...]';
  var sysPrompt=buildPrompt(volumeText);
  var volInstruction=volumeText?'\n\n★★★ 분량 지시: '+volumeText+'. 이 분량을 반드시 지켜주세요! 기본 규칙보다 이 분량이 우선입니다. ★★★':'';
  var userMsg='원문 제목: '+title+'\n\n원문:\n'+orig+'\n\n★ 앞쪽 본문에서 핵심 수치를 구체적으로 언급하고, 뒤쪽으로 갈수록 궁금증을 남겨서 원문 클릭을 유도하세요.'+volInstruction;
  /* 모델별로 body를 만들어서 시도 — system_instruction 지원 여부에 따라 분기 */
  var models=['gemini-2.5-flash'];
  function makeBody(useSystemInstruction){
    if(useSystemInstruction){
      return JSON.stringify({system_instruction:{parts:[{text:sysPrompt}]},contents:[{parts:[{text:userMsg}]}],generationConfig:{temperature:0.4,maxOutputTokens:32768}});
    } else {
      return JSON.stringify({contents:[{parts:[{text:sysPrompt+'\n\n---\n\n'+userMsg}]}],generationConfig:{temperature:0.4,maxOutputTokens:32768}});
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
    else if(t.indexOf('[도입]')===0){r.intro+=(r.intro?'\n':'')+t.replace('[도입]','').trim();lastTag='도입';}
    else if(t.indexOf('[본문]')===0){
      var btext=t.replace('[본문]','').trim();
      r.body.push(btext);
      lastTag='본문';
    }
    else if(t.indexOf('[유도]')===0){r.redirect=t.replace('[유도]','').trim();lastTag='유도';}
    else if(t.indexOf('[한줄]')===0){r.oneliner=t.replace('[한줄]','').trim();lastTag='한줄';}
    else if(t.indexOf('[통계]')===0){var sp=t.replace('[통계]','').trim().split('|');r.stat={num:(sp[0]||'').trim(),label:(sp[1]||'').trim()};lastTag='통계';}
    /* 태그 없는 줄 → 직전 태그에 이어붙이기 */
    else if(t.charAt(0)!=='['&&t.length>5){
      if(lastTag==='본문'&&r.body.length>0){
        r.body[r.body.length-1]+=(r.body[r.body.length-1]?' ':'')+t;
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
  var ds=today();
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
  for(var ii=0;ii<sections.length;ii++){
    if(sections[ii].ai.intro){introText+=(introText?'\n':'')+sections[ii].ai.intro;}
  }
  /* "안녕하세요" 인사 제거 (HTML에서 별도로 넣으므로) */
  introText=introText.replace(/안녕하세요[,.]?\s*(아이지에이웍스|IGAWorks)[^.!]*[.!]?\s*/gi,'').trim();
  if(introText){
    var introLines=introText.split('\n').filter(function(l){return l.trim();});
    for(var il=0;il<introLines.length;il++){
      S+='<div style="margin-bottom:12px;color:#222;font-size:16px;line-height:1.8">'+introLines[il].trim()+'</div>';
    }
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

  if(sections.length>1){
    S+='<div style="margin-top:14px;font-size:13px;color:#999">오늘 총 '+sections.length+'가지 이야기를 준비했어요.</div>';
  }
  S+='</div>';
  S+='</div>';

  /* === SECTIONS === */
  for(var si=0;si<sections.length;si++){
    var sec=sections[si],ai=sec.ai,data=sec.data;

    /* 섹션 래퍼 (드래그 순서 변경용) */
    S+='<div data-section="'+si+'" style="position:relative">';

    /* 구분선 + 태그 라인 */
    S+='<div style="border-top:1px solid #D5D2CA;margin:36px 0 0;padding-top:20px">';
    S+='<div style="display:inline-block;font-size:11px;font-weight:700;color:#3B48CC;background:#FBFBFF;padding:4px 12px;border-radius:4px;letter-spacing:0.5px;margin-bottom:16px;border:1px solid #E5E7EB">'+esc(sec.tag);
    S+='</div></div>';

    /* 이모지 + 제목 */
    S+='<div data-src-idx="sub'+si+'" style="font-size:18px;font-weight:800;color:#111;line-height:1.5;margin-bottom:20px;'+ff+'">'+ai.subtitle+'</div>';

    var secTrackLink=sec.trackingUrl||'';

    /* 썸네일 1개만 (첫 번째 이미지) */
    var validImgs=data.imgs.filter(function(s){return s&&s.indexOf('http')===0;});
    if(validImgs.length>0){
      var thumbTag='<img src="'+validImgs[0]+'" alt="" onerror="this.remove()" style="width:100%;max-width:100%;height:auto;border-radius:8px;margin:0 0 20px;display:block">';
      if(secTrackLink)thumbTag='<a href="'+esc(secTrackLink)+'" target="_blank" style="display:block">'+thumbTag+'</a>';
      S+=thumbTag;
    }

    /* 본문 */
    for(var bi=0;bi<ai.body.length;bi++){
      var bodyText=ai.body[bi];
      /* ◾■▪ 불릿 + 번호 제거 */
      bodyText=bodyText.replace(/^[◾■▪]\s*/,'');
      bodyText=bodyText.replace(/^\d+[.)\]번]\s*/,'');
      /* 전체가 <strong>으로 감싸진 경우 제거 */
      var rawText=bodyText.replace(/<[^>]+>/g,'');
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
    }

    /* 인사이트 요약 박스 */
    if(ai.insightBox){
      S+='<div data-el="box" contenteditable="inherit" style="background:#FBFBFF;border:1px solid #E5E7EB;border-left:4px solid #3B48CC;padding:20px 24px;border-radius:0 10px 10px 0;margin:20px 0;color:#222;'+ff+'">';
      S+='<div style="font-weight:700;color:#3B48CC;margin-bottom:10px">💡 더 깊이 들여다보기</div>';
      var insightLines=ai.insightBox.split('\n').filter(function(l){return l.trim();});
      for(var il=0;il<insightLines.length;il++){
        S+='<div style="margin-bottom:6px;font-size:16px;line-height:1.8">'+insightLines[il].trim()+'</div>';
      }
      /* 원본 링크 — 우측 정렬, 본문과 동일 크기 */
      var origLink=secTrackLink||sec.url;
      S+='<div style="margin-top:12px;text-align:right"><a href="'+esc(origLink)+'" target="_blank" style="font-size:18px;color:#3B48CC;text-decoration:none;font-weight:600">&#128206; 원문 보기 &rarr;</a></div>';
      S+='</div>';
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

/* ===== Compare & Edit ===== */
var hasOrigData=false;
qs('#compare-toggle').addEventListener('click',function(){
  if(!hasOrigData){toast('원본 대조는 새로 생성한 뉴스레터에서만 가능합니다');return;}
  /* 편집 모드 해제 */
  if(isEditable){isEditable=false;NL.contentEditable=false;NL.classList.remove('editable');qs('#edit-toggle').classList.remove('active');qs('#edit-toggle').textContent='✏ Edit';qs('#edit-panel').classList.remove('open');}
  isComparing=!isComparing;this.classList.toggle('active',isComparing);
  qs('#original-panel').classList.toggle('hidden',!isComparing);
  qs('#panel-divider').classList.toggle('hidden',!isComparing);
  if(!isComparing)clearHL();
});
qs('#edit-toggle').addEventListener('click',function(){
  isEditable=!isEditable;NL.contentEditable=isEditable;
  NL.classList.toggle('editable',isEditable);this.classList.toggle('active',isEditable);
  this.textContent=isEditable?'편집 완료':'✏ Edit';
  var ep=qs('#edit-panel');
  ep.classList.toggle('open',isEditable);
  if(isEditable){clearHL();syncToolbar();}
});
/* 도구 패널 X 닫기 */
qs('#ep-close').addEventListener('click',function(){
  isEditable=false;NL.contentEditable=false;
  NL.classList.remove('editable');qs('#edit-toggle').classList.remove('active');
  qs('#edit-toggle').textContent='✏ Edit';
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
qs('#copy-html-btn').addEventListener('click',function(){
  var html=stibeeHTML();
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(html).then(function(){toast('HTML 복사됨!');});
  else{var ta=document.createElement('textarea');ta.value=html;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('HTML 복사됨!');}
});

/* ===== Undo ===== */
var undoStack=[];
function saveUndo(){undoStack.push(NL.innerHTML);if(undoStack.length>30)undoStack.shift();}
/* 편집 시 자동 저장 (debounced) */
var undoTimer=null;
NL.addEventListener('input',function(){clearTimeout(undoTimer);undoTimer=setTimeout(saveUndo,800);});

/* ===== Email Preview ===== */
qs('#preview-btn').addEventListener('click',function(){
  var html=stibeeHTML();
  var frame=qs('#preview-frame');
  frame.innerHTML=html;
  qs('#preview-modal').classList.remove('hidden');
});
qs('#preview-close').addEventListener('click',function(){qs('#preview-modal').classList.add('hidden');});

/* ===== Template Save/Load ===== */
function getTpls(){try{return JSON.parse(localStorage.getItem('nl-templates')||'[]');}catch(e){return[];}}
function saveTpls(t){localStorage.setItem('nl-templates',JSON.stringify(t));}
/* 디자인 추출: NL에서 스타일 정보만 추출 */
function extractDesign(){
  return{
    nlStyle:{fontSize:NL.style.fontSize||'16px',lineHeight:NL.style.lineHeight||'1.8',letterSpacing:NL.style.letterSpacing||'-0.27px',color:NL.style.color||'#222',fontFamily:NL.style.fontFamily||''},
    html:NL.innerHTML
  };
}
/* 디자인 적용: 저장된 HTML에서 스타일만 현재 콘텐츠에 적용 */
function applyDesign(design){
  if(design.nlStyle){
    NL.style.fontSize=design.nlStyle.fontSize;
    NL.style.lineHeight=design.nlStyle.lineHeight;
    NL.style.letterSpacing=design.nlStyle.letterSpacing;
    NL.style.color=design.nlStyle.color;
    if(design.nlStyle.fontFamily)NL.style.fontFamily=design.nlStyle.fontFamily;
  }
  /* 현재 콘텐츠의 박스/구분선/헤더 스타일을 템플릿 것으로 교체 */
  var tplDoc=document.createElement('div');tplDoc.innerHTML=design.html;
  /* 인트로 박스 스타일 복사 */
  var tplIntro=tplDoc.querySelector('[data-src-idx="intro"]');
  var curIntro=NL.querySelector('[data-src-idx="intro"]');
  if(tplIntro&&curIntro)curIntro.style.cssText=tplIntro.style.cssText;
  /* 인사이트 박스 스타일 복사 */
  var tplBoxes=tplDoc.querySelectorAll('[data-el="box"]');
  var curBoxes=NL.querySelectorAll('[data-el="box"]');
  for(var i=0;i<Math.min(tplBoxes.length,curBoxes.length);i++){
    curBoxes[i].style.cssText=tplBoxes[i].style.cssText;
  }
  syncToolbar();
  toast('디자인 적용됨');
}
qs('#save-tpl-btn').addEventListener('click',function(){
  var name=prompt('디자인 템플릿 이름:');
  if(!name)return;
  var tpls=getTpls();
  tpls.unshift({name:name,date:today(),design:extractDesign()});
  if(tpls.length>10)tpls.length=10;
  saveTpls(tpls);toast('디자인 "'+name+'" 저장됨');
});
var loadTplBtn=qs('#load-tpl-btn');
if(loadTplBtn)loadTplBtn.addEventListener('click',function(){
  var tpls=getTpls();
  var list=qs('#tpl-list');
  if(!tpls.length){list.innerHTML='<p style="color:#888;text-align:center;padding:20px">저장된 디자인이 없습니다.</p>';}
  else{list.innerHTML=tpls.map(function(t,i){
    return'<div style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:6px;cursor:pointer" data-tpl="'+i+'">'
      +'<div style="flex:1"><div style="font-size:14px;font-weight:600">'+esc(t.name)+'</div><div style="font-size:11px;color:#888">'+t.date+'</div></div>'
      +'<button class="tpl-del" data-td="'+i+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px">✕</button>'
      +'</div>';
  }).join('');}
  qs('#tpl-modal').classList.remove('hidden');
});
qs('#tpl-close').addEventListener('click',function(){qs('#tpl-modal').classList.add('hidden');});
qs('#tpl-list').addEventListener('click',function(e){
  var del=e.target.closest('.tpl-del');
  if(del){e.stopPropagation();var tpls=getTpls();tpls.splice(+del.dataset.td,1);saveTpls(tpls);qs('#load-tpl-btn').click();toast('디자인 삭제됨');return;}
  var item=e.target.closest('[data-tpl]');
  if(item){var tpls=getTpls();var idx=+item.dataset.tpl;if(tpls[idx]&&tpls[idx].design){saveUndo();applyDesign(tpls[idx].design);qs('#tpl-modal').classList.add('hidden');}
    /* 구버전 호환 (html만 있는 경우) */
    else if(tpls[idx]&&tpls[idx].html){saveUndo();NL.innerHTML=tpls[idx].html;panels.classList.remove('hidden');toolbar.classList.remove('hidden');var hero=qs('#hero-section');if(hero)hero.classList.add('hidden');qs('#tpl-modal').classList.add('hidden');toast('템플릿 불러옴');}}
});

/* ===== Drafts (임시저장) ===== */
function getDrafts(){try{return JSON.parse(localStorage.getItem('nl-drafts')||'[]');}catch(e){return[];}}
function saveDrafts(d){localStorage.setItem('nl-drafts',JSON.stringify(d));}
function renderDrafts(){
  var dl=qs('#drafts-list');if(!dl)return;
  var drafts=getDrafts();
  if(!drafts.length){dl.innerHTML='<p class="history-empty">임시저장된 뉴스레터가 없습니다.</p>';return;}
  dl.innerHTML=drafts.map(function(d,i){
    return'<div class="history-item" data-di="'+i+'"><div style="display:flex;justify-content:space-between;align-items:start"><div class="hi-title">'+esc(d.name)+'</div><button class="draft-del" data-dd="'+i+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">✕</button></div><div class="hi-date">'+d.date+'</div><span class="hi-tag" style="background:#f59e0b">임시저장</span></div>';
  }).join('');
}
var currentDraftName=null;
qs('#save-draft-btn').addEventListener('click',function(){
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
qs('#drafts-list').addEventListener('click',function(e){
  var del=e.target.closest('.draft-del');
  if(del){e.stopPropagation();var drafts=getDrafts();var delName=drafts[+del.dataset.dd]&&drafts[+del.dataset.dd].name;drafts.splice(+del.dataset.dd,1);saveDrafts(drafts);renderDrafts();if(currentDraftName===delName)currentDraftName=null;toast('임시저장 삭제됨');return;}
  var item=e.target.closest('[data-di]');
  if(item){var drafts=getDrafts();var idx=+item.dataset.di;if(drafts[idx]){saveUndo();NL.innerHTML=drafts[idx].html;currentDraftName=drafts[idx].name;hasOrigData=false;showEditor();sidebar.classList.remove('open');toast('임시저장 불러옴: '+drafts[idx].name);}}
});

/* ===== Designs in Sidebar ===== */
function renderDesigns(){
  var dl=qs('#designs-list');if(!dl)return;
  var tpls=getTpls();
  if(!tpls.length){dl.innerHTML='<p class="history-empty">저장된 디자인이 없습니다.</p>';return;}
  dl.innerHTML=tpls.map(function(t,i){
    return'<div class="history-item" data-dsi="'+i+'"><div style="display:flex;justify-content:space-between;align-items:start"><div class="hi-title">'+esc(t.name)+'</div><button class="design-del" data-dsd="'+i+'" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0">✕</button></div><div class="hi-date">'+t.date+'</div><span class="hi-tag" style="background:#8B5CF6">디자인</span></div>';
  }).join('');
}
qs('#designs-list').addEventListener('click',function(e){
  var del=e.target.closest('.design-del');
  if(del){e.stopPropagation();var tpls=getTpls();tpls.splice(+del.dataset.dsd,1);saveTpls(tpls);renderDesigns();toast('디자인 삭제됨');return;}
  var item=e.target.closest('[data-dsi]');
  if(item){var tpls=getTpls();var idx=+item.dataset.dsi;if(tpls[idx]&&tpls[idx].design){saveUndo();applyDesign(tpls[idx].design);sidebar.classList.remove('open');}}
});

/* ===== Toolbar ===== */
/* 서식 버튼 mousedown에서 선택 유지 */
qsa('.ep-fmt[data-cmd]').forEach(function(btn){
  btn.addEventListener('mousedown',function(e){e.preventDefault();});
  btn.addEventListener('click',function(){if(!isEditable)return;if(colorSavedRange){var sel=window.getSelection();sel.removeAllRanges();sel.addRange(colorSavedRange.cloneRange());}document.execCommand(btn.dataset.cmd,false,null);});
});
qs('#font-family').addEventListener('change',function(e){if(isEditable)document.execCommand('fontName',false,e.target.value);});
qs('#font-size').addEventListener('change',function(e){
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

qs('#font-color').addEventListener('input',function(e){
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
qs('#font-color-hex').addEventListener('change',function(e){
  var v=e.target.value.trim();
  if(v&&v.charAt(0)!=='#')v='#'+v;
  if(/^#[0-9A-Fa-f]{6}$/.test(v)){qs('#font-color').value=v;qs('#font-color').dispatchEvent(new Event('input'));}
});
/* 배경색 */
qs('#bg-color').addEventListener('input',function(e){
  if(!isEditable)return;
  var bg=e.target.value;
  qs('#bg-color-hex').value=bg;
  var sel=window.getSelection();
  if(colorSavedRange){try{sel.removeAllRanges();sel.addRange(colorSavedRange.cloneRange());}catch(ex){}}
  if(!sel.rangeCount||sel.isCollapsed)return;
  document.execCommand('hiliteColor',false,bg);
  if(sel.rangeCount>0)colorSavedRange=sel.getRangeAt(0).cloneRange();
});
qs('#bg-color-hex').addEventListener('change',function(e){
  var v=e.target.value.trim();
  if(v&&v.charAt(0)!=='#')v='#'+v;
  if(/^#[0-9A-Fa-f]{6}$/.test(v)){qs('#bg-color').value=v;qs('#bg-color').dispatchEvent(new Event('input'));}
});
qs('#line-height-select').addEventListener('change',function(e){
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
qs('#letter-spacing-select').addEventListener('change',function(e){
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
    if(type==='hr')html='<hr style="border:none;border-top:1px solid #D5D2CA;margin:32px 0 28px">';
    else if(type==='spacer'){editingSpacer=null;qs('#spacer-height').value='32';qs('#spacer-height-val').textContent='32';qs('#spacer-modal').classList.remove('hidden');return;}
    else if(type==='box')html='<div data-el="box" style="background:#FBFBFF;border:1px solid #E5E7EB;padding:16px 20px;border-radius:10px;margin:16px 0">여기에 내용을 입력하세요.</div><p><br></p>';
    if(html)document.execCommand('insertHTML',false,html);
    NL.focus();
  });
});
/* Spacer */
var editingSpacer=null;
qs('#spacer-cancel').addEventListener('click',function(){qs('#spacer-modal').classList.add('hidden');editingSpacer=null;});
qs('#spacer-delete').addEventListener('click',function(){if(editingSpacer){editingSpacer.remove();editingSpacer=null;}qs('#spacer-modal').classList.add('hidden');toast('공백 삭제됨');});
qs('#spacer-confirm').addEventListener('click',function(){
  var h=parseInt(qs('#spacer-height').value)||32;
  if(editingSpacer){editingSpacer.style.height=h+'px';}
  else{restoreSelection();document.execCommand('insertHTML',false,'<div data-el="spacer" style="height:'+h+'px;line-height:0;font-size:0">&nbsp;</div>');}
  qs('#spacer-modal').classList.add('hidden');editingSpacer=null;NL.focus();
});
/* Spacer 슬라이더 실시간 반영 */
qs('#spacer-height').addEventListener('input',function(e){
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
qs('#insert-link-btn').addEventListener('click',function(){if(!isEditable)return;var sel=window.getSelection();saveSelection();qs('#link-text').value=sel.toString()||'';qs('#link-url').value='';qs('#link-modal').classList.remove('hidden');});
qs('#link-cancel').addEventListener('click',function(){qs('#link-modal').classList.add('hidden');});
qs('#link-confirm').addEventListener('click',function(){
  var text=qs('#link-text').value.trim()||'링크',url=qs('#link-url').value.trim();
  if(!url){toast('URL을 입력해주세요.');return;}
  restoreSelection();
  document.execCommand('insertHTML',false,'<a data-el="link" href="'+url+'" target="_blank" style="color:#3B48CC;font-weight:bold;text-decoration:none">'+esc(text)+' ↗</a>');
  qs('#link-modal').classList.add('hidden');NL.focus();
});

/* Image Modal */
var imgFileInput=qs('#img-file-input');
qs('#insert-img-btn').addEventListener('click',function(){
  if(!isEditable)return;
  ensureCursorInNL();
  var ph='<div data-el="img-placeholder" style="background:#F1F5F9;border:2px dashed #CBD5E1;border-radius:12px;padding:32px 16px;text-align:center;cursor:pointer;margin:12px 0"><div style="font-size:24px;color:#94A3B8;margin-bottom:6px">&#128444;</div><div style="font-size:12px;color:#94A3B8">클릭해서 이미지 추가</div></div>';
  document.execCommand('insertHTML',false,ph);
  NL.focus();
});
qs('#img-file-btn').addEventListener('click',function(){imgFileInput.click();});
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
qs('#img-url').addEventListener('input',function(e){var v=e.target.value.trim();if(v){qs('#img-preview').src=v;qs('#img-preview-wrap').classList.remove('hidden');}else qs('#img-preview-wrap').classList.add('hidden');});
qs('#img-cancel').addEventListener('click',function(){qs('#img-modal').classList.add('hidden');editingImg=null;window._imgPlaceholder=null;});
qs('#img-delete').addEventListener('click',function(){
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
qs('#img-confirm').addEventListener('click',function(){
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
qs('#insert-img-row-btn').addEventListener('click',function(){
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
qs('#insert-btn-btn').addEventListener('click',function(){if(!isEditable)return;saveSelection();editingBtn=null;qs('#btn-text').value='블로그 아티클 바로가기';qs('#btn-url').value='';qs('#btn-bg').value='#ffffff';qs('#btn-fg').value='#4F46E5';qs('#btn-border-color').value='#4F46E5';qs('#btn-size').value='md';qs('#btn-radius').value='8px';qs('#btn-width').value='auto';qs('#btn-modal').classList.remove('hidden');});
qs('#btn-cancel').addEventListener('click',function(){qs('#btn-modal').classList.add('hidden');editingBtn=null;});
qs('#btn-delete').addEventListener('click',function(){if(editingBtn){editingBtn.remove();editingBtn=null;}qs('#btn-modal').classList.add('hidden');toast('버튼 삭제됨');});
qs('#btn-confirm').addEventListener('click',function(){
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
qs('#box-cancel').addEventListener('click',function(){qs('#box-modal').classList.add('hidden');editingBox=null;});
qs('#box-delete').addEventListener('click',function(){
  if(editingBox){
    var parentA=editingBox.parentNode&&editingBox.parentNode.tagName==='A'&&editingBox.parentNode.getAttribute('data-box-link')?editingBox.parentNode:null;
    if(parentA)parentA.remove();else editingBox.remove();
    editingBox=null;
  }
  qs('#box-modal').classList.add('hidden');toast('박스 삭제됨');
});
qs('#box-confirm').addEventListener('click',function(){
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
qs('#hr-cancel').addEventListener('click',function(){qs('#hr-modal').classList.add('hidden');clickedHr=null;});
qs('#hr-delete').addEventListener('click',function(){
  if(clickedHr){clickedHr.remove();clickedHr=null;}
  qs('#hr-modal').classList.add('hidden');toast('구분선 삭제됨');
});
qs('#hr-confirm').addEventListener('click',function(){
  if(clickedHr){
    var color=qs('#hr-color').value;
    var width=qs('#hr-width').value+'px';
    var style=qs('#hr-style').value;
    clickedHr.style.border='none';
    clickedHr.style.borderTop=width+' '+style+' '+color;
  }
  qs('#hr-modal').classList.add('hidden');clickedHr=null;
});
qs('#hr-width').addEventListener('input',function(e){
  qs('#hr-width-val').textContent=e.target.value;
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=e.target.value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});
qs('#hr-style').addEventListener('change',function(){
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=qs('#hr-width').value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});
qs('#hr-color').addEventListener('input',function(){
  if(clickedHr){clickedHr.style.border='none';clickedHr.style.borderTop=qs('#hr-width').value+'px '+qs('#hr-style').value+' '+qs('#hr-color').value;}
});

/* ===== Click-to-Edit in Newsletter ===== */
var clickedHr=null;
NL.addEventListener('click',function(e){
  if(!isEditable)return;
  syncToolbar();
  /* 이미지 플레이스홀더 클릭 → 이미지 모달 */
  var ph=e.target.closest('[data-el="img-placeholder"]');
  if(ph){e.preventDefault();editingImg=null;qs('#img-url').value='';qs('#img-alt').value='';qs('#img-width').value='100%';qs('#img-link').value='';qs('#img-border-style').value='';qs('#img-border-width').value='1';qs('#img-border-color').value='#E2E8F0';qs('#img-preview-wrap').classList.add('hidden');
    /* 이미지 확정 시 플레이스홀더 교체 */
    window._imgPlaceholder=ph;window._nlScrollTop=NL.scrollTop;
    qs('#img-modal').classList.remove('hidden');return;}
  /* Image */
  var img=e.target.closest('img');
  if(img){e.preventDefault();var parentA=img.parentNode&&img.parentNode.tagName==='A'?img.parentNode:null;editingImg=parentA||img;qs('#img-url').value=img.src||'';qs('#img-alt').value=img.alt||'';qs('#img-width').value=img.style.width||'100%';qs('#img-link').value=parentA?parentA.href:'';
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
  sec.style.display='';
  content.innerHTML='<div style="font-size:12px;font-weight:600;margin-bottom:8px">📦 박스 설정</div>'
    +'<label style="font-size:11px;color:#888;display:block;margin:6px 0 2px">배경색</label><input type="color" id="ep-box-bg" value="'+rgbToHex(box.style.backgroundColor||'#FBFBFF')+'" style="width:100%;height:32px;border:1px solid #E5E7EB;border-radius:6px;cursor:pointer">'
    +'<label style="font-size:11px;color:#888;display:block;margin:6px 0 2px">왼쪽 테두리</label><input type="color" id="ep-box-left" value="'+rgbToHex(box.style.borderLeftColor||'#3B48CC')+'" style="width:100%;height:32px;border:1px solid #E5E7EB;border-radius:6px;cursor:pointer">'
    +'<label style="font-size:11px;color:#888;display:block;margin:6px 0 2px">전체 테두리</label><input type="color" id="ep-box-outline" value="'+rgbToHex(box.style.borderRightColor||'#E5E7EB')+'" style="width:100%;height:32px;border:1px solid #E5E7EB;border-radius:6px;cursor:pointer">'
    +'<label style="font-size:11px;color:#888;display:block;margin:6px 0 2px">텍스트 색상</label><input type="color" id="ep-box-color" value="'+rgbToHex(box.style.color||'#222222')+'" style="width:100%;height:32px;border:1px solid #E5E7EB;border-radius:6px;cursor:pointer">'
    +'<label style="font-size:11px;color:#888;display:block;margin:6px 0 2px">링크 URL</label><input type="url" id="ep-box-link" value="'+(box.parentNode&&box.parentNode.tagName==='A'?box.parentNode.href:'')+'" placeholder="https://..." style="width:100%;padding:6px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px;outline:none">'
    +'<div style="display:flex;gap:6px;margin-top:10px"><button id="ep-box-apply" style="flex:1;padding:6px;background:#3B48CC;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">적용</button><button id="ep-box-delete" style="padding:6px 12px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">삭제</button></div>';
  /* 실시간 이벤트 */
  qs('#ep-box-apply').addEventListener('click',function(){
    if(!editingBox)return;
    editingBox.style.backgroundColor=qs('#ep-box-bg').value;
    editingBox.style.borderLeftColor=qs('#ep-box-left').value;
    var oc=qs('#ep-box-outline').value;
    editingBox.style.borderTopColor=oc;editingBox.style.borderRightColor=oc;editingBox.style.borderBottomColor=oc;
    editingBox.style.color=qs('#ep-box-color').value;
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
        return'<div class="recent-item" data-di="'+i+'" style="border-left:3px solid #F59E0B;flex-wrap:wrap">'
          +'<span class="ri-tag" style="background:#F59E0B">임시저장</span>'
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
function saveHist(title,tag,html){nlHistory.unshift({title:title,tag:tag,date:today(),html:html});if(nlHistory.length>10)nlHistory.length=10;localStorage.setItem('nl-history',JSON.stringify(nlHistory));renderHist();}
function loadHist(idx){if(!nlHistory[idx])return;NL.innerHTML=nlHistory[idx].html;hasOrigData=false;origOut.innerHTML='';showEditor();
  /* 원본 대조 비활성화 */
  if(isComparing){isComparing=false;qs('#compare-toggle').classList.remove('active');qs('#original-panel').classList.add('hidden');qs('#panel-divider').classList.add('hidden');}
  toast('히스토리에서 불러옴');}
qs('#history-list').addEventListener('click',function(e){
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
  var di=e.target.closest('.recent-item[data-di]');if(di){var drafts=getDrafts();var idx=+di.dataset.di;if(drafts[idx]){saveUndo();NL.innerHTML=drafts[idx].html;currentDraftName=drafts[idx].name;hasOrigData=false;showEditor();toast('임시저장 불러옴: '+drafts[idx].name);}}
});})();

/* ===== Generate ===== */
/* 재생성 버튼 */
qs('#regenerate-btn').addEventListener('click',function(){
  if(!lastGenUrls.length){
    /* URL이 없으면 홈으로 돌아가서 다시 생성하도록 */
    goHome();
    toast('URL을 입력하고 다시 생성해주세요');
    return;
  }
  /* URL 입력란 복원 */
  urlList.innerHTML='';
  lastGenUrls.forEach(function(u){
    var row=makeUrlRow();
    row.querySelector('.url-field').value=u.url;
    row.querySelector('.url-tag-select').value=u.tag;
    if(u.volumeText)row.querySelector('.url-volume-input').value=u.volumeText;
    urlList.appendChild(row);
  });
  /* 홈으로 갔다가 바로 생성 */
  var hero=qs('#hero-section');if(hero)hero.classList.remove('hidden');
  panels.classList.add('hidden');toolbar.classList.add('hidden');
  genBtn.click();
});

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
        return aiRewrite(data.paras,data.title,item.volumeText).catch(function(err){
          if(err.message==='NO_KEY'){showErr('API 키를 설정해주세요.');return null;}
          console.error('AI err:',err);toast('AI 실패: '+err.message.substring(0,60));return fallback(data.paras,data.title);
        }).then(function(ai){if(ai)sections.push({url:item.url,tag:tag,data:data,ai:ai,trackingUrl:item.trackingUrl||''});});
      }).catch(function(err){showErr(err.message==='PROXY_FAIL'?'프록시 실패: '+item.url:'오류: '+err.message);});
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
    saveHist(cleanBr(sections[0].ai.title||'뉴스레터'),result.tag,result.html);
    /* URL 칩을 우측 패널에 표시 */
    populateUrlChips(sections);
    populateTitleCandidates(sections);
    lastGenUrls=getUrls(); /* 재생성용 저장 */
    toast('뉴스레터 생성 완료!');
  }).catch(function(err){showErr('오류: '+err.message);console.error(err);}).then(function(){loading.classList.add('hidden');genBtn.disabled=false;});
});

/* ===== Title Candidates ===== */
function populateTitleCandidates(sections){
  var topWrap=qs('#title-candidates');
  var epSec=qs('#ep-titles-section');if(epSec)epSec.style.display='none';
  if(!topWrap)return;
  var ai=sections[0]&&sections[0].ai;
  if(!ai||!ai.title){topWrap.classList.add('hidden');return;}
  var titles=[
    {label:'&#127919; 기본',text:ai.title},
    {label:'&#128202; 데이터',text:ai.titleB||''},
    {label:'&#128293; 클릭유도',text:ai.titleC||''}
  ].filter(function(t){return t.text;});
  topWrap.classList.remove('hidden');
  topWrap.innerHTML='<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0">'
    +titles.map(function(t,i){
      return'<div data-title-idx="'+i+'" style="flex:0 0 auto;min-width:180px;padding:10px 14px;background:var(--white);border:1px solid var(--border);border-radius:12px;cursor:pointer;font-size:11px;line-height:1.4;transition:all .15s">'
        +'<div style="font-size:9px;font-weight:700;color:#4F46E5;margin-bottom:3px">'+t.label+'</div>'
        +'<div style="color:#334155;word-break:keep-all">'+cleanBr(t.text)+'</div>'
        +'</div>';
    }).join('')+'</div>';
  topWrap.onclick=function(e){
    var card=e.target.closest('[data-title-idx]');
    if(!card)return;
    var idx=+card.dataset.titleIdx;
    var newTitle=titles[idx].text;
    var headerDiv=NL.querySelector('div[style*="font-size:22px"]');
    if(headerDiv){headerDiv.innerHTML=newTitle;toast('제목 변경됨');}
  };
}

/* ===== URL Chips (drag to insert) ===== */
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
      if(dragInsert==='hr')html='<hr style="border:none;border-top:1px solid #D5D2CA;margin:32px 0 28px">';
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

/* ===== 부분 재생성 + 수정 지시 ===== */
(function(){
  var floatWrap=document.createElement('div');
  floatWrap.style.cssText='position:absolute;display:none;z-index:100;display:none';
  floatWrap.innerHTML='<div style="display:flex;gap:4px;margin-bottom:4px">'
    +'<button id="rewrite-btn" class="rewrite-float">&#8634; 재생성</button>'
    +'<button id="rewrite-edit-btn" class="rewrite-float" style="background:#1E293B">&#9998; 수정 지시</button>'
    +'</div>'
    +'<div id="rewrite-input-wrap" style="display:none;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,.1)">'
    +'<input id="rewrite-instruction" type="text" placeholder="예: 더 짧게, 수치 강조, 톤 부드럽게..." style="width:240px;padding:8px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;outline:none">'
    +'<button id="rewrite-go" style="margin-left:4px;background:#1E293B;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:11px;cursor:pointer;font-weight:600">적용</button>'
    +'</div>';
  document.body.appendChild(floatWrap);
  var rewriteRange=null;

  var isFloatInteracting=false;
  floatWrap.addEventListener('mousedown',function(){isFloatInteracting=true;});
  floatWrap.addEventListener('mouseup',function(){setTimeout(function(){isFloatInteracting=false;},100);});

  document.addEventListener('selectionchange',function(){
    if(!isEditable){floatWrap.style.display='none';return;}
    if(isFloatInteracting)return; /* 플로팅 UI 조작 중이면 무시 */
    var sel=window.getSelection();
    if(!sel.rangeCount||sel.isCollapsed||!NL.contains(sel.anchorNode)){
      /* 입력창 열려있으면 닫지 않음 */
      if(qs('#rewrite-input-wrap').style.display==='flex')return;
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
    qs('#rewrite-input-wrap').style.display='none';
  });

  /* 이벤트는 rebindFloatEvents에서 바인딩 */

  function doRewrite(instruction){
    if(!rewriteRange){toast('텍스트를 먼저 선택해주세요');return;}
    var key=getKey();
    if(!key){toast('API 키를 설정해주세요');return;}
    var originalText=rewriteRange.toString().trim();
    if(originalText.length<10){toast('텍스트를 더 선택해주세요');return;}

    /* 선택 영역 하이라이트 표시 */
    var marker=document.createElement('span');
    marker.style.cssText='background:#DBEAFE;border-radius:4px;';
    marker.setAttribute('data-rewriting','1');
    try{rewriteRange.surroundContents(marker);}catch(ex){
      var frag=rewriteRange.extractContents();marker.appendChild(frag);rewriteRange.insertNode(marker);
    }

    /* 로딩 표시 */
    floatWrap.innerHTML='<div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,.1);display:flex;align-items:center;gap:8px"><div class="spinner" style="width:14px;height:14px;border-width:2px"></div><span style="font-size:12px;color:#64748B">'+(instruction?'수정 지시 반영 중...':'재생성 중...')+'</span></div>';

    var sysText='너는 뉴스레터 리라이터야. 주어진 텍스트를 같은 톤과 스타일로 리라이팅해. ~습니다체, 핵심 수치 유지, 원문에 없는 내용 창작 금지. 소제목이 있으면 이모지+소제목 형식 유지. 리라이팅 결과만 출력해. 태그나 설명 없이 본문만.';
    /* 전체 뉴스레터 컨텍스트도 전달 */
    var fullContext=NL.textContent.substring(0,2000);
    var userText=instruction
      ?'전체 뉴스레터 컨텍스트:\n'+fullContext+'\n\n---\n\n아래 선택된 부분을 다음 지시에 따라 수정해줘. 전체 뉴스레터의 다른 내용도 참고해서 작성해.\n\n수정 지시: '+instruction+'\n\n선택된 부분:\n'+originalText
      :'전체 뉴스레터 컨텍스트:\n'+fullContext+'\n\n---\n\n아래 선택된 부분만 리라이팅해줘. 전체 흐름에 맞게 작성해.\n\n선택된 부분:\n'+originalText;
    var models=['gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-flash'];

    function resetFloat(){
      floatWrap.style.display='none';
      floatWrap.innerHTML='<div style="display:flex;gap:4px;margin-bottom:4px">'
        +'<button id="rewrite-btn" class="rewrite-float">&#8634; 재생성</button>'
        +'<button id="rewrite-edit-btn" class="rewrite-float" style="background:#1E293B">&#9998; 수정 지시</button>'
        +'</div>'
        +'<div id="rewrite-input-wrap" style="display:none;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,.1)">'
        +'<input id="rewrite-instruction" type="text" placeholder="예: 더 짧게, 수치 강조..." style="width:240px;padding:8px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;outline:none">'
        +'<button id="rewrite-go" style="margin-left:4px;background:#1E293B;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:11px;cursor:pointer;font-weight:600">적용</button>'
        +'</div>';
      rebindFloatEvents();
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
        /* 소제목 서식 적용: 이모지로 시작하는 첫 줄은 18px 볼드 */
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
        toast(instruction?'수정 지시 반영 완료':'부분 재생성 완료');
        resetFloat();
      })
      .catch(function(err){console.error(err);tryModel(i+1,false);});
    }
    tryModel(0,false);
  }

  function rebindFloatEvents(){
    floatWrap.querySelector('#rewrite-btn').addEventListener('click',function(){doRewrite(null);});
    floatWrap.querySelector('#rewrite-edit-btn').addEventListener('click',function(e){
      e.stopPropagation();
      var wrap=qs('#rewrite-input-wrap');
      wrap.style.display=wrap.style.display==='none'?'flex':'none';
      if(wrap.style.display==='flex')setTimeout(function(){qs('#rewrite-instruction').focus();},50);
    });
    var goBtn=floatWrap.querySelector('#rewrite-go');
    if(goBtn)goBtn.addEventListener('click',function(){
      var inst=qs('#rewrite-instruction').value.trim();
      if(!inst){toast('수정 지시를 입력해주세요');return;}
      doRewrite(inst);
    });
    var instInput=qs('#rewrite-instruction');
    if(instInput)instInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();floatWrap.querySelector('#rewrite-go').click();}});
    /* mousedown에서 선택 유지 */
    floatWrap.querySelectorAll('button').forEach(function(b){b.addEventListener('mousedown',function(e){e.preventDefault();});});
  }
  rebindFloatEvents();

  /* NL 밖 클릭 시 숨기기 */
  document.addEventListener('mousedown',function(e){
    if(!floatWrap.contains(e.target)&&qs('#rewrite-input-wrap').style.display!=='flex'){floatWrap.style.display='none';}
  });
})();

/* Init */
renderHist();
renderDrafts();
renderDesigns();
})();
