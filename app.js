(() => {
  'use strict';
  const slides = window.COURSE.slides;
  const $ = id => document.getElementById(id);
  const plain = html => html.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'');
  const revealed = new Map();
  const chapterStarts = slides.flatMap((s,i) => i === 0 || s.chapter !== slides[i-1].chapter ? [{title:s.chapter,index:i,time:s.time}] : []);
  let current = 0;
  const initialIndex = () => Math.max(0,Math.min(slides.length-1,Math.trunc(Number(location.hash.slice(1)) || 1)-1));
  function updateNotes() {
    const s = slides[current];
    $('notes-content').replaceChildren();
    const timing = document.createElement('p');
    timing.className = 'note-source';
    timing.textContent = `建議時段：${s.time}。第 ${current+1} 頁${s.question ? `，提問 ${s.question}` : ''}。`;
    const main = document.createElement('p');
    main.textContent = s.notes || '留時間讓聽眾回應，再揭示參考。依現場節奏換頁。';
    $('notes-content').append(timing,main);
    if(s.source) {
      const source = document.createElement('p');
      source.className = 'note-source';
      source.textContent = `來源與改寫：${s.source}`;
      $('notes-content').append(source);
    }
  }
  function updateReveal() {
    const s = slides[current];
    const count = revealed.get(current) || 0;
    const total = s.reveal?.length || 0;
    $('slide').classList.toggle('has-answer',count>0);
    if(s.revealedBodies) $('slide-body').innerHTML = count>0 ? s.revealedBodies[count-1] : s.body;
    $('slide').querySelectorAll('.answer').forEach((answer,i)=>answer.hidden=i>=count);
    $('reveal').hidden = count>=total;
    $('reveal').textContent = s.revealLabels?.[count] || s.revealLabel || '揭示參考';
    $('hide-answer').hidden = count===0;
  }
  function render(focus=false) {
    const s = slides[current];
    $('slide').className = s.className || '';
    $('slide').dataset.slide = String(current+1);
    $('slide').innerHTML = `<p class="eyebrow"><span>${s.kicker || s.chapter}</span><span class="duration">${s.time}</span></p>${s.cover?'':`<h1 id="slide-title">${s.title}</h1>`}<div id="slide-body">${s.body}</div>${s.source?'<span class="source-cue">來源與情境說明，見帶領筆記</span>':''}`;
    if(!s.revealedBodies) {
      const container = $('video-answer-slot') || $('slide-body');
      (s.reveal||[]).forEach(html=> {
        const answer = document.createElement('section');
        answer.className='answer';
        answer.setAttribute('aria-label','參考方向');
        answer.hidden=true;
        answer.innerHTML=`<p class="reference-label">參考方向 · 可以有不同理解與說法</p>${html}`;
        container.append(answer);
      });
    }
    $('chapter-name').textContent=s.chapter;
    $('counter').textContent=`${String(current+1).padStart(2,'0')} / ${slides.length}`;
    $('previous').disabled=current===0;
    $('next').disabled=current===slides.length-1;
    $('progress-fill').style.width=`${(current+1)/slides.length*100}%`;
    document.title=s.cover ? `${window.COURSE.title}｜親職討論演練` : `${plain(s.title)}｜${window.COURSE.title}`;
    document.querySelectorAll('#chapter-list button').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.index)<=current && slides[Number(button.dataset.index)].chapter===s.chapter)));
    updateNotes(); updateReveal();
    if(focus) $('slide').focus({preventScroll:true});
  }
  function go(index) {
    if(index<0 || index>=slides.length || index===current) return;
    current=index;
    history.replaceState(null,'',`#${current+1}`);
    render(true);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function reveal() {
    const count=revealed.get(current)||0;
    if(count>=(slides[current].reveal?.length||0)) return;
    revealed.set(current,count+1);
    updateReveal();
    // No remount: revealing on the video page keeps the current playback position.
    if($('reveal').hidden) $('hide-answer').focus({preventScroll:true});
  }
  $('previous').addEventListener('click',()=>go(current-1));
  $('next').addEventListener('click',()=>go(current+1));
  $('reveal').addEventListener('click',reveal);
  $('hide-answer').addEventListener('click',()=>{revealed.delete(current);updateReveal();$('reveal').focus({preventScroll:true});});
  $('chapters-button').addEventListener('click',()=>$('chapters-dialog').showModal());
  $('notes-button').addEventListener('click',()=>$('notes-dialog').showModal());
  document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
    if(event.target===dialog) {
      const r=dialog.getBoundingClientRect();
      if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close();
    }
  }));
  chapterStarts.forEach(({title,index,time})=>{
    const button=document.createElement('button');
    button.dataset.index=String(index);
    const small=document.createElement('span');
    small.textContent=`${time} · 第 ${index+1} 頁`;
    button.append(small,document.createTextNode(title));
    button.addEventListener('click',()=>{$('chapters-dialog').close();go(index);});
    $('chapter-list').append(button);
  });
  $('fullscreen-button').addEventListener('click',async()=>{
    try {
      if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { $('fullscreen-button').textContent='請按 F11'; }
  });
  document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').textContent=document.fullscreenElement?'離開全螢幕':'全螢幕';});
  document.addEventListener('keydown',event=>{
    if(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(event.target.tagName)) return;
    if(['ArrowRight','PageDown'].includes(event.key)) {event.preventDefault();go(current+1);}
    else if(['ArrowLeft','PageUp'].includes(event.key)) {event.preventDefault();go(current-1);}
    else if(event.key==='Home') {event.preventDefault();go(0);}
    else if(event.key==='End') {event.preventDefault();go(slides.length-1);}
    else if(event.code==='Space' && !['BUTTON','A'].includes(event.target.tagName)) {event.preventDefault();reveal();}
  });
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#slide') {$('slide').focus();return;}
    current=initialIndex();render(true);window.scrollTo({top:0,behavior:'instant'});
  });
  current=initialIndex(); render();
})();
