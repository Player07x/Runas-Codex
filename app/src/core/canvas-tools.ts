import type { CanvasNode } from "./canvas"
export interface CanvasView {x:number;y:number;zoom:number}
export interface CanvasPoint {x:number;y:number}
export function pinchCanvas(view:CanvasView,first:CanvasPoint,second:CanvasPoint,nextFirst:CanvasPoint,nextSecond:CanvasPoint):CanvasView {
 const distance=Math.max(1,Math.hypot(first.x-second.x,first.y-second.y)),next=Math.hypot(nextFirst.x-nextSecond.x,nextFirst.y-nextSecond.y),zoom=Math.min(2.5,Math.max(.15,view.zoom*next/distance))
 const x=(first.x+second.x)/2,y=(first.y+second.y)/2,nx=(nextFirst.x+nextSecond.x)/2,ny=(nextFirst.y+nextSecond.y)/2
 return {zoom,x:nx-(x-view.x)*zoom/view.zoom,y:ny-(y-view.y)*zoom/view.zoom}
}
export function selectCanvasBox(nodes:CanvasNode[],a:CanvasPoint,b:CanvasPoint):string[] {
 const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y)
 return nodes.filter(n=>n.x<=right&&n.x+n.width>=left&&n.y<=bottom&&n.y+n.height>=top).map(n=>n.id)
}
export function cropPixels(width:number,height:number,crop:{x:number;y:number;width:number;height:number}) {
 if(![width,height,crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||width<1||height<1||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>100||crop.y+crop.height>100)throw new Error("O recorte deve ficar dentro da imagem, em porcentagens de 0 a 100.")
 const result={x:Math.floor(width*crop.x/100),y:Math.floor(height*crop.y/100),width:Math.max(1,Math.floor(width*crop.width/100)),height:Math.max(1,Math.floor(height*crop.height/100))}
 if(result.width*result.height>40000000)throw new Error("Escolha um recorte com até 40 milhões de pixels.")
 return result
}
