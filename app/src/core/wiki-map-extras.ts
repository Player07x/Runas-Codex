export interface EraRange { from?:number; to?:number; secret?:boolean }
export interface MapImageLayer extends EraRange { name:string; image:string; opacity:number }
export interface MapDrawing extends EraRange { kind:"zona"|"rota"|"rotulo"; points:{x:number;y:number}[]; color:string; text:string; layer:string }
export interface MapExtras { images?:MapImageLayer[]; drawings?:MapDrawing[] }
const object=(v:unknown):Record<string,unknown>=>v && typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}
const range=(d:Record<string,unknown>):EraRange=>({... (typeof d.era_inicio==="number"&&Number.isFinite(d.era_inicio)?{from:d.era_inicio}:{}),... (typeof d.era_fim==="number"&&Number.isFinite(d.era_fim)?{to:d.era_fim}:{}),...(d.segredo===true?{secret:true}:{})})
export const inEra=(range:EraRange,year:number,players=false)=>!(players&&range.secret)&&(range.from===undefined||year>=range.from)&&(range.to===undefined||year<=range.to)
export function parseMapExtras(data:Record<string,unknown>):MapExtras {
 const images=(Array.isArray(data.imagens)?data.imagens:[]).map(value=>{const d=object(value);if(typeof d.nome!=="string"||typeof d.imagem!=="string")throw new Error("Cada camada de imagem precisa de nome e imagem.");return {name:d.nome,image:d.imagem.replace(/^\[\[|\]\]$/g,""),opacity:typeof d.opacidade==="number"&&Number.isFinite(d.opacidade)?Math.max(0,Math.min(1,d.opacidade)):1,...range(d)}})
 const drawings=(Array.isArray(data.desenhos)?data.desenhos:[]).map(value=>{const d=object(value);if(!["zona","rota","rotulo"].includes(String(d.tipo))||!Array.isArray(d.pontos))throw new Error("Desenho precisa de tipo e pontos.");const points=d.pontos.map(value=>{const p=object(value);if(typeof p.x!=="number"||typeof p.y!=="number"||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new Error("Coordenada inválida no desenho.");return {x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))}});if(points.length< (d.tipo==="zona"?3:d.tipo==="rota"?2:1)||points.length>10000)throw new Error("Quantidade de pontos inválida no desenho.");return {kind:d.tipo as MapDrawing["kind"],points,color:typeof d.cor==="string"&&/^#[0-9a-f]{6}$/i.test(d.cor)?d.cor:"#76558f",text:typeof d.texto==="string"?d.texto:"",layer:typeof d.camada==="string"?d.camada:"",...range(d)}})
 return {...(images.length?{images}:{}),...(drawings.length?{drawings}:{})}
}
const yamlRange=(d:EraRange)=>({... (d.from!==undefined?{era_inicio:d.from}:{}),...(d.to!==undefined?{era_fim:d.to}:{}),...(d.secret?{segredo:true}:{})})
export function mapExtrasYaml(extras:MapExtras) {
 return {imagens:(extras.images??[]).map(d=>({nome:d.name,imagem:`[[${d.image}]]`,opacidade:d.opacity,...yamlRange(d)})),desenhos:(extras.drawings??[]).map(d=>({tipo:d.kind,pontos:d.points,cor:d.color,texto:d.text,camada:d.layer,...yamlRange(d)}))}
}
