import { describe, expect, it } from "vitest"
import { PortableDatabase, PortableWorldStore, type WorldFile, type WorldFiles } from "./portable-world-store"
import { RoomAuthority } from "./room-authority"
import { putDocument, deleteDocument } from "./world-documents"
import { VisionService } from "./vision-service"
import type { PlayerWireMessage } from "./player"
import type { PlayerTransportOptions } from "./transport"
import { hashPlayerSecret, PlayerSession } from "./player-session"

function files() {
  const entries=new Map<string,{version:WorldFile;bytes:Uint8Array}>()
  let clock=1
  const io:WorldFiles={
    list:async()=>[...entries.values()].map(e=>({...e.version})),
    read:async path=>{const value=entries.get(path);if(!value)throw new Error("Ausente");return value.bytes.slice()},
    write:async(path,bytes,expected)=>{
      const current=entries.get(path)
      if(current ? !expected || expected.mtime!==current.version.mtime || expected.size!==current.version.size : expected!==null)throw new Error("Arquivo mudou fora do app")
      const version={path,mtime:++clock,size:bytes.length};entries.set(path,{bytes:bytes.slice(),version});return {...version}
    },
  }
  return {io,entries}
}
async function room() {
  const {io,entries}=files(), store=new PortableWorldStore(io)
  const summary=await store.create({title:"Sessão no celular"});await store.open(summary.id)
  const db=store.database()
  putDocument(db,{id:"scene",type:"scene",parentId:null,data:{name:"Praça",width:1000,height:1000}})
  putDocument(db,{id:"hero",type:"token",parentId:"scene",data:{name:"Heroína",x:150,y:150,disposition:"player",playerSlotId:"player-1"}})
  putDocument(db,{id:"secret",type:"token",parentId:"scene",data:{name:"SEGREDO",hidden:true}})
  putDocument(db,{id:"wall",type:"wall",parentId:"scene",data:{x1:500,y1:0,x2:500,y2:1000}})
  let options!:PlayerTransportOptions
  const sent:PlayerWireMessage[]=[]
  const authority=new RoomAuthority(store,value=>{options=value;return {spectatorCount:0,addressPort:30000,start:async()=>undefined,stop:async()=>undefined,publish:message=>sent.push(message),publishTo:make=>sent.push(make(null))}},()=>undefined,new VisionService(()=>db),()=>"192.168.1.8")
  authority.setCommit(change=>authority.onDocumentChange(change))
  authority.setMasterView({sceneId:"scene",selection:[],center:null})
  const state=await authority.start(30000,2)
  return {store,db,authority,options,sent,state,io,entries}
}
describe("autoridade compartilhada da sala",()=>{
  it("entrega só a projeção pública e autentica o mesmo assento nas duas plataformas",async()=>{
    const {authority,options,state}=await room()
    const snapshot=JSON.stringify(options.snapshot(null))
    expect(snapshot).toContain("Heroína");expect(snapshot).not.toContain("SEGREDO");expect(snapshot).not.toContain('"wall"')
    expect(state.localUrl).toContain("192.168.1.8:30000")
    const joined=options.joinSeat!(state.seats[0]!.code!)!
    expect(options.authenticateSeat!(joined.token)?.slotId).toBe("player-1")
    expect(JSON.stringify(authority.state())).not.toContain(joined.token)
    authority.rotateSeatCode("player-1")
    expect(options.authenticateSeat!(joined.token)).toBeNull()
    await authority.stop();expect(options.joinSeat!(state.seats[0]!.code!)).toBeNull()
  })
  it("recusa espectador, outro assento, parede e movimentos desativados",async()=>{
    const {authority,options,db}=await room(), move={type:"move",tokenId:"hero",x:250,y:250}
    expect(options.onClientMessage!(move,null)).toMatchObject({ok:false})
    expect(options.onClientMessage!(move,{slotId:"player-2",label:"Outro"})).toMatchObject({ok:false})
    const seat={slotId:"player-1",label:"Jogador 1"}
    expect(options.onClientMessage!({...move,x:750},seat)).toMatchObject({ok:false})
    expect(options.onClientMessage!(move,seat)).toMatchObject({ok:true})
    expect(db.get("hero")?.data).toMatchObject({x:250,y:250})
    authority.setMovesEnabled(false)
    expect(options.onClientMessage!(move,seat)).toMatchObject({ok:false})
  })
  it("usa SHA-256 e mantém códigos e cookies apenas na sessão",()=>{
    expect(hashPlayerSecret("abcd-efgh")).toBe("9ac2197d9258257b1ae8463e4214e4cd0a578bc1517f2415928b91be4283fc48")
    const {session,codes}=PlayerSession.create(2)
    const token=session.issueAccessToken("player-1")
    expect(JSON.stringify(session.snapshot())).not.toContain(codes["player-1"])
    expect(JSON.stringify(session.snapshot())).not.toContain(token)
    session.clearSeat("player-1");expect(session.authenticateAccessToken(token)).toBeNull()
  })
})
describe("mesas portáteis com gravação versionada",()=>{
  it("reabre cenas, preserva os demais documentos e persiste exclusões",async()=>{
    const {store,db,io}=await room()
    putDocument(db,{id:"playlist",type:"playlist",parentId:null,data:{name:"Música"}})
    const id=store.openWorld!.summary.id
    await store.close();await store.open(id)
    expect(store.database().list("token","scene")).toHaveLength(2)
    deleteDocument(store.database(),"scene");await store.close()
    const reopened=new PortableWorldStore(io);await reopened.open(id)
    expect(reopened.database().list("token")).toEqual([])
    expect(reopened.database().list("playlist")).toHaveLength(1)
  })
  it("recusa sobrescrever uma edição externa e bloqueia as gravações seguintes",async()=>{
    const {db,io,entries}=await room();await db.flush()
    const target=`${db.path}/cenas/scene.json`,external=new TextEncoder().encode("[]\n")
    await io.write(target,external,entries.get(target)!.version)
    putDocument(db,{id:"hero",type:"token",parentId:"scene",data:{name:"Nova"}})
    await expect(db.flush()).rejects.toThrow("fora do app")
    expect(new TextDecoder().decode(entries.get(target)!.bytes)).toBe("[]\n")
    expect(()=>db.delete("hero")).toThrow("fora do app")
  })
  it("recusa partições inválidas sem criar arquivos",()=>{
    const {io}=files()
    expect(()=>new PortableDatabase(".runas/mesas/teste",io,new Map(),[{}])).toThrow("inválido")
  })
})
