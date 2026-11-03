(()=>{
"use strict";
const cfg=window.MYAIR_CLOUD||{},url=String(cfg.url||"").replace(/\/$/,""),key=String(cfg.publishableKey||"");
const $=id=>document.getElementById(id),status=$("cloudStatus");
if(!url||!key){status.textContent="자동 동기화 서버 준비 중 · 현재는 파일 불러오기 방식입니다.";return}
let auth=null;try{auth=JSON.parse(localStorage.getItem("myair-auth-session")||"null")}catch{}
const headers=()=>({"Content-Type":"application/json","apikey":key});
const show=(x)=>status.textContent=x;
async function refresh(){if(!auth?.refresh_token)return false;try{const r=await fetch(url+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:headers(),body:JSON.stringify({refresh_token:auth.refresh_token})});if(!r.ok)throw Error("로그인 만료");auth=await r.json();localStorage.setItem("myair-auth-session",JSON.stringify(auth));return true}catch{auth=null;localStorage.removeItem("myair-auth-session");return false}}
async function ensure(){if(!auth)return false;if((auth.expires_at||0)*1000<Date.now()+60000)return refresh();return true}
function update(){const signed=!!auth;$("cloudLogin").hidden=signed;$("cloudSigned").hidden=!signed;show(signed?"개인 계정 연결됨 · 최신 기록을 불러올 수 있습니다.":"개인 계정 로그인이 필요합니다.")}
$("cloudLoginBtn").onclick=async()=>{const email=$("cloudEmail").value.trim(),password=$("cloudPass").value;if(!email||!password){show("이메일과 비밀번호를 입력해 주세요.");return}try{show("로그인 확인 중…");const r=await fetch(url+"/auth/v1/token?grant_type=password",{method:"POST",headers:headers(),body:JSON.stringify({email,password})});if(!r.ok)throw Error("로그인 실패 · 개인용 Supabase 계정 확인");auth=await r.json();auth.expires_at=Math.floor(Date.now()/1000)+Number(auth.expires_in||3600);localStorage.setItem("myair-auth-session",JSON.stringify(auth));$("cloudPass").value="";update();await load()}catch(e){show(e.message)}};
async function load(){if(!await ensure()){update();return}try{show("서버 기록 불러오는 중…");const r=await fetch(url+"/rest/v1/myair_records?select=used_on,usage_minutes,events_per_hour,mask_off,mask_seal&order=used_on.asc&limit=600",{headers:{...headers(),Authorization:"Bearer "+auth.access_token}});if(!r.ok)throw Error("서버 조회 실패 ("+r.status+")");const data=await r.json();const records={};for(const row of data){records[row.used_on]={minutes:row.usage_minutes,events:row.events_per_hour===null?null:Number(row.events_per_hour),maskOff:row.mask_off,seal:row.mask_seal}}window.myAirCloudApply?.(records);show("서버 동기화 완료 · "+data.length+"일 기록") }catch(e){show(e.message)}}
$("cloudRefresh").onclick=load;$("cloudLogout").onclick=()=>{auth=null;localStorage.removeItem("myair-auth-session");window.myAirCloudExit?.();update()};update();if(auth)load();
})();