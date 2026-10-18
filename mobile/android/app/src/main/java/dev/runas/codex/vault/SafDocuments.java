package dev.runas.codex.vault;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.DocumentsContract.Document;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/** DocumentsContract em lote; o provedor local aplica a permissão à árvore inteira, inclusive após renomear. */
final class SafDocuments implements DocumentTree {
    private static final String[] COLUMNS = { Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME,
        Document.COLUMN_MIME_TYPE, Document.COLUMN_SIZE, Document.COLUMN_LAST_MODIFIED, Document.COLUMN_FLAGS };
    private final ContentResolver resolver;
    private final Uri tree;

    SafDocuments(ContentResolver resolver, Uri tree) throws IOException {
        // O app é offline. Provedores remotos podem fazer rede ao abrir um arquivo, mesmo sem rede na interface.
        if (!"content".equals(tree.getScheme()) || !"com.android.externalstorage.documents".equals(tree.getAuthority()) || !DocumentsContract.isTreeUri(tree)) {
            throw new VaultStore.VaultError("Escolha uma pasta local da memória interna ou do cartão para abrir pelo seletor.");
        }
        this.resolver = resolver;
        this.tree = tree;
    }

    public String identity() { return tree.toString(); }
    private Uri uri(Node n) { return DocumentsContract.buildDocumentUriUsingTree(tree, n.id); }
    public String source(Node n) { return uri(n).toString(); }

    private Node row(Cursor c) throws IOException {
        if (c.isNull(0) || c.isNull(1)) throw new VaultStore.VaultError("O provedor não informou o nome do documento.");
        return new Node(c.getString(0), c.getString(1), Document.MIME_TYPE_DIR.equals(c.getString(2)),
            c.isNull(3) ? -1 : c.getLong(3), c.isNull(4) ? -1 : c.getLong(4), c.isNull(5) ? 0 : c.getInt(5));
    }

    private Node query(Uri document) throws IOException {
        try (Cursor c = resolver.query(document, COLUMNS, null, null, null)) {
            if (c == null || !c.moveToFirst()) throw new FileNotFoundException("Documento não encontrado no cofre.");
            return row(c);
        } catch (SecurityException | IllegalArgumentException e) { throw new VaultStore.VaultError("Sem acesso à pasta do cofre. Escolha-a novamente pelo seletor."); }
    }

    public Node root() throws IOException { return query(DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))); }

    public List<Node> children(Node parent) throws IOException {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parent.id);
        List<Node> out = new ArrayList<>();
        try (Cursor c = resolver.query(children, COLUMNS, null, null, null)) {
            if (c == null) throw new IOException("Não deu para listar a pasta do cofre.");
            while (c.moveToNext()) out.add(row(c));
            return out;
        } catch (SecurityException | IllegalArgumentException e) { throw new VaultStore.VaultError("Sem acesso à pasta do cofre. Escolha-a novamente pelo seletor."); }
    }

    public InputStream read(Node file) throws IOException {
        try {
            InputStream stream = resolver.openInputStream(uri(file));
            if (stream == null) throw new FileNotFoundException("Arquivo não encontrado no cofre: " + file.name);
            return stream;
        } catch (SecurityException e) { throw new VaultStore.VaultError("O Android não deixou ler o arquivo do cofre."); }
    }

    private static void supports(Node n, int flag) throws IOException {
        if ((n.flags & flag) == 0) throw new VaultStore.VaultError("O provedor da pasta não oferece a operação necessária para gravar com segurança.");
    }

    public Node create(Node parent, String name, boolean folder) throws IOException {
        supports(parent, Document.FLAG_DIR_SUPPORTS_CREATE);
        try {
            Uri created = DocumentsContract.createDocument(resolver, uri(parent), folder ? Document.MIME_TYPE_DIR : "application/octet-stream", name);
            if (created == null) throw new IOException("Não deu para criar o documento no cofre.");
            Node result = query(created);
            if (!result.name.equals(name) && !(name.startsWith(".runas-") && result.name.startsWith(name))) {
                DocumentsContract.deleteDocument(resolver, created);
                throw new VaultStore.VaultError("O provedor mudou o nome do arquivo ao criá-lo.");
            }
            return result;
        } catch (SecurityException | UnsupportedOperationException e) { throw new VaultStore.VaultError("O provedor não deixou criar o documento no cofre."); }
    }

    public void write(Node file, byte[] bytes) throws IOException {
        supports(file, Document.FLAG_SUPPORTS_WRITE);
        supports(file, Document.FLAG_SUPPORTS_RENAME);
        supports(file, Document.FLAG_SUPPORTS_DELETE);
        // Só abre o temporário. Nunca trunca o documento original.
        try {
            ParcelFileDescriptor descriptor = resolver.openFileDescriptor(uri(file), "rwt");
            if (descriptor == null) throw new IOException("Não deu para abrir o temporário do cofre.");
            try (ParcelFileDescriptor.AutoCloseOutputStream out = new ParcelFileDescriptor.AutoCloseOutputStream(descriptor)) {
                out.write(bytes);
                out.flush();
                out.getFD().sync();
            }
        } catch (SecurityException | UnsupportedOperationException e) { throw new VaultStore.VaultError("O provedor não deixou concluir o temporário do cofre."); }
    }

    public Node rename(Node file, String name) throws IOException {
        supports(file, Document.FLAG_SUPPORTS_RENAME);
        try {
            Uri renamed = DocumentsContract.renameDocument(resolver, uri(file), name);
            if (renamed == null) throw new IOException("Não deu para renomear o documento no cofre.");
            return query(renamed);
        } catch (SecurityException | UnsupportedOperationException e) { throw new VaultStore.VaultError("O provedor não deixou renomear o documento no cofre."); }
    }

    public Node move(Node file, Node from, Node to) throws IOException {
        supports(file, Document.FLAG_SUPPORTS_MOVE);
        try {
            Uri moved = DocumentsContract.moveDocument(resolver, uri(file), uri(from), uri(to));
            if (moved == null) throw new IOException("Não deu para mover o documento no cofre.");
            return query(moved);
        } catch (SecurityException | UnsupportedOperationException e) { throw new VaultStore.VaultError("O provedor não deixou mover o documento no cofre."); }
    }

    public void delete(Node file) throws IOException {
        supports(file, Document.FLAG_SUPPORTS_DELETE);
        try {
            if (!DocumentsContract.deleteDocument(resolver, uri(file))) throw new IOException("Não deu para remover o documento temporário do cofre.");
        } catch (SecurityException | UnsupportedOperationException e) { throw new VaultStore.VaultError("O provedor não deixou remover o documento do cofre."); }
    }
}
