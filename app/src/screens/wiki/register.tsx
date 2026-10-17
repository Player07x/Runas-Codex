import { registerCodeBlock } from "../../markdown/extensions"
import { CalendarBlock } from "./WikiCalendar"
import { MapBlock } from "./WikiMap"

// Blocos da Wiki desenhados em qualquer nota (leitura e live preview), pelo ponto de extensão do leitor.
registerCodeBlock(["runas-calendario"], CalendarBlock)
registerCodeBlock(["runas-mapa"], MapBlock)

import { RollTableBlock, DictionaryBlock } from "./WikiTools"
registerCodeBlock(["runas-tabela"], RollTableBlock)
registerCodeBlock(["runas-idioma"], DictionaryBlock)
