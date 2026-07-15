/* llmwiki client behavior: local search + mobile navigation toggle. */

async function initSearch(){
  const input=document.getElementById('site-search');
  const box=document.getElementById('search-results');
  if(!input||!box) return;
  const lang=document.documentElement.lang==='en' ? 'en' : 'zh';
  const href=document.querySelector('link[rel="stylesheet"]').getAttribute('href');
  const prefix=href.replace(/assets\/wiki\.css(?:\?v=[^#]+)?$/,'');
  const version=document.body.dataset.assetVersion || '';
  const res=await fetch(prefix+'assets/search-index.json'+(version ? '?v='+encodeURIComponent(version) : ''), {cache:'no-cache'});
  const pages=await res.json();
  input.addEventListener('input',()=>{
    const q=input.value.trim().toLowerCase();
    if(!q){box.style.display='none';box.innerHTML='';return;}
    const hits=pages.filter(p => (p.search_text || (p.title+' '+(p.title_en||'')+' '+p.slug+' '+(p.tags||[]).join(' '))).toLowerCase().includes(q)).slice(0,12);
    const emptyTitle=lang==='en' ? 'No pages found' : '没有找到页面';
    const emptyHint=lang==='en' ? 'Try a topic, tag, paper slug, or Chinese title.' : '可以试试主题、标签、论文 slug 或英文标题。';
    box.innerHTML=hits.map(p=>{
      const title=lang==='en' ? (p.title_en || p.title) : p.title;
      const url=lang==='en' ? (p.url_en || p.url) : p.url;
      return `<a href="${prefix}${url}">${title}<small>${p.kind} · ${p.slug}</small></a>`;
    }).join('') || `<a>${emptyTitle}<small>${emptyHint}</small></a>`;
    box.style.display='block';
  });
  document.addEventListener('click',e=>{ if(!box.contains(e.target)&&e.target!==input) box.style.display='none'; });
}

function initMobileNav(){
  const toggle=document.querySelector('.menu-toggle');
  const sidebar=document.getElementById('wiki-sidebar');
  if(!toggle||!sidebar) return;
  toggle.addEventListener('click',()=>{
    const open=document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  // Close the drawer when navigating or tapping outside it.
  sidebar.addEventListener('click',e=>{ if(e.target.closest('a')) document.body.classList.remove('nav-open'); });
  document.addEventListener('click',e=>{
    if(!document.body.classList.contains('nav-open')) return;
    if(!sidebar.contains(e.target) && !toggle.contains(e.target)){
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded','false');
    }
  });
}

function initDesktopSidebar(){
  const root=document.documentElement;
  const toggle=document.querySelector('.sidebar-collapse-toggle');
  const panel=document.getElementById('sidebar-panel');
  if(!toggle||!panel) return;
  const desktop=window.matchMedia('(min-width: 861px)');
  const storageKey='llmwiki.sidebarCollapsed';
  const icon=toggle.querySelector('[aria-hidden="true"]');
  const readStoredState=()=>{
    try{return localStorage.getItem(storageKey)==='true';}
    catch(error){return false;}
  };
  const persist=collapsed=>{
    try{localStorage.setItem(storageKey,String(collapsed));}
    catch(error){}
  };
  if(readStoredState()) root.classList.add('sidebar-collapsed');
  const sync=()=>{
    const collapsed=desktop.matches&&root.classList.contains('sidebar-collapsed');
    const label=collapsed ? toggle.dataset.expandLabel : toggle.dataset.collapseLabel;
    toggle.setAttribute('aria-expanded',String(!collapsed));
    toggle.setAttribute('aria-label',label);
    toggle.setAttribute('title',label);
    if(icon) icon.textContent=collapsed ? '›' : '‹';
    panel.inert=collapsed;
    if(collapsed) panel.setAttribute('aria-hidden','true');
    else panel.removeAttribute('aria-hidden');
  };
  toggle.addEventListener('click',()=>{
    if(!desktop.matches) return;
    const collapsed=root.classList.toggle('sidebar-collapsed');
    persist(collapsed);
    sync();
  });
  desktop.addEventListener('change',sync);
  sync();
}

function initResponsiveToc(){
  const toc=document.querySelector('details.toc');
  if(!toc) return;
  const narrow=window.matchMedia('(max-width: 1180px)');
  const sync=()=>{ toc.open=!narrow.matches; };
  sync();
  narrow.addEventListener('change', sync);
}

function initMotion(){
  const targets=[...document.querySelectorAll('[data-motion="reveal"]')];
  if(!targets.length) return;
  document.body.classList.add('motion-ready');
  targets.forEach((el,index)=>el.style.setProperty('--motion-delay', `${Math.min(index * 70, 350)}ms`));
  const reveal=el=>el.classList.add('is-visible');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced || !('IntersectionObserver' in window)){
    targets.forEach(reveal);
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, {threshold:0.08, rootMargin:'0px 0px -6% 0px'});
  targets.forEach(target=>observer.observe(target));
}

initSearch();
initDesktopSidebar();
initMobileNav();
initResponsiveToc();
initMotion();
