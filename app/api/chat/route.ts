import {analyze,indicators} from '@/lib/indicators';
export async function POST(request:Request){
 let data;try{data=await request.json()}catch{return Response.json({error:'JSON inválido'},{status:400})}
 if(typeof data.question!=='string'||!data.question.trim()||data.question.length>2000)return Response.json({error:'Pergunta deve conter de 1 a 2000 caracteres'},{status:400});
 const base=process.env.GO_API_URL;
 if(base){try{const r=await fetch(base.replace(/\/$/,'')+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.GO_API_TOKEN},body:JSON.stringify(data),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error();return Response.json(await r.json())}catch{return Response.json({error:'Não foi possível consultar o Seu Sinval'},{status:502})}}
 return Response.json({answer:analyze(data.question,data.domain&&data.domain!=='Todos'?indicators.filter(i=>i.domain===data.domain):indicators),mode:'demo'});
}
