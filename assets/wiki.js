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
  const label=toggle.querySelector('.menu-toggle-label');
  const sync=open=>{
    const text=open ? toggle.dataset.closeLabel : toggle.dataset.menuLabel;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',text);
    toggle.setAttribute('title',text);
    if(label) label.textContent=text;
  };
  const close=()=>{
    document.body.classList.remove('nav-open');
    sync(false);
  };
  toggle.addEventListener('click',()=>{
    const open=document.body.classList.toggle('nav-open');
    sync(open);
  });
  // Close the drawer when navigating or tapping outside it.
  sidebar.addEventListener('click',e=>{ if(e.target.closest('a')) close(); });
  document.addEventListener('click',e=>{
    if(!document.body.classList.contains('nav-open')) return;
    if(!sidebar.contains(e.target) && !toggle.contains(e.target)) close();
  });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.body.classList.contains('nav-open')) close(); });
  sync(false);
}

function initDesktopSidebar(){
  const root=document.documentElement;
  const toggle=document.querySelector('.sidebar-collapse-toggle');
  const panel=document.getElementById('sidebar-panel');
  if(!toggle||!panel) return;
  const desktop=window.matchMedia('(min-width: 861px)');
  const storageKey='llmwiki.sidebarCollapsed';
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

function initKnowledgeGraph(){
  const root=document.querySelector('[data-knowledge-graph]');
  const dataNode=document.getElementById('knowledge-graph-data');
  const svg=document.getElementById('knowledge-graph-svg');
  if(!root||!dataNode||!svg) return;

  let data;
  try{ data=JSON.parse(dataNode.textContent); }
  catch(error){ return; }
  if(!Array.isArray(data.nodes)||!Array.isArray(data.edges)) return;

  const lang=document.documentElement.lang==='en' ? 'en' : 'zh';
  const copy=lang==='en' ? {
    groups:{concept:'Foundation',research:'Research topic',roadmap:'Application roadmap',entity:'Method entity',claim:'Evidence claim',question:'Open question'},
    evidence:'Evidence links',relations:'Direct relations',updated:'Updated',open:'Open full page',neighbors:'Directly connected',empty:'No visible nodes',visible:'visible nodes',edges:'relations'
  } : {
    groups:{concept:'基础概念',research:'研究专题',roadmap:'应用路线',entity:'方法实体',claim:'证据判断',question:'开放问题'},
    evidence:'证据入口',relations:'直接关系',updated:'更新于',open:'进入完整页面',neighbors:'直接相连',empty:'没有符合条件的节点',visible:'个可见节点',edges:'条关系'
  };
  const viewport=svg.querySelector('.knowledge-graph-viewport');
  const detail=document.getElementById('graph-detail');
  const status=document.getElementById('graph-status');
  const search=document.getElementById('graph-search-input');
  const filterButtons=[...document.querySelectorAll('[data-graph-filter]')];
  const listItems=[...document.querySelectorAll('[data-graph-list-group]')];
  const nodeById=new Map(data.nodes.map(node=>[node.id,node]));
  const adjacency=new Map(data.nodes.map(node=>[node.id,new Set()]));
  data.edges.forEach(edge=>{
    if(adjacency.has(edge.source)&&adjacency.has(edge.target)){
      adjacency.get(edge.source).add(edge.target);
      adjacency.get(edge.target).add(edge.source);
    }
  });

  const centers={
    concept:[230,205], research:[515,300], roadmap:[280,540],
    entity:[805,160], claim:[820,385], question:[710,570]
  };
  const hash=text=>{
    let value=2166136261;
    for(let i=0;i<text.length;i++) value=Math.imul(value^text.charCodeAt(i),16777619);
    return value>>>0;
  };
  const positions=new Map();
  data.nodes.forEach((node,index)=>{
    const seed=hash(node.id);
    const center=centers[node.group]||[520,340];
    const angle=((seed%360)/180)*Math.PI;
    const spread=42+((seed>>>9)%88);
    positions.set(node.id,{
      x:center[0]+Math.cos(angle)*spread,
      y:center[1]+Math.sin(angle)*spread*.72,
      index
    });
  });

  // A small deterministic force pass keeps related clusters organic without
  // importing a runtime dependency or changing positions between page loads.
  for(let iteration=0;iteration<210;iteration++){
    const cooling=1-iteration/250;
    const force=new Map(data.nodes.map(node=>[node.id,{x:0,y:0}]));
    data.nodes.forEach(node=>{
      const p=positions.get(node.id);
      const center=centers[node.group]||[520,340];
      force.get(node.id).x+=(center[0]-p.x)*.0055;
      force.get(node.id).y+=(center[1]-p.y)*.0055;
    });
    for(let i=0;i<data.nodes.length;i++){
      for(let j=i+1;j<data.nodes.length;j++){
        const a=data.nodes[i], b=data.nodes[j];
        const pa=positions.get(a.id), pb=positions.get(b.id);
        let dx=pa.x-pb.x, dy=pa.y-pb.y;
        const distance2=Math.max(dx*dx+dy*dy,72);
        const distance=Math.sqrt(distance2);
        const repel=1050/distance2;
        dx/=distance; dy/=distance;
        force.get(a.id).x+=dx*repel;
        force.get(a.id).y+=dy*repel;
        force.get(b.id).x-=dx*repel;
        force.get(b.id).y-=dy*repel;
      }
    }
    data.edges.forEach(edge=>{
      const pa=positions.get(edge.source), pb=positions.get(edge.target);
      if(!pa||!pb) return;
      let dx=pb.x-pa.x, dy=pb.y-pa.y;
      const distance=Math.max(Math.sqrt(dx*dx+dy*dy),1);
      const same=nodeById.get(edge.source).group===nodeById.get(edge.target).group;
      const desired=same ? 92 : 138;
      const spring=(distance-desired)*.0038;
      dx/=distance; dy/=distance;
      force.get(edge.source).x+=dx*spring;
      force.get(edge.source).y+=dy*spring;
      force.get(edge.target).x-=dx*spring;
      force.get(edge.target).y-=dy*spring;
    });
    data.nodes.forEach(node=>{
      const p=positions.get(node.id), f=force.get(node.id);
      p.x=Math.max(36,Math.min(1004,p.x+f.x*cooling*9));
      p.y=Math.max(42,Math.min(646,p.y+f.y*cooling*9));
    });
  }

  const svgNode=(name,attributes={})=>{
    const element=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,String(value)));
    return element;
  };
  const clusterLayer=svgNode('g',{class:'graph-cluster-layer','aria-hidden':'true'});
  Object.entries(centers).forEach(([group,[x,y]])=>{
    const label=svgNode('text',{x,y:y-116,class:`graph-cluster-label graph-cluster-label--${group}`});
    label.textContent=copy.groups[group];
    clusterLayer.appendChild(label);
  });
  viewport.appendChild(clusterLayer);

  const edgeLayer=svgNode('g',{class:'graph-edge-layer','aria-hidden':'true'});
  const edgeElements=[];
  data.edges.forEach(edge=>{
    const source=positions.get(edge.source), target=positions.get(edge.target);
    if(!source||!target) return;
    const line=svgNode('line',{
      x1:source.x,y1:source.y,x2:target.x,y2:target.y,
      class:'graph-edge','data-source':edge.source,'data-target':edge.target
    });
    edgeLayer.appendChild(line);
    edgeElements.push({edge,element:line});
  });
  viewport.appendChild(edgeLayer);

  const nodeLayer=svgNode('g',{class:'graph-node-layer'});
  const nodeElements=new Map();
  data.nodes.forEach(node=>{
    const p=positions.get(node.id);
    const radius=Math.min(17,6.5+Math.sqrt(Math.max(node.evidence_count,0))*1.05+Math.min(node.connection_count,12)*.22);
    const group=svgNode('g',{
      class:`graph-node graph-node--${node.group}`,
      transform:`translate(${p.x} ${p.y})`, tabindex:'0', role:'button',
      'aria-label':`${node.title}，${copy.groups[node.group]}，${node.connection_count} ${copy.relations}`,
      'data-node-id':node.id
    });
    const circle=svgNode('circle',{r:radius});
    const label=svgNode('text',{y:-(radius+7),class:`graph-node-label${['concept','research','roadmap'].includes(node.group)?' graph-node-label--persistent':''}`});
    const compact=node.title.length>15 ? `${node.title.slice(0,14)}…` : node.title;
    label.textContent=compact;
    const title=svgNode('title'); title.textContent=node.title;
    group.append(circle,label,title);
    nodeLayer.appendChild(group);
    nodeElements.set(node.id,group);
  });
  viewport.appendChild(nodeLayer);

  let selectedId='';
  let activeFilter='all';
  let query='';
  const visibleNodes=new Set(data.nodes.map(node=>node.id));

  const renderDetail=node=>{
    if(!detail||!node) return;
    const neighbors=[...(adjacency.get(node.id)||[])].map(id=>nodeById.get(id)).filter(Boolean)
      .sort((a,b)=>b.connection_count-a.connection_count||a.title.localeCompare(b.title)).slice(0,8);
    detail.replaceChildren();
    const kicker=document.createElement('p'); kicker.className='section-kicker'; kicker.textContent=copy.groups[node.group];
    const heading=document.createElement('h2'); heading.textContent=node.title;
    detail.append(kicker,heading);
    if(node.title_en&&node.title_en!==node.title){
      const translation=document.createElement('p'); translation.className='graph-detail-translation'; translation.lang='en'; translation.textContent=node.title_en;
      detail.appendChild(translation);
    }
    if(node.summary){ const summary=document.createElement('p'); summary.textContent=node.summary; detail.appendChild(summary); }
    const metrics=document.createElement('dl'); metrics.className='graph-detail-metrics';
    [[copy.evidence,node.evidence_count],[copy.relations,node.connection_count],[copy.updated,node.updated||'—']].forEach(([label,value])=>{
      const cell=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd');
      dt.textContent=label; dd.textContent=String(value); cell.append(dt,dd); metrics.appendChild(cell);
    });
    detail.appendChild(metrics);
    if(neighbors.length){
      const neighborTitle=document.createElement('h3'); neighborTitle.textContent=copy.neighbors;
      const list=document.createElement('ul'); list.className='graph-neighbor-list';
      neighbors.forEach(neighbor=>{
        const li=document.createElement('li'), button=document.createElement('button');
        button.type='button'; button.dataset.graphNeighbor=neighbor.id; button.textContent=neighbor.title;
        li.appendChild(button); list.appendChild(li);
      });
      detail.append(neighborTitle,list);
    }
    const open=document.createElement('a'); open.className='primary-action graph-open-page'; open.href=node.href;
    const span=document.createElement('span'); span.textContent=copy.open;
    open.appendChild(span); detail.appendChild(open);
  };

  const highlight=id=>{
    const related=id ? adjacency.get(id)||new Set() : new Set();
    nodeElements.forEach((element,nodeId)=>{
      element.classList.toggle('is-selected',nodeId===id);
      element.classList.toggle('is-related',Boolean(id)&&related.has(nodeId));
      element.classList.toggle('is-dimmed',Boolean(id)&&nodeId!==id&&!related.has(nodeId));
    });
    edgeElements.forEach(({edge,element})=>{
      const active=Boolean(id)&&(edge.source===id||edge.target===id);
      element.classList.toggle('is-active',active);
      element.classList.toggle('is-dimmed',Boolean(id)&&!active);
    });
  };
  const selectNode=id=>{
    if(!nodeById.has(id)||!visibleNodes.has(id)) return;
    selectedId=id;
    highlight(id);
    renderDetail(nodeById.get(id));
  };

  nodeElements.forEach((element,id)=>{
    element.addEventListener('click',event=>{ event.stopPropagation(); selectNode(id); });
    element.addEventListener('dblclick',event=>{ event.stopPropagation(); window.location.href=nodeById.get(id).href; });
    element.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){ event.preventDefault(); selectNode(id); }
    });
    element.addEventListener('mouseenter',()=>{ if(!selectedId) highlight(id); });
    element.addEventListener('mouseleave',()=>{ if(!selectedId) highlight(''); });
  });
  detail?.addEventListener('click',event=>{
    const button=event.target.closest('[data-graph-neighbor]');
    if(button) selectNode(button.dataset.graphNeighbor);
  });

  const applyFilter=()=>{
    visibleNodes.clear();
    data.nodes.forEach(node=>{
      const text=`${node.title} ${node.title_zh||''} ${node.title_en||''} ${node.summary||''} ${node.id}`.toLowerCase();
      const visible=(activeFilter==='all'||node.group===activeFilter)&&(!query||text.includes(query));
      nodeElements.get(node.id).classList.toggle('is-filtered-out',!visible);
      if(visible) visibleNodes.add(node.id);
    });
    let visibleEdgeCount=0;
    edgeElements.forEach(({edge,element})=>{
      const visible=visibleNodes.has(edge.source)&&visibleNodes.has(edge.target);
      element.classList.toggle('is-filtered-out',!visible);
      if(visible) visibleEdgeCount++;
    });
    listItems.forEach(item=>{
      const text=item.textContent.toLowerCase();
      item.hidden=!((activeFilter==='all'||item.dataset.graphListGroup===activeFilter)&&(!query||text.includes(query)));
    });
    if(selectedId&&!visibleNodes.has(selectedId)){ selectedId=''; highlight(''); }
    if(status){
      status.textContent=visibleNodes.size ? `${visibleNodes.size} ${copy.visible} · ${visibleEdgeCount} ${copy.edges}` : copy.empty;
    }
  };
  filterButtons.forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.graphFilter;
    filterButtons.forEach(item=>{
      const active=item===button;
      item.classList.toggle('is-active',active);
      item.setAttribute('aria-pressed',String(active));
    });
    applyFilter();
  }));
  search?.addEventListener('input',()=>{ query=search.value.trim().toLowerCase(); applyFilter(); });

  const defaultView={x:-130,y:-85,scale:1.2};
  const view={...defaultView};
  const syncView=()=>viewport.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.scale})`);
  const zoomBy=factor=>{
    const next=Math.max(.62,Math.min(2.3,view.scale*factor));
    const center={x:520,y:340};
    view.x=center.x-(center.x-view.x)*(next/view.scale);
    view.y=center.y-(center.y-view.y)*(next/view.scale);
    view.scale=next; syncView();
  };
  document.querySelectorAll('[data-graph-view]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.graphView;
    if(action==='in') zoomBy(1.18);
    else if(action==='out') zoomBy(1/1.18);
    else{ view.x=defaultView.x; view.y=defaultView.y; view.scale=defaultView.scale; syncView(); }
  }));
  svg.addEventListener('wheel',event=>{
    event.preventDefault();
    const rect=svg.getBoundingClientRect();
    const point={x:(event.clientX-rect.left)*1040/rect.width,y:(event.clientY-rect.top)*680/rect.height};
    const next=Math.max(.62,Math.min(2.3,view.scale*Math.exp(-event.deltaY*.0012)));
    view.x=point.x-(point.x-view.x)*(next/view.scale);
    view.y=point.y-(point.y-view.y)*(next/view.scale);
    view.scale=next; syncView();
  },{passive:false});
  let pan=null;
  svg.addEventListener('pointerdown',event=>{
    if(event.target.closest('.graph-node')) return;
    pan={x:event.clientX,y:event.clientY,originX:view.x,originY:view.y};
    svg.classList.add('is-panning'); svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove',event=>{
    if(!pan) return;
    const rect=svg.getBoundingClientRect();
    view.x=pan.originX+(event.clientX-pan.x)*1040/rect.width;
    view.y=pan.originY+(event.clientY-pan.y)*680/rect.height;
    syncView();
  });
  const endPan=()=>{ pan=null; svg.classList.remove('is-panning'); };
  svg.addEventListener('pointerup',endPan);
  svg.addEventListener('pointercancel',endPan);
  svg.addEventListener('click',event=>{
    if(event.target===svg||event.target.classList.contains('knowledge-graph-viewport')){
      selectedId=''; highlight('');
    }
  });
  syncView();
  applyFilter();
}

initSearch();
initDesktopSidebar();
initMobileNav();
initResponsiveToc();
initMotion();
initKnowledgeGraph();
