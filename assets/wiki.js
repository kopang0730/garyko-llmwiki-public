
async function initSearch(){
  const input=document.getElementById('site-search');
  const box=document.getElementById('search-results');
  if(!input||!box) return;
  const prefix=document.querySelector('link[rel="stylesheet"]').getAttribute('href').replace(/assets\/wiki\.css$/,'');
  const res=await fetch(prefix+'assets/search-index.json');
  const pages=await res.json();
  input.addEventListener('input',()=>{
    const q=input.value.trim().toLowerCase();
    if(!q){box.style.display='none';box.innerHTML='';return;}
    const hits=pages.filter(p => (p.title+' '+p.slug+' '+(p.tags||[]).join(' ')).toLowerCase().includes(q)).slice(0,12);
    box.innerHTML=hits.map(p=>`<a href="${prefix}${p.url}">${p.title}<small>${p.kind} · ${p.slug}</small></a>`).join('') || '<a>No pages found<small>Try a topic, tag, or paper slug.</small></a>';
    box.style.display='block';
  });
  document.addEventListener('click',e=>{ if(!box.contains(e.target)&&e.target!==input) box.style.display='none'; });
}
initSearch();
