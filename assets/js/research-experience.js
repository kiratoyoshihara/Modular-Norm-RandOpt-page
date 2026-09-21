import { geometryContent, renderGeometryResponsive, renderAblation } from './research-visuals.js';

export class GeometryLab {
  constructor(root, data) {
    this.root=root;
    this.data=data;
    this.kind='norms';
    this.rho=1;
    this.buttons=[...root.querySelectorAll('[data-geometry]')];
    this.buttons.forEach((button,index)=>{
      button.hidden=false;
      button.addEventListener('click',()=>this.select(button.dataset.geometry));
      button.addEventListener('keydown',(event)=>{
        const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
        if(next===null) return;
        event.preventDefault();
        this.buttons[next].focus();
        this.select(this.buttons[next].dataset.geometry);
      });
    });
    root.querySelector('#rho-control').addEventListener('input',(event)=>{
      this.rho=Number(event.target.value);
      root.querySelector('#rho-value').textContent=this.rho.toFixed(2);
      event.target.setAttribute('aria-valuetext',`${this.rho.toFixed(2)} correction, ${(1/this.rho).toFixed(2)} times the base perturbation size`);
      root.querySelector('#geometry-drawing').innerHTML=renderGeometryResponsive('sensitivity',this.rho);
    });
    this.select('norms');
  }
  select(kind) {
    if(!geometryContent[kind]) return;
    this.kind=kind;
    this.root.dataset.geometry=kind;
    this.buttons.forEach(button=>{
      const active=button.dataset.geometry===kind;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    const content=geometryContent[kind];
    this.root.querySelector('#geometry-panel').setAttribute('aria-labelledby',`geometry-tab-${kind}`);
    for(const [id, key] of [['geometry-title','title'],['geometry-text','text'],['geometry-detail','detail']]) this.root.querySelector(`#${id}`).textContent=content[key];
    this.root.querySelector('#geometry-formula').innerHTML=content.formula;
    this.root.querySelector('#geometry-drawing').innerHTML=renderGeometryResponsive(kind,this.rho);
    this.root.querySelector('#rho-controls').hidden=kind!=='sensitivity';
    this.root.querySelector('#ablation-mount').innerHTML=renderAblation(this.data,kind);
  }
}
