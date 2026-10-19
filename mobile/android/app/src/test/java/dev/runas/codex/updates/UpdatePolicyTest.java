package dev.runas.codex.updates;
import static org.junit.Assert.*;
import org.junit.Test;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class UpdatePolicyTest {
    @Test public void recusaOrigemRedirecionamentosEEnderecosArbitrarios() {
        String base = UpdatePolicy.DOWNLOAD + "v0.1.0-beta.14/Runas-Codex-0.1.0-beta.14-android.apk";
        assertTrue(UpdatePolicy.trustedDownload(base));
        for (String url : new String[] {"http://github.com/Player07x/Runas-Codex/releases/download/x/a", base+"?token=x",base+"#parte", base.replace("github.com","github.com.evil.test"), base.replace("github.com","user@github.com"), base.replace("beta.14/", "beta.14/../"), base.replace("beta.14/", "beta.14/%2f"), "file:///tmp/apk"}) assertFalse(url, UpdatePolicy.trustedDownload(url));
        assertTrue(UpdatePolicy.trustedRedirect("https://release-assets.githubusercontent.com/asset?sig=abc"));
        assertFalse(UpdatePolicy.trustedRedirect("https://exemplo.test/apk"));
        assertFalse(UpdatePolicy.trustedRedirect("http://objects.githubusercontent.com/apk"));
    }
    @Test public void exigeUmaSomaExataDoArquivoEscolhido() throws Exception {
        String hash = new String(new char[64]).replace('\0','a');
        assertEquals(hash, UpdatePolicy.checksum(hash+" *arquivo.apk\r\n", "arquivo.apk"));
        assertThrows(IOException.class, () -> UpdatePolicy.checksum(hash+"  outro.apk", "arquivo.apk"));
        assertThrows(IOException.class, () -> UpdatePolicy.checksum(hash+"  a.apk\n"+hash+"  a.apk", "a.apk"));
    }
    @Test public void medeOsBytesERecusaDownloadsIncompletosOuMaioresQueAPrevia() throws Exception {
        byte[] bytes = "abc".getBytes(StandardCharsets.UTF_8); ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", UpdatePolicy.copy(new ByteArrayInputStream(bytes), output, 3, (received,total)->{}));
        assertArrayEquals(bytes, output.toByteArray());
        for (long size : new long[] {0,2,4,UpdatePolicy.MAX_APK+1}) assertThrows(IOException.class, () -> UpdatePolicy.copy(new ByteArrayInputStream(bytes), new ByteArrayOutputStream(), size, (r,t)->{}));
    }
    @Test public void comparaAplicativoVersaoEAssinaturaSemAceitarArquivoIncompativel() throws Exception {
        String[] signers={"certificado"};
        UpdatePolicy.identity("app","app",100,101,"beta.14","beta.14",signers,signers);
        assertThrows(IOException.class, () -> UpdatePolicy.identity("app","outro",100,101,"14","14",signers,signers));
        assertThrows(IOException.class, () -> UpdatePolicy.identity("app","app",100,100,"14","14",signers,signers));
        assertThrows(IOException.class, () -> UpdatePolicy.identity("app","app",100,101,"14","15",signers,signers));
        assertThrows(IOException.class, () -> UpdatePolicy.identity("app","app",100,101,"14","14",signers,new String[]{"outra"}));
        assertThrows(IOException.class, () -> UpdatePolicy.identity("app","app",100,101,"14","14",new String[0],new String[0]));
    }
}
