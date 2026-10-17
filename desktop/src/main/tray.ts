import { app, Menu, nativeImage, Tray, type BrowserWindow } from "electron"
import icon from "../../build/icon.png?asset"
export class DesktopTray {
 private tray:Tray|null=null
 private window:BrowserWindow|null=null
 private quitting=false
 constructor(){app.on("before-quit",()=>{this.quitting=true})}
 attach(window:BrowserWindow){this.window=window;window.on("close",event=>{if(this.tray&&!this.quitting){event.preventDefault();window.hide()}})}
 set(enabled:boolean):boolean {
  if(!enabled){this.tray?.destroy();this.tray=null;return false}
  if(!this.window||this.window.isDestroyed())throw new Error("Janela principal indisponível.")
  if(!this.tray){this.tray=new Tray(nativeImage.createFromPath(icon).resize({width:24,height:24}));this.tray.setToolTip("Runas-Codex — Agenda e lembretes ativos");this.tray.setContextMenu(Menu.buildFromTemplate([{label:"Abrir Runas-Codex",click:()=>{this.window?.show();this.window?.focus()}},{type:"separator"},{label:"Sair do Runas-Codex",click:()=>app.quit()}]));this.tray.on("click",()=>{this.window?.show();this.window?.focus()})}
  return true
 }
}
