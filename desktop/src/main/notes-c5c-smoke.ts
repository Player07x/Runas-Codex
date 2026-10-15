/** Roteiro da C5c dentro da janela real, com o cofre temporário do --smoke --write. */
export const NOTES_C5C_SMOKE = `
  location.hash = "/notas/" + encodeURIComponent("Notas/C5c/Porto de teste.md")
  await until(() => document.querySelector('.editor-status')?.getAttribute('title') === 'Notas/C5c/Porto de teste.md')
  ;[...document.querySelectorAll('.editor-bar [role=tab]')].find(e => e.textContent.includes('Leitura'))?.click()
  await until(() => document.querySelectorAll('.query-view tbody tr').length === 3, 100)
  result.notesC5c = {
    bases: document.querySelectorAll('.query-view')[0]?.querySelectorAll('tbody tr').length === 2,
    formula: document.querySelector('.query-summary')?.textContent.includes('22') === true,
    dataview: document.querySelectorAll('.query-view')[1]?.querySelectorAll('tbody tr').length === 1,
  }
  const clickC5 = (label) => [...document.querySelectorAll('button')].find(e => e.getAttribute('aria-label') === label || e.textContent.trim() === label)?.click()
  clickC5('Dividir à direita')
  await until(() => document.querySelectorAll('.tab-pane').length === 2)
  result.notesC5c.split = document.querySelectorAll('.tab-pane').length === 2
  clickC5('Workspaces')
  const workspaceName = await until(() => document.querySelector('[aria-label="Nome do workspace"]'))
  if (workspaceName) { setter.call(workspaceName, 'Smoke C5c'); workspaceName.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); workspaceName.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await wait(100) }
  result.notesC5c.workspace = localStorage.getItem('runas-codex:workspaces:' + result.vault.path)?.includes('Smoke C5c') === true
  document.querySelector('.workspace-menu input')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  clickC5('Fechar o painel 2')
  await until(() => document.querySelectorAll('.tab-pane').length === 1)
  clickC5('Ferramentas da nota')
  await until(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Histórico de versões'))
  clickC5('Histórico de versões')
  await until(() => document.querySelector('[aria-label="Versão da nota"]'))
  await until(() => [...document.querySelectorAll('.modal button')].some(button => button.textContent.trim() === 'Guardar versão agora' && !button.disabled))
  clickC5('Guardar versão agora')
  await until(() => document.querySelector('[aria-label="Versão da nota"] option'))
  result.notesC5c.history = document.querySelectorAll('[aria-label="Versão da nota"] option').length > 0
  ;[...document.querySelectorAll('.modal button')].find(b => b.textContent.trim() === 'Fechar')?.click()
  // A lixeira real também aceita recuperar arquivo apagado fora do renderer.
  const restoredName = 'Notas/C5c/Restaurada.md'
  await bridge.vault.write(restoredName, '# Recuperável', null)
  await bridge.vault.trash(restoredName)
  const deleted = (await bridge.vault.listTrash()).find(e => e.path.endsWith('/Restaurada.md'))
  if (deleted) await bridge.vault.restoreTrash(deleted.path, restoredName)
  result.notesC5c.trash = (await bridge.vault.read([restoredName]))[restoredName] === '# Recuperável'
  result.notesC5c.words = Boolean(document.querySelector('.note-word-count')?.textContent.includes('palavras'))
`
