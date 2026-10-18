package dev.runas.codex.vault;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/** E/S do provedor, separada das regras para poder testar falhas e conflitos na JVM. IDs são opacos. */
interface DocumentTree {
    final class Node {
        final String id;
        final String name;
        final boolean folder;
        final long size;
        final long mtime;
        final int flags;

        Node(String id, String name, boolean folder, long size, long mtime, int flags) {
            this.id = id; this.name = name; this.folder = folder;
            this.size = size; this.mtime = mtime; this.flags = flags;
        }
    }

    String identity();
    Node root() throws IOException;
    List<Node> children(Node parent) throws IOException;
    InputStream read(Node file) throws IOException;
    Node create(Node parent, String name, boolean folder) throws IOException;
    void write(Node file, byte[] bytes) throws IOException;
    Node rename(Node file, String name) throws IOException;
    Node move(Node file, Node from, Node to) throws IOException;
    void delete(Node file) throws IOException;
    String source(Node file);
}
