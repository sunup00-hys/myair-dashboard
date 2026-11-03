import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const ADMIN=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||"";
const cors={"Access-Control-Allow-Origin":"https://sunup00-hys.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-myair-device-key","Access-Control-Allow-Methods":"POST,OPTIONS"};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...cors}});
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function token(){const a=crypto.getRandomValues(new Uint8Array(32));return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("")}
const pad=(v:number)=>String(v).padStart(2,"0");
function dateToday(){const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());const n=(kind:string)=>Number(parts.find(x=>x.type===kind)?.value);return [n("year"),n("month"),n("day")].join("-")}
function dateFromParts(m:number,d:number){const parts=dateToday().split("-").map(Number),ref=Date.UTC(parts[0],parts[1]-1,parts[2],12);let best:{when:number,date:string}|null=null;
for(const y of [parts[0]-1,parts[0],parts[0]+1]){const dt=Date.UTC(y,m-1,d,12);const o=new Date(dt);if(o.getUTCDate()!==d||o.getUTCMonth()!==m-1)continue;const diff=Math.abs(dt-ref);if(!best||diff<best.when)best={when:diff,date:y+"-"+pad(m)+"-"+pad(d)}}if(!best)throw Error("Invalid date");return best.date}
function extract(obj:Record<string,unknown>){const entry=(name:string)=>{for(const [k,v] of Object.entries(obj)){if(String(v).trim()===name){const mt=/^index:(\d+)$/.exec(k);if(mt){const next=obj["index:"+(Number(mt[1])+1)];if(next!==undefined)return String(next).trim()}}}return null};
const dt=String(obj.TherapyCardDateNav||Object.values(obj).find(v=>typeof v==="string"&&/\d{1,2}월\s*\d{1,2}일/.test(v))||"");
const md=/(\d{1,2})월\s*(\d{1,2})일/.exec(dt);if(!md)throw Error("Date missing");
const t=/^(\d{1,2}):(\d{2})$/.exec(entry("사용량")||"");if(!t||+t[1]>24||+t[2]>59)throw Error("Invalid usage");
const ep=entry("이벤트(시간당)"),off=entry("마스크 벗음"),seal=entry("마스크 밀폐");
const events=ep===null?null:Number(ep),mask=off===null?null:Number(off);
if(events!==null&&(!Number.isFinite(events)||events<0||events>100))throw Error("Invalid events");
if(mask!==null&&(!Number.isInteger(mask)||mask<0||mask>100))throw Error("Invalid mask removal");
const used_on=dateFromParts(+md[1],+md[2]);
if(Date.parse(used_on+"T12:00:00Z")>Date.now()+86400000)throw Error("Future date");
return {used_on,usage_minutes:+t[1]*60 + +t[2],events_per_hour:events,mask_off:mask,mask_seal:seal?.slice(0,60)||null}}
Deno.serve(async (req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 if(!PROJECT_URL||!ADMIN||!ANON)return respond({error:"Server configuration missing"},503);
 const admin=createClient(PROJECT_URL,ADMIN,{auth:{persistSession:false,autoRefreshToken:false}});
 const action=new URLSearchParams(new URL(req.url).search).get("action");
 if(action==="enroll"){
   const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
   if(!jwt)return respond({error:"Sign in first"},401);
   const reader=createClient(PROJECT_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:{user},error:authErr}=await reader.auth.getUser(jwt);
   if(authErr||!user)return respond({error:"Invalid session"},401);
   const deviceKey=token(),digest=await sha256(deviceKey);
   const {error}=await admin.from("myair_device_tokens").upsert({user_id:user.id,token_hash:digest,created_at:new Date().toISOString()},{onConflict:"user_id"});
   if(error){console.error(error.code);return respond({error:"Unable to enroll device"},500)}
   return respond({deviceKey,warning:"Copy now. Creating another key revokes the old key."});
 }
 if(action!==null)return respond({error:"Unknown action"},404);
 const key=req.headers.get("X-MyAir-Device-Key")||"";
 if(!/^[a-f0-9]{64}$/.test(key))return respond({error:"Unauthorized"},401);
 const digest=await sha256(key);
 const {data:device,error:lookErr}=await admin.from("myair_device_tokens").select("user_id").eq("token_hash",digest).maybeSingle();
 if(lookErr||!device)return respond({error:"Unauthorized"},401);
 const len=Number(req.headers.get("content-length")||0);
 if(len>50000)return respond({error:"Payload too large"},413);
 if(!(req.headers.get("content-type")||"").includes("application/json"))return respond({error:"Expected application/json"},415);
 const text=await req.text();if(text.length>50000)return respond({error:"Payload too large"},413);
 try{const payload=JSON.parse(text);if(!payload||typeof payload!=="object"||Array.isArray(payload))throw Error("Invalid dictionary");
 const value=extract(payload);
 const {error}=await admin.from("myair_records").upsert({user_id:device.user_id,...value,updated_at:new Date().toISOString()},{onConflict:"user_id,used_on"});
 if(error){console.error(error.code);return respond({error:"Write failed"},500)}
 return respond({ok:true,date:value.used_on});
 }catch(e){return respond({error:e instanceof Error?e.message:"Bad request"},400)}
});