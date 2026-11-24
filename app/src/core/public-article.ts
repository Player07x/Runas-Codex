import { maskNonContent } from "./parse"
import { noteBody } from "./sections"
import { extname } from "./text"
import type { IndexedNote, VaultIndex } from "./vault-index"
import { articleImage } from "./wiki"

/** Imagens que a página do jogador pode mostrar: as mesmas extensões que o leitor desenha como imagem. */
const PUBLIC_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp"])

/** Uma imagem que fica no texto público: o alvo como está escrito no link e o arquivo do cofre. */
export interface PublicImage { target: string; path: string }

/** Só o texto, com as imagens trocadas por “[Anexo: …]” (versão antiga, para quem não leva as imagens). */
export function publicArticleText(index:VaultIndex,note:IndexedNote,recipient?:string):string {
 return publicArticle(index,note,recipient,{images:false}).text
}

/**
 * Versão pública de um artigo (anexo 6, 24/11): Markdown, com os segredos de fora. Com `images`, as imagens embutidas
 * (`![[x.png|esquerda|210]]`) continuam no texto, do jeito que o leitor desenha, e voltam na lista para a sala copiar;
 * a imagem da ficha (retrato, símbolo) entra no começo quando o texto não a mostra.
 */
export function publicArticle(index:VaultIndex,note:IndexedNote,recipient?:string,options:{images?:boolean}={}):{text:string;images:PublicImage[]} {
 const keep=options.images!==false,images:PublicImage[]=[]
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
  if(!text.includes(link.raw))continue
  const image=keep&&link.embed&&link.kind==="wiki"&&!privateTarget&&resolved.dest&&PUBLIC_IMAGE_EXT.has(extname(resolved.dest).toLowerCase())
  if(image){if(!images.some(i=>i.target===link.target))images.push({target:link.target,path:resolved.dest!});continue}
  text=text.split(link.raw).join(privateTarget?"[referência privada]":link.embed?`[Anexo: ${link.alias??"consultar o mestre"}]`:link.alias??link.target.split("/").at(-1)??"")
 }
 text=text.replace(/<[^>]*>/g,"").replace(/!\[([^\]]*)\]\([^)]*\)/g,"[Imagem: $1]").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/\n{3,}/g,"\n\n").trim()
 // A imagem da ficha não está no texto: vai no alto, à direita, como no artigo.
 const cover=keep?articleImage(note):null
 if(cover&&!images.some(i=>i.target===cover)){
  const dest=index.resolve({kind:"wiki",embed:true,target:cover,start:0,end:0,raw:"",inFrontmatter:true},note.path).dest
  if(dest&&PUBLIC_IMAGE_EXT.has(extname(dest).toLowerCase())){images.unshift({target:cover,path:dest});text=`![[${cover}|direita|240]]\n\n${text}`}
 }
 return {text,images}
}
