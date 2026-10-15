import { registerCodeBlock } from "../../markdown/extensions"
import { EncounterBlock } from "./EncounterBlock"

// Blocos das Campanhas desenhados em qualquer nota (leitura e live preview), pelo ponto de extensão do leitor.
registerCodeBlock(["runas-encontro"], EncounterBlock)
