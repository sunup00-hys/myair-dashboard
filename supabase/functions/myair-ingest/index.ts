import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const secret=Deno.env.get("MYAIR_DEVICE_SECRET");
const owner=Deno.env.get("MYAIR_OWNER_USER_ID");
const url=Deno.env.get("SUPABASE_URL");
const adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
function sameSecret(a:string,b:string){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0;}
function getKoreanDate(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function inferDate(month:number,day:number,baseDate:string){const yr=Number(baseDate.slice(0,4)),base=new Date(baseDate+"T12:00:00Z");const c=[yr-1,yr,yr+1].map(y=>({y,date:new Date(Date.UTC(y,month-1,day,12))})).filter(z=>z.date.getUTCMonth()===month-1&&z.date.getUTCDate()===day).sort((a,b)=>Math.abs(+a.date-+base)-Math.abs(+b.date-+base));if(!c.length)throw Error("Invalid calendar date");return c[0].y+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0")}
function parsePayload(raw:any){const obj=(raw?.data&&typeof raw.data==="object")?raw.data:raw; if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("Expected myAir JSON dictionary");
 const entries=Object.entries(obj);const after=(label:string)=>{for(const [k,v] of entries){if(String(v).trim()===label){const n=/index:(\d+)/.exec(k);if(n&&obj["index:"+(Number(n[1])+1)]!==undefined)return String(obj["index:"+(Number(n[1])+1)]).trim();}}return null};
 const rawDate=String(obj.TherapyCardDateNav||entries.find(([,v])=>typeof v==="string"&&/\d{1,2}월\s*\d{1,2}일/.test(v))?.[1]||"");const dm=/(\d{1,2})월\s*(\d{1,2})일/.exec(rawDate);if(!dm)throw Error("Date missing");
 const tm=/^(\d{1,2}):(\d{2})$/.exec(after("사용량")||"");if(!tm||+tm[2]>59||+tm[1]>24)throw Error("Invalid usage");
 const ep=after("이벤트(시간당)"),mp=after("마스크 벗음"),seal=after("마스크 밀폐");const events=ep===null?null:Number(ep),off=mp===null?null:Number(mp);
 if(events!==null&&(!Number.isFinite(events)||events<0||events>100))throw Error("Invalid events");
 if(off!==null&&(!Number.isInteger(off)||off<0||off>100))throw Error("Invalid mask removal");
 const base=/^\d{4}-\d{2}-\d{2}$/.test(raw?.collected_date||"")?raw.collected_date:getKoreanDate();
 const used_on=inferDate(Number(dm[1]),Number(dm[2]),base);
 if(new Date(used_on+"T12:00:00Z").getTime()>Date.now()+86400000)throw Error("Future usage date");
 return {used_on,usage_minutes:+tm[1]*60 + +tm[2],events_per_hour:events,mask_off:off,mask_seal:seal?String(seal).slice(0,60):null};
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!secret||!owner||!url||!adminKey)return json({error:"Server not configured"},503);
 const token=req.headers.get("X-MyAir-Device-Key")||"";
 if(token.length>256||!sameSecret(token,secret))return json({error:"Unauthorized"},401);
 const type=req.headers.get("content-type")||"";if(!type.includes("application/json"))return json({error:"JSON required"},415);
 const body=await req.text();if(body.length>50000)return json({error:"Payload too large"},413);
 try{const record=parsePayload(JSON.parse(body));const db=createClient(url,adminKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {error}=await db.from("myair_records").upsert({user_id:owner,...record,updated_at:new Date().toISOString()},{onConflict:"user_id,used_on"});
 if(error){console.error("Database write failed",error.code);return json({error:"Storage unavailable"},500)}
 return json({ok:true,date:record.used_on});
 }catch(e){return json({error:e instanceof Error?e.message:"Invalid data"},400)}
});