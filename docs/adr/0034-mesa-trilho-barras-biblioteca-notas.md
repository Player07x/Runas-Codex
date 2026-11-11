# ADR 0034 — Mesa: propriedades no trilho, barras personalizadas, biblioteca e Notas

- **Status:** aceita (2026-10-31)

## Contexto
Depois da beta.24 o dono registrou quatro pedidos para a mesa do VTT (U11 a U14 em
[`rumo-a-1.0.md`](../tarefas/concluidas/rumo-a-1.0.md)): o painel de propriedades do token abria por cima do painel lateral; as
barras do token eram só PV, PA e PE; não havia como guardar mapas e tokens para usar em outra mesa; e o “Registro” não
servia para anotar a sessão.

## Decisão
1. **Propriedades no trilho (U11).** O objeto selecionado abre as propriedades no trilho do lado direito, no lugar do
   painel aberto, com “Voltar a <painel>”; fechar devolve o trilho como estava. O `SceneCanvas` recebe da mesa o
   destino (`properties.host`) e desenha o painel lá por portal; sem destino (mestre remoto antigo) continua sobre o
   mapa. No celular é a mesma folha de baixo para cima dos outros painéis.
2. **Barras (U12).** Até 12 barras por token, com nome, cor, valor, máximo e `visibility`: `padrao` (segue a escolha
   da sala), `mestre`, `dono` ou `todos`. Sem o campo a barra se comporta como antes, então as mesas com PV/PA/PE não
   mudam; a barra sem nome vira “Barra” (não mais “PV”). Os modelos são os nomes já usados nos tokens da mesa, mais
   PV, PA e PE; não há arquivo de modelos. A barra `dono` sai da projeção só para o assento dono do token:
   `projectionForSeat` filtra o snapshot e os remendos vão por `publishTo` quando há barra do dono. Espectadores e a
   Vista dos Jogadores não a recebem.
3. **Biblioteca (U13).** Os itens ficam em `.runas/mesas/biblioteca/` (`cenas/<id>.json` e `assets/<tipo>/<hash>`),
   uma pasta reservada da área das mesas, sem `mesa.json`. O pedido falava em `.runas/biblioteca/`; a área das mesas
   foi escolhida porque já é a única pasta oculta que o cofre transporta nos pacotes (ADR 0020) e que o desktop e o
   Android gravam com versão, sem código nativo novo. Nenhuma mesa pode ter esse nome (`worldFolderName` sempre
   acrescenta o id). A importação de pacotes não exige `mesa.json` nessa pasta e, ao duplicar, renomeia só o item
   repetido. Um token guardado perde posição e dono; um mapa leva a cena, imagens, desenhos, paredes, luzes e regiões
   (sem tokens, notas, sons nem névoa explorada). As imagens passam entre a biblioteca e a mesa pelo hash.
4. **Notas da mesa (U14).** O painel “Registro” virou “Notas”: um rascunho por mesa, num documento novo
   `table-notes` (vai para `outros.json` da mesa), gravado com pausa curta, ao sair do campo, ao trocar de painel e ao
   fechar a mesa. Só “Salvar Sessão” cria a nota da sessão (`Campanhas/<campanha>/Sessões/`, realizada, data entre
   aspas, texto em Anotações) pelo `useVault().createNote`. O que ia para o Registro continua em “Acontecimentos”,
   embaixo, só leitura, com “Copiar para a nota”. O mestre remoto edita as Notas, mas não salva a sessão (não tem o
   cofre).

## Consequências
- Versões anteriores do app ignoram o documento `table-notes` e o campo `visibility` das barras (a barra aparece como
  “como a sala”); a pasta da biblioteca é ignorada por elas como pasta sem manifesto.
- A biblioteca não guarda modelos de barra à parte: apagar o último token com “Sanidade” tira o modelo da lista.
- Regiões guardadas num mapa podem apontar para destinos de teleporte de outra mesa; ao virar cena nova, esses destinos
  ficam sem efeito até o mestre escolher outros.
