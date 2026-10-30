/**
 * Culturas novas do gerador de nomes (dobro da beta.22). Mesmo formato de `name-cultures.ts`: nomes separados por
 * espaço, `_` vira espaço. As cinco últimas são inventadas para mesas de fantasia.
 */
import type { NameCulture } from "./name-cultures"

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean).map((word) => word.replace(/_/g, " "))
function culture(id: string, label: string, hint: string, female: string, male: string, surnames: string, extra: Partial<NameCulture> = {}): NameCulture {
  return { id, label, hint, female: words(female), male: words(male), surnames: words(surnames), order: "nome-sobrenome", ...extra }
}

export const EXTRA_CULTURES: NameCulture[] = [
  culture("coreana", "Coreana", "reinos da península coreana; o sobrenome vem antes do nome",
    `Ji-woo Seo-yeon Min-ji Ha-eun Su-bin Ye-jin Ji-min Da-eun Seo-hyun Yu-jin Eun-ji Hye-jin Na-yeon So-yeon Ji-hye
    Hyo-jin Min-seo Ye-eun Chae-won Ga-eun Ha-yoon Seo-ah Ji-an Yoon-seo Da-in Soo-ah Ye-rin Ha-rin Eun-seo Ah-rin
    Bo-ra Mi-rae Sun-hee Young-hee Mi-kyung Jung-ah Hae-won In-hye Kyung-ja Ok-soon Myung-sook Soon-ja Hwa-young
    Jin-ah Ae-ri Bo-young Hye-won Mi-sook Sun-young Yeon-hee Eun-hye Ha-neul Ga-young Joo-hee Seul-gi Na-rae Ri-na
    Yu-na Ji-yoon Han-byul Bit-na Sae-rom Da-som`,
    `Min-jun Seo-jun Do-yun Ye-jun Si-woo Ha-jun Ji-ho Ju-won Ji-hoon Jun-seo Gun-woo Hyun-woo Woo-jin Seung-min Dong-hyun
    Jae-won Tae-yang Sung-ho Young-ho Jin-woo Kyung-soo Jae-hyun Sang-woo Min-ho Joon-young Jung-hoon Hyun-jin Seung-woo
    Tae-hyun Kwang-soo Byung-hoon Chang-min Dae-sung Eun-woo Gi-tae Han-gyeol Hee-chul In-sung Jong-kook Kang-dae
    Myung-soo Nam-gil Seok-jin Sang-hoon Tae-woong Won-bin Yoon-ho Young-jae Il-woo Chul-soo Doo-hyun Gyu-ri Hak-jun
    Jae-sung Ki-bum Moon-soo Pil-sung Ryu-jin Sun-woo`,
    `Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Oh Seo Shin Kwon Hwang Ahn Song Jeon Hong Yoo Ko Moon Yang Son Bae
    Baek Heo Nam Shim Noh Ha Kwak Sung Cha Joo Woo Koo Min Ryu Na Jin Ji Eom Chae Won Cheon Bang Gong Hyun Ham Byun
    Yeom Yeo Choo Do So Seok Seon Sul Ma Gil Yeon Wi Pyo Myung Ki Ban Ra Wang Geum Ok Yook In Maeng Je Mo Tak Guk Eo
    Eun Pyeon Yong Ye Kyung Bong Sa Bu Hwangbo Namgung Jegal Seonu Dokgo Sagong Seomun Gam Gyeon Dong Pi Tae Gu Mok
    Ga Bin Jeom Sim Hwa`,
    { order: "sobrenome-nome" }),
  culture("finlandesa", "Finlandesa", "florestas e lagos da Finlândia e da Carélia",
    `Aino Aili Aune Eeva Elina Elli Emilia Helmi Hilja Ilona Inkeri Irja Johanna Kaarina Kaisa Katri Kerttu Kirsi
    Laila Lahja Leena Liisa Lotta Maija Marjatta Meri Minna Mirja Neea Noora Oona Outi Paula Pirkko Raija Riikka
    Ritva Saara Sanna Satu Seija Siiri Sirkka Sofia Suvi Taina Tarja Terhi Tuula Tyyne Ulla Venla Vilma Viivi Anneli
    Hanna Iida Jenni Kukka Lumi Pihla Ronja Tuuli Ulpu`,
    `Aapo Aarne Akseli Antero Antti Arvo Eero Eino Elias Erkki Esa Hannu Heikki Ilmari Jaakko Jari Joonas Jouko Juha
    Juho Jussi Kalle Kari Kauko Lauri Leevi Martti Matti Mikko Niilo Olavi Onni Osmo Paavo Pekka Pentti Petri Raimo
    Reijo Risto Sakari Sami Seppo Simo Taisto Tapani Tapio Teemu Timo Toivo Tuomas Unto Urho Valtteri Veikko Väinö
    Ville Aleksi Eemeli Ilkka Kaapo Lassi Oiva Topi`,
    `Virtanen Korhonen Mäkinen Nieminen Mäkelä Hämäläinen Laine Heikkinen Koskinen Järvinen Lehtonen Lehtinen Saarinen
    Salminen Heinonen Niemi Heikkilä Kinnunen Salonen Turunen Salo Laitinen Tuominen Rantanen Karjalainen Jokinen
    Mattila Savolainen Lahtinen Ahonen Leinonen Hiltunen Kallio Lindholm Miettinen Pitkänen Leppänen Väisänen Hirvonen
    Manninen Laaksonen Aaltonen Peltonen Lindroos Halonen Seppälä Koivisto Räsänen Huttunen Kärkkäinen Toivonen
    Laukkanen Ojala Mustonen Ketola Kettunen Vainio Lappalainen Hakala Rinne Laakso Lindqvist Kauppinen Moilanen
    Honkanen Nurmi Pesonen Tikkanen Oksanen Kivelä Kivinen Heino Mäki Rautio Asikainen Vuorinen Karvonen Ikonen
    Kokkonen Partanen Hyvönen Suominen Lampinen Kangas Sundström Hakkarainen Harju Holm Lehto Aalto Kemppainen Pelkonen
    Ruotsalainen Väänänen Halme Kurki Koponen Ilves Kuusela Paananen Haapala Ollila Peltola Koivu Sallinen`),
  culture("hungara", "Húngara", "planícies da Hungria e da Transilvânia; o sobrenome vem antes",
    `Anna Ágnes Andrea Anikó Boglárka Borbála Csilla Dóra Edit Emese Enikő Erika Erzsébet Eszter Éva Fruzsina Gabriella
    Gizella Hajnalka Hanna Ibolya Ildikó Ilona Irén Judit Julianna Katalin Klára Krisztina Lilla Magdolna Margit Mária
    Melinda Mónika Nóra Orsolya Piroska Réka Rita Rozália Sára Szilvia Tímea Tünde Valéria Veronika Viktória Virág Zita
    Zsófia Zsuzsanna Etelka Gyöngyi Kinga Kincső Panna Rozi Tekla Villő`,
    `Ádám András Antal Árpád Attila Balázs Barnabás Béla Bence Botond Csaba Dániel Dávid Dénes Elemér Endre Ernő Ferenc
    Gábor Gergely Géza György Gyula Imre István János Jenő József Kálmán Károly Kristóf Lajos László Levente Lóránt
    Márk Márton Mátyás Miklós Mihály Nándor Norbert Ottó Pál Péter Richárd Róbert Sándor Szabolcs Tamás Tibor Viktor
    Vilmos Zoltán Zsolt Bálint Kornél Lehel Örs Tas Zalán`,
    `Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas Balogh Papp Takács Juhász Lakatos Mészáros Oláh
    Simon Rácz Fekete Szilágyi Török Fehér Balázs Gál Kis Szűcs Kocsis Orsós Pintér Fodor Szalai Sipos Magyar Lukács
    Gulyás Biró Király Katona László Jakab Bogdán Balog Sándor Boros Fazekas Kelemen Antal Somogyi Orosz Fülöp Veres
    Budai Vass Bakos Pásztor Hegedűs Bodnár Vincze Lengyel Halász Szekeres Major Hajdu Deák Pap Fábián Bíró Vida
    Csonka Bárány Hegyi Erdős Pataki Bognár Benkő Kardos Szőke Bencze Nyitrai Vörös Kozma Dudás Péter Bánki Csizmadia
    Galambos Kálmán Kertész Lőrincz Mohácsi Nádasdy Rákóczi Széchenyi Zrínyi Báthory Esterházy Hunyadi Batthyány Kun Sárközi Medgyessy Tisza`,
    { order: "sobrenome-nome" }),
  culture("holandesa", "Holandesa", "Países Baixos e Flandres, de comerciantes e diques",
    `Aaltje Anke Annelies Antje Babette Bep Betje Brecht Cato Daantje Dieuwke Eline Elske Femke Fenna Geertje Gerda
    Grietje Hanneke Hendrika Ineke Janneke Jantje Jeltje Joke Kaatje Lieke Liesbeth Lotte Maaike Marieke Marijke Mies
    Neeltje Nienke Petronella Rianne Roos Saartje Sanne Sientje Silke Tineke Truus Wilhelmina Willemijn Wietske Yfke
    Aafke Bregje Doortje Fien Guusje Jet Loes Mieke Noor Wies`,
    `Aart Adriaan Anton Arend Arjen Bart Bastiaan Bram Casper Cornelis Daan Dirk Douwe Eelco Evert Floris Frans Gerrit
    Gijs Govert Hendrik Huib Jaap Jacob Jan Jelle Joost Jurriaan Kees Klaas Koen Lambert Lars Laurens Maarten Marten
    Michiel Niels Pieter Reinier Rik Roelof Ruud Sander Sjoerd Stijn Teun Thijs Tjeerd Ties Wessel Willem Wouter
    Bauke Dolf Geert Hidde Joris Ruben Sietse`,
    `de_Jong Jansen de_Vries van_den_Berg van_Dijk Bakker Janssen Visser Smit Meijer de_Boer Mulder de_Groot Bos Vos
    Peters Hendriks van_Leeuwen Dekker Brouwer de_Wit Dijkstra Smits de_Graaf van_der_Meer van_der_Linden Kok Jacobs
    de_Haan Vermeulen van_den_Heuvel van_der_Veen van_den_Broek de_Bruijn de_Bruin van_der_Heijden Schouten van_Beek
    Willems van_Vliet van_de_Ven Hoekstra Maas Verhoeven Koster van_Dam van_der_Wal Prins Blom Huisman Peeters
    de_Jonge Kuipers van_Veen Post Kuiper Veenstra Kramer van_den_Brink Scholten van_Wijk Postma Martens Vink
    de_Ruiter Timmermans Groen Gerritsen Jonker van_Loon Boer van_der_Velde Willemsen Smeets de_Lange de_Vos Bosch
    van_Dongen Schipper de_Koning van_der_Laan Koning van_der_Velden Driessen van_Doorn Hermans Evers van_den_Bosch
    van_der_Meulen Hofman Bosman Wolters Sanders van_der_Horst Mertens Molenaar Pronk Rutten Spijker Rembrandt
    Vermeer Steen Hals Mondriaan`),
  culture("armenia", "Armênia", "montanhas da Armênia; os sobrenomes terminam em -ian",
    `Anahit Ani Anush Arpi Astghik Ararat Arevik Armine Gayane Hasmik Hripsime Karine Knarik Lilit Lusine Maral Mariam
    Marine Narine Nane Nvard Ruzanna Satenik Seda Shushan Siranush Sona Srbuhi Susanna Taguhi Tamar Tatev Zara Zaruhi
    Zepyur Alvard Arax Arusyak Gohar Hayarpi Heghine Hermine Isabella Kristine Lala Manush Nazeli Nune Ovsanna Shoghik
    Shushanik Siran Varduhi Yeva Zabel Zangak Mane Margarit Sirun`,
    `Aram Ara Arman Armen Arsen Artak Artashes Artur Ashot Avetik Davit Edgar Gagik Garegin Garnik Gevorg Grigor Hakob
    Hayk Hovhannes Hrant Karen Khachatur Levon Mher Mkrtich Movses Narek Nerses Norayr Paruyr Petros Ruben Samvel Sargis
    Sevak Smbat Suren Tigran Vahagn Vahan Vardan Vazgen Zaven Zorayr Andranik Arshak Babken Gurgen Haik Hamlet Hrachya
    Mesrop Monte Shant Tatul Vache Varuzhan`,
    `Petrosyan Harutyunyan Sargsyan Hovhannisyan Grigoryan Khachatryan Hakobyan Vardanyan Stepanyan Karapetyan
    Gevorgyan Mkrtchyan Poghosyan Avetisyan Ghazaryan Manukyan Martirosyan Hayrapetyan Margaryan Mikayelyan Minasyan
    Arakelyan Asatryan Baghdasaryan Davtyan Galstyan Gasparyan Hambardzumyan Kocharyan Melkonyan Movsisyan Nazaryan
    Abrahamyan Aghajanyan Alexanyan Amirkhanyan Andreasyan Antonyan Arzumanyan Avagyan Babayan Badalyan Barseghyan
    Danielyan Darbinyan Dallakyan Egiazaryan Galoyan Ghukasyan Gyulumyan Hakhverdyan Hayrapetian Hovsepyan Israelyan
    Kirakosyan Kostanyan Krikorian Madoyan Malkhasyan Manvelyan Matevosyan Melikyan Mirzoyan Muradyan Nalbandyan
    Navasardyan Nersesyan Ohanyan Papazyan Rostomyan Safaryan Sahakyan Sargsian Shahinyan Simonyan Soghomonyan
    Tadevosyan Ter-Petrosyan Tonoyan Tumanyan Vardanian Yeghiazaryan Zakaryan Zohrabyan Abovyan Aivazovsky Saroyan
    Khachaturian Aznavourian Mardirossian Tashjian Kalajian Boyajian Najarian Dermenjian Ghazarian Hagopian Kasparian Manoogian Nazarian Ohanian Sarkisian Topalian`),
  culture("georgiana", "Georgiana", "reinos do Cáucaso; sobrenomes em -shvili e -dze",
    `Ana Ani Eka Ekaterine Elene Eliso Ia Ketevan Khatia Lali Lela Lika Maia Manana Mariam Marika Nana Natia Nato Nino
    Salome Sopo Sophio Tamar Tamuna Tea Tekla Tinatin Tsira Ketino Keti Medea Mzia Nanuli Nestan Rusudan Shorena Tako
    Tsitso Darejan Elisabed Gulnara Inga Irina Khatuna Lamara Lia Marine Mzevinar Nazi Nunu Sandra Teona Tiko Veriko
    Zeinab Zhuzhuna Eteri Dali Gvantsa`,
    `Aleksandre Amiran Archil Avtandil Bachana Badri Beka Dachi Davit Demetre Erekle Gela Giorgi Givi Gocha Guram Iakob
    Ilia Irakli Ivane Kakha Konstantine Lado Levan Luka Mamuka Merab Mikheil Nika Nikoloz Nodar Otar Paata Revaz Rezo
    Shalva Shota Simon Soso Tamaz Tariel Teimuraz Temur Tornike Vakhtang Vano Zaza Zurab Gaioz Goga Jaba Lasha Mate
    Rati Saba Sandro Tsotne Vazha Zviad`,
    `Beridze Kapanadze Gelashvili Maisuradze Giorgadze Lomidze Tsiklauri Bolkvadze Kvaratskhelia Nozadze Khutsishvili
    Shengelia Abashidze Mikeladze Tabatadze Mamedov Kiknadze Gogoladze Chikhladze Dolidze Gvenetadze Japaridze
    Kharaishvili Lomsadze Mchedlishvili Nadiradze Pirtskhalava Saakashvili Tsereteli Chavchavadze Dadiani Bagrationi
    Orbeliani Amilakhvari Eristavi Javakhishvili Kakabadze Kalandadze Khachidze Khoshtaria Kobakhidze Kurtanidze
    Margvelashvili Meladze Mgaloblishvili Natadze Papava Qavtaradze Rukhadze Shavgulidze Shevardnadze Sikharulidze
    Tchanturia Tkeshelashvili Tsagareishvili Tsitsishvili Vashakidze Zhvania Abuladze Antadze Bakradze Barbakadze
    Chachua Chkheidze Dzhaparidze Gabunia Gamsakhurdia Gelovani Grigolia Gugushvili Iashvili Jorjadze Kandelaki
    Kereselidze Kipiani Kldiashvili Kvirikashvili Lordkipanidze Mamaladze Matiashvili Melikishvili Mosashvili
    Nikoladze Okujava Paichadze Razmadze Sulakauri Tavadze Tsintsadze Usupashvili Vachnadze Zurabishvili Andronikashvili
    Bakhtadze Chubinidze Dvalishvili Gotsiridze Jgharkava Kenchadze Gogiashvili Kipshidze Mumladze Topuria`),
  culture("etiope", "Etíope", "terras altas da Etiópia; o segundo nome é o do pai",
    `Abeba Almaz Aster Ayana Azeb Bethlehem Birtukan Desta Eden Elleni Eyerusalem Fana Feven Genet Hana Hirut Kidist
    Konjit Lemlem Liya Mahlet Makeda Mekdes Meron Meseret Mulu Netsanet Rahel Saba Selam Selamawit Senait Sennait
    Sofonias Tadelech Tigist Tsedey Tsion Tirunesh Wubit Yeshi Zewditu Zinash Aberash Amarech Bezawit Dinknesh Etenesh
    Fikirte Haregewoin Kibnesh Mamitu Menen Mestawet Nardos Rediet Seble Tewabech Workinesh`,
    `Abebe Abiy Alemayehu Amare Berhanu Bekele Dawit Demeke Desalegn Ephrem Ermias Eyob Fasil Fikru Gebre Getachew
    Girma Haile Henok Kebede Kidane Lemma Lij Mekonnen Melaku Menelik Mesfin Mulugeta Negash Seifu Semere Shiferaw
    Solomon Tadesse Tafari Tekle Tesfaye Tewodros Teshome Tilahun Wolde Yared Yemane Yohannes Yonas Zerihun Abel
    Aklilu Asfaw Biniam Daniel Elias Fitsum Habtamu Kaleb Mikael Natnael Samuel Yeshitila Zelalem`,
    "", { patronymic: { male: (father) => father, female: (father) => father } }),
  culture("havaiana", "Havaiana e polinésia", "ilhas do Pacífico; um nome só, muitas vezes ligado ao mar e ao céu",
    `Ailani Akela Alana Alani Aolani Haunani Hiwalani Hōkū Iolana Kaimana Kaila Kalani Kalena Kamea Keala Kealoha Kehau
    Keilani Kiana Kailani Lani Leilani Leinani Lokelani Luana Mahina Makana Malia Malie Maile Malana Mele Moana Nalani
    Nani Noelani Noe Nohea Olina Palila Pualani Puanani Ululani Wailani Halia Hina Iwalani Kaena Kanoa Kawena Keiki
    Lehua Liko Lilinoe Manu Melia Noa Pele Wainani`,
    `Akamu Akoni Alika Analu Ikaika Iokepa Kahale Kahiau Kai Kaimi Kainoa Kaleo Kalua Kamaka Kamakana Kameha Kana Kanoa
    Kapena Kawika Keahi Keaka Keala Keanu Kekoa Kimo Koa Konane Lono Makoa Mana Manaia Mikala Nahele Nalu Nohea Palani
    Pono Ikaia Kahiko Kaiholo Kalani Kamaile Kanaloa Kaupo Keoni Kepa Kolohe Maui Makani Malu Noelo Paulo Tama Tane
    Tangaroa Wikolia`,
    ""),
  culture("inuite", "Inuíte", "povos do gelo do extremo norte; um nome só",
    `Aaju Aana Akna Aleqa Aput Arnaq Atiqtalik Aviaja Ivalu Kallik Kanaaq Kunik Malina Miki Nanouk Naaja Nauja Nivi
    Nukka Paninnguaq Pipaluk Pukiq Qilak Siku Suka Tupaarnaq Uki Uyarak Aaluk Amarok Arnaaluk Arnapik Ataataq Isapik
    Iluliaq Inuuja Kiluk Kunuk Maata Minik Nalua Navarana Nuvua Paaliaq Pilu Puja Qaqortoq Sakari Sila Sitsi Taqqiq
    Tiluk Tuuli Uluak Ulloriaq Umiaq Usuk Arnatsiaq Kigge Malik`,
    `Aguta Akiak Amaruq Anaanaq Angakkuq Apak Aqqaluk Arnaq Atanarjuat Atka Ikiaq Inuk Isuk Juaaka Kalluk Kiviaq Kunuk
    Malik Miki Nanuq Nuka Paniliaq Piita Pitsiark Qaanaaq Qajaq Qanniq Sakkiak Saqqaq Sialuk Tagak Tikaani Tulugaq
    Tuluk Tuurngait Ujarak Ukkuq Uluq Unalaq Usuk Aklak Anori Hamaq Iggi Iqaluk Kajortoq Kanut Kigiak Nattiq Nukilik
    Panik Quppersimaan Sila Siku Tarqik Tuukkaq Uqaliq Aputsiaq Kaali`,
    ""),
  culture("quichua", "Quíchua (andina)", "povos dos Andes e do império inca; um nome só",
    `Achik Akllasisa Amaru Anka Asiri Ayllu Cori Cusi Illari Inti Kantu Killa Koyllur Kusi Mama Mayu Micay Nina Nusta
    Ocllo Pacha Paqari Phuyu Qhawa Qori Qoyllur Raymi Rimay Sami Sayri Sisa Suyana Taki Tamia Tika Tupaq Urpi Wayra
    Waylla Yaku Yana Yupanki Allpa Aqhu Chaska Chumpi Huaco Kallpa Kuntur Llipi Mallku Munay Ñusta Paloma Pukyu
    Rumi Sumaq Tanta Wari`,
    `Amaru Apu Atahualpa Ayar Cusi Huaman Huayna Illapa Inti Kallpa Kamaq Kunturi Llamkay Lloque Mallku Manco Mayta
    Ninan Pachacuti Paullu Puma Qhapaq Qispi Rimaq Rumi Sayri Sinchi Tamya Titu Tupac Uturunku Waman Wari Wayna Willka
    Yachay Yaku Yawar Yupanki Achachi Antawa Atoq Chaski Chuqui Hatun Huaskar Inka Kusi Machaq Paqo Quilla Saywa
    Suyu Tanka Tupaq Uchu Urqu Wanka Wiraqocha`,
    ""),
  culture("mesopotamica", "Mesopotâmica antiga", "Suméria, Acádia e Babilônia; um nome só, muitas vezes com um deus",
    `Ama-sukkal Amat-Ninlil Enheduanna Ereshkigal Geme-Enlil Inanna Ishtar Kubaba Ku-Bau Nanshe Nidaba Ninbanda Ningal
    Ninlil Ninsun Nisaba Puabi Sabitum Shala Shamhat Shubad Tashmetum Abi-simti Ahatum Ammi-saduqa Belessunu Beltani
    Bunene Damqa Ea-sharrat Erishti Geshtinanna Humusi Iltani Ishtar-ummi Kishar Lamassi Mamitu Naqia Nin-banda Ninkasi
    Ninmah Ninshubur Rimtum Sammuramat Shamash-nuri Sharrat Sin-nada Tabni-Ishtar Taram-Uram Ubartum Ummi Waqrat
    Zakutu Zimri-ummi Amat-Sin Ana-Ishtar Ilshu-ibni Kuri Lilith Bau Ninatta`,
    `Adapa Akurgal Amar-Sin Ashurbanipal Atrahasis Bel-shar-usur Dumuzi Eannatum Enkidu Enlil-bani Enmerkar Etana
    Gilgamesh Gudea Hammurabi Ibbi-Sin Iddin-Dagan Ishbi-Erra Lugalbanda Lugalzagesi Mesannepada Nabonidus
    Nabopolassar Naram-Sin Nebuchadnezzar Rimush Sargon Shamshi-Adad Shu-Sin Shulgi Sin-leqi-unninni Sumu-abum
    Tiglath-Pileser Ur-Nammu Ur-Nanshe Utu-hegal Ziusudra Abi-eshuh Adad-nirari Amar-Utu Ashur-dan Bel-ibni Ea-nasir
    Enki-du Esarhaddon Ili-ma Ishme-Dagan Kudur-Mabuk Lipit-Ishtar Marduk-apla Nabu-nasir Nergal-ushezib Rim-Sin
    Sennacherib Shalmaneser Shamash-shum-ukin Sin-iddinam Tukulti-Ninurta Ur-Zababa Warad-Sin Zabaya`,
    ""),
  culture("halfling", "Halfling (inventada)", "povo pequeno dos campos e das colinas; sobrenomes de família camponesa",
    `Amaryllis Andry Belba Bella Berylla Bree Callie Camellia Cora Daisy Dora Eglantine Elanor Esmeralda Euphemia Fern
    Gilly Goldilocks Hilda Hollyhock Ivy Jasmine Kithri Lavinia Lidda Lily Linnea Lobelia Marigold Mentha Merla
    Mirabella Myrtle Nedda Paela Pansy Pearl Peony Pervinca Poppy Primrose Primula Rose Rosamunda Ruby Salvia Seraphina
    Tansy Tilly Verna Violet Wilhelmina Yolanda Zinnia Acacia Bramblerose Clover Hazel Meadow Posy Sorrel`,
    `Adalbert Alton Ander Andwise Balbo Bandobras Bilbo Bingo Blanco Bowman Bucca Cade Corrin Doderic Drogo Eldon
    Erling Everard Falco Ferdibrand Ferumbras Fosco Garret Gorbadoc Griffo Hamfast Hob Isembard Isengrim Lindal Lotho
    Lyle Marmadoc Merric Milo Mungo Odo Olo Osborn Otho Paladin Perrin Ponto Porto Posco Reed Reginard Robin Roscoe
    Rufus Sadoc Saradoc Seredic Tobold Tolman Wellby Wendel Wilibald Bartho Cotman Dudo Fastred Hugo Largo Nob Rory`,
    `Abaixo-da-Colina Amarrafeno Barriga-Cheia Bom-Corpo Botafogo Brandevin Cachimbo-Longo Capim-Alto Cardo-Doce
    Castanheiro Cerca-Viva Chá-das-Cinco Colhe-Mel Cova-Funda Cultiva-Bem Dedo-Verde Debaixo-do-Morro Erva-Boa
    Fava-Doce Feijão-Gordo Folha-de-Fumo Fundo-do-Vale Gordo-Feliz Gramado Horta-Grande Jardineiro Lenço-Florido
    Leiteiro Maçã-Verde Mel-de-Urze Moita-Baixa Monte-Verde Morro-Pequeno Muro-Baixo Nabo-Roxo Noz-Moscada Pão-Doce
    Pé-Peludo Pé-Ligeiro Pedra-Lisa Pomar-Velho Porta-Redonda Prato-Fundo Queijo-Mole Rio-Manso Riso-Fácil Roda-de-Moinho
    Rolha-de-Cortiça Salsa-Fresca Sebe-Alta Sete-Fornadas Sol-de-Tarde Sopa-Quente Toca-Funda Torta-de-Amora
    Trevo-da-Sorte Trigo-Novo Vale-Verde Velho-Tonel Agulha-Fina Alecrim Batata-Doce Bolota Bota-Furada Broa-Quente
    Cabaça Cântaro Capoeira Cebolinha Chaleira Colherada Cozinha-Cheia Despensa Erva-Cidreira Fogão-a-Lenha Funil
    Garrafão Goiabada Jarro-Velho Lareira Manteiga Marmelada Moranga Morango-Silvestre Panela-Velha Pastel Pipoca Polenta
    Rabanete Rapadura Rocambole Toucinho Varal Xícara-Fina Amora-Doce Canela-Fina Cesto-Cheio Figo-Maduro Leite-Morno Mel-Grosso Ninho-Quente Pão-de-Mel Salgueiro-Baixo Trilha-Curta`),
  culture("gnoma", "Gnoma (inventada)", "inventores e ilusionistas das tocas; nomes longos e apelidos de oficina",
    `Bimpnottin Breena Caramip Carlin Donella Duvamil Ella Ellyjobell Ellywick Lilli Loopmottin Lorilla Mardnab Nissa
    Nyx Oda Orla Roywyn Shamil Tana Waywocket Zanna Bimble Fizzwick Gimble Quilla Rinnet Sprocka Tinkle Wizzle Zippa
    Bellabel Cogsy Dimble Fennelope Glimmera Ninkabel Pippatwist Quibbly Sprinna Twinkla Widget Zibba Brassy Flicka
    Gearlynn Kettleby Nimbletta Pocket Ratchetta Spindla Tamsa Thimbla Valvette Whistla Yarrabel Zephyrette Bobbla Tilda`,
    `Alston Alvyn Boddynock Brocc Burgell Dimble Eldon Erky Fonkin Frug Gerbo Gimble Glim Jebeddo Kellen Namfoodle
    Orryn Roondar Seebo Sindri Warryn Wrenn Zook Bixby Cogwort Dizzlewick Fizban Gizmo Kibble Nackle Nebbin Pockle
    Quillon Sprocket Tinker Twizzle Widdle Zibble Brassbolt Clank Dinkum Fennick Gadget Hobnob Jinx Kettle Nimbus Orbo
    Pinwheel Ratchet Spindle Thimble Valvo Whistlewick Yeeble Zipper Bolt Cranky`,
    `Bafflestone Beren Daergel Folkor Garrick Nackle Murnig Ningel Raulnor Scheppen Timbers Turen Engrenagem
    Faísca-Azul Parafuso-Solto Mola-Tensa Manivela Rosca-Fina Fole-Doce Lente-Torta Chave-Inglesa Pistão Alavanca
    Dínamo Válvula Caldeira Bobina Catraca Roldana Polia Eixo-Torto Biela Mancal Cremalheira Rebite Arruela Porca-Doida
    Pino-Mestre Graxa-Boa Vapor-Alto Apito-Fino Relojoaria Ampulheta Bússola-Louca Cata-Vento Luneta Lupa-Grande
    Espelhinho Prisma Cristal-Fosco Ilusão-Leve Brilho-Falso Truque-Bom Fumacinha Estalo Pipoca-Mágica Confete
    Serpentina Fogo-de-Artifício Faísca Lâmpada Fiozinho Botãozinho Molinha Engenhoca Geringonça Traquitana Bugiganga
    Quinquilharia Badulaque Penduricalho Cacareco Treco Troço Coisinha Tralha Caixinha Gavetinha Cofrinho Baú-Mágico
    Chapéu-Alto Sapato-Fino Gravata-Torta Óculos-Redondos Barba-Encaracolada Nariz-Grande Orelha-Fina Sorriso-Torto
    Riso-Fácil Pé-Ligeiro Mão-Leve Dedo-Hábil Olho-Vivo Cabeça-Quente Ideia-Brilhante Sonho-Alto Pensa-Muito Fala-Rápido
    Gira-Mundo Tic-Tac Trim-Trim Zum-Zum Bum-Bum`),
  culture("draconica", "Dracônica (inventada)", "povo de sangue de dragão; nomes ásperos e o nome do clã",
    `Akra Biri Daar Farideh Harann Havilar Jheri Kava Korinn Mishann Nala Perra Raiann Sora Surina Thava Uadjit
    Ashrinda Belith Charra Dazzra Ekarra Fyrra Ghessa Hallara Irrith Jazzra Kesshra Lyrrith Mazzra Nyrrith Oszra
    Pyrrha Qazzra Rhyssa Sazzra Tyrrith Urrith Vyrra Xarra Ysskra Zarrith Ammara Brisska Corrith Drakka Ezzra Fhazra
    Gyrra Hissra Ithra Jyrra Kalinth Lazzara Myrrha Nazzith Ophyrra Rissa`,
    `Arjhan Balasar Bharash Donaar Ghesh Heskan Kriv Medrash Mehen Nadarr Pandjed Patrin Rhogar Shamash Shedinn
    Tarhun Torinn Azzakh Baradakh Ckhaz Drazzar Ekhorr Fyrrax Ghorrak Hazzrak Ixthrak Jazzrak Khorrad Lazzrak Mazzrak
    Nazzrak Orrak Pazzrak Qazzrak Rhazzar Sazzrak Thazzrak Uzzrak Vazzrak Xazzrak Yazzrak Zazzrak Akkhan Bhurash Ckhorr
    Draxx Esskar Ghorran Hrrakh Irrakh Kezzrak Lorrakh Morrakh Nazzar Orrikh Rakkhan Szarr Turrakh`,
    `Clethtinthiallor Daardendrian Delmirev Drachedandion Fenkenkabradon Kepeshkmolik Kerrhylon Kimbatuul Linxakasendalor
    Myastan Nemmonis Norixius Ophinshtalajiir Prexijandilin Shestendeliath Turnuroth Verthisathurgiesh Yarjerit
    Escama-Rubra Escama-Negra Escama-de-Bronze Escama-de-Cobre Escama-de-Ouro Escama-de-Prata Escama-Azul
    Escama-Verde Escama-Branca Chama-Eterna Sopro-de-Fogo Sopro-Gelado Sopro-Ácido Sopro-de-Raio Garra-de-Ferro
    Garra-Sangrenta Asa-Partida Asa-de-Brasa Olho-de-Fogo Olho-de-Âmbar Dente-de-Pedra Cauda-Longa Chifre-Negro
    Chifre-de-Bronze Coração-de-Brasa Sangue-Antigo Sangue-de-Wyrm Fúria-Rubra Trovão-Escamoso Pedra-Viva Cinza-Quente
    Fumaça-Negra Vulcão Magma Obsidiana Rubi-Ardente Safira-Gélida Esmeralda-Ácida Topázio-Elétrico Ônix-Sombrio
    Ninho-Alto Ninho-de-Pedra Pico-Fumegante Caverna-Funda Tesouro-Antigo Ouro-Guardado Ovo-de-Fogo Ovo-de-Pedra
    Rugido-Alto Rugido-Rouco Juramento-de-Sangue Honra-de-Clã Vigília-Eterna Lança-de-Escama Escudo-de-Escama
    Bainha-de-Osso Elmo-de-Chifre Tambor-de-Guerra Grito-de-Batalha Primeiro-Ovo Último-Ninho Filho-do-Fogo
    Filho-do-Gelo Filho-do-Trovão Senhor-das-Cinzas Senhor-das-Marés Senhor-da-Areia Guardião-do-Ninho Caçador-de-Wyrms
    Matador-de-Gigantes Lâmina-Rubra Lâmina-Negra Punho-de-Brasa Vento-Ardente Céu-Rubro Lua-de-Fogo Sol-Negro
    Estrela-Caída Montanha-Viva Brasa-Viva Fornalha Forja-Antiga Bigorna-Viva Martelo-Rubro Corrente-de-Ferro`),
  culture("infernal", "Infernal (inventada)", "descendentes de pactos antigos; nomes infernais ou de virtude, sem sobrenome",
    `Akta Anakis Bryseis Criella Damaia Ea Kallista Lerissa Makaria Nemeia Orianna Phelaia Rieta Ashtara Belaxa Caelith
    Dezra Esvele Ferra Ghilanna Hespera Iskra Jezebeth Kethra Lilitha Mazera Nyxa Oriel Pyra Qessa Rhesa Shava Tiamra
    Ulvara Vexa Xira Yseult Zhera Alegria Ânsia Aurora Beleza Clemência Desejo Esperança Fé Glória Graça Harmonia
    Honra Júbilo Lamento Luxúria Melancolia Paixão Piedade Promessa Sina Ternura Tristeza Vaidade Ventura`,
    `Akmenos Amnon Barakas Damakos Ekemon Iados Kairon Leucis Melech Mordai Morthos Pelaios Skamos Therai Abraxas
    Belial Caim Dantalion Eligos Furfur Gaap Haures Ipos Jezrael Kimaris Leraje Malphas Naberius Orobas Paimon Raum
    Sabnock Stolas Valac Vepar Xaphan Zagan Andras Bifrons Crocell Decarabia Amargura Ardor Coragem Desafio Desdém
    Destino Desprezo Fúria Glória Ira Medo Mentira Orgulho Ousadia Perigo Pesar Poder Rancor Silêncio Tormento Triunfo
    Vingança Vitória`,
    ""),
  culture("feerica", "Feérica (inventada)", "povo das fadas; nomes que soam como sinos, sem sobrenome",
    `Aelira Briarrose Celandine Dewdrop Elowyn Fennella Glimmerwing Hollyberry Iriel Jessamine Kestrella Lilibet
    Moonpetal Nimue Oriabel Puckeline Quillith Rosethorn Sylphine Thistledown Umbrella Violetta Willowmere Xanthe
    Yarrowyn Zephyrine Alvina Bellflower Cinderwisp Dandelion Ellabell Faylin Gossamer Honeysuckle Ilianne Junebug
    Kalista Larkspur Mistral Nettle Oleander Primrose Quince Riverbell Starling Twilight Ulmara Vesper Wisteria
    Ysolde Zinnia Amberlight Blossom Clover Dewmist Fernshade Glimmer Sorrelwind`,
    `Alder Bramble Corwin Dunstan Eldrin Fenwick Galen Hawthorn Ivor Jasper Kestrel Linden Moss Nettle Oberon Puck
    Quillan Rowan Sorrel Thorne Umber Vale Wren Yarrow Zephyr Ash Birch Cedar Dewin Elmwood Flint Gorse Heath Inkcap
    Juniper Kelp Lark Mallow Nightshade Oakheart Pippin Quartz Reed Sage Tansy Underhill Vetch Willow Whisper Yew
    Acorn Brook Cobweb Drizzle Ember Foxglove Gale Hazelnut Mistle`,
    ""),
]

/** Mais nomes para as culturas que já existiam (o dobro da beta.22), pelo `id` da cultura. */
export const MORE_CULTURE_NAMES: Record<string, { female?: string; male?: string; surnames?: string }> = {
  halfling: {
    female: "Alyssum Begonia Bluebell Buttercup Calla Caraway Chamomile Cinnamon Dahlia Elderberry Foxglove Gardenia Heather Iris Juniper Lilac Mallow Mayflower Nutmeg Orchid Parsley Petunia Rosemary Saffron Snowdrop Sweetpea Thyme Tulip Verbena Wisteria",
    male: "Barnabus Benno Berilac Bodo Bramwell Bungo Cosimo Dinodas Dudley Fredegar Gerontius Halfred Hamson Hildibrand Isumbras Jolly Longo Madoc Marroc Merimac Mosco Nibs Orgulas Pip Polo Rudibert Sancho Tolly Wiseman",
    surnames: "Bolota-Doce Chaleira-Quente Fogão-Aceso Folha-de-Louro Fumo-Bom Lama-Seca Moinho-Velho Nabo-Branco Pé-de-Feijão Rosca-Doce",
  },
  gnoma: {
    female: "Ardi Baby Blinka Cogsworthy Delphi Effi Fenna Glitta Hixie Ivvy Jinna Klinka Lyssa Mippi Nixie Opal Pipsqueaka Quinni Ruby Sizzla Tikka Umbrina Vexie Wispa Yippa Zelli Brindle Clinka Dazzla Flinka",
    male: "Alberic Bilbix Cobb Dabble Ebble Fiddle Gubble Hobbs Ickle Jibber Klunk Lumbo Mibble Nobb Orvo Pibb Quizzle Rumble Snibble Tumble Umbo Vix Wobble Xibble Yobbo Zubb Bimble Cogsley Dribble Fumble",
    surnames: "Ponteiro-Fino Relógio-Doido Fusível Martelinho Serrote Esquadro Compasso Régua-Torta Prumo-Certo Nível-Bom",
  },
  draconica: {
    female: "Aszra Bhyrra Chyrra Dhazzra Ehsra Fhyrra Ghyssa Hrissa Isskra Jhazza Khyrra Lhyrra Mhyrra Nhazza Ohrra Phyrra Rhazza Shyrra Thazza Uhrra Vhazza Whyrra Xhyrra Yhazza Zhyrra Askhara Belzzra Chyrrith Dyssra Erzzra",
    male: "Akhorr Bhazzar Chorrak Dhorr Ehzzar Fhorr Ghazzar Hhorr Izzar Jhorr Khazzar Lhorr Mhazzar Nhorr Ozzar Phorr Rhazzak Shorr Thazzar Uhorr Vhazzar Whorr Xhazzar Yhorr Zhazzar Askhorr Bherrak Chazzrak Dhorrak Ezzrak",
  },
  infernal: {
    female: "Aradia Bathory Calyx Delphine Erebia Felicity Gehenna Hecate Inferna Jinx Kali Lamia Morrigan Nocturne Obsidia Persephone Ravenna Seraphine Tenebra Umbra Valencia Wraith Xanthia Yara Zelda Agonia Caridade Desdita Fortuna Saudade",
    male: "Asmodel Baal Corvin Damien Erebus Faust Grimm Hadrian Ignis Jareth Kain Lucien Malachai Nero Obsidian Phlegeton Quillon Raziel Sorath Thanatos Umbriel Vesper Wraithe Xerxes Yorick Zephon Desespero Esmero Infortúnio Penitência",
  },
  feerica: {
    female: "Applewhisper Bellamina Crystalline Daffodil Evanesce Flutterby Gleamwing Hyacinth Ivywind Jewelweed Kittentail Lumina Mirabel Nectarine Opaline Peaseblossom Quicksilver Raindrop Snowflake Tinkerbell Ulyssa Velvetine Wildrose Xyla Yuletide Zinnamon Auriel Bluebell Dewberry Elfwyn",
    male: "Ashgrove Brambleworth Cobblestone Dusk Eventide Frost Gloaming Hob Ironwood Jack Kindle Leafwhistle Midsummer Nimbus Orchard Pinecone Quill Robin Sloe Thimble Underbough Vervain Wispwood Yarrowby Zest Ambergrass Bracken Dandelion Elderwood Fernlight",
  },
  hispanica: {
    female: "Agustina Alejandra Amparo Araceli Belén Candela Catalina_María Concepción Cristina Encarnación Esmeralda Estefanía Fátima Florencia Gloria Inés_María Irene Josefa Leticia Lidia Lourdes_María Marina Matilde Natalia Noelia Olga Patricia Raquel Rosalía Rosana Sandra Silvia Sonia Susana Verónica Victoria Virginia Yolanda_María Zoraida Abigail",
    male: "Agustín Aitor Alberto Alejandro Álex Armando Arturo Bernardo Carlos Clemente Cristian Eduardo Emiliano Ernesto Eugenio Fabián Federico Félix Fermín Gabriel Gregorio Héctor Hugo Ismael Jacinto Jesús Lucas Marcelo Mario Maximiliano Óscar Patricio Raúl Rubén Samuel Sergio Teodoro Valentín Víctor",
    surnames: "Aguirre Arroyo Barrios Bustamante Cabello Calderón Camacho Carrillo Castañeda Cervantes Contreras Córdoba Escobar Espinosa Estrada Figueroa Galindo Gallegos Guzmán Ibarra Jaramillo Lara Lozada Maldonado Mejía Miranda Montoya Navarrete Ochoa Orozco Pacheco Palacios Quintero Rivas Salazar Sandoval Valencia Zamora Zúñiga",
  },
  francesa: {
    female: "Adélaïde Alix Apolline Armelle Bérénice Capucine Clotilde Corentine Diane Elise Ermengarde Faustine Félicie Flavie Gisèle Guenièvre Henriette Hortense Inès Isaure Jacinthe Joséphine_Anne Léonie Lucienne Margaux Maryse Mélisande Noémie Océane Ophélie Philippine Prune Romane Sabine Séverine Sidonie Valentine Victoire Yolande Zoé",
    male: "Achille Ambroise Anatole Anselme Auguste Aymeric Barthélemy Baudouin Benjamin Blaise Côme Cyprien Edmond Eloi Enguerrand Félix Fernand Gaspard_Louis Gaston Gervais Hector Hippolyte Honoré Isidore Jacquemin Joachim Jules Léandre Léopold Lucas Marius Maxence Octave Odilon Perceval Quentin Sébastien Théodore Valentin Victor",
    surnames: "Allard Barre Baron Benoît Besson Blanchet Bouvier Brunel Carpentier Charpentier Chauvin Collet Cordier Cousin Delmas Deschamps Devaux Dufresne Fleury Germain Gilbert Guillot Hubert Jacquet Langlois Laporte Lebrun Leclair Marchal Maréchal Navarre Pelletier Poirier Rivière",
  },
  italiana: {
    female: "Adelaide Agata Alba Ambra Annalisa Arianna Benedetta Carolina Cecilia Clelia Cristina Debora Elettra Elisa Erminia Fiorella Gaia Gioia Giorgia Iolanda Irene Isotta Lidia Loredana Luisa Marta_Giulia Noemi Ottavia_Maria Pietra Rebecca Rosanna Sabrina Santa Stefania Teodora Vanessa Vera Virginia Zaira",
    male: "Achille Adriano Agostino Alberto Alfredo Amedeo Arnaldo Attilio Aurelio Bruno Corrado Daniele Dario Edoardo Emilio Ettore Fausto Flavio Gianluca Gualtiero Ignazio Lamberto Livio Manfredi Massimo Mauro Nicola Ottaviano Piero_Paolo Raimondo Renato Rinaldo Romeo Rocco Sebastiano Silvio Simone Teodoro Valerio Vittore",
    surnames: "Abate Albanese Amoroso Bassi Bellucci Bernardini Bianchini Bonetti Brambilla Calabrese Cappelli Carbonari Cassano Colonna Corsini D'Alessandro Ferraresi Fumagalli Gentili Grimaldi Lanza Leonardi Lucchesi Marchi Melis Mazzini Orsini Pace Parodi Ricciardi Romagnoli Spada Venturi Zanetti",
  },
  germanica: {
    female: "Adelgunde Agathe Anneliese Antje Bärbel Brigitte Christa Dagmar Edeltraud Elsbeth Friederike Gesine Gudrun Hannelore Heike Hermine Ingeborg Irmtraud Juliane Käthe Kunigunde_Marie Lieselotte Luise_Anna Mechthild Monika Nele Ortrud Philippine Rosemarie Rotraut Sieglinde_Maria Swantje Theresia Trude Ulla Waltraud Wiebke_Anna Wilhelmine Zenzi Ute",
    male: "Adolf Ansgar Arnulf Baldur Bernhard Burkhart Clemens Detlef Diethelm Egon Ekkehard Engelbert Florian Fritz Gebhardt Gerold Gottlieb Hartwig Heinz Helmar Hinrich Hubertus Ingo Klaus Lorenz Ludger Markward Oswin Reinhold Roland Rüdiger Sebastian Siegmund Theodor Ulf Volkmar Wenzel Wigand Wolfhart",
    surnames: "Ackermann Adler Bach Bader Barth Baumgartner Blum Dietz Döring Eberhardt Eckert Ernst Falk Feldmann Fink Forster Freund Gerber Glaser Hagen Hartung Heinemann Hesse Hirsch Jansen Kessler Kraft Lindner Marquardt Moser Reuter Sauter Stahl Steiner Strauss",
  },
  inglesa: {
    female: "Abigail Agatha Annabel Arabella Beatrix Bertha Caroline Cordelia Daphne Delia Dorcas Edwina_Rose Eleanor_Mae Emmeline Ethel Evelyn Harriet_Anne Hester Imogen Iris Jemima Lavinia Letitia Mabel_Rose Marjorie Millicent Nell Ottoline Penelope Prudence Rowena Theodora Ursula Verity Violet Wilhelmina_Rose Winnie Ysolde Zelda",
    male: "Alaric Algernon Archibald Barnaby Basil Bertram Cedric Clement Desmond Egbert Ernest Ezra Felix Fitzwilliam Gareth Godwin Horace Hubert Ignatius Leopold Lionel Mortimer Neville Osric Percy Quentin Rupert Silas Thaddeus Tobias Ulric Vernon Winston",
    surnames: "Abbott Ainsworth Aldridge Ashby Atherton Barrington Beckett Blackburn Bradshaw Briggs Cartwright Chamberlain Chandler Cromwell Dalton Davenport Eastwood Elwood Fairbanks Fitzgerald Gladstone Hargreaves Hastings Holloway Kingsford Langley Lockwood Mansfield Montague Norwood Pembroke Prescott Radcliffe Rutherford Stanhope Thackeray Underwood Wainwright Woodward",
  },
  celta: {
    female: "Ailsa Áine Annwen Bethan Blodwen Bríd_Mór Cerys Cliodhna Dervla Eilonwy Eirwen Elspeth Enid Fionnghuala Ffion Gwenda Gwyneth Isolde Kenna Lowri Mairi Morwenna Muirne Nerys Oonagh Rhian Rhosyn Roisin_Bán Seonag Siwan Sorcha_Rua Tegwen Una_Bhán Wenna Ailbhe_Óg Briallen Catrin Deryn Ffraid Gwawr",
    male: "Aengus Alun Aodhán Barra Bedwyr Brychan Cadfael Cadoc_Mawr Caradog Cathal_Óg Ciarán Colum Cynan Dafydd_ap_Ifan Dermot Dougal Eamon_Rua Emlyn Euan Fionn Fearghus Gwalchmai Gwion Iestyn Ifor Kenneth Llywelyn Lorcan_Óg Macsen Madoc Morgan_Mawr Niall_Rua Peredur Rhodri Rhys Ronan Seamus Tadhg_Óg Tristan_Mawr Uilliam",
    surnames: "Ó_Conaill Ó_Gráda Ó_hAnnracháin Ó_Maolmhuaidh Ó_Duibhne Ó_Ceallaigh_Mór Mac_Aonghusa Mac_Dhòmhnaill Mac_Coinnich Mac_Leòid Mac_Fhionnlaigh MacAlister MacBride MacCallum MacCormack MacDuff MacEwan MacGillivray MacKellar MacLaren MacNaughton MacRory MacTavish Ferguson Galbraith Kennedy Lennox Maxwell Ogilvy Rattray ap_Rhys ap_Gruffydd ap_Hywel ap_Owain ap_Llywelyn Le_Bras Le_Roux Kerjean Morvan Trégor",
  },
  nordica: {
    female: "Alva Asgerd Aslaug Bjorg Eldrid Estrid Fridgerd Geirhild Gudny Hallveig Helka Hjordis Holmfrid Ingerid Jorunn Ketilridr Ljufa Olof Ragnfrid Ranveig Saldis Skadi Solrun Steinunn Svala Thorhild Ulfrun Valgerd Yngvild Aesa Brynja Edda Freyja",
    male: "Agnar Alrik Asgeir Atli Audun Bard Bersi Brynjolf Dagfinn Eldjarn Eyolf Finnbogi Frodi Geirmund Gest Gudmund Hallvard Harek Hjort Hrolf Ingolf Isleif Kolbein Kollsvein Ljot Olvir Rognvald Saemund Skeggi Skuli Steinar Svart Thorgeir Thrand Torvald Ulfar Yngvar",
  },
  eslava: {
    female: "Agafya Alenka Ania Bogna Borislava Cvetana Darina Dobrava Dragomira Evdokiya Fedora Gordana Inna Ivana Jarmila Jasna Klavdiya Lenka Ljubica Marfa Mirka Nadja Olesya Polina Radka Raisa Slavena Snježana Stanka Tamara Ulyana Velimira Vlasta Yeva Zinaida Zlatka Zorana Zvezdana",
    male: "Anton Arkady Bogumil Bohdan Branimir Bratislav Cvetko Dalibor Danilo Dobroslav Dušan Fedor Gavrilo Gorazd Ignat Kasimir Ladislav Lavrentiy Lubor Matvei Milorad Nikita Ostap Predrag Rodion Semyon Slavomir Stepan Svetozar Timofei Vasilije Velimir Vitomir Zdeněk Zlatan Zvonimir",
    surnames: "Abramovich Babić Bogdanović Chernenko Dobrev Dragović Dvořáková Fedorova Gavrilović Golubev Horák Ivanova Kaminski Kolar Kovač Krasnov Kuzmina Lazarević Lebedeva Marković Mikhailova Nowakowski Novotný Orlova Pavlović Petrovna Radić Sokolova Stojanović Tomić Vlasova Volkova Yakovleva Zielińska",
  },
  grega: {
    female: "Aglaia Alcestis Ambrosia Antiope Arete Calliope_Maria Callirhoe Chryseis Cleio Corinna Cybele Dione Elpis Eudora Evadne Halcyone Harmonia Hero Ione Iphigenia Kleopatra Kore Lampetia Lysandra Maia Melia Myrrine Nausicaa Niobe Pasiphae Philomela Rhode Sophronia Thea Thetis Xanthippe Zenais Kalliope Eugenia Despina",
    male: "Aeschylus Alcibiades Anaxagoras Antiochos Apollodoros Archimedes Aristarchos Cleisthenes Damon Democritos Diomedes Epaminondas Euclid Euripides Glaukos Herodotos Hippokrates Iason Kallikrates Kimon Kleon Lysias Lysimachos Menandros Nestor Pausanias Pheidias Philoktetes Polykrates Praxiteles Ptolemaios Pythagoras Sophokles Strabon Telemachos Thales Theseus Thucydides Xanthos Zenodotos",
    surnames: "Adamopoulos Anagnostopoulos Andreou Apostolou Argyropoulos Christakis Dimitrakopoulos Eleftheriou Georgakopoulos Giannakopoulos Hatzidakis Ioannidis Kalogeropoulos Karagiorgis Konstantinou Kotsis Lambropoulos Liakos Manolakis Michalopoulos Mitsotakis Nikolaou Oikonomidis Papadakis Papadimitriou Papanikolaou Raptopoulos Sarris Sotiriou Stathopoulos Theodoridis Triantafyllou Tsakiris Vasilakis Vlachopoulos",
  },
  latina: {
    female: "Aemiliana Afrania Albia Antistia Arria Aurelia_Maior Caesia Calvisia Caninia Cassia Cloelia Cominia Curtia Decimia Duilia Egnatia Fannia Flaminia Furia Gellia Herennia Hostilia Iulia_Minor Laelia Lollia_Paulina Lucilla_Maior Maenia Marcia Memmia Minucia Mucia Naevia Nonia_Maior Octavia_Minor Papiria Petronia Pomponia Quinctilia Rutilia Sempronia",
    male: "Aemilius Aetius Agricola Ahenobarbus Albinus Antonius_Felix Avitus Balbus Bassus Blandus Caecilianus Calidus Capito Catulus Celsus Cotta Crispus Dexter Fabricius Faustus Fidus Fronto Fuscus Gratus Iustus Laevinus Lepidus_Minor Lucullus Macer Metellus Naso Nerva Paulus Pollio Regulus Rufinus Sabinianus Saturninus Tacitus Verus",
    surnames: "Aebutius Ambivius Anicius Apronius Aquilius Arruntius Atrius Aufidius Avidius Baebius Betutius Blossius Caecina Calidius Carvilius Cestius Cispius Coelius Cominius Cornificius Curiatius Decius Didius Ennius Fadius Fufius Gavius Hirtius Lutatius Maecenas Mamilius Numicius Oppius",
  },
  arabe: {
    female: "Abla Afra Alia Anisa Arwa Ayah Badia Bahiya Dima Fadwa Faiza Hadil Hiba Ibtisam Inas Jawahir Khawla Lamya Layan Lina Majida Manal Maysa Nabila Nadira Najla Nasrin Qamar Rafah Raya Rihab Rula Saba Safa Samah Sumayya Taghrid Wijdan",
    male: "Adnan Akram Amjad Anas Ayyub Bassam Bilal Dawud Diya Fadi Fahd Faris Fawzi Ghazi Haytham Hilal Ihab Imad Jabir Jalal Jawad Kamil Kareem Luqman Mazin Muhannad Murad Nadim Qays Rami Riyad Shadi Tamim Wasim Yasir Zaki",
  },
  persa: {
    female: "Afsaneh Azita Bahareh Banafsheh Behnaz Delnaz Elham Ghazal Golbahar Golshan Hengameh Jila Kamand Kimia Ladan Mandana Marjan Mehri Mojgan Nasim Negar Niloofar Pari Parvin Ramesh Rozita Sepideh Shahla Shiva Sima Soheila Tara Yasmin",
    male: "Ahura Amir Ardeshir Arya Bahman Behrouz Borzou Daryoush Esfandiyar Farbod Farhang Fereydoun Garshasp Hormuz Jahangir Kamran Keyhan Khashayar Mahan Mazdak Mehrab Nima Parsa Pejman Shapour Siamak Taher Yazdgerd",
    surnames: "Abedini Alavi Amirzadeh Ansari Asgari Ashtiani Bahadori Bazargan Dehghani Djavadi Ebadi Emami Eslami Farahmand Farzad Golzari Hamedani Hekmat Javadi Kashefi Khamenei Khorasani Lotfi Mahdavi Mazandarani Mirzaee Mofidi Nahavandi Najafi Nikpour Pirzadeh Qasemi Rafiee Sadri Shafaghi Shahbazi Sharifi Tabrizian",
  },
  turca: {
    female: "Ada Afet Akgül Arzu Asena Aynur Bahar Banu Begüm Berrin Canan Cansu Didem Duygu Esin Feray Figen Filiz Gönül Gülay_Nur Güler Hacer Hülya_Nur İnci Jale Kevser Leman Meral Nalan Nermin_Nur Nilay Pınar_Nur Seda Sevim Şebnem Tülin Ülkü Yeşim Zerrin",
    male: "Ahmet_Can Akın Alper Altan Aras Atakan Aydın_Can Baran Batuhan Berk Bülent Can Cemal Çağlar Deniz Ercan Erdal Erkan Eren Fikret Gökhan Hüseyin_Can İlker Kaan_Can Kemal_Can Levent Metin Necati Oğuzhan Orhan_Can Ozan Rıza Sinan Şükrü Taner Turgut Ümit Yiğit Yunus",
    surnames: "Abacı Akbaş Akçay Akdoğan Akgün Aksu Altınok Arıkan Aslantaş Avcıoğlu Bağcı Baysal Bilgili Bozdağ Çakmak Çelebi Demirel Dinç Duran Elmas Erbil Eroğlu Gökçe Güneri Gürsoy Işıklar Karabulut Karakuş Kayaoğlu Koçak Mutlu Özbay Sarıkaya Tunç Yalın",
  },
  hebraica: {
    female: "Adah Ahuva Aviva Ayelet Batya Bina Dafna Dvora Efrat Galit Hadas Ilanit Irit Kineret Levana Lior Meirav Mira Nava Nili Ofra Orna Ronit Rut Sarit Shlomit Talia Tirza Varda Yafa",
    male: "Adin Amitai Avishai Azaria Betzalel Dan Eitan Elazar Eliyahu Elkana Gavriel Gershon Hanan Ilan Itamar Kalman Lavi Matan Matityahu Meshulam Nachum Naftali Nadav Nissim Oded Omri Pinchas Shai Shimshon Tzvi Uri Yehoshua Yigal Yoel Zalman",
    surnames: "Abramov Amsalem Assaf Ben-Haim Ben-Shimon Ben-Yosef Bitton Brenner Dayan Eisenberg Gabbai Goldstein Gordon Horowitz Levy Lieberman Navon Rabin Rosenthal Segal Shalom Shapira Sharabi Shemesh Steinberg Zur",
  },
  indiana: {
    female: "Aarti Akshara Amala Anusha Bhavana Chandni Chhaya Deepika Devika Gita Hema Ila Indu Jyoti Kamini Kiran Kumud Lata Madhavi Malini Mohini Nalini Nandita Neela Nirmala Pallavi Pushpa Rajni Ranjana Rohini Rupa Sandhya Shobha Shyama Smita Suman Sushila Urmila Vandana Vasudha",
    male: "Abhay Abhinav Akash Amit Anil Arvind Ashwin Bhaskar Chetan Devendra Dinesh Gopal Harish Ishaan Jayant Kailash Kishore Mahavir Manoj Mukesh Naveen Nitin Omkar Pankaj Prabhat Prem Rajesh Ramesh Sachin Sanjiv Satish Shyam Sudhir Sunil Tejas Uttam Vasant Vinay Yogesh",
    surnames: "Agnihotri Ahluwalia Bajaj Bhalla Bhargava Bhatnagar Chandra Chawla Dhawan Dixit Garg Ghoshal Jaiswal Kapadia Kashyap Khurana Kothari Lal Mahajan Mehra Modi Mukherji Nanda Narang Oberai Pandit Rajput Ranganathan Saini Sengupta Shastri Sood Thakkar Vaidya Varma Wadia",
  },
  chinesa: {
    female: "Bailian Chang_E Chunhua Dan Fen Hongmei Huan Jiayi Jin Lanxin Lihua Lianhua Lingyu Meiling Meilin Mingyue Mulan Nuan Qiong Rui Shufen Si Tian Weiwei Xialan Xiaomei Xinyi Xiuying Xuemei Yating Yanli Yiling Yingyue Yulan Yuyan Yueying Zhiruo Zihan Zixuan Zhenzhen",
    male: "Baoyu Changming Chenglong Dawei Dehua Fengming Guangyu Haifeng Haoran Hongwei Jianguo Junjie Liwei Minghao Pengfei Qingshan Ruilin Shijie Tianyu Weiming Wenbo Xiaolong Xinyu Yifan Yongkang Yuhang Zeyu Zhihao Zhiqiang Zihao Zhonghua Anping Binbin Chenlong Deming Guowei Haitao Hongjun",
  },
  japonesa: {
    female: "Akari Asuka Chiyoko Emiko Fuyumi Haruna Hiromi Hotaru Kanon Kazumi Kiyoko Koharu Kotone Machiko Mayu Michiru Mio Miyako Nanami Natsume Nozomi Ran Rika Sachiko Sayaka Setsuko Shiori Suzume Tamaki Tomoyo Umeko Wakana Yayoi Yoshiko Yuzuki",
    male: "Akihiro Atsushi Daiki Eita Fumio Genji Hajime Haruki Hideyoshi Hiroki Ieyasu Isao Jun_Ichi Kaname Katsuo Keita Kenshin Kiyomasa Kojiro Kosuke Masamune Mitsuhide Musashi Naoki Nobuyuki Ryuji Shingen Shinji Shunsuke Sota Takumi Tatsuya Teruo Tomohiro Yoshida Yukimura Yusuke",
    surnames: "Akiyama Arai Asano Fukushima Furukawa Hamada Hattori Hayashida Higuchi Hirata Hoshino Iida Ishihara Iwata Kaneda Kasai Kawaguchi Kojima Komatsu Kubota Matsushita Miyata Mizuno Nagai Nishida Shimada Sugimoto Tanabe",
  },
  ioruba: {
    female: "Abidemi Adeyinka Adunola Aramide Ayomikun Bolatito Damilare Dupe Enitan Ibidun Ifeyinwa Iyanu Jadesola Jolaade Kemisola Kofoworola Lolade Mojisola Morenike Nifemi Oluwadamilola Omotola Opeyemi Oreoluwa Oyindamola Remilekun Sadeade Tiwalola Tolulope Toyin Bimbola Dolapo Foluke Iyabode",
    male: "Adebola Adedayo Adeniyi Adeoye Akinwunmi Alaba Ayodeji Bolaji Damilola Ebun Gbolahan Ibukun Lekan Mayowa Oladapo Oluwaseyi Oyelaran Seun Temitope Tobiloba Fola",
    surnames: "Abiodun Adeboye Adegoke Adelabu Adeniran Adesanya Agbaje Ajani Akinyele Alade Amusan Ayinde Bamgbose Dairo Fadeyi Falola Fasanmi Kolade Okeowo Olaniyi Olowookere Omole Onifade Oyeleke Sowemimo",
  },
  suaili: {
    female: "Bahati Fahima Haiba Hasina Mahiri Nadra Nasimiyu Nuru Panya Penda Siti Sharifa Tabitha Umi Wangari Wanjiku",
    male: "Abdallah Ahmed Chacha Gathoni Idi Jabali",
    surnames: "Achieng Adongo Akello Amollo Awino Chelimo Cherono Chepkemoi Gachoki Gatimu Githongo Jemutai Kipruto Kiprop Muchemi Muriithi Mutai Ndegwa Nyaga",
  },
  tupi: {
    female: "Abaporu Anahy Anaí Araí Cira Eçaí Guacira Iracema Itaí Jandaíra Jupira Juraci Moara Nayra Potyra Sami Sauá Ubiraci Ybá Yupanã",
    male: "Aimoré Anhangüera Aratu Ibirapitanga Iraí Itaberaba Jaguaré Jaguatirica Juruá Kayapó Mbaé Nhamandu Piraí Potiguar Taíno Tamoio Uirapuru",
  },
  nahuatl: {
    female: "Atzi Coyotl Huitzitzilin Ichpochtli Matlalcueye Mecatl Mixtli Nahui Papalotl Quetzalxochitl Tecuiltzin Teyolia Tlacotl Tlaltecuhtli Tonantzin Xiuhpapalotl Xochiquetzalli Yolotzin Zacnite Ameyaltzin Centeotl Chalchiuhtli Coatlicue Iztac Tlazolteotl Xilonen",
    male: "Atzin Axolotl Huehuetl Mictlan Nanahuatzin Nezahual Tepeyollotl Tezcatlipoca Totec Xicohtencatl Xipe",
  },
  egipcia: {
    female: "Ankhesenpaaten Baketaten Hatnefer Henuttaneb Isetemkheb Khamerernebty Meritre Mutemwiya Nebetah Neferhetepes Neferkayet Nitiqret Nubnofret Satiah Senebtisi Senseneb Sitamun Tentamun Weret",
    male: "Amenemope Ankhtify Bakenrenef Djedi Djehutymose Hatiay Hekaib Horemakhet Khaemhat Khnumhotep Meketre Mentuemhat Nakhtmin Nebmaatre Nefermaat Paneb Pentaweret Ptahshepses Rahotep Sabni Senbi Sennedjem Sobekhotep Tjaty Userhat Wahankh Wennefer",
  },
  mongol: {
    female: "Altantuya Ariunzaya Bayarma Bolor Chimgee Enkhmaa Enkhtsetseg Javkhlan Khongor Mönkhzul Nandintsetseg Oyunbileg Oyuun Sükhtsetseg Tsetsegee Tsogt Tuul Uranbileg Urantuya Chuluun Davaa Gantsetseg Munkhzaya Odgerel",
    male: "Ankhbayar Ariunbold Baatar Batjargal Bayarsaikhan_Khan Bilguun Boldbaatar_Khan Chinbat Dashnyam Davaasüren Enkhjargal Erdenebat Ganbat Gantulga Jargal Khatanbaatar Khurelsukh Lkhagva Mönkh-Erdene Munkhbayar Naranbaatar Ochirbat Otgonbaatar Purev Sainbayar Shagdar Sükhee Temuulen Tsogtbaatar Tumur Turbold Ulziibayar Undral Yesugei_Khan Zorigt Altai Batu_Khan Ganzorig_Khan Möngke_Khan Tolui_Khan",
  },
  elfica: {
    female: "Aerendyl Alavara Amastacia Arielimnda Bellaluna Caerlyn Chandrelle Dirivia Elasha Elenaril Faeranduil Ilmadia Ilythyrra Jhaelryna Keishara Lathlaeril Leshanna Maialie Merialeth Naertho Nimeriel Oluevaera Pharaema Sakrattars Sarya Shandalar Sylmae Talindra Teharissa Thessaly Ulelesse Valindra Varisse Vessaliel Ylveriel Zaltarra Aelith Ynneth",
    male: "Ailluin Akkar Alarodan Aolis Belanor Beluar Cymbiir Delsaran Eluvian Erlan Evindal Gaeleath Galan Iliphar Imizael Ivellon Kivessin Lafarallin Maeral Melandrach Mlartlar Nhamashal Phaendar Rhistel Ruvaen Saevel Shaundar Taeral Tannivh Theremas Ualair Valandil Vamir Yhendorn Zaor Ilbryn",
    surnames: "Amakiir Galanodel Holimion Ilphelkiir Liadon Meliamne Naïlo Siannodel Xiloscient Brisa-de-Prata Canto-da-Aurora Clareira-Lunar Coroa-de-Bétula Escudo-de-Orvalho Estrela-Vespertina Flecha-de-Prata Folha-Nova Fonte-de-Luar Galho-de-Prata Harpa-do-Vento Jardim-Eterno Lago-de-Cristal Luar-de-Inverno Manto-de-Folhas Névoa-do-Rio Orvalho-de-Prata Pássaro-Azul Pena-Dourada Pétala-de-Lua Raio-de-Luar Rio-de-Estrelas Rosa-de-Prata Sombra-Verde Sussurro-de-Vento Teia-de-Luz Vale-de-Lírios Véu-de-Estrelas Voo-de-Cisne Galhada-de-Prata",
  },
  ana: {
    female: "Agna Audra Balda Bergra Bruni Dalla Dorra Eldra Fenna Gisla Grenda Gunnhilda Helda Hildra Jorra Kilda Lodda Magna Radda Ragnhilda Runa Sigga Skadda Svanna Thora Ulla Valda Bera Doga Gerta",
    male: "Balgrim Bardin Borin Brokk Dagnar Dorgrim Eitri Fili Galdur Gimbrin Gorm Grimbold Hargin Jorgrim Kargan Korgin Lodin Magnar Morgrim Nordri Oin Sigmar Skaldin Stonar Thorgar Thorgrim Torvin Valgrim Yngvar Zorgrim Barik",
    surnames: "Barba-de-Bronze Barba-de-Carvão Barba-de-Prata Bigorna-de-Bronze Bigorna-Velha Cinzel-de-Ouro Coração-de-Pedra Elmo-Velho Escudo-de-Ferro Forja-Fria Forja-Velha Granito-Negro Lâmina-de-Pedra Machado-Velho Malho-Pesado Mão-de-Ferro Martelo-Velho Mina-Profunda Montanha-Alta Muralha-de-Ferro Ouro-Negro Pedra-Fria Pedra-Funda Pedra-Rúnica Picareta-de-Ferro Prata-Viva Punho-de-Bronze Rocha-Funda Rubi-Negro Runa-Antiga Safira-Funda Salão-Antigo Túnel-Velho Veio-de-Ouro Veio-Profundo Brasa-de-Forja Ferro-Velho Cobre-Rubro Bronze-Velho Granito-Cinza",
  },
  orquica: {
    female: "Agra Bashka Borga Dagra Durga Feska Ghazka Gorza Grima Hagra Ikka Karga Kazra Lagga Magra Mazka Nagra Ogga Ragza Shazka Skagga Tagra Ugga Urga Vagra Yazka Zogra Brukka Dregga Fogga Grizza Krukka Murza Nogga Prukka Shagga Thrugga Vrukka Zugga Gharra",
    male: "Azog Bolg Dushnak Durbag Gharash Gorbash Grishnak Grub Hrukk Karguk Kruk Lugbur Lurtz Mogg Muzgash Ogrod Ragduf Rukk Shagrol Snaga Thrak Ufthak Ugrak Urzog Vrakk Zogg Bagronk Draka Ghorbag Grubnak Krull Morbag Nargol Raknar Shakh Thrugg Yazgash",
    surnames: "Arranca-Olhos Bate-Forte Berra-Alto Cabeça-Dura Come-Gente Corta-Fundo Dente-de-Javali Dente-Podre Espinha-Torta Esmaga-Escudo Fere-Fundo Garra-Negra Grito-Rouco Lama-Negra Lâmina-Suja Mão-de-Pedra Mata-Cavalos Morde-Ferro Olho-Vermelho Orelha-Partida Osso-Duro Pé-de-Ferro Pele-Grossa Presa-Longa Punho-Rubro Quebra-Ossos Racha-Elmo Rasga-Carne Rugido-de-Trovão Sangue-Negro Sem-Orelha Sopro-Fedido Toca-Funda Tripa-de-Ferro Unha-Negra Urro-Longo Vira-Barco Bebe-Sangue Caça-Elfos Uiva-Lua",
  },
}
