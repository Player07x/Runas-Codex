/**
 * Como nasce cada categoria pronta da Wiki (anexos 1–3, 24/11): cor, ícone e descrição padrão, para a wiki nova já
 * abrir com cartões completos em vez de blocos vazios. Valem só enquanto a nota da categoria não diz outra coisa: cada
 * campo escrito em `Pasta/Pasta.md` (`cor`, `icone`, `descricao`) ganha do padrão. As descrições das categorias que o
 * João já tinha escrito na Valknut viraram o padrão; as outras seguem o mesmo tom.
 */
export interface CategoryPreset {
  /** Id do tom (`TONES`). */
  tone: string
  /** Id do ícone (`EMBLEMS`), o mesmo do tipo de artigo da pasta. */
  emblem: string
  description: string
}

export const CATEGORY_PRESETS: Readonly<Record<string, CategoryPreset>> = {
  Personagens: { tone: "ceu", emblem: "pessoa", description: "Indivíduo que participa da história, com identidade, personalidade, objetivos e relações próprias." },
  Locais: { tone: "musgo", emblem: "local", description: "Região geográfica ou ambiente específico de um mundo." },
  Organizações: { tone: "ouro", emblem: "escudo", description: "Grupo de indivíduos reunidos em torno de objetivos, interesses ou atividades comuns." },
  Países: { tone: "sangue", emblem: "bandeira", description: "Nação ou reino com território, governo e povo próprios." },
  Itens: { tone: "ametista", emblem: "gema", description: "Objeto que possui alguma utilidade, propriedade ou importância na história." },
  Materiais: { tone: "pedra", emblem: "camadas", description: "Substância natural ou mágica usada para criar objetos, armas, tecnologia ou rituais." },
  Espécies: { tone: "jade", emblem: "pata", description: "Grupo de seres que compartilham características biológicas ou sobrenaturais." },
  Culturas: { tone: "ambar", emblem: "grupo", description: "Modo de viver de um povo: costumes, festas, arte e valores." },
  Religiões: { tone: "rosa", emblem: "sol", description: "Sistema de crenças, dogmas e rituais que guiam a fé e a devoção de um povo." },
  Idiomas: { tone: "mare", emblem: "idioma", description: "Língua falada ou escrita no mundo, com sons, escrita e palavras próprias." },
  Magia: { tone: "lavanda", emblem: "brilho", description: "Fonte de poder sobrenatural, com regras, custos e tradições próprias." },
  Tecnologia: { tone: "pedra", emblem: "engrenagem", description: "Invenção, ferramenta ou técnica que muda o modo de viver do mundo." },
  Veículos: { tone: "mare", emblem: "navio", description: "Meio de transporte por terra, mar, ar ou outros planos." },
  Mitos: { tone: "lavanda", emblem: "livro", description: "Narrativas tradicionais, lendas e crenças que explicam a origem, os fenômenos e os mistérios de um mundo." },
  Acontecimentos: { tone: "brasa", emblem: "chama", description: "Fato ou episódio que ocorre em determinado momento e influencia o mundo." },
  Guerras: { tone: "sangue", emblem: "espadas", description: "Conflito armado organizado entre povos, facções, nações ou outras forças." },
  Documentos: { tone: "ouro", emblem: "pergaminho", description: "Texto escrito dentro do mundo: cartas, livros, tratados e registros." },
  Condições: { tone: "lavanda", emblem: "pulso", description: "Estado físico, mental, social ou sobrenatural que afeta um indivíduo ou entidade." },
  Eras: { tone: "ambar", emblem: "ampulheta", description: "Grande período da história do mundo, com começo, fim e marcas próprias." },
  Calendários: { tone: "jade", emblem: "calendario", description: "Sistema de organização e medição do tempo, dividido em dias, meses e anos." },
  Mapas: { tone: "ambar", emblem: "mapa", description: "Mapas de locais, lugares e mundos." },
}

/** O padrão de uma categoria: só as pastas prontas logo abaixo da wiki (`Wikis/Mundo/Locais`), não as subpastas. */
export function categoryPreset(folder: string): CategoryPreset | null {
  const parts = folder.replace(/\/$/, "").split("/")
  if (parts.length !== 3 || parts[0] !== "Wikis") return null
  return CATEGORY_PRESETS[parts[2]!] ?? null
}
