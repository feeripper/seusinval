import { indicators } from '@/lib/indicators';
export async function GET(){
 const base=process.env.GO_API_URL;
 if(!base)return Response.json({indicators,mode:'demo'});
 try{const r=await fetch(base.replace(/\/$/,'')+'/api/indicators',{headers:{Authorization:'Bearer '+process.env.GO_API_TOKEN},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();return Response.json(await r.json())}catch{return Response.json({error:'Backend indisponível'},{status:502})}
}
