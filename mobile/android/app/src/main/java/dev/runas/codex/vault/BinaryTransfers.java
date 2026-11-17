package dev.runas.codex.vault;

import java.io.*;
import java.util.*;

/** U80: no máximo dois arquivos em trânsito; cada mensagem leva até 2 MB, nunca o binário inteiro. */
final class BinaryTransfers {
    static final int CHUNK = 2 * 1024 * 1024;
    private static final class Item {
        final VaultFs owner, fs;
        final String path;
        final long size;
        final VaultStore.Version expected;
        final boolean createOnly;
        final InputStream in;
        final File file;
        final FileOutputStream out;
        long done;
        Item(VaultFs owner, VaultFs fs, String path, long size, VaultStore.Version expected, boolean createOnly, InputStream in, File file, FileOutputStream out) {
            this.owner=owner; this.fs=fs; this.path=path; this.size=size; this.expected=expected; this.createOnly=createOnly; this.in=in; this.file=file; this.out=out;
        }
    }
    private final Map<Integer, Item> items = new HashMap<>();
    private int next = 1;
    private void room(long size) throws IOException {
        if (size < 0 || size > BinaryContent.MAX_SIZE) throw new IOException("O arquivo passa do limite de 512 MB.");
        if (items.size() >= 2) throw new IOException("Aguarde os arquivos que já estão em transferência.");
    }
    synchronized int readStart(VaultFs owner, String path) throws IOException {
        VaultStore.Entry entry=owner.entry(path); room(entry.size);
        items.put(next, new Item(owner,owner,path,entry.size,new VaultStore.Version(entry.size,entry.mtime),false,owner.openBinary(path),null,null));
        return next++;
    }
    synchronized long size(int id) throws IOException { return get(id).size; }
    synchronized VaultFs owner(int id) throws IOException { return get(id).owner; }
    synchronized byte[] readChunk(int id) throws IOException {
        Item item=get(id);
        try {
            if (item.in == null) throw new IOException("Esta transferência não é uma leitura.");
            byte[] buffer=new byte[(int)Math.min(CHUNK,item.size-item.done)];
            int n=BinaryContent.readChunk(item.in,buffer);
            if (n != buffer.length) throw new IOException("O arquivo terminou antes do tamanho informado.");
            item.done+=n; return buffer;
        } catch (IOException | RuntimeException e) { abort(id); throw e; }
    }
    synchronized void readFinish(int id) throws IOException {
        Item item=get(id);
        try {
            if (item.in == null || item.done != item.size || item.in.read() != -1 || !VaultStore.sameVersion(item.fs.entry(item.path),item.expected)) throw new IOException("O arquivo mudou durante a leitura. Tente novamente.");
        } finally { abort(id); }
    }
    synchronized int writeStart(VaultFs owner,VaultFs fs,String path,long size,VaultStore.Version expected,boolean createOnly,File cache) throws IOException {
        room(size);
        for (String part:VaultStore.split(path)) if (part.startsWith(".")) throw new IOException("Não é permitido gravar em caminhos ocultos.");
        // Mesmo a chamada antiga sem versão fica vinculada ao destino visto antes do primeiro pedaço.
        if (expected == null && !createOnly) {
            try { VaultStore.Entry e=fs.entry(path); expected=new VaultStore.Version(e.size,e.mtime); }
            catch (FileNotFoundException e) { createOnly=true; }
            catch (VaultStore.VaultError e) { if (e.getMessage().startsWith("Arquivo não encontrado")) createOnly=true; else throw e; }
        }
        if (!cache.isDirectory() && !cache.mkdirs()) throw new IOException("Não deu para preparar o arquivo temporário.");
        File file=File.createTempFile("binary-", ".part",cache);
        try { items.put(next,new Item(owner,fs,path,size,expected,createOnly,null,file,new FileOutputStream(file))); }
        catch (IOException e) { file.delete(); throw e; }
        return next++;
    }
    synchronized void writeChunk(int id,byte[] bytes) throws IOException {
        Item item=get(id);
        try {
            if (item.out == null || bytes.length == 0 || bytes.length > CHUNK || item.done+bytes.length > item.size) throw new IOException("Pedaço inválido para a gravação do arquivo.");
            item.out.write(bytes); item.done+=bytes.length;
        } catch (IOException | RuntimeException e) { abort(id); throw e; }
    }
    synchronized VaultStore.Entry writeFinish(int id) throws IOException {
        Item item=get(id);
        try {
            if (item.out == null || item.done != item.size) throw new IOException("A gravação do arquivo está incompleta.");
            item.out.getFD().sync(); item.out.close();
            VaultStore.Entry entry=item.fs.writeBinaryFromFile(item.path,item.file,item.expected,item.createOnly);
            return item.fs==item.owner ? entry : new VaultStore.Entry(VaultTransfer.PREFIX+entry.path,entry.size,entry.mtime,entry.uri);
        } finally { abort(id); }
    }
    synchronized void abort(int id) {
        Item item=items.remove(id); if(item==null)return;
        try { if(item.in!=null)item.in.close(); }catch(IOException ignored){}
        try { if(item.out!=null)item.out.close(); }catch(IOException ignored){}
        if(item.file!=null)item.file.delete();
    }
    synchronized void abortAll() { for(int id:new ArrayList<>(items.keySet()))abort(id); }
    synchronized int openCount() { return items.size(); }
    private Item get(int id)throws IOException { Item item=items.get(id);if(item==null)throw new IOException("A transferência do arquivo foi encerrada.");return item; }
}
