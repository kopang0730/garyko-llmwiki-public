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

function initResponsiveToc(){
  const toc=document.querySelector('details.toc');
  if(!toc) return;
  const narrow=window.matchMedia('(max-width: 1180px)');
  const sync=()=>{ toc.open=!narrow.matches; };
  sync();
  narrow.addEventListener('change', sync);
}

initSearch();
initMobileNav();
initResponsiveToc();
