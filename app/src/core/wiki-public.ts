import { maskNonContent, parseFrontmatter } from "./parse"
import { VaultIndex } from "./vault-index"
/** Projeção para a prévia dos jogadores; nunca é gravada de volta no cofre. */
export function publicWikiIndex(index:VaultIndex):VaultIndex {
 const privateNotes=new Set(index.allNotes().filter(n=>n.meta.frontmatter?.data?.segredo===true).map(n=>n.path)),texts:Record<string,string>={}
 for(const note of index.allNotes()){
  if(privateNotes.has(note.path))continue
  const front=parseFrontmatter(note.text),body=front?note.text.slice(front.end):note.text,lines=body.split("\n"),masked=maskNonContent(body).split("\n"),out:string[]=[]
  let depth=0,blank=false
  lines.forEach((line,i)=>{
   const count=(/^\s*((?:>\s*)+)/.exec(line)?.[1]?.match(/>/g)??[]).length
   if(depth){if(!line.trim()){blank=true;return}if(count>=depth){blank=false;return}if(count===0&&!blank)return;depth=0}
   if(/^\s*(?:>\s*)+\[!(?:segredo|secret)(?:[|\]])/i.test(masked[i]??"")){depth=count;blank=false;return}
   out.push(line)
  })
  let text=(front?note.text.slice(0,front.end):"")+out.join("\n")
  for(const link of index.outgoing(note.path))if(link.dest&&privateNotes.has(link.dest))text=text.split(link.link.raw).join("referência privada")
  texts[note.path]=text
 }
 return new VaultIndex(index.allFiles().filter(f=>!privateNotes.has(f.path)),texts)
}
