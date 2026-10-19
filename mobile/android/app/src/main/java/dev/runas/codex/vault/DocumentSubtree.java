package dev.runas.codex.vault;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/** Reutiliza a gravação segura sobre a raiz interna autorizada, mantendo as URIs do provedor original. */
final class DocumentSubtree implements DocumentTree {
    private final DocumentTree source;
    private final Node root;
    DocumentSubtree(DocumentTree source, Node root) { this.source = source; this.root = root; }
    public String identity() { return source.identity() + "#runas-worlds"; }
    public Node root() { return root; }
    public List<Node> children(Node parent) throws IOException { return source.children(parent); }
    public InputStream read(Node file) throws IOException { return source.read(file); }
    public Node create(Node parent, String name, boolean folder) throws IOException { return source.create(parent, name, folder); }
    public void write(Node file, byte[] bytes) throws IOException { source.write(file, bytes); }
    public Node rename(Node file, String name) throws IOException { return source.rename(file, name); }
    public Node move(Node file, Node from, Node to) throws IOException { return source.move(file, from, to); }
    public void delete(Node file) throws IOException { source.delete(file); }
    public String source(Node file) { return source.source(file); }
}
