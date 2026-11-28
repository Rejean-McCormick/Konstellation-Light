// First operational UI/search profile. Generic sidecar contract remains unchanged.
import {normalizeLocale,selectedSearchLocales} from './multilingual-read.mjs';
export const PRIORITY_LANGUAGES=Object.freeze(['fr','en','es','it','fi','de']);
export function priorityLocale(tag){const normalized=normalizeLocale(tag);return PRIORITY_LANGUAGES.includes(normalized)?normalized:null;}
export function searchProfile(ui,extras=[]){return selectedSearchLocales(priorityLocale(ui)||'fr',Array.isArray(extras)?extras.map(priorityLocale).filter(Boolean):[]);}
export function eligibleDescriptors(descriptors={}){return Object.fromEntries(Object.entries(descriptors).filter(([tag])=>priorityLocale(tag)));}
export function initialUi(requested,saved){return priorityLocale(requested)||priorityLocale(saved)||'fr';}
const messages={
 "ui": {
  "fr": "Langue de l’interface",
  "en": "Interface language",
  "es": "Idioma de la interfaz",
  "it": "Lingua dell’interfaccia",
  "fi": "Käyttöliittymän kieli",
  "de": "Sprache der Oberfläche"
 },
 "brand": {
  "fr": "EXPLORATEUR DE CONNAISSANCES",
  "en": "KNOWLEDGE EXPLORER",
  "es": "EXPLORADOR DE CONOCIMIENTO",
  "it": "ESPLORATORE DELLA CONOSCENZA",
  "fi": "TIEDON SELAIN",
  "de": "WISSENSEXPLORER"
 },
 "domain": {
  "fr": "CHOISIR UN DOMAINE",
  "en": "CHOOSE A DOMAIN",
  "es": "ELEGIR UN ÁMBITO",
  "it": "SCEGLI UN AMBITO",
  "fi": "VALITSE AIHEALUE",
  "de": "THEMENBEREICH WÄHLEN"
 },
 "collection": {
  "fr": "Kristal à explorer",
  "en": "Kristal to explore",
  "es": "Kristal por explorar",
  "it": "Kristal da esplorare",
  "fi": "Tutkittava Kristal",
  "de": "Kristal zum Erkunden"
 },
 "version": {
  "fr": "Version",
  "en": "Version",
  "es": "Versión",
  "it": "Versione",
  "fi": "Versio",
  "de": "Version"
 },
 "knowledge": {
  "fr": "Langue des connaissances",
  "en": "Knowledge language",
  "es": "Idioma del conocimiento",
  "it": "Lingua delle conoscenze",
  "fi": "Sisällön kieli",
  "de": "Sprache der Inhalte"
 },
 "explore": {
  "fr": "EXPLORER",
  "en": "EXPLORE",
  "es": "EXPLORAR",
  "it": "ESPLORA",
  "fi": "TUTKI",
  "de": "ERKUNDEN"
 },
 "discover": {
  "fr": "Découvrir le Kristal",
  "en": "Discover the Kristal",
  "es": "Descubrir el Kristal",
  "it": "Scopri il Kristal",
  "fi": "Tutustu Kristaliin",
  "de": "Kristal entdecken"
 },
 "map": {
  "fr": "Explorer la carte",
  "en": "Explore the map",
  "es": "Explorar el mapa",
  "it": "Esplora la mappa",
  "fi": "Tutki karttaa",
  "de": "Karte erkunden"
 },
 "registry": {
  "fr": "Explorer les notions",
  "en": "Explore concepts",
  "es": "Explorar conceptos",
  "it": "Esplora i concetti",
  "fi": "Tutki käsitteitä",
  "de": "Begriffe erkunden"
 },
 "advanced": {
  "fr": "Options avancées",
  "en": "Advanced options",
  "es": "Opciones avanzadas",
  "it": "Opzioni avanzate",
  "fi": "Lisäasetukset",
  "de": "Erweiterte Optionen"
 },
 "trace": {
  "fr": "Vérification des données",
  "en": "Data verification",
  "es": "Verificación de datos",
  "it": "Verifica dei dati",
  "fi": "Tietojen tarkistus",
  "de": "Datenprüfung"
 },
 "compare": {
  "fr": "Comparer les versions",
  "en": "Compare versions",
  "es": "Comparar versiones",
  "it": "Confronta le versioni",
  "fi": "Vertaa versioita",
  "de": "Versionen vergleichen"
 },
 "unnamed": {
  "fr": "Explorer individuellement les notions sans nom (avancé)",
  "en": "Explore unnamed concepts individually (advanced)",
  "es": "Explorar conceptos sin nombre individualmente (avanzado)",
  "it": "Esplora singolarmente i concetti senza nome (avanzato)",
  "fi": "Tutki nimettömiä käsitteitä yksitellen (lisäasetus)",
  "de": "Unbenannte Begriffe einzeln erkunden (erweitert)"
 },
 "readOnly": {
  "fr": "Consultation en lecture seule",
  "en": "Read-only browsing",
  "es": "Consulta de solo lectura",
  "it": "Consultazione in sola lettura",
  "fi": "Vain luku -tila",
  "de": "Schreibgeschützte Ansicht"
 },
 "readOnlyNote": {
  "fr": "Les données sont affichées sans modification.",
  "en": "Data is displayed without modification.",
  "es": "Los datos se muestran sin modificaciones.",
  "it": "I dati sono mostrati senza modifiche.",
  "fi": "Tiedot näytetään muuttamattomina.",
  "de": "Die Daten werden unverändert angezeigt."
 },
 "share": {
  "fr": "↗ Partager",
  "en": "↗ Share",
  "es": "↗ Compartir",
  "it": "↗ Condividi",
  "fi": "↗ Jaa",
  "de": "↗ Teilen"
 },
 "offline": {
  "fr": "◉ Accès hors ligne",
  "en": "◉ Offline access",
  "es": "◉ Acceso sin conexión",
  "it": "◉ Accesso offline",
  "fi": "◉ Käyttö ilman verkkoa",
  "de": "◉ Offlinezugriff"
 },
 "notice": {
  "fr": "À savoir",
  "en": "Please note",
  "es": "Nota importante",
  "it": "Nota importante",
  "fi": "Huomaa",
  "de": "Hinweis"
 },
 "noticeBody": {
  "fr": "Les liens affichés proviennent des données des Kristals. Leur exactitude n'a pas été vérifiée indépendamment.",
  "en": "Displayed links come from Kristal data. Their accuracy has not been independently verified.",
  "es": "Los enlaces mostrados proceden de los datos de los Kristals. Su exactitud no se ha verificado de forma independiente.",
  "it": "I collegamenti mostrati provengono dai dati dei Kristal. La loro accuratezza non è stata verificata in modo indipendente.",
  "fi": "Näytetyt yhteydet ovat peräisin Kristalien tiedoista. Niiden paikkansapitävyyttä ei ole tarkistettu riippumattomasti.",
  "de": "Die angezeigten Verknüpfungen stammen aus den Kristal-Daten. Ihre Richtigkeit wurde nicht unabhängig überprüft."
 },
 "noticeQuestion": {
  "fr": "Comment ces données sont-elles vérifiées ?",
  "en": "How is this data checked?",
  "es": "¿Cómo se verifican estos datos?",
  "it": "Come vengono verificati questi dati?",
  "fi": "Miten tiedot tarkistetaan?",
  "de": "Wie werden diese Daten geprüft?"
 },
 "noticeDetail": {
  "fr": "Les fichiers sont contrôlés pour détecter les modifications accidentelles. Ce contrôle ne prouve ni l'exactitude de chaque information, ni la validation de sa publication. Les données d'origine ne sont pas modifiées.",
  "en": "Files are checked for accidental changes. This check proves neither the accuracy of each statement nor approval for publication. Original data is not modified.",
  "es": "Se comprueban los archivos para detectar cambios accidentales. Esta comprobación no demuestra la exactitud de cada dato ni la aprobación de su publicación. Los datos originales no se modifican.",
  "it": "I file sono controllati per rilevare modifiche accidentali. Questo controllo non dimostra né l'accuratezza delle singole informazioni né l'approvazione della pubblicazione. I dati originali non vengono modificati.",
  "fi": "Tiedostot tarkistetaan tahattomien muutosten varalta. Tarkistus ei todista yksittäisten tietojen oikeellisuutta eikä julkaisuhyväksyntää. Alkuperäisiä tietoja ei muuteta.",
  "de": "Dateien werden auf unbeabsichtigte Änderungen geprüft. Diese Prüfung belegt weder die Richtigkeit einzelner Angaben noch die Freigabe zur Veröffentlichung. Originaldaten werden nicht verändert."
 },
 "search": {
  "fr": "Rechercher un mot, une notion ou un document…",
  "en": "Search for a word, concept or document…",
  "es": "Buscar una palabra, concepto o documento…",
  "it": "Cerca una parola, un concetto o un documento…",
  "fi": "Etsi sanaa, käsitettä tai asiakirjaa…",
  "de": "Wort, Begriff oder Dokument suchen…"
 },
 "searchLang": {
  "fr": "Langues de recherche",
  "en": "Search languages",
  "es": "Idiomas de búsqueda",
  "it": "Lingue di ricerca",
  "fi": "Hakukielet",
  "de": "Suchsprachen"
 },
 "add": {
  "fr": "Ajouter une langue disponible",
  "en": "Add an available language",
  "es": "Añadir un idioma disponible",
  "it": "Aggiungi una lingua disponibile",
  "fi": "Lisää käytettävissä oleva kieli",
  "de": "Verfügbare Sprache hinzufügen"
 },
 "resetLang": {
  "fr": "Rétablir les langues par défaut",
  "en": "Reset default languages",
  "es": "Restablecer idiomas predeterminados",
  "it": "Ripristina le lingue predefinite",
  "fi": "Palauta oletuskielet",
  "de": "Standardsprachen wiederherstellen"
 },
 "original": {
  "fr": "Inclure les textes d’origine (langue non déclarée)",
  "en": "Include original texts (language unspecified)",
  "es": "Incluir textos originales (idioma no declarado)",
  "it": "Includi testi originali (lingua non dichiarata)",
  "fi": "Sisällytä alkuperäiset tekstit (kieltä ei määritetty)",
  "de": "Originaltexte einbeziehen (Sprache nicht angegeben)"
 },
 "originalShort": {
  "fr": "Sources d’origine",
  "en": "Original sources",
  "es": "Fuentes originales",
  "it": "Fonti originali",
  "fi": "Alkuperäiset lähteet",
  "de": "Originalquellen"
 },
 "defaults": {
  "fr": "Par défaut",
  "en": "Default",
  "es": "Por defecto",
  "it": "Predefinite",
  "fi": "Oletus",
  "de": "Standard"
 },
 "remove": {
  "fr": "Retirer",
  "en": "Remove",
  "es": "Quitar",
  "it": "Rimuovi",
  "fi": "Poista",
  "de": "Entfernen"
 },
 "noResource": {
  "fr": "Aucune ressource linguistique révisée disponible dans les six langues. Activez les textes d’origine pour les consulter.",
  "en": "No reviewed language resource is available in the six languages. Enable original texts to search them.",
  "es": "No hay recursos lingüísticos revisados en los seis idiomas. Active los textos originales para buscarlos.",
  "it": "Nessuna risorsa linguistica revisionata disponibile nelle sei lingue. Attiva i testi originali per cercarli.",
  "fi": "Kuudella kielellä ei ole tarkistettuja kieliresursseja. Ota alkuperäiset tekstit käyttöön niiden hakemiseksi.",
  "de": "Keine geprüften Sprachressourcen in den sechs Sprachen verfügbar. Aktivieren Sie Originaltexte, um sie zu durchsuchen."
 },
 "selectedOnly": {
  "fr": "Seules les ressources des langues choisies sont interrogées.",
  "en": "Only selected language resources are searched.",
  "es": "Solo se consultan los recursos de los idiomas elegidos.",
  "it": "Si consultano solo le risorse delle lingue scelte.",
  "fi": "Vain valittujen kielten resursseja haetaan.",
  "de": "Nur Ressourcen der gewählten Sprachen werden durchsucht."
 },
 "missing": {
  "fr": "Non disponibles",
  "en": "Unavailable",
  "es": "No disponibles",
  "it": "Non disponibili",
  "fi": "Ei saatavilla",
  "de": "Nicht verfügbar"
 },
 "refused": {
  "fr": "Ressources refusées ou indisponibles",
  "en": "Resources refused or unavailable",
  "es": "Recursos rechazados o no disponibles",
  "it": "Risorse rifiutate o non disponibili",
  "fi": "Hylätyt tai puuttuvat resurssit",
  "de": "Abgelehnte oder nicht verfügbare Ressourcen"
 },
 "searching": {
  "fr": "Recherche dans les langues sélectionnées…",
  "en": "Searching selected languages…",
  "es": "Buscando en los idiomas seleccionados…",
  "it": "Ricerca nelle lingue selezionate…",
  "fi": "Haetaan valituilla kielillä…",
  "de": "Suche in ausgewählten Sprachen…"
 },
 "noResults": {
  "fr": "Aucun résultat dans le périmètre choisi. Vous pouvez ajouter une langue ou consulter les textes d’origine.",
  "en": "No results in the selected scope. Add a language or search original texts.",
  "es": "No hay resultados en el ámbito elegido. Añada un idioma o busque en los textos originales.",
  "it": "Nessun risultato nell’ambito scelto. Aggiungi una lingua o cerca nei testi originali.",
  "fi": "Ei tuloksia valitussa laajuudessa. Lisää kieli tai hae alkuperäisistä teksteistä.",
  "de": "Keine Ergebnisse im gewählten Umfang. Fügen Sie eine Sprache hinzu oder durchsuchen Sie Originaltexte."
 },
 "more": {
  "fr": "Afficher 60 résultats supplémentaires",
  "en": "Show 60 more results",
  "es": "Mostrar 60 resultados más",
  "it": "Mostra altri 60 risultati",
  "fi": "Näytä 60 tulosta lisää",
  "de": "60 weitere Ergebnisse anzeigen"
 },
 "originalWords": {
  "fr": "Mots d’origine",
  "en": "Original words",
  "es": "Palabras originales",
  "it": "Parole originali",
  "fi": "Alkuperäiset sanat",
  "de": "Originalbegriffe"
 },
 "reviewedOnly": {
  "fr": "Seules les traductions révisées sont proposées.",
  "en": "Only reviewed translations are offered.",
  "es": "Solo se ofrecen traducciones revisadas.",
  "it": "Sono proposte solo traduzioni revisionate.",
  "fi": "Vain tarkistettuja käännöksiä tarjotaan.",
  "de": "Nur geprüfte Übersetzungen werden angeboten."
 },
 "reviewedText": {
  "fr": "Texte révisé en",
  "en": "Reviewed text in",
  "es": "Texto revisado en",
  "it": "Testo revisionato in",
  "fi": "Tarkistettu teksti kielellä",
  "de": "Geprüfter Text auf"
 },
 "noTranslation": {
  "fr": "Relation non traduite",
  "en": "Untranslated relation",
  "es": "Relación sin traducir",
  "it": "Relazione non tradotta",
  "fi": "Kääntämätön suhde",
  "de": "Nicht übersetzte Relation"
 },
 "results": {
  "fr": "résultat(s)",
  "en": "result(s)",
  "es": "resultado(s)",
  "it": "risultati",
  "fi": "tulosta",
  "de": "Ergebnis(se)"
 },
 "searchResults": {
  "fr": "Résultats de recherche",
  "en": "Search results",
  "es": "Resultados de búsqueda",
  "it": "Risultati di ricerca",
  "fi": "Hakutulokset",
  "de": "Suchergebnisse"
 },
 "searchHint": {
  "fr": "Une entrée par identité dans le Kristal, avec les langues correspondantes.",
  "en": "One entry per Kristal identity, with matching languages.",
  "es": "Una entrada por identidad del Kristal, con los idiomas coincidentes.",
  "it": "Una voce per identità del Kristal, con le lingue corrispondenti.",
  "fi": "Yksi tulos Kristalin tunnistetta kohti, vastaavine kielineen.",
  "de": "Ein Eintrag pro Kristal-Identität mit den passenden Sprachen."
 },
 "searchScope": {
  "fr": "Périmètre linguistique sélectionné",
  "en": "Selected language scope",
  "es": "Ámbito lingüístico seleccionado",
  "it": "Ambito linguistico selezionato",
  "fi": "Valittu kielialue",
  "de": "Gewählter Sprachumfang"
 },
 "back": {
  "fr": "← Précédent",
  "en": "← Back",
  "es": "← Atrás",
  "it": "← Indietro",
  "fi": "← Takaisin",
  "de": "← Zurück"
 },
 "home": {
  "fr": "⌂ Départ",
  "en": "⌂ Home",
  "es": "⌂ Inicio",
  "it": "⌂ Inizio",
  "fi": "⌂ Alku",
  "de": "⌂ Start"
 },
 "reset": {
  "fr": "Réinitialiser les filtres",
  "en": "Reset filters",
  "es": "Restablecer filtros",
  "it": "Ripristina filtri",
  "fi": "Palauta suodattimet",
  "de": "Filter zurücksetzen"
 },
 "about": {
  "fr": "À propos",
  "en": "About",
  "es": "Acerca de",
  "it": "Informazioni",
  "fi": "Tietoja",
  "de": "Über"
 },
 "full": {
  "fr": "↗ Plein écran",
  "en": "↗ Full screen",
  "es": "↗ Pantalla completa",
  "it": "↗ Schermo intero",
  "fi": "↗ Koko näyttö",
  "de": "↗ Vollbild"
 },
 "loading": {
  "fr": "Chargement du catalogue…",
  "en": "Loading catalog…",
  "es": "Cargando catálogo…",
  "it": "Caricamento catalogo…",
  "fi": "Ladataan luetteloa…",
  "de": "Katalog wird geladen…"
 },
 "choose": {
  "fr": "Choisissez un Kristal",
  "en": "Choose a Kristal",
  "es": "Elija un Kristal",
  "it": "Scegli un Kristal",
  "fi": "Valitse Kristal",
  "de": "Kristal auswählen"
 },
 "partial": {
  "fr": "Interface en cours de traduction ; certains panneaux restent en français. Les contenus sources ne sont pas traduits automatiquement.",
  "en": "Interface translation in progress; some panels remain in French. Source content is not translated automatically.",
  "es": "Interfaz en traducción; algunos paneles siguen en francés. Los contenidos fuente no se traducen automáticamente.",
  "it": "Interfaccia in traduzione; alcuni pannelli restano in francese. I contenuti originali non sono tradotti automaticamente.",
  "fi": "Käyttöliittymän käännös on kesken; osa paneeleista on ranskaksi. Lähdesisältöä ei käännetä automaattisesti.",
  "de": "Oberflächenübersetzung in Arbeit; einige Bereiche bleiben französisch. Quellinhalte werden nicht automatisch übersetzt."
 },
 "footer": {
  "fr": "Lecture seule · Contenu affiché selon les sources publiées, sans validation indépendante des faits",
  "en": "Read only · Content follows published sources, without independent fact verification",
  "es": "Solo lectura · Contenido según las fuentes publicadas, sin verificación independiente de los hechos",
  "it": "Sola lettura · Contenuti secondo le fonti pubblicate, senza verifica indipendente dei fatti",
  "fi": "Vain luku · Sisältö julkaistujen lähteiden mukaan, ilman riippumatonta tosiasioiden tarkistusta",
  "de": "Schreibgeschützt · Inhalte gemäß veröffentlichten Quellen, ohne unabhängige Faktenprüfung"
 },
 "mapKnowledge": {
  "fr": "Constellation des connaissances",
  "en": "Knowledge constellation",
  "es": "Constelación de conocimientos",
  "it": "Costellazione delle conoscenze",
  "fi": "Tietojen verkosto",
  "de": "Wissenskonstellation"
 },
 "mapDocs": {
  "fr": "Carte des documents",
  "en": "Document map",
  "es": "Mapa de documentos",
  "it": "Mappa dei documenti",
  "fi": "Asiakirjakartta",
  "de": "Dokumentenkarte"
 },
 "registryDocs": {
  "fr": "Parcourir les documents",
  "en": "Browse documents",
  "es": "Explorar documentos",
  "it": "Sfoglia i documenti",
  "fi": "Selaa asiakirjoja",
  "de": "Dokumente durchsuchen"
 },
 "named": {
  "fr": "NOTIONS NOMMÉES",
  "en": "NAMED CONCEPTS",
  "es": "CONCEPTOS CON NOMBRE",
  "it": "CONCETTI CON NOME",
  "fi": "NIMETYT KÄSITTEET",
  "de": "BENANNTE BEGRIFFE"
 },
 "documents": {
  "fr": "DOCUMENTS RÉPERTORIÉS",
  "en": "LISTED DOCUMENTS",
  "es": "DOCUMENTOS CATALOGADOS",
  "it": "DOCUMENTI ELENCATI",
  "fi": "LUETTELOIDUT ASIAKIRJAT",
  "de": "ERFASSTE DOKUMENTE"
 },
 "links": {
  "fr": "LIENS DÉCLARÉS (NON VALIDÉS)",
  "en": "DECLARED LINKS (NOT VALIDATED)",
  "es": "ENLACES DECLARADOS (NO VALIDADOS)",
  "it": "COLLEGAMENTI DICHIARATI (NON CONVALIDATI)",
  "fi": "ILMOITETUT YHTEYDET (EI VALIDOITU)",
  "de": "DEKLARIERTE VERKNÜPFUNGEN (NICHT VALIDiert)"
 },
 "inventory": {
  "fr": "LIENS D’INVENTAIRE",
  "en": "INVENTORY LINKS",
  "es": "ENLACES DE INVENTARIO",
  "it": "COLLEGAMENTI D’INVENTARIO",
  "fi": "LUETTELOYHTEYDET",
  "de": "INVENTARVERKNÜPFUNGEN"
 },
 "neighbors": {
  "fr": "Notions autour du sujet",
  "en": "Concepts around the topic",
  "es": "Conceptos alrededor del tema",
  "it": "Concetti attorno al tema",
  "fi": "Aiheeseen liittyvät käsitteet",
  "de": "Begriffe rund um das Thema"
 },
 "visibleDocs": {
  "fr": "Documents visibles",
  "en": "Visible documents",
  "es": "Documentos visibles",
  "it": "Documenti visibili",
  "fi": "Näkyvät asiakirjat",
  "de": "Sichtbare Dokumente"
 },
 "searchTag": {
  "fr": "RECHERCHE",
  "en": "SEARCH",
  "es": "BÚSQUEDA",
  "it": "RICERCA",
  "fi": "HAKU",
  "de": "SUCHE"
 },
 "mapHint": {
  "fr": "Connexions réellement présentes. Les notions sans nom restent neutres et numérotées.",
  "en": "Actual connections. Unnamed concepts remain neutral and numbered.",
  "es": "Conexiones realmente presentes. Los conceptos sin nombre se mantienen neutros y numerados.",
  "it": "Connessioni realmente presenti. I concetti senza nome restano neutri e numerati.",
  "fi": "Todelliset yhteydet. Nimettömät käsitteet pysyvät neutraaleina ja numeroituina.",
  "de": "Tatsächlich vorhandene Verbindungen. Unbenannte Begriffe bleiben neutral und nummeriert."
 },
 "mapDocHint": {
  "fr": "Classement visuel de fichiers publics, sans relations sémantiques supposées. Sélectionnez une catégorie pour découvrir les documents.",
  "en": "Visual grouping of public files, without assumed semantic relations. Select a category to discover documents.",
  "es": "Clasificación visual de archivos públicos, sin relaciones semánticas supuestas. Seleccione una categoría para descubrir documentos.",
  "it": "Classificazione visiva dei file pubblici, senza relazioni semantiche presunte. Seleziona una categoria per scoprire i documenti.",
  "fi": "Julkisten tiedostojen visuaalinen ryhmittely ilman oletettuja semanttisia suhteita. Valitse luokka tutkiaksesi asiakirjoja.",
  "de": "Visuelle Gruppierung öffentlicher Dateien ohne angenommene semantische Beziehungen. Wählen Sie eine Kategorie, um Dokumente zu entdecken."
 },
 "registryHint": {
  "fr": "Parcourez les notions qui possèdent un vrai libellé. Les notions anonymes restent regroupées.",
  "en": "Browse concepts with actual labels. Anonymous concepts remain grouped.",
  "es": "Explore conceptos con etiquetas reales. Los conceptos anónimos permanecen agrupados.",
  "it": "Esplora i concetti con etichette effettive. I concetti anonimi restano raggruppati.",
  "fi": "Selaa käsitteitä, joilla on todellinen nimike. Nimettömät käsitteet pysyvät ryhmiteltyinä.",
  "de": "Erkunden Sie Begriffe mit tatsächlichen Bezeichnungen. Anonyme Begriffe bleiben gruppiert."
 },
 "registryDocHint": {
  "fr": "Parcourez les documents répertoriés, classés par type.",
  "en": "Browse listed documents grouped by type.",
  "es": "Explore los documentos catalogados, agrupados por tipo.",
  "it": "Sfoglia i documenti elencati, raggruppati per tipo.",
  "fi": "Selaa luetteloituja asiakirjoja tyypin mukaan.",
  "de": "Durchsuchen Sie die erfassten Dokumente nach Typ."
 },
 "noReviewed": {
  "fr": "Aucune traduction révisée disponible dans ce périmètre. Les mots d’origine restent accessibles.",
  "en": "No reviewed translation is available in this scope. Original words remain accessible.",
  "es": "No hay traducciones revisadas en este ámbito. Las palabras originales siguen disponibles.",
  "it": "Nessuna traduzione revisionata in questo ambito. Le parole originali restano accessibili.",
  "fi": "Tässä laajuudessa ei ole tarkistettuja käännöksiä. Alkuperäiset sanat ovat edelleen käytettävissä.",
  "de": "Keine geprüfte Übersetzung in diesem Umfang verfügbar. Originalbegriffe bleiben zugänglich."
 }
};
export function uiText(locale,key){if(!Object.hasOwn(messages,key))throw Error('Unknown UI message: '+key);return messages[key][priorityLocale(locale)||'fr'];}
export function translateShell(root,locale){
 for(const e of root.querySelectorAll('[data-ui]'))e.textContent=uiText(locale,e.dataset.ui);
 for(const e of root.querySelectorAll('[data-ui-tail]'))e.lastChild.textContent=' '+uiText(locale,e.dataset.uiTail);
 for(const e of root.querySelectorAll('[data-ui-placeholder]')){const value=uiText(locale,e.dataset.uiPlaceholder);e.placeholder=value;e.setAttribute('aria-label',value);}
 for(const e of root.querySelectorAll('[data-ui-aria]'))e.setAttribute('aria-label',uiText(locale,e.dataset.uiAria));
}
