# Paged.js 0.4.3

Cópia sem alterações de `dist/paged.esm.js` do pacote oficial `pagedjs@0.4.3` no npm (publicado em 2023-07-06).
Licença MIT em `PAGED-LICENSE.md`. Origem: https://github.com/pagedjs/pagedjs e https://www.npmjs.com/package/pagedjs/v/0.4.3.

Usamos o bundle ESM, importado somente pelo módulo lazy da prévia, sem o auto-polyfill. A distribuição via npm
traria `@babel/polyfill`/`core-js` com um novo postinstall transitivo; copiar o bundle pronto evita esse script e
mantém a dependência fixada e offline. Não usa eval/Function e não altera a CSP. Não editar o bundle à mão.

Atualizações devem substituir o arquivo pelo bundle oficial, conferir a licença/hash e repetir a matriz visual e os smokes.

SHA-256 do bundle: `6d7ae76b6f3ae8ccd06cdb2f8ca65acb6be25702e57bf65af89ef5067ad5e9e3`.
