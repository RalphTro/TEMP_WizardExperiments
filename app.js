
async function loadModel(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('JSON konnte nicht geladen werden');
  return await res.json();
}

function i18nHelper(model){
  let locale = model.i18n?.defaultLocale || 'de';
  const t = (key)=> (model.i18n?.strings?.[locale]?.[key] ?? key);
  return { t, get locale(){return locale;}, setLocale(l){ if(model.i18n?.strings?.[l]) locale=l; } };
}

function runWizard(model){
  const i18n = i18nHelper(model);
  const state = { current: (model.nodes.find(n=>n.type==='start')?.next), history: [] };
  const root = document.getElementById('app');
  const titleEl = document.getElementById('title');
  titleEl.textContent = model.title + ' – ' + model.version;

  const render = () => {
    const node = model.nodes.find(n=>n.id===state.current);
    if(!node){ root.innerHTML = '<p>Ende.</p>'; return; }

    if(node.type==='decision'){
      root.innerHTML = `
        <div class="card">
          <div class="badge">Decision</div>
          <h2>${i18n.t(node.text)}</h2>
          <div class="buttons">
            ${node.outcomes.map((o,i)=>`<button data-i="${i}">${i18n.t(o.label)}</button>`).join('')}
          </div>
          <hr/>
          <div class="small">Node: ${node.id}</div>
        </div>`;
      root.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const o = node.outcomes[Number(btn.dataset.i)];
          state.history.push({ from: node.id, to: o.next, label: o.label });
          state.current = o.next;
          render();
        });
      });
    } else if(node.type==='result'){
      const tooltip = (node.actions||[]).find(a=>a.type==='tooltip');
      root.innerHTML = `
        <div class="card">
          <div class="badge" style="background:#052e1b;border-color:#064e3b;color:#a7f3d0">Result</div>
          <h2>${i18n.t(node.text)}</h2>
          ${tooltip ? `<div class="tooltip">${tooltip.text}</div>` : ''}
          <div class="buttons" style="margin-top:24px">
            <button id="restart">${i18n.t('btn_restart')||'Neu starten'}</button>
          </div>
          <hr/>
          <div class="small">Node: ${node.id}</div>
        </div>`;
      document.getElementById('restart').addEventListener('click', ()=>{
        state.current = model.nodes.find(n=>n.type==='start')?.next;
        state.history=[]; render();
      });
    } else if(node.type==='process' || node.type==='start'){
      // Auto-advance
      state.current = node.next; render();
    } else {
      root.innerHTML = `<pre>${JSON.stringify(node,null,2)}</pre>`;
    }
  };

  // Locale switcher
  const localeSel = document.getElementById('locale');
  if(localeSel){
    localeSel.addEventListener('change', ()=>{ i18n.setLocale(localeSel.value); render(); });
  }
  // Populate locales
  const locales = Object.keys(model.i18n?.strings||{de:{}});
  localeSel.innerHTML = locales.map(l=>`<option value="${l}">${l}</option>`).join('');
  localeSel.value = model.i18n?.defaultLocale||'de';

  render();
}

(async function(){
  const model = await loadModel('./diagram.json');
  window.__wizardModel = model;
  runWizard(model);
})();
