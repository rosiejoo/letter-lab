/* ===== SNS 텍스트 생성 모듈 =====
 * SNS 플랫폼별 공유 텍스트 자동 생성
 * - snsGenerate: Gemini AI로 페이스북/링크드인/인스타그램 텍스트 생성
 * - renderSnsCandidates: 생성 결과 UI 렌더링
 * - regenSingleCandidate: 개별 후보 재생성
 *
 * 의존: qs, qsa, on, toast, getKey, fetchUrl, extract, esc (app.js에서 전역 노출)
 */

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

  /* URL당 프롬프트 구성 — 프록시 파싱 텍스트 포함해 캐시 방지 */
  var urlLines=urls.map(function(u,i){
    var base=(i+1)+'. URL: '+u.url+'\n   솔루션: '+u.tag+'\n   인스타그램 프로필 링크: '+getInstaLink(u.tag);
    if(u.paras&&u.paras.length>0){
      var orig=u.paras.map(function(p){return(p.isH?'## ':'')+p.text;}).join('\n\n');
      if(orig.length>8000)orig=orig.substring(0,8000)+'\n\n[... 원문 일부 생략 ...]';
      base+='\n   ★ 아래는 지금 직접 크롤링한 최신 본문입니다. URL 캐시가 아닌 이 텍스트를 기준으로 작성하세요:\n'+orig;
    }
    return base;
  }).join('\n\n---\n\n');

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
    '1. 후킹 질문 또는 반전 데이터로 시작 (1~2줄). 예: "KBO 직관러가 일반인보다 건강/의료 앱을 2.5배 더 많이 쓴다는 사실, 알고 계셨나요?"',
    '2. 맥락 설명 2~3문장 (왜 이게 중요한지, 시장 상황)',
    '3. 소제목 + 불릿(-) 3~5개. 소제목은 대괄호 [] 사용. 예: [쿠팡의 견고한 1강], [멀티호밍의 함정], [진짜 승부처는 정밀 타격]',
    '   - 각 불릿은 구체적 수치 + 브랜드명 직접 언급. 예: "- 두산 팬은 헬스/요가, 롯데 팬은 명품 잡화에 지갑을 엽니다."',
    '   - 불릿 안에 이모지 넣지 마.',
    '4. CTA 1문장으로 마무리. 예: "데이터를 기반으로 우리 브랜드의 마케팅 성공 공식을 찾아보세요."',
    '- 이모지 사용 최소화. 필요할 때 1개 정도만. 남발 금지.',
    '- ★ 750자 이내 필수! 절대 초과 금지. 간결하게 작성.',
    '- ★ 3개 후보 중 하나는 "리포트 핵심 요약" + "데이터 방법론" 구조로 작성 (신뢰도 강조형).',
    '',
    '### 링크드인',
    '다음 구조로 작성:',
    '1. 비즈니스적으로 날카로운 첫 문장 (질문형 또는 충격 데이터 제시)',
    '2. 시장 상황이나 문제의식 2~3문장',
    '3. 핵심 인사이트 3~4개 불릿(-) 정리. 대괄호 [] 소제목 사용 가능.',
    '4. 마지막은 간결하게 마무리. "아티클 전문을 통해 확인해 보세요" 정도로 끝내. "청사진", "새로운 지평", "패러다임" 같은 거창한 단어 절대 금지. 장황한 마무리 금지. 딱 한 문장으로.',
    '- 350~500자 내외, B2B 전문가 톤, 이모지 최소화 (0~1개)',
    '',
    '### 인스타그램',
    '다음 구조로 작성:',
    '1. 첫 줄: [콘텐츠 제목] — 대괄호 꺽쇠 안에 원문 제목을 간결하게. 예: [BTS 광화문 공연, 135만 팬덤 데이터 분석]',
    '2. 본문: 5~6줄로 핵심 내용 작성. 짧고 임팩트 있는 문장 위주. 단락 사이에 빈 줄(\\n\\n)을 넣어서 가독성 높게.',
    '3. 마지막 문장은 반드시: "지금 바로 프로필 상단 링크 (📊아이지에이웍스 블로그)를 통해 확인해 보세요!" 로 끝낼 것. 이 문구 그대로 사용. ★ 이 CTA 문장 앞에 반드시 빈 줄(\\n\\n)을 넣어서 앞 단락과 띄워줄 것!',
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

  /* 프록시 파싱 성공한 URL이 하나라도 있으면 urlContext 불필요 — 캐시 방지 */
  var hasAnyProxy=urls.some(function(u){return u.paras&&u.paras.length>0;});
  var userMsg=(hasAnyProxy
    ?'아래 제공된 최신 원문을 기반으로 SNS 공유 텍스트를 생성해주세요:'
    :'다음 URL들의 콘텐츠를 분석하여 SNS 공유 텍스트를 생성해주세요:'
  )+'\n\n'+urlLines;

  var body=JSON.stringify({
    system_instruction:{parts:[{text:sysPrompt}]},
    contents:[{parts:[{text:userMsg}]}],
    generationConfig:{temperature:0.8,maxOutputTokens:32768},
    tools:hasAnyProxy?[]:[{"urlContext":{}}]
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
      urls.push({url:urlVal,tag:detectedTag,paras:[],title:''});
    }
  });
  if(urls.length===0){toast('URL을 입력하세요');return;}

  qs('#sns-loading').classList.remove('hidden');
  qs('#sns-error-msg').classList.add('hidden');
  qs('#sns-generate-btn').disabled=true;

  /* 각 URL 프록시 파싱 후 snsGenerate 호출 */
  var parseChain=Promise.resolve();
  urls.forEach(function(item){
    parseChain=parseChain.then(function(){
      return fetchUrl(item.url).then(function(html){
        var data=extract(html,item.url);
        item.paras=data.paras||[];
        item.title=data.title||'';
      }).catch(function(){/* 파싱 실패 시 빈 paras로 진행 */});
    });
  });

  parseChain.then(function(){return snsGenerate(urls);}).then(function(result){
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
        var style=qs('#card-modal-style').value;
        if(!style){toast('스타일을 선택하세요');return;}
        var btn=qs('#card-modal-regen');btn.disabled=true;btn.textContent='⏳';
        regenSingleCandidate(snsActivePlatform,ci,style).then(function(result){
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
        var style=qs('#saved-modal-style').value;
        var key=getKey();if(!key){toast('API 키를 설정해주세요');return;}
        var btn=qs('#saved-modal-regen');btn.disabled=true;btn.textContent='⏳';
        var styleMap={data:'수치/데이터를 좀 더 전면에',story:'스토리텔링 흐름으로 살짝 재배치',question:'도입부를 질문형으로',problem:'도입부에서 문제의식 강조',reversal:'도입부에 반전 포인트 배치'};
        var sysP='아래 SNS 텍스트를 다시 작성해줘. 기존 구조와 톤을 최대한 유지하면서 아래 방향만 살짝 반영해.\n\n';
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
        var style=qs('#sidebar-saved-style').value;
        var key=getKey();if(!key){toast('API 키를 설정해주세요');return;}
        var btn=qs('#sidebar-saved-regen');btn.disabled=true;btn.textContent='⏳';
        var styleMap={data:'수치/데이터를 좀 더 전면에',story:'스토리텔링 흐름으로 살짝 재배치',question:'도입부를 질문형으로',problem:'도입부에서 문제의식 강조',reversal:'도입부에 반전 포인트 배치'};
        var sysP='아래 SNS 텍스트를 다시 작성해줘. 기존 구조와 톤을 최대한 유지하면서 아래 방향만 살짝 반영해.\n\n';
        if(style)sysP+='스타일: '+styleMap[style]+'\n';
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

function regenSingleCandidate(platform,idx,style){
  var key=getKey();
  if(!key){toast('API 키를 설정해주세요');return Promise.reject();}
  var existing=snsCandidates[platform]||[];
  var current=existing[idx];
  var currentText=(typeof current==='object'&&current.text)?current.text:current;
  var styleGuide='';
  var styleMap={data:'수치/데이터를 좀 더 전면에 배치',story:'스토리텔링 흐름으로 살짝 재배치',question:'도입부를 질문형으로',problem:'도입부에서 문제의식 강조',reversal:'도입부에 반전 포인트 배치'};
  if(style&&styleMap[style])styleGuide=styleMap[style];
  else styleGuide='다른 각도로 새롭게 작성. 기존 톤은 유지.';

  var charLimit={facebook:750,linkedin:500,instagram:350};
  var limitGuide=charLimit[platform]?'★ '+charLimit[platform]+'자 이내 필수!\n':'';

  var sysPrompt='당신은 SNS 마케팅 전문가입니다. 아래 텍스트를 같은 플랫폼('+platform+')용으로 다시 작성해주세요.\n\n'
    +'★ 기존 톤을 그대로 유지하면서, 스타일만 변경: '+styleGuide+'\n'
    +limitGuide
    +'★ 마크다운(**, * 등) 절대 사용 금지\n'
    +'★ label(특징 2~4자)과 text를 JSON으로 출력\n'
    +'★ 기존 내용의 핵심 메시지는 유지하되 표현과 구조를 바꿔\n'
    +'★ 단락과 단락 사이에 반드시 빈 줄(\\n\\n)을 넣어서 가독성 높게 작성\n'
    +(platform==='instagram'?'★ 마지막 문장은 반드시: "지금 바로 프로필 상단 링크 (📊아이지에이웍스 블로그)를 통해 확인해 보세요!" 로 끝낼 것. 이 CTA 문장 앞에 반드시 빈 줄(\\n\\n)을 넣어서 앞 단락과 띄울 것!\n★ 이모지 반드시 2개 사용\n':'')
    +(platform==='facebook'?'★ 이모지는 필요할 때만 1~2개 사용. 남발 금지.\n':'')
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
