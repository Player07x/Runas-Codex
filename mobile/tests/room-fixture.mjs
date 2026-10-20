import { mkdir,writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const output=process.argv[2] ?? '/tmp/runas-android-room'
const folder=join(output,'fixture/.runas/mesas/ci-x7')
await mkdir(join(folder,'cenas'),{recursive:true});await mkdir(join(folder,'assets/maps'),{recursive:true});await mkdir(join(folder,'assets/tokens'),{recursive:true})
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=','base64')
const hash=createHash('sha256').update(image).digest('hex'),map=`maps/${hash}.png`,secret=`tokens/${hash}.png`
await writeFile(join(folder,'assets',map),image);await writeFile(join(folder,'assets',secret),image)
await writeFile(join(folder,'mesa.json'),JSON.stringify({id:'x7-ci',formatVersion:1,title:'Sala Android X7',description:'Teste isolado da sala',createdAt:1,updatedAt:1}))
const doc=(id,type,parentId,data)=>({id,type,parentId,data,sort:1,createdAt:1,updatedAt:1})
await writeFile(join(folder,'cenas/scene.json'),JSON.stringify([
  doc('scene','scene',null,{name:'Praça no Android',width:1000,height:1000,background:map}),
  doc('hero','token','scene',{name:'Heroína',x:150,y:150,disposition:'player',playerSlotId:'player-1'}),
  doc('secret','token','scene',{name:'SEGREDO-X7',x:250,y:250,hidden:true,image:secret}),
  doc('wall','wall','scene',{x1:500,y1:0,x2:500,y2:1000}),
]))
await mkdir(join(output,'fixture/Notas'),{recursive:true});await writeFile(join(output,'fixture/Notas/Intacta.md'),'# Nota intacta\n')
await writeFile(join(output,'fixture.json'),JSON.stringify({map,secret,imageBytes:image.length}))
