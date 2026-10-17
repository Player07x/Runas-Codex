import { maskNonContent } from "./parse"
import { noteBody } from "./sections"
import type { IndexedNote, VaultIndex } from "./vault-index"
export function publicArticleText(index:VaultIndex,note:IndexedNote,recipient?:string):string {
 const allowed=(value:unknown)=>Boolean(recipient && (Array.isArray(value)?value:typeof value==="string"?value.split(","):[]).some(v=>typeof v==="string"&&v.trim().toLocaleLowerCase("pt-BR")===recipient.toLocaleLowerCase("pt-BR")))
 if(note.meta.frontmatter?.data?.segredo===true&&!allowed(note.meta.frontmatter.data.segredo_para))throw new Error("Este artigo está marcado como segredo do mestre.")
 const lines=maskNonContent(noteBody(note.text)).split("\n"),out:string[]=[]
 let secretDepth=0,afterBlank=false
 for(const line of lines){
  const depth=/^\s*((?:>\s*)+)/.exec(line)?.[1]?.split(">").length
  const level=depth?depth-1:0
  if(secretDepth){
    if(!line.trim()){afterBlank=true;continue}
    if(level>=secretDepth){afterBlank=false;continue}
    if(level===0&&!afterBlank)continue
    secretDepth=0
  }
  const marker=/^\s*(?:>\s*)+\[!(?:segredo|secret)(?:\|([^\]]*))?\]/i.exec(line)
  if(marker){if(!allowed(marker[1])){secretDepth=level;afterBlank=false;continue}out.push(line.replace(marker[0],"> Informação reservada"));continue}
  out.push(line)
 }
 let text=out.join("\n")
 for(const resolved of index.outgoing(note.path).slice().reverse()){
  // A versão pública não resolve transclusões nem carrega dados de outra nota.
  const link=resolved.link,privateTarget=resolved.dest&&index.note(resolved.dest)?.meta.frontmatter?.data?.segredo===true
  text=text.split(link.raw).join(privateTarget?"[referência privada]":link.embed?`[Anexo: ${link.alias??"consultar o mestre"}]`:link.alias??link.target.split("/").at(-1)??"")
 }
 return text.replace(/<[^>]*>/g,"").replace(/!\[([^\]]*)\]\([^)]*\)/g,"[Imagem: $1]").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/\n{3,}/g,"\n\n").trim()
}
