document.getElementById('yr').textContent=new Date().getFullYear();
const b=document.getElementById('burger'),m=document.getElementById('menu');
b.onclick=()=>b.setAttribute('aria-expanded',m.classList.toggle('open'));
/* scroll reveal + hero parallax (null-safe for every page) */
(()=>{const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;if(rm||!('IntersectionObserver' in window))return;
document.documentElement.classList.add('js');
const sel='main h2,.lead,.card,.step,.stats>div,.checks li,.photo,.note,.two>div,.support>div,details,.cta-band .wrap,.contact>*';
document.querySelectorAll(sel).forEach(el=>{if(el.closest('.hero'))return;el.classList.add('rv');
const sibs=[...el.parentElement.children].filter(c=>c.classList.contains('rv'));el.style.transitionDelay=Math.min(sibs.indexOf(el),5)*90+'ms'});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
const hv=document.querySelector('.hero-visual');
if(hv&&matchMedia('(hover:hover)').matches){const p=hv.querySelector('.portrait');
document.querySelector('.hero').addEventListener('mousemove',e=>{const r=hv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
p.style.transform=`translate(${x*10}px,${y*10}px)`;p.style.animation='none';p.style.opacity=1;p.style.transition='transform .2s'});}
})();
const f=document.getElementById('form');
if(f)f.addEventListener('submit',e=>{e.preventDefault();const $=i=>document.getElementById(i);
const r={'l-name':$('name').value.trim().length>1,'l-email':/^\S+@\S+\.\S+$/.test($('email').value),'l-type':!!$('type').value,'l-msg':$('msg').value.trim().length>9};
let ok=true;for(const k in r){$(k).classList.toggle('bad',!r[k]);if(!r[k])ok=false}if(!ok)return;
$('ok').style.display='block';
const body=`Name: ${$('name').value}\nEmail: ${$('email').value}\nCountry: ${$('country').value}\nIncident: ${$('type').value}\n\n${$('msg').value}`;
location.href='mailto:cyberbeaconrecoveryservices@gmail.com?subject='+encodeURIComponent('New case: '+$('type').value)+'&body='+encodeURIComponent(body)});
/* Live chat (Tawk.to). Paste your Property ID (and Widget ID if it isn't "default") below. Leave PROPERTY empty to turn chat off. */
(()=>{
const PROPERTY='6ac99ccc61cd3634bb651cdc',WIDGET='1k4hop0nv';
if(!PROPERTY)return;
window.Tawk_API=window.Tawk_API||{};window.Tawk_LoadStart=new Date();
window.Tawk_API.customStyle={visibility:{desktop:{position:'br',xOffset:20,yOffset:20},mobile:{position:'br',xOffset:12,yOffset:12}}};
const load=()=>{const s=document.createElement('script');s.async=true;s.src=`https://embed.tawk.to/${PROPERTY}/${WIDGET}`;s.charset='UTF-8';s.setAttribute('crossorigin','*');document.head.appendChild(s)};
/* load shortly after the page finishes so chat never slows the first view */
if(document.readyState==='complete')setTimeout(load,1500);else addEventListener('load',()=>setTimeout(load,1500));
/* any element with data-open-chat opens the chat window (falls back to the contact page if chat hasn't loaded yet) */
document.addEventListener('click',e=>{const t=e.target.closest('[data-open-chat]');if(!t)return;e.preventDefault();
if(window.Tawk_API&&typeof Tawk_API.maximize==='function')Tawk_API.maximize();else location.href='contact.html'});
})();