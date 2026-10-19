package dev.runas.codex.testdocuments;

import android.database.Cursor;
import android.database.MatrixCursor;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract.Document;
import android.provider.DocumentsContract.Root;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.webkit.MimeTypeMap;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;

/** Outro UID e outra autoridade: verifica o contrato SAF sem depender de um gerenciador comercial específico. */
public final class TestDocumentsProvider extends DocumentsProvider {
    private static final String[] DOCUMENT_COLUMNS = { Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME,
        Document.COLUMN_MIME_TYPE, Document.COLUMN_SIZE, Document.COLUMN_LAST_MODIFIED, Document.COLUMN_FLAGS };
    private static final String[] ROOT_COLUMNS = { Root.COLUMN_ROOT_ID, Root.COLUMN_DOCUMENT_ID, Root.COLUMN_TITLE, Root.COLUMN_FLAGS };

    private File root() { return new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "cofre-smoke-provider"); }
    @Override public boolean onCreate() { return true; }

    private File file(String id) throws FileNotFoundException {
        try {
            if (!id.equals("vault") && !id.startsWith("vault/")) throw new IOException();
            File base = root().getCanonicalFile();
            File found = id.equals("vault") ? base : new File(base, id.substring(6)).getCanonicalFile();
            if (!found.equals(base) && !found.getPath().startsWith(base.getPath() + File.separator)) throw new IOException();
            if (!found.exists()) throw new IOException();
            return found;
        } catch (IOException e) { throw new FileNotFoundException("Documento de teste inexistente ou fora da árvore."); }
    }

    private String id(File file) throws FileNotFoundException {
        try {
            String base = root().getCanonicalPath(), path = file.getCanonicalPath();
            if (path.equals(base)) return "vault";
            if (!path.startsWith(base + File.separator)) throw new IOException();
            return "vault/" + path.substring(base.length() + 1);
        } catch (IOException e) { throw new FileNotFoundException("Caminho fora da árvore de teste."); }
    }

    private String mime(File file) {
        if (file.isDirectory()) return Document.MIME_TYPE_DIR;
        String name = file.getName();
        int dot = name.lastIndexOf('.');
        String type = dot < 0 ? null : MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1).toLowerCase(Locale.ROOT));
        return type == null ? "application/octet-stream" : type;
    }

    private void row(MatrixCursor cursor, File file) throws FileNotFoundException {
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String column : cursor.getColumnNames()) {
            switch (column) {
                case Document.COLUMN_DOCUMENT_ID: row.add(id(file)); break;
                case Document.COLUMN_DISPLAY_NAME: row.add(file.getName()); break;
                case Document.COLUMN_MIME_TYPE: row.add(mime(file)); break;
                case Document.COLUMN_SIZE: row.add(file.length()); break;
                case Document.COLUMN_LAST_MODIFIED: row.add(file.lastModified()); break;
                case Document.COLUMN_FLAGS:
                    row.add(Document.FLAG_SUPPORTS_DELETE | Document.FLAG_SUPPORTS_RENAME | Document.FLAG_SUPPORTS_MOVE
                        | (file.isDirectory() ? Document.FLAG_DIR_SUPPORTS_CREATE : Document.FLAG_SUPPORTS_WRITE)); break;
                default: row.add(null);
            }
        }
    }

    @Override public Cursor queryRoots(String[] projection) {
        MatrixCursor cursor = new MatrixCursor(projection == null ? ROOT_COLUMNS : projection);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String column : cursor.getColumnNames()) {
            switch (column) {
                case Root.COLUMN_ROOT_ID: row.add("runas-test"); break;
                case Root.COLUMN_DOCUMENT_ID: row.add("vault"); break;
                case Root.COLUMN_TITLE: row.add("Pastas de teste do Runas"); break;
                // Sem FLAG_LOCAL_ONLY: o filtro antigo escondia provedores como este.
                case Root.COLUMN_FLAGS: row.add(Root.FLAG_SUPPORTS_CREATE | Root.FLAG_SUPPORTS_IS_CHILD); break;
                default: row.add(null);
            }
        }
        return cursor;
    }

    @Override public Cursor queryDocument(String documentId, String[] projection) throws FileNotFoundException {
        MatrixCursor cursor = new MatrixCursor(projection == null ? DOCUMENT_COLUMNS : projection);
        row(cursor, file(documentId));
        return cursor;
    }

    @Override public Cursor queryChildDocuments(String parentId, String[] projection, String sortOrder) throws FileNotFoundException {
        MatrixCursor cursor = new MatrixCursor(projection == null ? DOCUMENT_COLUMNS : projection);
        File[] children = file(parentId).listFiles();
        if (children == null) throw new FileNotFoundException("Pasta de teste indisponível.");
        for (File child : children) row(cursor, child);
        return cursor;
    }

    @Override public boolean isChildDocument(String parentId, String childId) throws FileNotFoundException {
        File parent = file(parentId), child = file(childId);
        return child.getPath().startsWith(parent.getPath() + File.separator);
    }

    @Override public DocumentsContract.Path findDocumentPath(String parentId, String childId) throws FileNotFoundException {
        file(childId);
        String current = childId;
        List<String> path = new ArrayList<>();
        while (true) {
            path.add(0, current);
            if (current.equals(parentId == null ? "vault" : parentId)) break;
            int slash = current.lastIndexOf('/');
            if (slash < 0) throw new FileNotFoundException("Documento fora da pasta de teste.");
            current = current.substring(0, slash);
        }
        return new DocumentsContract.Path(parentId == null ? "runas-test" : null, path);
    }

    @Override public ParcelFileDescriptor openDocument(String documentId, String mode, CancellationSignal signal) throws FileNotFoundException {
        return ParcelFileDescriptor.open(file(documentId), ParcelFileDescriptor.parseMode(mode));
    }

    private File target(File parent, String name) throws FileNotFoundException {
        if (!parent.isDirectory() || name.isEmpty() || name.equals(".") || name.equals("..") || name.contains("/") || name.contains("\\")) throw new FileNotFoundException("Nome inválido.");
        File target = new File(parent, name);
        if (target.exists()) throw new FileNotFoundException("Já existe o destino.");
        return target;
    }

    @Override public String createDocument(String parentId, String mimeType, String name) throws FileNotFoundException {
        File target = target(file(parentId), name);
        try {
            if (!(Document.MIME_TYPE_DIR.equals(mimeType) ? target.mkdir() : target.createNewFile())) throw new IOException();
            return id(target);
        } catch (IOException e) { throw new FileNotFoundException("Não deu para criar o documento de teste."); }
    }

    @Override public String renameDocument(String documentId, String name) throws FileNotFoundException {
        File source = file(documentId);
        if (documentId.equals("vault")) throw new FileNotFoundException("Não renomeia a raiz de teste.");
        File target = target(source.getParentFile(), name);
        if (!source.renameTo(target)) throw new FileNotFoundException("Não deu para renomear o documento de teste.");
        return id(target);
    }

    @Override public String moveDocument(String documentId, String parentId, String targetParentId) throws FileNotFoundException {
        File source = file(documentId), parent = file(parentId), destination = file(targetParentId);
        if (!source.getParentFile().equals(parent) || documentId.equals("vault") || destination.getPath().startsWith(source.getPath() + File.separator)) throw new FileNotFoundException("Movimento inválido.");
        File target = target(destination, source.getName());
        if (!source.renameTo(target)) throw new FileNotFoundException("Não deu para mover o documento de teste.");
        return id(target);
    }

    private void remove(File file) throws FileNotFoundException {
        File[] children = file.isDirectory() ? file.listFiles() : null;
        if (children != null) for (File child : children) remove(child);
        if (!file.delete()) throw new FileNotFoundException("Não deu para remover o documento de teste.");
    }

    @Override public void deleteDocument(String documentId) throws FileNotFoundException {
        if (documentId.equals("vault")) throw new FileNotFoundException("Não remove a raiz de teste.");
        remove(file(documentId));
    }
}
