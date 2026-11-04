(function(){
var h=document.querySelector('.hero h1');
if(h){h.innerHTML=h.textContent.split(' ').map(function(w,i){return '<span class="w" style="animation-delay:'+(.3+i*.12)+'s">'+w+'&nbsp;</span>'}).join('')}
var hero=document.querySelector('.hero'),cfg=[['₹','',8,12,'6%','18%',7,0],['₹','v',6,6,'88%','12%',9,1],['%','m',5,8,'8%','62%',8,2],['₹','',4,5,'92%','58%',6,.5],['₹','v',3.4,4,'78%','82%',10,3],['%','',3,4,'20%','86%',7,1.5]];
cfg.forEach(function(c){var e=document.createElement('div');e.className='coin '+c[1];e.textContent=c[0];var s=c[2]*10;
e.style.cssText='width:'+s+'px;height:'+s+'px;left:'+c[4]+';top:'+c[5]+';--d:'+c[6]+'s;--l:'+c[7]+'s;font-size:'+s/2.6+'px';e.dataset.k=c[3];hero&&hero.appendChild(e)});
var sp=document.createElement('div');sp.id='sp';document.body.appendChild(sp);
var cg=document.createElement('div');cg.id='cg';document.body.appendChild(cg);
addEventListener('scroll',function(){var m=document.documentElement;sp.style.width=(scrollY/(m.scrollHeight-innerHeight)*100)+'%'},{passive:true});
addEventListener('mousemove',function(e){cg.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
var x=(e.clientX/innerWidth-.5),y=(e.clientY/innerHeight-.5);
document.querySelectorAll('.coin').forEach(function(c){var k=c.dataset.k;c.style.transform='translate('+(-x*k*6)+'px,'+(-y*k*6)+'px)'})});
document.addEventListener('mousemove',function(e){var c=e.target.closest&&e.target.closest('.card,.feature-card');if(!c)return;
var r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
c.style.setProperty('--mx',px*100+'%');c.style.setProperty('--my',py*100+'%');
c.style.transform='perspective(900px) rotateX('+((.5-py)*6)+'deg) rotateY('+((px-.5)*8)+'deg) translateY(-6px)'});
document.addEventListener('mouseout',function(e){var c=e.target.closest&&e.target.closest('.card,.feature-card');if(c&&!c.contains(e.relatedTarget))c.style.transform=''});
})();
(function(){
var ul=document.querySelector('.nav-links');if(!ul)return;
var li=document.createElement('li');li.className='tt';
li.innerHTML='<button id="theme-toggle" type="button" aria-label="Toggle dark mode"><i class="fas fa-moon"></i><i class="fas fa-sun"></i></button>';
ul.insertBefore(li,ul.firstElementChild?ul.lastElementChild:null);
li.querySelector('button').addEventListener('click',function(){
var r=document.documentElement,n=r.getAttribute('data-theme')==='dark'?'light':'dark';
r.setAttribute('data-theme',n);try{localStorage.setItem('ff-theme',n)}catch(e){}});
})();
