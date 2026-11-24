import { useState } from "react"
import type { IndexedNote } from "../../core/vault-index"
import { publicArticle, type PublicImage } from "../../core/public-article"
import { useVault } from "../../platform/VaultProvider"
import { vtt } from "../../vtt/api"
import { Modal } from "../../components/ui"

/**
 * Copia para a mesa aberta as imagens que continuam no texto e devolve alvo → asset (anexo 6, 24/11). Uma imagem que
 * não deu para copiar fica de fora: o jogador vê o nome dela no lugar, e o artigo sai mesmo assim.
 */
async function copyImages(text: string, images: PublicImage[], read: (path: string) => Promise<Uint8Array>): Promise<{ images: Record<string, string>; failed: number }> {
  const out: Record<string, string> = {}
  let failed = 0
  for (const image of images) {
    if (!text.includes(image.target)) continue
    try { out[image.target] = await vtt.assets.import("tiles", image.path.split("/").at(-1) ?? "imagem.png", await read(image.path)) }
    catch { failed++ }
  }
  return { images: out, failed }
}

export function ShowArticle({note}:{note:IndexedNote}) {
 const vault=useVault(),[open,setOpen]=useState(false),[text,setText]=useState(""),[images,setImages]=useState<PublicImage[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[recipient,setRecipient]=useState(""),[seats,setSeats]=useState<{slotId:string;label:string}[]>([])
 const preview=(target:string,list=seats)=>{setRecipient(target);try{const result=publicArticle(vault.index!,note,list.find(s=>s.slotId===target)?.label);setText(result.text);setImages(result.images);setMessage("")}catch(e){setText("");setImages([]);setMessage(String(e))}}
 const present=async()=>{
  setBusy(true)
  try{
   if(!vtt.collaboration)throw new Error("Esta versão da sala não permite apresentar artigos.")
   const copied=await copyImages(text,images,path=>vault.platform.readBinary(path))
   await vtt.collaboration.command({type:"handout",handout:{title:note.name,text,...(recipient?{recipients:[recipient]}:{}),...(Object.keys(copied.images).length?{images:copied.images}:{})}})
   setOpen(false)
   const who=recipient?"Artigo apresentado ao jogador escolhido.":"Artigo apresentado a todos na sala."
   setMessage(copied.failed?`${who} ${copied.failed === 1 ? "Uma imagem não pôde ser copiada para a mesa e" : `${copied.failed} imagens não puderam ser copiadas para a mesa e`} aparece só pelo nome.`:who)
  }catch(e){setMessage(String(e))}finally{setBusy(false)}
 }
 return <section className="card stack"><button className="btn" disabled={vault.info?.readOnly} onClick={()=>{setBusy(true);void vtt.player.state().then(state=>{setSeats(state.seats);preview("",state.seats);setOpen(true)}).catch(e=>setMessage(String(e))).finally(()=>setBusy(false))}}>Mostrar artigo pela sala</button>{message&&!open&&<p role="status">{message}</p>}{open&&<Modal title="Apresentar artigo aos jogadores" onClose={()=>!busy&&setOpen(false)} wide footer={<><button className="btn" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button className="btn primary" disabled={busy||!text.trim()} onClick={()=>void present()}>{busy?"Apresentando…":"Apresentar na sala"}</button></>}><label>Destinatário<select className="input" value={recipient} onChange={e=>preview(e.target.value)}><option value="">Todos na sala</option>{seats.map(s=><option key={s.slotId} value={s.slotId}>{s.label}</option>)}</select></label><p>Confira o texto que será recebido. Só entram os segredos destinados ao jogador escolhido. O jogador vê o artigo formatado, com as imagens dele{images.length?` (${images.length === 1 ? "1 imagem vai" : `${images.length} imagens vão`} junto, copiadas para a mesa)`:""}; propriedades e conteúdo de outras notas ficam de fora.</p><label>Texto para os jogadores<textarea className="input" rows={16} maxLength={50000} value={text} onChange={e=>setText(e.target.value)}/></label>{message&&<p role="alert">{message}</p>}</Modal>}<button className="btn" disabled={busy||vault.info?.readOnly||!vtt.collaboration} onClick={()=>{setBusy(true);void vtt.collaboration!.command({type:"handout",handout:null}).then(()=>setMessage("Apresentação encerrada.")).catch(e=>setMessage(String(e))).finally(()=>setBusy(false))}}>Encerrar apresentação na sala</button></section>
}
