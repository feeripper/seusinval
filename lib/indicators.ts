import data from '../backend/indicators.json';
export type Indicator = typeof data[number];
export const indicators: Indicator[] = data;
export const months = ['Mar','Abr','Mai','Jun','Jul','Ago'];
export const fmt = (v:number) => v.toLocaleString('pt-BR', {maximumFractionDigits:1});
export function status(i:Indicator){ const gap=i.direction==='up'?i.target-i.value:i.value-i.target; return gap<=0?'Na meta':gap>10||i.unit===''?'Crítico':'Atenção'; }
export function projection(i:Indicator){return Math.max(0,Math.min(i.unit==='%'?100:Infinity,i.value+(i.value-i.history[3])/2));}
export function analyze(question:string, rows:Indicator[]=indicators){
 const q=question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const selected=rows.filter(i=>q.includes(i.id.toLowerCase()) || q.includes(i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
 let filtered=selected.length?selected: /privacidade|titular/.test(q)?rows.filter(i=>i.domain==='Privacidade de dados'):/protecao|acesso|criptografia|incidente/.test(q)?rows.filter(i=>i.domain==='Proteção de dados'):/\bia\b|modelo|vies/.test(q)?rows.filter(i=>i.domain==='Riscos de IA'):rows;
 if(!/indicador|risco|prior|resum|analis|meta|critico|atencao|futur|proje|tend|privacidade|protecao|titular|acesso|criptografia|incidente|modelo|vies|\bia\b/.test(q)&&!selected.length) return 'Posso analisar os indicadores desta demonstração, suas metas, tendências e prioridades. Pergunte, por exemplo: “Quais indicadores precisam de atenção?” Não tenho acesso a informações fora desta base.';
 const future=/futur|proje|tend|proximo/.test(q);
 if(/prior|critico|atencao/.test(q)) filtered=filtered.filter(i=>status(i)!=='Na meta').sort((a,b)=>(status(a)==='Crítico'?-1:1)-(status(b)==='Crítico'?-1:1));
 return `Análise da base demonstrativa de agosto de 2026. ${filtered.length} indicadores no recorte.\n\n`+filtered.map(i=>`${i.id} · ${i.name}: ${fmt(i.value)}${i.unit} (meta ${i.direction==='up'?'≥':'≤'} ${fmt(i.target)}${i.unit}). ${status(i)}. ${future?`Projeção ilustrativa para setembro: ${fmt(projection(i))}${i.unit}. `:''}${i.action} Fonte: ${i.source}; responsável: ${i.owner}.`).join('\n\n')+(future?'\n\nMétodo: extrapolação linear da variação média entre junho e agosto, limitada a 0–100% para percentuais. É um cenário ilustrativo, sem validação preditiva.':'')+'\n\nResposta demonstrativa calculada por regras, sem modelo de IA conectado. Metas internas fictícias; não representam conclusão de conformidade legal.';
}
