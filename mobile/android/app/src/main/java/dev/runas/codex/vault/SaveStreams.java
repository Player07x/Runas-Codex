package dev.runas.codex.vault;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Exportações grandes em pedaços (U50, ADR 0037): a interface manda o pacote aos poucos para o arquivo que o usuário
 * escolheu. No Android o arquivo já tem o nome final (o seletor de documentos não deixa renomear depois), então
 * cancelar, falhar ou fechar o app apaga o arquivo pela metade.
 */
final class SaveStreams {
    /** Apaga o arquivo incompleto; falhas aqui são ignoradas (o provedor pode não permitir apagar). */
    interface Cleanup { void run() throws IOException; }

    private static final class Item {
        final OutputStream stream;
        final String name;
        final Cleanup delete;
        Item(OutputStream stream, String name, Cleanup delete) { this.stream = stream; this.name = name; this.delete = delete; }
    }

    private final Map<Integer, Item> open = new HashMap<>();
    private int next = 1;

    synchronized int start(OutputStream stream, String name, Cleanup delete) {
        int id = next++;
        open.put(id, new Item(stream, name, delete));
        return id;
    }

    void write(int id, byte[] bytes) throws IOException {
        Item item = get(id);
        try {
            item.stream.write(bytes);
        } catch (IOException | RuntimeException e) {
            abort(id);
            throw e;
        }
    }

    /** Fecha o arquivo e devolve o nome que o usuário vê; se não fechar, apaga o que ficou. */
    String finish(int id) throws IOException {
        Item item = remove(id);
        if (item == null) throw new IOException("A exportação foi encerrada.");
        try {
            item.stream.close();
        } catch (IOException | RuntimeException e) {
            discard(item);
            throw e;
        }
        return item.name;
    }

    void abort(int id) {
        Item item = remove(id);
        if (item == null) return;
        try { item.stream.close(); } catch (IOException | RuntimeException ignored) { /* vai ser apagado */ }
        discard(item);
    }

    /** Ao fechar o app no meio de uma exportação, não fica pacote incompleto para trás. */
    void abortAll() {
        ArrayList<Integer> ids;
        synchronized (this) { ids = new ArrayList<>(open.keySet()); }
        for (int id : ids) abort(id);
    }

    synchronized int openCount() { return open.size(); }

    private synchronized Item remove(int id) { return open.remove(id); }

    private Item get(int id) throws IOException {
        Item item;
        synchronized (this) { item = open.get(id); }
        if (item == null) throw new IOException("A exportação foi encerrada.");
        return item;
    }

    private static void discard(Item item) {
        try { item.delete.run(); } catch (IOException | RuntimeException ignored) { /* o provedor não deixou apagar */ }
    }
}
