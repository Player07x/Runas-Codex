O **VTT** é a mesa virtual: cenas com mapa, tokens, paredes, luzes e sons, e uma **sala** para os jogadores
acompanharem pelo navegador do celular ou do computador, sem instalar nada. As mesas ficam em `Mesas/` no cofre.

### Mesas

VTT › **Criar Sala** lista as mesas em cartões (miniatura, última sessão, número de cenas). **Criar nova** começa uma
mesa; clique num cartão para abrir. VTT › **Entrar Sala** é para quem vai jogar: cole o link, digite o código
(`ABCD-EFGH`) ou leia o QR com a câmera.

### A cena

Uma mesa tem várias **cenas** (painel Cenas). Em **Configuração da cena**: o mapa (**Escolher mapa** / **Trocar
mapa**), o tamanho, a cor de fundo e a **grade** — quadrada, hexagonal (colunas ou fileiras) ou sem grade —, com o
tamanho da célula, o deslocamento, a cor, quanto cada célula vale e a regra das diagonais.

### Ferramentas do mapa

| Ferramenta | O que faz |
| :-- | :-- |
| **Selecionar e mover** | Escolhe e arrasta tokens, desenhos e notas; alças mudam o tamanho e giram |
| **Régua** | Mede distâncias na unidade da grade |
| **Novo token** | Põe um token (imagem), com barras como PV, PA e PE e a visão dele |
| **Nota no mapa** | Um marcador com texto no mapa |
| **Desenhar** | Mão livre, retângulo, elipse e texto |
| **Paredes e portas** | Bloqueiam a visão e o movimento; portas abrem e fecham |
| **Luzes** | Iluminam a cena e definem o que os tokens enxergam |
| **Sons no mapa** | Sons que tocam mais alto perto deles |
| **Regiões** | Áreas que avisam no Registro quando um token entra |

A **névoa** segue as paredes e as luzes: os jogadores só veem o que os tokens deles enxergam. **Desfazer e refazer**
valem para tudo o que muda na mesa (<kbd>Ctrl</kbd> <kbd>Z</kbd> e <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Z</kbd>). No
celular e no tablet, mova, edite e desenhe pelo toque; dois dedos aproximam e afastam.

### Painéis da mesa

- **Cenas**: criar, ordenar e escolher a cena transmitida.
- **Áudio**: playlists e faixas, tocar, parar, repetir e o volume de cada uma; **Parar os sons desta mesa** silencia
  tudo.
- **Registro**: testes, danos e avisos das regiões, do mais recente ao mais antigo; dá para apagar tudo.
- **Sala**: a sala dos jogadores (abaixo).

### A sala dos jogadores

No painel **Sala**:

1. Abra a sala. Ela funciona na **rede local** (Wi-Fi da mesa) e mostra o **link** e o **QR** para os jogadores.
2. Para jogadores fora da sua rede, **Gerar link público** cria um endereço pela internet (só quando você pede).
   **Testar link** confere se ele responde. Funciona também com a sala aberta no celular (Android com processador ARM
   de 64 bits, quase todos): o túnel já vem no app e usa o Wi-Fi ou os dados móveis do celular enquanto a sala
   estiver aberta.
3. Cada jogador entra pelo navegador e vê a cena transmitida, com a névoa, a régua e os tokens que pode mover.
4. A lista mostra os aparelhos conectados; **Desconectar** tira um.

No computador, a vista dos jogadores também pode abrir numa segunda tela (uma TV na mesa).

### Mestre pelo celular

**Mostrar link e QR do mestre** dá um endereço para comandar a mesa de um celular ou tablet na mesma rede: trocar a
cena, mover tokens, tocar áudio. **Trocar chave** invalida o link anterior (útil se ele vazou).

### O que os jogadores podem fazer

- Mover o mapa, aproximar, usar a régua e mover os próprios tokens (o mestre pode recusar o movimento).
- **Carta X**: um sinal anônimo para pausar a cena (aparece para o mestre).
- Responder às atividades que o mestre manda das Campanhas: avaliação da sessão, enquete de data e entradas do
  diário.
- Ler um artigo da Wiki que o mestre mostrar pela sala (sem os segredos).

### Levar e trazer mesas

Em Importar e exportar, **Mesas e dados do VTT** levam uma mesa inteira (com mapas, tokens e áudios) para outro
aparelho ou cofre.

### Importar cenas e tokens

No painel **Cenas**, **Importar…** traz para a mesa aberta, sem internet:

- **Cena do Universal VTT** (`.dd2vtt`, `.uvtt`, `.df2vtt`, do Dungeondraft, DungeonFog e outros): o mapa embutido, a
  grade, as paredes, as portas e as luzes. A cena leva o nome do arquivo.
- **Cena do Foundry VTT**: o `.json` de “Exportar dados” de uma cena (v9 a v12), com grade, paredes, portas (inclusive
  secretas), tokens e luzes. O Foundry não põe o mapa nem as imagens dos tokens no arquivo: escolha o mapa depois em
  **Trocar mapa** e as imagens no token.
- **Tokens em lote**: uma lista `.json`, até 500, que entra na cena aberta. Cada token tem `name` e, se quiser, `x` e
  `y` (o centro, em pixels), `size` (em células), `hidden` e `disposition` (-1 hostil, 0 neutro, 1 aliado, 2 jogador):

```json
[{ "name": "Lobo 1", "x": 150, "y": 150, "disposition": -1 }, { "name": "Lobo 2", "x": 250, "y": 150 }]
```

Antes de gravar, o diálogo mostra o tamanho, quantas paredes, portas, tokens e luzes vão entrar e os avisos.
