package dev.runas.codex.vault;

import org.junit.Test;
import org.junit.Rule;
import org.junit.rules.TemporaryFolder;
import java.io.*;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.Arrays;
import static org.junit.Assert.*;

public class BinaryTransfersTest {
    @Rule public TemporaryFolder tmp=new TemporaryFolder();
    @Test public void transportaAudio92MbEZip270MbSemArrayNativoDoArquivo() throws Exception {
        for(int mb:new int[]{92,270}) {
            File root=tmp.newFolder(), cache=tmp.newFolder(); VaultStore store=new VaultStore(root); BinaryTransfers transfer=new BinaryTransfers();
            byte[] chunk=new byte[BinaryTransfers.CHUNK]; for(int i=0;i<chunk.length;i++)chunk[i]=(byte)(i%251);
            long size=mb*1024L*1024;String path="Anexos/arquivo-"+mb+".bin";
            MessageDigest expected=MessageDigest.getInstance("SHA-256");
            int id=transfer.writeStart(store,store,path,size,null,true,cache);
            for(long at=0;at<size;at+=chunk.length){transfer.writeChunk(id,chunk);expected.update(chunk);}
            VaultStore.Entry entry=transfer.writeFinish(id);assertEquals(size,entry.size);assertEquals(0,cache.list().length);
            MessageDigest actual=MessageDigest.getInstance("SHA-256");int reader=transfer.readStart(store,path);
            for(long at=0;at<size;){byte[] part=transfer.readChunk(reader);assertTrue(part.length<=BinaryTransfers.CHUNK);at+=part.length;actual.update(part);}
            transfer.readFinish(reader);assertArrayEquals(expected.digest(),actual.digest());assertEquals(0,transfer.openCount());
            Files.delete(new File(root,path).toPath());
        }
    }
    @Test public void arquivoSoApareceInteiroEAbortarPreservaOriginal() throws Exception {
        VaultStore store=new VaultStore(tmp.newFolder());File cache=tmp.newFolder();BinaryTransfers transfer=new BinaryTransfers();
        int id=transfer.writeStart(store,store,"a.bin",3,null,true,cache);transfer.writeChunk(id,new byte[]{1});
        assertEquals(0,store.list("",false).size());
        try{transfer.writeFinish(id);fail();}catch(IOException expected){}assertEquals(0,cache.list().length);
        store.writeBinary("a.bin",new byte[]{9},null,true);id=transfer.writeStart(store,store,"a.bin",2,null,false,cache);transfer.writeChunk(id,new byte[]{1,2});transfer.abortAll();
        assertArrayEquals(new byte[]{9},store.readBinary("a.bin"));assertEquals(0,cache.list().length);
    }
    @Test public void recusaConflitoAposInicioELeituraModificada() throws Exception {
        VaultStore store=new VaultStore(tmp.newFolder());File cache=tmp.newFolder();BinaryTransfers transfer=new BinaryTransfers();
        store.writeBinary("a.bin",new byte[]{9},null,true);
        int id=transfer.writeStart(store,store,"a.bin",2,null,false,cache);transfer.writeChunk(id,new byte[]{1,2});
        store.writeBinary("a.bin",new byte[]{8,8,8},null,false);
        try{transfer.writeFinish(id);fail();}catch(IOException expected){}assertArrayEquals(new byte[]{8,8,8},store.readBinary("a.bin"));
        id=transfer.readStart(store,"a.bin");transfer.readChunk(id);store.writeBinary("a.bin",new byte[]{7},null,false);
        try{transfer.readFinish(id);fail();}catch(IOException expected){}assertEquals(0,transfer.openCount());
    }
    @Test public void recusaLimiteOcultosEscapeEExcessoDeBytes() throws Exception {
        VaultStore store=new VaultStore(tmp.newFolder());File cache=tmp.newFolder();BinaryTransfers transfer=new BinaryTransfers();
        for(String path:new String[]{"../x","/x",".obsidian/x"}) {try{transfer.writeStart(store,store,path,1,null,true,cache);fail(path);}catch(IOException expected){}}
        try{transfer.writeStart(store,store,"x",BinaryContent.MAX_SIZE+1,null,true,cache);fail();}catch(IOException expected){}
        int id=transfer.writeStart(store,store,"x",1,null,true,cache);
        try{transfer.writeChunk(id,new byte[]{1,2});fail();}catch(IOException expected){}assertEquals(0,cache.list().length);
    }
}
