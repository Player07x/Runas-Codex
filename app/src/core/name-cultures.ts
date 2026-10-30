/**
 * Nomes por cultura para o gerador de nomes (Wiki › Ferramentas). Culturas do mundo real servem de inspiração para
 * povos de fantasia; as três últimas são inventadas. Cada cultura tem pelo menos 100 nomes (femininos e masculinos) e,
 * quando a cultura usa sobrenome, pelo menos 100 sobrenomes. Nomes separados por espaço; `_` vira espaço
 * (“de_la_Vega” → “de la Vega”).
 */
import { FEMALE_NAMES, MALE_NAMES, SURNAMES } from "./generator-tables"
import { EXTRA_CULTURES, MORE_CULTURE_NAMES } from "./name-cultures-extra"

export type NameOrder = "nome-sobrenome" | "sobrenome-nome"

export interface NameCulture {
  id: string
  label: string
  /** De onde vêm os nomes, para o mestre escolher pelo clima do povo. */
  hint: string
  female: string[]
  male: string[]
  /** Sem sobrenomes, a cultura usa só o nome (ou o patronímico, se houver). */
  surnames: string[]
  order: NameOrder
  /** Sobrenome feito do nome do pai (“Erik Haraldsson”, “Ali ibn Omar”). */
  patronymic?: { male: (father: string) => string; female: (father: string) => string }
}

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean).map((word) => word.replace(/_/g, " "))

function culture(id: string, label: string, hint: string, female: string, male: string, surnames: string, extra: Partial<NameCulture> = {}): NameCulture {
  return { id, label, hint, female: words(female), male: words(male), surnames: words(surnames), order: "nome-sobrenome", ...extra }
}

const BASE_CULTURES: NameCulture[] = [
  { id: "lusofona", label: "Lusófona", hint: "Portugal, Brasil e África lusófona, com nomes medievais, indígenas e afro-brasileiros", female: FEMALE_NAMES, male: MALE_NAMES, surnames: SURNAMES, order: "nome-sobrenome" },
  culture("hispanica", "Hispânica", "Castela, Aragão e a América espanhola",
    `Ximena Urraca Elvira Jimena Leonor Blanca Inés Mencía Sancha Teresa Juana Isabel Catalina Beatriz Lucía Carmen Dolores
    Pilar Rocío Mercedes Guadalupe Soledad Consuelo Esperanza Paloma Marisol Montserrat Nuria Begoña Itziar Ainhoa Amaia
    Lorena Macarena Inmaculada Rosario Remedios Asunción Ángela Adela Alba Aurora Celia Clara Elena Esther Eugenia Fernanda
    Gabriela Graciela Josefina Lourdes Luz Marcela Milagros Natividad Paz Pía Reyes Valeria Yolanda Zaida`,
    `Rodrigo Diego Sancho Alfonso Fernando Gonzalo Íñigo Pelayo Ramiro Bermudo Ordoño Fruela García Nuño Álvaro Pedro Juan
    Martín Lope Hernán Esteban Tomás Andrés Bartolomé Cristóbal Domingo Emilio Enrique Felipe Francisco Gaspar Gerardo Gil
    Guillermo Ignacio Jaime Javier Joaquín Jorge José Julián Leandro Lorenzo Luis Manuel Marcos Mateo Miguel Nicolás Pablo
    Rafael Ramón Ricardo Salvador Santiago Sebastián Vicente Xavier Alonso Baltasar`,
    `García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno
    Álvarez Muñoz Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Ramírez Serrano Blanco Suárez Molina
    Morales Ortega Delgado Castro Ortiz Rubio Marín Sanz Núñez Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero
    Cano Prieto Méndez Cruz Calvo Gallego Vidal León Márquez Herrera Peña Flores Cabrera Campos Vega Fuentes Carrasco Diez
    Caballero Reyes Nieto Aguilar Pascual Santana Herrero Lorenzo Montero Hidalgo Giménez Ibáñez Ferrer Durán Santiago
    Benítez Mora Vicente Vargas Arias Carmona Crespo Román Pastor Soto Sáez Velasco Moya Soler Parra Esteban Bravo Gallardo
    Rojas de_la_Vega de_Mendoza de_Guzmán de_Toledo`),
  culture("francesa", "Francesa", "França medieval e moderna",
    `Aliénor Adèle Agathe Amélie Anne Aurélie Béatrice Blanche Brigitte Camille Catherine Cécile Charlotte Claire Clémence
    Colette Constance Delphine Denise Éloïse Émilie Estelle Eugénie Fleur Florence Françoise Gabrielle Geneviève Hélène
    Héloïse Isabeau Jacqueline Jeanne Joséphine Juliette Laure Léa Louise Lucie Madeleine Margot Marguerite Marie Marthe
    Mathilde Mireille Nicole Odette Pauline Perrine Renée Rose Simone Solène Sophie Suzanne Sylvie Thérèse Yvette Yvonne`,
    `Adrien Alain Amaury Antoine Armand Arnaud Arthur Aubert Baptiste Basile Benoît Bernard Bertrand Charles Clément Damien
    Denis Didier Édouard Émile Étienne Eudes Fabien Florent François Gaspard Gauthier Geoffroy Gérard Gilles Godefroy
    Guillaume Gustave Henri Hugues Jacques Jean Jérôme Julien Laurent Léon Louis Lucien Marcel Mathieu Maurice Michel
    Nicolas Olivier Pascal Philippe Pierre Raoul Raymond Rémi Renaud Robert Roland Thibault Tristan Yves`,
    `Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcin David
    Bertrand Roux Vincent Fournier Morel Girard André Lefèvre Mercier Dupont Lambert Bonnet François Martinez Legrand Garnier
    Faure Rousseau Blanc Guérin Muller Henry Roussel Nicolas Perrin Morin Mathieu Clément Gauthier Dumont Lopez Fontaine
    Chevalier Robin Masson Sanchez Boyer Denis Lemaire Duval Joly Gautier Roger Roche Roy Noël Meyer Lucas Meunier Jean
    Perez Marchand Dufour Blanchard Marie Barbier Brun Dumas Brunet Schmitt Leroux Colin Fernandez Pierre Renard Arnaud
    Rolland Caron Aubert Giraud Leclerc Vidal Bourgeois Renaud Lemoine Picard Gaillard Philippe Leclercq Lacroix Fabre
    Dupuis Olivier de_Montfort de_Valois d'Anjou`),
  culture("italiana", "Italiana", "cidades-estado e reinos da Itália",
    `Alessandra Angela Antonella Beatrice Bianca Camilla Caterina Chiara Claudia Costanza Elena Eleonora Elisabetta Emilia
    Federica Fiammetta Francesca Gemma Ginevra Giovanna Giulia Isabella Laura Lavinia Letizia Lucia Lucrezia Margherita
    Maria Marina Marta Matilde Nicoletta Ottavia Paola Patrizia Rachele Rosa Rosalia Serena Silvia Simonetta Sofia Teresa
    Valentina Veronica Vittoria Viola Agnese Ilaria Livia Lorenza Maddalena Mirella Ornella Pia Raffaella Stella Tiziana`,
    `Alessandro Andrea Angelo Antonio Bartolomeo Benedetto Bernardo Carlo Cesare Cosimo Dante Davide Domenico Emanuele
    Enrico Enzo Fabrizio Federico Filippo Francesco Gabriele Galeazzo Giacomo Giorgio Giovanni Giuliano Giuseppe Guido
    Jacopo Leonardo Lorenzo Luca Ludovico Marcello Marco Matteo Michele Niccolò Orlando Paolo Piero Raffaele Riccardo
    Roberto Salvatore Sandro Sergio Stefano Tommaso Ugo Umberto Vincenzo Vittorio Amerigo Baldassare Ercole Ottavio Taddeo`,
    `Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa
    Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo
    Gentile Martinelli Vitale Lombardo Serra Coppola De_Santis D'Angelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri
    Bianco Marini Grasso Valentini Messina Sala De_Angelis Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo
    Morelli Amato Silvestri Mazza Testa Grassi Pellegrino Carbone Giuliani Benedetti Barone Rossetti Caputo Montanari
    Guerra Palmieri Bernardi Martino Fiore De_Rosa Ferretti Bellini Basile Riva Donati Piras Vitali Battaglia Sartori
    Neri Costantini Milani Pagano Ruggiero Sorrentino D'Amico Orlando Damico Negri Medici Sforza Visconti Borgia`),
  culture("germanica", "Germânica", "terras alemãs, Sacro Império e Hansa",
    `Adelheid Agnes Alwine Anna Barbara Berta Brunhilde Clara Dorothea Edda Elfriede Elisabeth Elke Emma Erika Frieda
    Gerda Gertrud Gisela Greta Hedwig Heidi Helga Hildegard Hilde Ilse Ingrid Irmgard Johanna Josefine Jutta Karin Katharina
    Klara Kunigunde Liesel Lotte Luise Magda Margarete Marlene Martha Mathilde Minna Ottilie Petra Renate Rosamund Roswitha
    Sabine Sieglinde Sigrun Susanne Ulrike Ursula Walburga Wilhelmina Wiebke`,
    `Adalbert Albrecht Alois Anselm Arnold Berthold Bruno Dietrich Eberhard Eckhart Ernst Friedrich Georg Gerhard Gottfried
    Gunther Hans Hartmut Heinrich Helmut Hermann Hubert Jakob Joachim Johann Jürgen Karl Konrad Kurt Leopold Lothar Ludwig
    Manfred Matthias Maximilian Meinhard Otto Rainer Reinhard Rudolf Rupert Siegfried Sigismund Thomas Ulrich Volker Walter
    Werner Wilhelm Wolfgang Wolfram Burkhard Erhard Gebhard Gustav Hagen Lambert Lutz Norbert Theobald`,
    `Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf
    Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Schmitz Krause Meier Lehmann
    Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn
    Schubert Vogel Friedrich Keller Günther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht Schuster Simon
    Ludwig Böhm Winter Kraus Martin Schumacher Krämer Vogt Stein Jäger Otto Sommer Groß Seidel Heinrich Brandt Haas
    Schreiber Graf Schulte Dietrich Ziegler Kuhn Kühn Pohl Engel Horn Busch Bergmann Thomas Voigt Sauer Arnold Wolff
    Pfeiffer von_Falkenstein von_Hohenberg`),
  culture("inglesa", "Inglesa", "Inglaterra medieval e as ilhas",
    `Ada Agnes Alice Amabel Anne Beatrice Bridget Catherine Cecily Charlotte Clemence Constance Dorothy Edith Eleanor
    Elizabeth Ella Emma Eve Florence Frances Grace Gwendolyn Hannah Harriet Helen Isabel Isolde Jane Joan Josephine Judith
    Juliana Katherine Lettice Lilian Mabel Margaret Margery Marian Martha Mary Matilda Maud Mildred Muriel Philippa Rosamund
    Rose Sarah Sybil Susanna Winifred Edwina Godiva Elfrida Audrey Wilhelmina Hilda Eadith`,
    `Alfred Arthur Edmund Edward Edgar Edwin Geoffrey Gilbert Godfrey Harold Henry Hugh Humphrey Jasper John Lancelot
    Leofric Matthew Miles Nicholas Oliver Osbert Oswald Percival Peter Ralph Randall Reginald Richard Robert Roger Simon
    Stephen Thomas Tristram Walter William Wystan Adam Ambrose Anthony Bartholomew Benedict Christopher Cuthbert Daniel
    Francis George Giles Gregory Guy Jeremy Lawrence Martin Michael Nathaniel Rowan Theodore Wilfred`,
    `Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green
    Hall Wood Jackson Clarke Patel Hill Turner Harris Cooper Ward Morris King Baker Harrison Morgan Allen James Scott Moore
    Phillips Watson Davis Parker Price Bennett Young Griffiths Mitchell Kelly Cook Carter Richardson Bailey Collins Bell
    Shaw Murphy Miller Cox Richards Khan Marshall Anderson Simpson Ellis Adams Singh Begum Wilkinson Foster Chapman Powell
    Webb Rogers Gray Mason Hughes Fletcher Hunt Holmes Palmer Lloyd Barker Mills Knight Reed Stevens Gibson Lee Hunter
    Graham Lewis Archer Ashdown Blackwood Thornton Fairfax Whitmore Ravenscroft Hawthorne Ashford Pemberton Mortimer Blackthorn Winterbourne Kingsley`),
  culture("celta", "Celta", "Irlanda, Escócia, Gales e Bretanha",
    `Aoife Bríd Brigid Caoimhe Ciara Deirdre Eithne Eimear Fionnuala Gráinne Íde Maeve Muireann Niamh Nuala Orla Róisín
    Saoirse Siobhán Sorcha Úna Aisling Ailbhe Bláthnaid Clodagh Dearbhla Éabha Emer Étaín Fiadh Líadan Mairéad Mór Nessa
    Ríona Sadhbh Síle Sinéad Ainsley Catriona Eilidh Isla Morag Mhairi Moira Rhona Seonaid Shona Branwen Ceridwen Eira
    Gwen Gwenllian Gwenhwyfar Nia Olwen Rhiannon Seren Tegan`,
    `Áed Ailill Art Bran Brendan Brian Cathal Cian Cillian Colm Conall Conchobar Conn Cormac Cú Dáire Diarmuid Domhnall
    Donncha Éamon Eoghan Fearghal Fergus Fiachra Finn Fintan Lorcan Lugh Niall Odhrán Oisín Pádraig Ruairí Seán Tadhg
    Tiernan Alasdair Angus Calum Duncan Ewan Fraser Hamish Iain Lachlan Malcolm Murdo Ruaridh Tavish Torquil Aneirin
    Cadoc Dafydd Dylan Emrys Gareth Gwyn Iolo Owain`,
    `Ó_Briain Ó_Néill Ó_Ceallaigh Ó_Súilleabháin Ó_Conchobhair Ó_Dónaill Ó_Murchú Ó_Raghallaigh Ó_Floinn Ó_Dubhghaill
    Ó_Cinnéide Ó_Gallchobhair Ó_Máille Ó_Sé Ó_Cathasaigh Ó_Riain Ó_Duibhir Ó_Laoghaire Ó_Faoláin Ó_Mathúna Ó_Ceallacháin
    Ó_Cuinn Ó_hEadhra Ó_Broin Ó_Tuathail Ó_Dálaigh Ó_Coileáin Ó_Loingsigh Ó_hAodha Ó_Ruairc Mac_Carthaigh Mac_Mathúna
    Mac_Giolla_Phádraig Mac_Diarmada Mac_Suibhne Mac_Lochlainn Mac_Aodha Mac_Conmara Mac_Gearailt Mac_Craith MacDonald
    MacLeod MacKenzie MacGregor MacKay MacLean MacPherson MacIntosh MacNeil MacMillan MacKinnon MacArthur MacAulay MacBain
    MacDougall MacFarlane MacInnes MacIntyre MacLachlan MacNab MacQueen MacRae Campbell Cameron Fraser Grant Gordon Murray
    Stewart Sinclair Munro Ross Robertson Douglas Buchanan Lamont Drummond Lindsay Davies Evans Jenkins Morgan Owen Powell
    Price Pritchard Rees Bowen Griffith Howell Llewellyn Vaughan Prosser Pugh Kerhoas Le_Goff Le_Gall Tanguy Riou
    Le_Bihan Guivarc'h Le_Floch`),
  culture("nordica", "Nórdica", "Escandinávia da era viking; o sobrenome vem do nome do pai",
    `Astrid Åsa Bergljót Bodil Brynhild Dagny Eir Embla Freydís Frida Gerd Gudrun Gunnhild Gyda Halla Helga Hervor Hilda
    Inga Ingeborg Ingrid Jórunn Katla Ragna Ragnhild Rannveig Sigrid Signý Sif Solveig Svanhild Thora Thordís Thurid Tove
    Ulfhild Unn Valdís Vigdís Yrsa Ylva Áslaug Alfhild Arnbjörg Ása Ástríðr Bera Borghild Dísa Eydís Gríma Gunnvor Hallgerd
    Herdís Hrefna Ingunn Ljót Oddný Sæunn`,
    `Arne Asbjørn Bjarni Bjørn Bodvar Brand Dag Egil Einar Eirik Erlend Eyvind Finn Floki Gisli Gorm Grim Gunnar Guthrum
    Hakon Hallbjørn Halfdan Harald Hauk Helgi Hjalmar Hrafn Ingvar Ivar Jarl Kare Ketil Knut Leif Magnus Njal Odd Olaf Orm
    Ragnar Rolf Rurik Sigurd Sigmund Skarde Snorri Stein Sten Svein Sverre Thorbjørn Thorfinn Thorkel Thorstein Toki Ulf
    Vagn Vidar`,
    "", { patronymic: { male: (father) => `${father}sson`, female: (father) => `${father}sdóttir` } }),
  culture("eslava", "Eslava", "Rus, Polônia, Boêmia e os Bálcãs",
    `Anastasia Agnieszka Alina Bogdana Bogumiła Bożena Danica Darya Dobromila Dragana Ekaterina Elena Galina Irina Jadwiga
    Jaroslava Katarzyna Kseniya Lada Larisa Ludmila Lyubov Magdalena Malgorzata Marina Milena Milica Mira Miroslava Nadezhda
    Natalia Nina Olga Oksana Rada Radmila Snezhana Sofia Stanislava Svetlana Tatiana Valentina Vasilisa Vera Veronika Vesna
    Wanda Yaroslava Yelena Zdenka Zlata Zofia Zora Zoya Agata Halina Iskra Jelena Kalina Wiesława`,
    `Aleksandr Aleksei Anatoly Bogdan Boleslav Boris Borislav Bronislav Casimir Dmitri Dobrynya Dragan Fyodor Gavril Gleb
    Grigori Igor Ilya Ivan Jaromir Jaroslav Kazimierz Konstantin Lech Leonid Lev Lubomir Miroslav Mikhail Milan Mstislav
    Nikolai Oleg Pavel Piotr Przemysł Radomir Radoslav Rostislav Ruslan Sergei Stanislav Stefan Svyatoslav Taras Tomasz
    Vadim Vasily Viktor Vladimir Vladislav Vsevolod Vyacheslav Wenceslas Witold Yaroslav Yuri Zbigniew Zoran`,
    `Ivanov Smirnov Kuznetsov Popov Vasiliev Petrov Sokolov Mikhailov Novikov Fedorov Morozov Volkov Alekseev Lebedev
    Semenov Egorov Pavlov Kozlov Stepanov Nikolaev Orlov Andreev Makarov Nikitin Zakharov Zaitsev Soloviev Borisov Yakovlev
    Grigoriev Romanov Vorobiev Sergeev Kuzmin Frolov Aleksandrov Dmitriev Korolev Gusev Kiselev Ilyin Maksimov Polyakov
    Sorokin Vinogradov Kovalev Belov Medvedev Antonov Tarasov Zhukov Baranov Filippov Komarov Davydov Belyaev Gerasimov
    Bogdanov Osipov Sidorov Matveev Titov Markov Mironov Krylov Kulikov Karpov Vlasov Melnikov Denisov Gavrilov Tikhonov
    Kazakov Afanasiev Danilov Savelyev Timofeev Fomin Chernov Abramov Martynov Efimov Fedotov Shcherbakov Nazarov Kalinin
    Isaev Chernyshev Bykov Maslov Rodionov Kowalski Nowak Wiśniewski Wójcik Kamiński Lewandowski Zieliński Szymański
    Dvořák Novák Svoboda Horvat Kovačević Petrović Jovanović Nikolić`),
  culture("grega", "Grega", "Grécia antiga e bizantina",
    `Agape Alexandra Anthea Ariadne Artemisia Aspasia Athanasia Calliope Cassandra Chloe Chrysanthe Daphne Demetria Doris
    Eleni Elpida Eudokia Eurydice Euphemia Evangelia Galatea Helena Hermione Hypatia Ianthe Irene Kallisto Katerina Kleio
    Lydia Melina Melpomene Nefeli Olympia Pandora Penelope Phaedra Philippa Phoebe Rhea Sappho Selene Sophia Stavroula
    Thalia Theodora Theophano Thekla Urania Xanthe Zenobia Zoe Agatha Andromeda Antigone Berenike Danae Electra Io`,
    `Achilleas Aeneas Agamemnon Alexandros Anaximandros Andreas Apollon Aristides Aristoteles Athanasios Basileios Christos
    Damianos Demetrios Dionysios Elias Evangelos Georgios Herakles Hector Ioannis Isokrates Kallias Konstantinos Kosmas
    Kyriakos Leandros Leonidas Lykourgos Menelaos Miltiades Nikandros Nikephoros Nikolaos Odysseus Orestes Pantelis
    Pavlos Periklis Petros Philippos Plato Prokopios Pyrrhos Sokrates Solon Spyridon Stavros Stephanos Themistokles
    Theodoros Theophilos Thrasyvoulos Timon Vasilis Xenophon Yannis Zenon`,
    `Papadopoulos Pappas Georgiou Oikonomou Vlachos Karagiannis Dimitriou Konstantinidis Nikolaidis Christodoulou Ioannou
    Antoniou Alexiou Makris Papageorgiou Athanasiou Theodorou Vasileiou Panagiotou Kyriakou Angelopoulos Michailidis
    Sotiropoulos Economou Karalis Galanis Lambrakis Mavridis Spanos Stavrou Kontos Doukas Komnenos Palaiologos Angelos
    Laskaris Kantakouzenos Batatzes Phokas Skleros Argyros Bryennios Melissenos Tornikes Kourkouas Dalassenos Kalamanos
    Raptis Mitropoulos Dimopoulos Kouris Xenakis Theodorakis Kazantzakis Ritsos Seferis Elytis Kavafis Solomos Kalvos
    Venizelos Trikoupis Kolokotronis Botsaris Karaiskakis Miaoulis Kanaris Mavrokordatos Ypsilantis Kapodistrias Rallis
    Mercouri Katsaros Pavlidis Kostopoulos Christopoulos Bekas Chatzis Zervas Manolas Ralli Lekkas Tsakalos Vlassis
    Gounaris Petrakis Manousakis Daskalakis Fragkiadakis Psaltis Tzanetakis Varvaresos Zografos Chalkias Lykos Drakos Andreadis Floros Kyrou Mavros Nikas Samaras`),
  culture("latina", "Latina", "Roma antiga: nome pessoal e nome da família (gens)",
    `Aelia Agrippina Antonia Aquilina Aurelia Caecilia Calpurnia Camilla Claudia Cornelia Domitia Drusilla Fabia Faustina
    Flavia Fulvia Gaia Helvia Horatia Hortensia Julia Junia Licinia Livia Lucilla Lucretia Marcella Messalina Octavia
    Ovidia Paulina Placidia Plautia Pompeia Porcia Priscilla Quintilla Sabina Septimia Servilia Sulpicia Terentia Tullia
    Valeria Vergilia Vibia Vipsania Agrippa Albina Aemilia Atia Clodia Domitilla Galla Lepida Lollia Minervina Nonia Postumia`,
    `Aulus Appius Caius Decimus Gnaeus Kaeso Lucius Mamercus Manius Marcus Numerius Publius Quintus Servius Sextus Spurius
    Tiberius Titus Aemilianus Agrippa Antoninus Atticus Augustinus Brutus Caesar Cassius Cato Cicero Corvinus Crassus
    Drusus Felix Flaccus Florus Gallus Germanicus Hadrianus Julianus Laelius Lentulus Lepidus Longinus Lucanus Magnus
    Marcellus Maximus Nero Pius Plinius Priscus Rufus Sabinus Scipio Seneca Severus Silvanus Varro Vitus`,
    `Aemilius Annius Antonius Aquillius Atilius Aurelius Caecilius Calpurnius Cassius Claudius Clodius Cornelius Curtius
    Domitius Fabius Flavius Fulvius Furius Gellius Helvius Horatius Hortensius Julius Junius Laelius Licinius Livius
    Lollius Lucretius Manlius Marcius Minucius Mucius Nonius Octavius Ovidius Papirius Plautius Pompeius Popillius Porcius
    Postumius Quinctius Rutilius Sempronius Sergius Servilius Sextius Sulpicius Terentius Titius Tullius Valerius Vergilius
    Verginius Vibius Vipsanius Volumnius Acilius Afranius Albius Arrius Asinius Betilienus Caelius Canuleius Cocceius
    Considius Duilius Egnatius Fannius Flaminius Genucius Herennius Hostilius Iulius Lartius Lucilius Maenius Memmius
    Naevius Nautius Ogulnius Opimius Petronius Pinarius Plancius Pomponius Rabirius Sallustius Scribonius Statilius
    Tarquinius Trebonius Ulpius Vettius Vitellius Aelius Caesius Marius Rubellius Valgius`),
  culture("arabe", "Árabe", "califados e reinos do deserto; “ibn” e “bint” ligam ao nome do pai",
    `Aisha Amina Amira Asma Basma Dalia Fatima Farah Ghada Hafsa Hala Hanan Hayat Huda Iman Jamila Jumana Karima Khadija
    Laila Lamia Lubna Maha Malak Mariam Muna Nadia Nahla Najwa Nawal Noor Nour Rania Rasha Rim Ruqayya Safiya Salma Samira
    Sana Sawsan Shadia Suad Sumaya Tahira Wafa Widad Yasmin Zahra Zainab Zaynab Zubaida Zulaikha Afaf Bushra Dunya Rabab Sahar`,
    `Abbas Abdullah Adel Ahmad Ali Amir Anwar Ayman Bakr Bashir Faisal Farid Fuad Ghassan Habib Hadi Hamza Harun Hassan
    Hisham Husayn Ibrahim Idris Ismail Jafar Jamal Kamal Karim Khalid Mahmud Majid Malik Mansur Marwan Muhammad Munir Musa
    Mustafa Nabil Nasir Nizar Omar Qasim Rashid Ridwan Saad Said Salah Salim Sami Sulayman Tariq Umar Usama Walid Yahya
    Yusuf Zayd Ziyad`,
    `al-Rashid al-Hashimi al-Qurashi al-Masri al-Baghdadi al-Dimashqi al-Halabi al-Andalusi al-Maghribi al-Tunisi
    al-Basri al-Kufi al-Makki al-Madani al-Yamani al-Najdi al-Hijazi al-Shami al-Iraqi al-Farsi al-Khurasani al-Samarqandi
    al-Bukhari al-Tabari al-Razi al-Kindi al-Farabi al-Ghazali al-Idrisi al-Khwarizmi al-Biruni al-Jahiz al-Mutanabbi
    al-Tamimi al-Azdi al-Kalbi al-Ansari al-Zubayri al-Umawi al-Abbasi al-Fatimi al-Ayyubi al-Mamluki al-Saadi al-Harbi
    al-Otaibi al-Shammari al-Dosari al-Qahtani al-Mutairi al-Anazi al-Ghamdi al-Zahrani al-Maliki al-Shafii al-Hanbali
    al-Hanafi al-Sufi al-Attar al-Khayyat al-Najjar al-Haddad al-Sabbagh al-Jazzar al-Khabbaz al-Sayyad al-Bannaa
    al-Tajir al-Warraq al-Sarraj al-Dabbagh al-Saffar al-Fakhuri al-Zayyat al-Halwani al-Shaybani al-Hilali al-Kinani
    al-Juhani al-Sulami al-Thaqafi al-Asadi al-Ghifari al-Khazraji al-Awsi al-Bakri al-Taghlibi al-Murri al-Fazari
    al-Dhubyani al-Ameri al-Uqayli al-Numayri al-Kilabi al-Jaafari al-Alawi al-Husayni al-Hasani al-Askari al-Sadiq
    al-Baqir al-Kazimi al-Ridawi al-Tusi al-Isfahani al-Shirazi`,
    { patronymic: { male: (father) => `ibn ${father}`, female: (father) => `bint ${father}` } }),
  culture("persa", "Persa", "impérios persas e o planalto iraniano",
    `Anahita Arezoo Ashraf Atoosa Azadeh Azar Banu Bahar Darya Delaram Donya Elaheh Farah Fariba Farnaz Fereshteh Golnar
    Golnaz Gordafarid Haleh Homa Jaleh Katayoun Laleh Leila Mahnaz Mahsa Mahtab Maryam Mehrnaz Mina Mitra Nahid Nasrin
    Nazanin Niloufar Parisa Parvaneh Pegah Pouran Roxana Roya Sahar Samira Sanaz Shabnam Shadi Shahrzad Shirin Simin
    Soraya Taraneh Tahmineh Yasaman Yekta Zhaleh Ziba Zohreh`,
    `Afshin Ardashir Arash Ardavan Aria Babak Bahram Bardia Bijan Cyrus Dariush Ehsan Esfandiar Farhad Farid Farrokh
    Faramarz Feridun Giv Hamid Hormoz Houshang Iraj Jamshid Kambiz Kaveh Kaykhosrow Keyvan Khosrow Kourosh Manouchehr
    Mehrdad Mehran Milad Nader Navid Omid Parviz Payam Peyman Pouya Ramin Rostam Saman Sassan Shahram Shahriar Siavash
    Sohrab Tahmasp Teymour Vahid Xerxes Yazdan Zal Zartosht Behnam Darab`,
    `Ahmadi Hosseini Mohammadi Rezaei Moradi Karimi Jafari Rahimi Hashemi Mousavi Ghasemi Sadeghi Heidari Kazemi Rostami
    Bagheri Abbasi Akbari Amini Asadi Azizi Bahrami Daneshvar Ebrahimi Esfandiari Farahani Farhadi Ghaffari Golshiri
    Habibi Hamidi Jahanbakhsh Jalali Kamali Kashani Khalili Khosravi Mahmoudi Majidi Mansouri Mirzaei Mohseni Nasiri
    Navabi Nikbakht Nouri Parsa Pahlavi Panahi Rahmani Ranjbar Rashidi Razavi Sabouri Saberi Safavi Salehi Samadi
    Shahidi Shirazi Soltani Tabatabaei Taheri Tehrani Vaziri Yazdani Zamani Zand Zarei Afshar Ardalan Bakhtiari Esfahani
    Firouzabadi Ghorbani Hejazi Kermani Larijani Mashhadi Nazari Qajar Rafsanjani Sasani Tavakoli Yeganeh Zanjani
    Behzadi Darvishi Golestani Kianian Mehrabi Nejati Pourmand Shafiei Tabrizi Vahidi Ashkani Kiani Arjomand Farzaneh Mehrzad Parvizi`),
  culture("turca", "Turca", "estepes turcomanas e o Império Otomano",
    `Ayla Aylin Ayşe Aysel Belgin Berna Burcu Ceren Damla Defne Derya Dilara Ebru Ece Elif Emine Esra Fatma Feride Gamze
    Gizem Gül Gülay Gülşen Hande Hatice Hülya Ipek Irmak Kader Lale Leyla Meltem Merve Mine Nazlı Nermin Nesrin Nihan Nur
    Özge Özlem Pelin Pınar Saadet Selin Serap Sevgi Sibel Songül Şule Tuba Tülay Türkan Yağmur Yasemin Yeliz Zehra Zeynep`,
    `Ahmet Alp Arslan Aslan Atilla Aydın Barış Batu Bayram Bora Burak Cem Cengiz Demir Doğan Emre Engin Enver Erdem Ertuğrul
    Faruk Fatih Hakan Halil Hasan Hüseyin İbrahim İlhan Kaan Kadir Kemal Kerem Kutay Mehmet Mert Murat Mustafa Oğuz Orhan
    Osman Ömer Özgür Recep Selim Serkan Süleyman Tamer Tarkan Timur Tolga Tuncay Uğur Umut Volkan Yavuz Yusuf Zafer`,
    `Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan
    Şimşek Polat Korkmaz Özcan Erdoğan Yavuz Can Acar Şen Aktaş Kalkan Güneş Bulut Keskin Ünal Turan Güler Tekin Taş Bozkurt
    Kaplan Avcı Sarı Altun Coşkun Karaca Uçar Bayram Akın Aksoy Gündoğdu Tuncer Duman Ateş Kocabaş Özer Yücel Ekinci Uysal
    Erdem Güven Gürbüz Sönmez Karakaya Bilgin Çakır Toprak Altıntaş Durmaz Ayhan Akbulut Akgül Ceylan Demirci Ergün
    Işık Kahraman Kartal Karataş Önal Savaş Soylu Tan Tok Uzun Yalçın Yaman Yazıcı Yiğit Zengin Albayrak Bektaş Çınar
    Dinçer Ercan Gök Karadağ Oral Akyol Başaran Kandemir Özbek Sezer`),
  culture("hebraica", "Hebraica", "tribos e reinos de Israel e as comunidades judaicas",
    `Abigail Ada Adina Atara Batsheva Bracha Chana Chaya Dalia Devorah Dina Edna Eliana Elisheva Esther Gila Hadassah
    Hila Ilana Judith Keren Leah Liora Malka Margalit Michal Miriam Naama Naomi Nechama Noa Ora Orly Rachel Rina Rivka
    Ruth Sarah Shira Shifra Shoshana Shulamit Tamar Tikva Tova Tzipora Yael Yaffa Yehudit Yocheved Zehava Zilpa Avital
    Bilha Hagar Merav Neta Penina Sigal`,
    `Aaron Abraham Akiva Amos Asher Avner Barak Baruch Benjamin Boaz Caleb Daniel David Eli Eliezer Elijah Ephraim Ezekiel
    Ezra Gad Gideon Hillel Isaac Isaiah Jacob Jeremiah Jonathan Joseph Joshua Judah Levi Menachem Meir Mordecai Moses Nathan
    Nehemiah Noam Obadiah Raphael Reuben Samson Samuel Saul Shimon Shlomo Uriel Yehuda Yitzhak Yoav Zebulun Zechariah
    Ariel Dov Ehud Hosea Jesse Micah`,
    `Cohen Levi Mizrahi Peretz Biton Dahan Avraham Friedman Agbaria Malka Azoulay Katz Yosef David Amar Ohana Hadad
    Gabay Ben-David Shapiro Goldberg Rosenberg Rosen Stern Weiss Klein Schwartz Adler Kaplan Levin Feldman Berger Blum
    Gold Silver Eisen Stein Mandel Halevi Sasson Abulafia Benveniste Toledano Abravanel Sefardi Ashkenazi Alfasi Maimon
    Nahmani Caro Luria Ibn-Ezra Halfon Elbaz Bensimon Benhamou Attias Azulai Danino Edery Elkayam Harush Knafo Lugassy
    Marciano Ohayon Pinto Revah Sabag Tapiero Turgeman Vaknin Yifrach Zrihen Barzilai Carmeli Dagan Eshkol Golan Harel
    Kedem Lavi Meron Nir Oren Paz Raz Sharon Tal Yaron Zohar Alon Bar Dror Erez Gefen Hod Shaked Tavor Ben-Ami Shalev Yadin`),
  culture("indiana", "Indiana", "reinos do subcontinente indiano, com nomes do sânscrito",
    `Aditi Amrita Ananya Anjali Aparna Arundhati Bhavani Chandra Damayanti Devi Divya Draupadi Durga Gauri Gayatri Indira
    Ishani Janaki Jaya Kalpana Kamala Kaveri Kavya Lakshmi Lalita Leela Madhuri Malati Meena Meera Nandini Padma Parvati
    Pooja Priya Radha Rani Rati Rekha Rukmini Sarita Savitri Shakuntala Shanti Sita Sudha Sunita Tara Uma Usha Vasanti
    Vidya Yamuna Ahalya Charulata Kunti Mandakini Sarasvati Tulasi`,
    `Aditya Ajay Amar Anand Arjun Ashok Bharat Bhima Chandragupta Deepak Dev Dhruv Ganesh Gautam Govind Hari Harsha Indra
    Jagdish Karan Krishna Kumar Lakshman Madhav Mahesh Manish Mohan Nakul Narayan Nikhil Pradeep Prakash Pranav Raghav
    Rahul Raj Rajendra Rakesh Ram Ravi Rohan Sahadev Sanjay Shankar Shiva Siddharth Suresh Surya Tarun Uday Varun Vijay
    Vikram Vinod Vishal Vivek Yash Yudhishthira`,
    `Sharma Verma Gupta Singh Kumar Patel Shah Mehta Desai Iyer Iyengar Nair Menon Pillai Reddy Rao Naidu Chowdhury
    Banerjee Chatterjee Mukherjee Ghosh Bose Das Sen Dutta Roy Sinha Mishra Pandey Tiwari Dubey Shukla Tripathi Chaturvedi
    Trivedi Dwivedi Upadhyay Agarwal Bansal Goel Jain Khanna Kapoor Malhotra Chopra Arora Sethi Bhatia Saxena Srivastava
    Kulkarni Deshpande Joshi Gokhale Bhatt Pathak Thakur Rathore Chauhan Solanki Parmar Jadeja Gill Sandhu Sidhu Dhillon
    Grewal Bajwa Kaur Ahuja Bedi Chadha Kohli Luthra Mathur Nigam Oberoi Puri Rastogi Tandon Wadhwa Bhattacharya Ganguly
    Majumdar Sarkar Mitra Basu Haldar Kaul Raina Dhar Zutshi Hegde Shetty Kamath Pai Shenoy Acharya Krishnan Subramanian
    Venkatesan Raghavan`),
  culture("chinesa", "Chinesa", "dinastias da China; o sobrenome vem antes do nome",
    `Ai An Bai Bao Bi Bing Cai Chun Cui Dai Fang Fei Feng Hong Hua Hui Jia Jiao Jie Jing Ju Juan Lan Lian Lin Ling Liu Mei
    Meng Min Ming Na Ning Ping Qian Qiao Qing Qiu Rong Rou Ru Shan Shu Shuang Ting Wan Wei Xia Xiang Xiao Xin Xiu Xue Ya
    Yan Ying Yu Yue Yun Zhen Zhi Zhu`,
    `An Bin Bo Chao Cheng Chong Da Dong Fa Fu Gang Guang Guo Hai Hao He Heng Hu Jian Jiang Jin Jun Kai Kang Kun Lei Liang
    Long Lun Peng Qiang Quan Rui Sen Sheng Shi Shun Song Tao Tian Wen Wu Xian Xiong Xu Xuan Yang Yao Yi Yong Yuan Zan Ze
    Zhan Zhao Zheng Zhong Zhou Zi Zong`,
    `Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo He Gao Lin Luo Zheng Liang Xie Song Tang Han Feng Deng Cao Peng Zeng Xiao Tian Dong Pan Yuan Cai Jiang Yu Du Ye Cheng Wei Su Lü Ding Ren Lu Yao Shen Zhong Cui Tan Fan Liao Shi Jin Jia Xia Fu Fang Zou Xiong Bai Meng Qin Qiu Hou Yin Xue Yan Duan Lei Long Tao Mao Hao Gu Gong Shao Wan Qian Dai Mo Kong Xiang Chang Wen Kang Ou Hua Niu Hong Zhuge Sima Ouyang Shangguan Murong Situ Huangfu Linghu Dugu Gongsun`,
    { order: "sobrenome-nome" }),
  culture("japonesa", "Japonesa", "Japão feudal; o sobrenome vem antes do nome",
    `Aiko Akane Akemi Akiko Ami Asami Ayaka Ayame Chiaki Chie Chiyo Emi Eri Fumiko Hana Hanako Haruka Haruko Hikari Hina
    Hiroko Hitomi Izumi Kaede Kaori Kasumi Kazuko Keiko Kiku Kimiko Kiyomi Kumiko Mai Mariko Masako Mayumi Megumi Michiko
    Midori Miho Mika Minako Misaki Momoko Nana Naoko Natsuki Noriko Reiko Rin Sakura Sayuri Shizuka Sumiko Tomoe Tomoko
    Yoko Yui Yuki Yumi`,
    `Akira Daichi Daisuke Eiji Goro Hachiro Haruto Hayato Hideaki Hideki Hikaru Hiroshi Hiroto Ichiro Isamu Jiro Jun Kaito
    Katsuro Kazuki Kazuo Kenji Kenta Kiyoshi Koji Kota Makoto Masaru Masato Minoru Nobu Nobunaga Noboru Osamu Ren Riku Ryo
    Ryota Saburo Satoshi Shigeru Shin Shiro Shota Sora Susumu Takashi Takeshi Taro Tetsuya Tomoya Toshiro Tsubasa Yamato
    Yasuo Yoshiro Yuto Yuuki`,
    `Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi Matsumoto
    Inoue Kimura Hayashi Shimizu Yamazaki Mori Abe Ikeda Hashimoto Yamashita Ishikawa Nakajima Maeda Fujita Ogawa Goto
    Okada Hasegawa Murakami Kondo Ishii Saito Sakamoto Endo Aoki Fujii Nishimura Fukuda Ota Miura Fujiwara Okamoto
    Matsuda Nakagawa Nakano Harada Ono Tamura Takeuchi Kaneko Wada Nakayama Ishida Ueda Morita Hara Shibata Sakai Kudo
    Yokoyama Miyazaki Miyamoto Uchida Takagi Ando Taniguchi Ohno Maruyama Imai Takada Fujimoto Takeda Murata Ueno Sugiyama
    Masuda Sugawara Hirano Otsuka Chiba Kubo Matsui Iwasaki Sakurai Kinoshita Noguchi Matsuo Nomura Kikuchi Sano Onishi
    Minamoto Taira Tokugawa Oda Toyotomi Date Uesugi Shimazu Hojo Ashikaga`,
    { order: "sobrenome-nome" }),
  culture("ioruba", "Iorubá", "cidades-reino iorubás da África Ocidental",
    `Abiola Adaeze Adebimpe Adebisi Adenike Adeola Adesua Adetokunbo Adunni Ajoke Ayodele Ayomide Ayotunde Bimpe Bisola
    Bolanle Bunmi Damilola Ebunoluwa Eniola Folake Folasade Funke Funmilayo Ibukun Ifeoluwa Iyabo Jumoke Kehinde Kemi
    Lola Modupe Morayo Motunrayo Ngozi Nike Oladunni Olamide Olufunke Olusola Omolara Omowunmi Oyinda Remi Ronke Sade
    Simisola Sola Taiwo Temitope Titilayo Toke Tolu Tomiwa Wuraola Yejide Yetunde Yewande Zainab`,
    `Abayomi Abiodun Adebayo Adekunle Ademola Adewale Adeyemi Akinola Akinwale Ayinde Ayobami Babajide Babatunde Bamidele
    Dapo Dayo Ebunoluwa Femi Folarin Gbenga Ibrahim Idowu Jide Kayode Kola Kunle Ladipo Lanre Niyi Obafemi Oladele Olajide
    Olamilekan Olaniyi Olatunde Olawale Olufemi Olumide Oluwaseun Oluwatobi Omotayo Oyebanji Rotimi Segun Seyi Sola Sunday
    Taiwo Tayo Tobi Tunde Wale Wole Yemi Yinka Kehinde Akin Bayo Deji Jimi`,
    `Adebayo Adeyemi Adeleke Afolabi Ajayi Akande Akinyemi Alabi Awolowo Ayodele Babatunde Balogun Bankole Bello Dada
    Ogunleye Fashola Fasanya Ige Ilori Johnson Kolawole Lawal Makinde Ogunbiyi Ogundipe Ogunlana Ojo Okonkwo Oladipo
    Olaniyan Olatunji Olawale Olayinka Oluwole Omotoso Onabanjo Oni Osinbajo Owolabi Oyebanji Oyedepo Oyelaran Oyelowo
    Oyewole Salami Shittu Sowande Soyinka Taiwo Tinubu Adeniyi Adesina Adewumi Agboola Ajibade Akinola Akintola Aremu
    Atanda Ayinla Badmus Fadare Fagbemi Falana Famuyiwa Fatunde Ibikunle Idowu Ilesanmi Jegede Kuti Ladipo Odukoya Ogunbanjo
    Ogunde Ogunsanya Ojukwu Okafor Oladele Olagunju Olaleye Olaoye Olatunde Olowu Olusegun Omisore Opeyemi Orimolade Osho
    Otedola Oyekan Popoola Raji Sanni Soetan Somolu Tiamiyu Williams Yusuf Akintunde Babalola Ogunwale Olukoya`),
  culture("suaili", "Suaíli", "costa suaíli e os grandes lagos da África Oriental",
    `Amani Aisha Asha Baraka Chausiku Dalila Eshe Faraja Fatuma Halima Hadiya Imani Jamila Johari Kamaria Kesi Khadija
    Lulu Makena Malaika Mariamu Mosi Mwajuma Mwanaisha Nafula Nala Neema Nia Nyokabi Pendo Rehema Saida Salma Sauda
    Subira Tabia Tatu Upendo Wambui Wanjiru Waridi Zawadi Zuhura Zuri Achieng Adhiambo Akinyi Atieno Chiku Furaha Habiba
    Kanika Mwanajuma Nasra Njeri Nyambura Sabra Shani Zainabu`,
    `Abasi Ali Amani Asante Bakari Baraka Chege Daudi Ekundayo Faraji Haji Hamisi Hassani Issa Jabari Jelani Juma Kamau
    Kariuki Kato Kibet Kimani Kiprono Kitwana Kofi Makame Mbwana Mosi Mwangi Mwinyi Njoroge Nuru Odhiambo Omari Otieno
    Rashidi Rehani Salim Sefu Shabani Sudi Suleimani Tumaini Uhuru Wafula Wanjala Yusufu Zuberi Atieno Barasa Kiptoo
    Mutua Mwamba Nyerere Ochieng Wekesa Kiprotich Mzee Zawadi`,
    `Mwangi Kamau Otieno Odhiambo Wanjiru Njoroge Kariuki Kimani Ochieng Onyango Mutua Wambui Kiprono Kipchoge Cheruiyot
    Rotich Kiplagat Kibet Langat Koech Korir Ruto Chebet Wekesa Wafula Barasa Simiyu Nyongesa Juma Hassani Bakari Salim
    Omari Mohamedi Abdallah Mwinyi Makame Shabani Ramadhani Athumani Mfaume Kombo Mzee Nyerere Kikwete Magufuli Mkapa
    Kawawa Sokoine Kenyatta Moi Kibaki Odinga Mboya Ngugi Maathai Wamalwa Kalonzo Musyoka Nzioka Mulwa Kilonzo Munyao
    Mbithi Ndambuki Kioko Muthoka Makau Mumo Wairimu Njeri Gathoni Mugo Gitau Macharia Wainaina Ndungu Kinyanjui Muriuki
    Mbugua Kahara Mburu Githinji Kuria Gachanja Muchiri Ngaruiya Thuo Waweru Nderitu Kamande Gachoka Karanja Wanyama
    Omondi Owino Ouma Okoth Achola Wanyonyi Lusweti Masinde`),
  culture("tupi", "Tupi-guarani", "povos tupi e guarani; um nome só, sem sobrenome",
    `Abaeté Aci Aracy Arani Araci Bartira Cauane Ceci Coaraci Iamê Iara Iacira Iandara Iberê Inaiê Iraci Irani Itanajara
    Jaci Jacira Janaína Jandaia Jandira Juçara Jurema Kauane Maiara Maíra Moacira Moema Nayara Paraguaçu Poti Potira Raíra
    Sumaia Tainá Tainara Tamires Tiê Ubiratã Ybyrá Yaci Yara Yasmin Ivy Mainá Araní Cunhã Ivi Jussara Aiyra Anahí Panambi
    Porã Mbaraka Kerana Jaciara`,
    `Abaeté Acauã Aimberê Anhangá Apoena Araribóia Aruã Caiubi Caramuru Cauã Cauê Coaraci Cunhambebe Guaraci Guarani
    Iberê Iracema Itaguaçu Jaguar Jaguaraci Jandir Juruna Kaiã Kauê Moacir Nhandu Obirici Pajeú Peri Piatã Poti Raoni
    Rudá Sepé Tabajara Tainã Tibiriçá Tupã Tupinambá Ubirajara Ubiratã Uirá Yberê Ybytu Jacy Caetê Mbói Arapuã Guairá
    Jaguarari Tabaré Avaré Tapiá Ipojucã Apuã Jurandir Japiaçu Guaracy`,
    ""),
  culture("nahuatl", "Nahuatl", "povos do vale do México; um nome só, ligado à natureza e aos deuses",
    `Atl Chalchiuitl Citlali Citlalmina Coatl Coyolxauhqui Eréndira Ichtaca Itzel Itzpapalotl Ixchel Izel Mayahuel
    Metztli Miahuatl Necahual Nenetl Nochtli Papan Quetzalli Teoxihuitl Tlalli Tlanextli Tonalli Toci Xiadani Xiloxoch
    Xochitl Xochiquetzal Yaretzi Yoloxochitl Zyanya Ameyali Atzin Centehua Chimalma Cihuacoatl Citlalli Coaxoch Eztli
    Huitzili Ilhuicatl Ixtli Malinalli Matlalihuitl Meztli Nayeli Necalli Quiahuitl Sacnite Tecuichpo Teyacapan Tlazohtzin
    Tlilpotonqui Xihuitl Yaotl Yolotli`,
    `Acamapichtli Ahuitzotl Atlahua Axayacatl Chimalli Chimalpopoca Citlalli Coaxoch Cuauhtémoc Cuauhtli Cuetlachtli
    Ehecatl Huemac Huitzilihuitl Huitzilopochtli Ilhuicamina Itzcoatl Itztli Ixtlilxochitl Matlal Mazatl Mixcoatl
    Moctezuma Necalli Nezahualcoyotl Nezahualpilli Ocelotl Ollin Patli Quauhtli Quetzalcoatl Tecuani Tenoch Tepiltzin
    Tezcatl Tezozomoc Tizoc Tlacaelel Tlaloc Tlanextic Tochtli Tonatiuh Tototl Xicotencatl Xipil Xiuhcoatl Xolotl Yaotl
    Yolotl Zolin Acatl Calli Cipactli Cozcacuauhtli Malinalli Miquiztli Ozomatli Tecpatl Tepetl`,
    ""),
  culture("egipcia", "Egípcia antiga", "dinastias do Nilo; um nome só, muitas vezes com um deus dentro",
    `Ahmose Amunet Ankhesenamun Bastet Bentanta Hatshepsut Henuttawy Heqet Iset Isetnofret Kawit Khentkaus Khnumet
    Maatkare Meritamun Meritaten Merneith Meresankh Meryt Mutemwia Mutnedjmet Nebet Neferet Nefertari Nefertiti
    Neferure Neith Nephthys Nitocris Nodjmet Nubkhesbed Satamun Sitre Sobekneferu Takhat Tetisheri Tiye Tuya Twosret
    Wadjet Ahhotep Anat Ankhet Baketamun Duathathor Hathor Henut Herit Inet Iuput Karomama Kiya Maia Merit Nebettawy
    Neferhotep Seshat Tausret Tey Tiaa`,
    `Ahmose Akhenaton Amenemhat Amenhotep Amenmesse Anen Ankhaf Apepi Ay Bakenkhonsu Djedefre Djehuty Djoser Hapu
    Haremhab Herihor Hor Huya Imhotep Ineni Intef Kagemni Kamose Khaemwaset Khafre Khufu Mentuhotep Menkaure Merneptah
    Montu Nakht Narmer Nebamun Neferhotep Neferkare Paser Pepi Psamtik Ptahhotep Ptahmose Ramose Ramsés Rekhmire Sahure
    Senenmut Senusret Seti Shabaka Sheshonq Siamun Smenkhkare Sneferu Taharqa Thutmose Tutankhamon Userkaf Weni Yuya`,
    ""),
  culture("mongol", "Mongol", "estepes da Mongólia; o nome do pai vem antes, no genitivo",
    `Altantsetseg Altanzul Ariunaa Bolormaa Borte Bulgan Chimeg Dulmaa Enkhjargal Enkhtuya Erdenechimeg Gerel Gerelmaa
    Khulan Khongorzul Lkhamsuren Mönkhtsetseg Nara Narantsetseg Narangerel Nomin Nominchimeg Oyun Oyunchimeg Saran
    Sarangerel Sarnai Solongo Sükhee Tsetseg Tsetsegmaa Tuya Tuyaa Uranchimeg Urantsetseg Yesügen Yesüi Zaya Zolzaya
    Alangoa Hoelun Sorghaghtani Toregene Mandukhai Altani Anu Bayarmaa Delgermaa Erdene Gantuya Javzandulam Khaliun
    Maral Nandin Odval Sodbilig Tsogzolmaa`,
    `Altan Altangerel Arslan Batbayar Batbold Bataar Batu Bayar Bayarsaikhan Berke Bilgüün Bold Boldbaatar Chagatai
    Chinggis Dorj Dorjsuren Enkhbayar Enkhbold Erdene Ganbaatar Ganzorig Gansukh Güyük Hulagu Jamukha Jebe Jochi Khasar
    Khubilai Möngke Mönkh Mönkhbat Naran Ögedei Ochir Sükhbaatar Subutai Temüjin Temür Toghrul Tolui Tömör Tsogt
    Tumen Yesügei Zorig Batzorig Bilegt Dashdorj Delger Ganbold Khurelbaatar Narantuya Otgonbayar Purevdorj Sanjaa Tsend`,
    "", { order: "sobrenome-nome", patronymic: { male: (father) => `${father}-iin`, female: (father) => `${father}-iin` } }),
  culture("elfica", "Élfica (inventada)", "povo antigo das florestas; nomes longos e cantados, casas com nomes de lugares",
    `Aelara Aerith Alaeth Alustriel Amarilis Anwen Arannis Arwëa Belanor Caelynn Celaena Elanil Elaria Eleniel Elessë
    Ellarian Elowen Faelyn Galadwen Ilyrana Isilwen Ithildë Keyleth Laerien Lia Lirien Liriel Lúthea Maerwen Meliamne
    Míriel Naivara Nimeria Nimrodel Nuala Quelenna Rilitar Sariel Shanaira Silaqui Sylvaril Tauriel Thalanil Thiriel
    Valanthe Vanyalë Varania Yaeliel Ylyndra Aerin Celebriel Eärwen Finduilas Idril Ilmarë Lindariel Melian Morwen`,
    `Adran Aelar Aerdeth Ahvain Aramil Arannis Aust Beiro Berrian Caeldrim Carric Dayereth Elandor Elrohir Enialis
    Erdan Erevan Faelar Galinndan Gennal Hadarai Halimath Heian Himo Immeral Ivellios Korfel Lamlis Laucian Lucan
    Mindartis Naal Nutae Paelias Peren Quarion Riardon Rolen Silvyr Soveliss Suhnae Thamior Tharivol Theren Theriatis
    Thervan Uthemar Vanuath Varis Aegnor Celeborn Ecthelion Glorfindel Ingwion Lindir Orophin Thranduin`,
    `Folha-de-Prata Canção-do-Vento Estrela-da-Manhã Orvalho-Lunar Bosque-Antigo Rio-de-Cristal Asa-de-Cisne
    Flor-da-Aurora Sombra-Serena Brisa-Dourada Raiz-Profunda Chama-Azul Pena-de-Garça Gota-de-Luz Véu-de-Névoa
    Lua-Crescente Campo-de-Lírios Galho-Florido Fonte-Clara Sussurro-das-Folhas Arco-Celeste Olhar-de-Falcão
    Coração-de-Carvalho Casca-de-Bétula Neve-Eterna Colina-Verde Lago-Espelhado Pétala-Branca Caminho-das-Estrelas
    Sol-Poente Céu-Profundo Harpa-de-Prata Musgo-Macio Vale-Escondido Sino-de-Vento Trilha-de-Cervos Amanhecer-Rubro
    Galhada-Alta Copa-Dourada Rosa-Selvagem Nascente-Pura Pedra-da-Lua Bruma-Matinal Seiva-Doce Voo-de-Andorinha
    Eco-da-Floresta Luz-de-Vaga-lume Sombra-de-Salgueiro Ninho-de-Coruja Cristal-de-Gelo Galho-de-Freixo Fio-de-Seda
    Canto-do-Rouxinol Onda-Calma Teia-de-Orvalho Pinheiro-Solitário Concha-Azul Folha-Caída Luar-de-Outono
    Primavera-Eterna Espinho-de-Rosa Cervo-Branco Flecha-Certeira Arco-de-Teixo Ventania-Suave Raio-de-Sol
    Riacho-Cantante Farfalhar Brilho-de-Estrela Ilha-Verde Copa-de-Faia Coroa-de-Folhas Sono-de-Inverno
    Neblina-do-Vale Garra-de-Lince Pena-de-Pavão Olho-de-Gato Mel-Silvestre Asa-de-Mariposa Floresta-Dourada
    Ramo-de-Hera Cinza-de-Prata Chuva-Fina Margem-do-Rio Lírio-do-Vale Hálito-de-Primavera Canção-Perdida
    Sombra-Lunar Céu-Estrelado Jardim-Suspenso Folha-de-Carvalho Raiz-de-Prata Vento-do-Oeste Flor-de-Cerejeira
    Gema-Verde Torre-de-Marfim Escudo-de-Folhas Raposa-Prateada Lagoa-Azul Pluma-Leve Brasa-Suave Trevo-Dourado
    Aurora-Boreal Gota-de-Mel`),
  culture("ana", "Anã (inventada)", "clãs das montanhas; nomes curtos e duros, clãs com nomes de ofício e pedra",
    `Amber Artin Audhild Bardryn Dagnal Diesa Eldeth Falkrunn Finellen Gunnloda Gurdis Helja Hlin Ilde Kathra Kristryd
    Liftrasa Mardred Riswynn Sannl Torbera Torgga Vistra Bruna Dagna Dísa Gerda Grenna Hilda Ingra Jorna Kerra Lodra
    Mórna Nalda Orsa Ragna Sigra Thyra Ulda Varda Yrsa Brekka Dorna Frida Glinna Hulda Ketta Marga Norda Rimma Skadi
    Tova Unna Vigga Werna Zorra Borgga Durdra`,
    `Adrik Alberich Baern Barendd Brottor Bruenor Dain Darrak Delg Eberk Einkil Fargrim Flint Gardain Harbek Kildrak
    Morgran Orsik Oskar Rangrim Rurik Taklinn Thoradin Thorin Tordek Traubon Travok Ulfgar Veit Vondal Balin Bombur Dwalin
    Farin Gloin Gror Hrolf Kili Nain Ori Thror Brak Dorn Durgan Grimnar Hargrim Korgan Magni Ormgar Snorri Thrain Ulrik
    Vagnar Bofur Throrin Dorgan Kragg`,
    `Martelo-de-Pedra Barba-de-Ferro Bigorna-Funda Machado-Rúnico Escudo-Partido Pedra-Negra Forja-Ardente
    Punho-de-Granito Picareta-Dourada Malho-Rubro Elmo-de-Bronze Cerveja-Forte Veio-de-Prata Rocha-Firme
    Túnel-Profundo Fogo-de-Brasa Martelo-Trovão Cinzel-Fino Muralha-Alta Barba-Trançada Mina-Antiga Ouro-Velho
    Cobre-Batido Ferro-Frio Carvão-Vivo Gema-Oculta Pedra-de-Amolar Fole-Ruidoso Lingote-Pesado Corrente-Forte
    Elo-Partido Couraça-Firme Bota-de-Ferro Lanterna-de-Mina Picareta-Velha Montanha-Cinza Granito-Rosa
    Basalto-Escuro Mármore-Branco Quartzo-Claro Diamante-Bruto Rubi-Sangrento Safira-Azul Esmeralda-Funda
    Obsidiana Pedra-Sonora Salão-de-Pedra Trono-de-Granito Porta-Rúnica Chave-de-Ferro Escada-Funda Ponte-de-Pedra
    Coluna-Firme Arco-de-Pedra Fornalha Brasa-Eterna Fumaça-Negra Vapor-Quente Rio-Subterrâneo Lago-Escuro
    Caverna-Funda Abismo Cume-Gelado Neve-de-Pico Avalanche Trovão-da-Serra Eco-da-Mina Barril-Cheio Caneco-de-Peltre
    Malte-Escuro Lúpulo-Amargo Hidromel-Velho Machado-Duplo Lança-Curta Besta-Pesada Escudo-Torre Martelo-de-Guerra
    Clava-Rúnica Runa-Viva Sangue-de-Pedra Osso-Duro Pele-de-Couro Punho-Fechado Olho-de-Ônix Dente-de-Pedra
    Coração-de-Bigorna Ombro-de-Ferro Testa-Dura Pé-Firme Braço-Forte Juramento-Eterno Honra-Antiga Dívida-Paga
    Rancor-Velho Grito-de-Guerra Marcha-Lenta Cerco-Longo Fortaleza Bastião Guarda-da-Porta Sentinela-Cinza
    Vigia-Funda Mestre-Ferreiro Ourives-Real Pedreiro-Mor`),
  culture("orquica", "Órquica (inventada)", "tribos das terras ermas; nomes ásperos, apelidos ganhos em batalha",
    `Arha Baggi Bendoo Bilga Brakka Creega Drenna Ekk Emen Engong Fistula Gaaki Gorga Grai Greeba Grigi Gynk Hrathy Huru
    Ilga Kabbarg Kansif Lagazi Lezre Murgen Murook Myev Nagrette Neega Nella Nogu Oolah Ootah Ovak Ownka Puyet Reeza Shautha
    Silgre Sutha Tagga Tawar Tomph Ubada Vanchu Vola Volen Vorka Yevelda Zagga Ghora Kruga Morga Shagra Urza Grishka
    Dushka Throka Varga`,
    `Argran Braak Brug Cagak Dench Dorn Dren Druuk Feng Gell Gnarsh Grumbar Gubrash Hagren Henk Hogar Holg Imsh Karash
    Karg Keth Korag Krusk Lubash Megged Mhurren Mord Morg Nil Nybarg Odorr Ohr Rendar Resh Ront Rrath Sark Scrag Sheggen
    Shump Tanglar Tarak Thar Thokk Trag Ugarth Varg Vilberg Yurk Zed Grommash Durotar Gorgut Skarr Brakk Ugluk Shagrat
    Gorbag Lugdush Mauhur`,
    `Quebra-Crânios Arranca-Dentes Olho-Rasgado Punho-Sangrento Mordida-Negra Rugido-Rouco Lâmina-Torta Osso-Partido
    Pele-Queimada Presa-de-Javali Grito-de-Sangue Machado-Cego Lança-Suja Escudo-de-Couro Pé-de-Pedra Garra-Rubra
    Cicatriz-Funda Orelha-Cortada Nariz-Torto Dente-Quebrado Língua-Bifurcada Sangue-Fervente Fúria-Cega Cinzas-Negras
    Fumaça-Acre Lama-Grossa Pântano-Podre Caveira-Pintada Tambor-de-Guerra Trovão-Rouco Corvo-Faminto Lobo-Sarnento
    Javali-Bravo Víbora-Verde Escorpião Abutre Hiena-Risonha Urso-das-Cavernas Rato-de-Esgoto Verme-Gordo Lesma-Lenta
    Fogo-Selvagem Brasa-Rubra Carvão-Negro Ferro-Enferrujado Corrente-Partida Gancho-de-Carne Faca-Cega Clava-de-Pregos
    Elmo-de-Chifre Capa-de-Pele Trapo-Sujo Bota-Furada Barriga-Cheia Fome-Eterna Sede-de-Sangue Mão-Pesada
    Braço-Torto Costas-Largas Pescoço-Grosso Testa-Baixa Queixo-Quadrado Olho-de-Fogo Uivo-Noturno Sombra-Rasteira
    Pegada-Funda Rastro-de-Sangue Matador-de-Elfos Caçador-de-Anões Comedor-de-Ossos Ladrão-de-Ovelhas
    Saqueador-de-Vilas Incendiário Destruidor Esmagador Devorador Arrasador Pisoteador Mordedor Rasgador Cortador
    Rachador Estripador Uivador Rosnador Berrador Batedor Queimador Afogador Enforcador Degolador Estrangulador
    Roedor-de-Pedra Bebedor-de-Lama Filho-da-Tempestade Filho-do-Trovão Último-de-Pé Primeiro-a-Correr
    Sem-Medo Sem-Nome Duas-Facas Três-Dedos Meia-Orelha Um-Olho Cem-Cicatrizes Mil-Mortes Rei-da-Lama Senhor-dos-Ossos`),
]

/** As culturas da beta.22 e as novas (no fim), com os nomes acrescentados depois. */
export const NAME_CULTURES: NameCulture[] = [...BASE_CULTURES, ...EXTRA_CULTURES].map((culture) => {
    const more = MORE_CULTURE_NAMES[culture.id]
    if (!more) return culture
    const add = (text?: string) => (text ? words(text) : [])
    return { ...culture, female: [...culture.female, ...add(more.female)], male: [...culture.male, ...add(more.male)], surnames: [...culture.surnames, ...add(more.surnames)] }
})

/** Sorteia um nome da cultura; `random` fixo deixa o resultado previsível nos testes. */
export function cultureName(culture: NameCulture, gender: "f" | "m", random: () => number = Math.random): string {
  const pick = <T,>(values: readonly T[]) => values[Math.max(0, Math.min(values.length - 1, Math.floor(random() * values.length)))]!
  const given = pick(gender === "f" ? culture.female : culture.male)
  const family = culture.surnames.length ? pick(culture.surnames) : culture.patronymic ? culture.patronymic[gender === "f" ? "female" : "male"](pick(culture.male)) : ""
  if (!family) return given
  return culture.order === "sobrenome-nome" ? `${family} ${given}` : `${given} ${family}`
}
