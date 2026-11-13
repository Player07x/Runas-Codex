package dev.runas.codex.vault;

import static org.junit.Assert.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;

/** Exportação em pedaços (U50): junta os pedaços em ordem e apaga o arquivo incompleto ao cancelar ou falhar. */
public class SaveStreamsTest {
    private final SaveStreams streams = new SaveStreams();
    private final AtomicInteger deleted = new AtomicInteger();

    private static byte[] text(String value) { return value.getBytes(StandardCharsets.UTF_8); }

    @Test public void juntaOsPedacosEDevolveONome() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int id = streams.start(out, "Cofre.runas", deleted::incrementAndGet);
        streams.write(id, text("PK"));
        streams.write(id, text("-resto"));
        assertEquals("Cofre.runas", streams.finish(id));
        assertEquals("PK-resto", out.toString(StandardCharsets.UTF_8.name()));
        assertEquals(0, deleted.get());
        assertEquals(0, streams.openCount());
    }

    @Test public void cancelarApagaOArquivo() throws IOException {
        int id = streams.start(new ByteArrayOutputStream(), "x.runas", deleted::incrementAndGet);
        streams.write(id, text("meio"));
        streams.abort(id);
        streams.abort(id);
        assertEquals(1, deleted.get());
        assertThrows(IOException.class, () -> streams.write(id, text("depois")));
        assertThrows(IOException.class, () -> streams.finish(id));
    }

    @Test public void falhaAoGravarApagaOArquivo() {
        OutputStream broken = new OutputStream() {
            @Override public void write(int b) throws IOException { throw new IOException("disco cheio"); }
        };
        int id = streams.start(broken, "x.runas", deleted::incrementAndGet);
        IOException error = assertThrows(IOException.class, () -> streams.write(id, text("a")));
        assertEquals("disco cheio", error.getMessage());
        assertEquals(1, deleted.get());
        assertEquals(0, streams.openCount());
    }

    @Test public void fecharOAppApagaTodosOsIncompletos() {
        streams.start(new ByteArrayOutputStream(), "a.runas", deleted::incrementAndGet);
        streams.start(new ByteArrayOutputStream(), "b.zip", () -> { throw new IOException("sem permissão"); });
        streams.abortAll();
        assertEquals(1, deleted.get());
        assertEquals(0, streams.openCount());
    }
}
