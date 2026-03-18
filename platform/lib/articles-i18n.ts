/**
 * Localised overrides for article content.
 * Key: `${locale}:${slug}` → partial Article fields to override.
 * English articles live in articles.ts and serve as the fallback.
 */

import type { Article } from "./articles";

type ArticleOverride = Omit<Article, "slug" | "themes">;

export const ARTICLE_TRANSLATIONS: Record<string, ArticleOverride> = {
  // ═══════════════════════════════════════════════════════════════════════
  // SPANISH
  // ═══════════════════════════════════════════════════════════════════════
  "es:learn-from-chess-blunders": {
    title: "Cómo aprender realmente de tus errores en ajedrez (no solo revisarlos)",
    metaTitle: "Aprende de tus errores en ajedrez — Convierte fallos en mejora",
    metaDescription: "Revisar errores no es suficiente. Así es como convertir tus fallos en ajedrez en mejora duradera con entrenamiento de puzzles dirigidos.",
    content: `Todo jugador de ajedrez revisa sus errores. Pierdes una partida, abres el tablero de análisis y haces clic en los movimientos hasta que Stockfish señala el momento en que fallaste. Miras la posición, asientes y cierras la pestaña. Tres partidas después, cometes el mismo error.

## Por qué la revisión pasiva falla

Revisar un error después del hecho es aprendizaje pasivo. Estás consumiendo información, no produciéndola. Tu cerebro registra "no debería haber hecho eso" pero no construye la vía neuronal que lo prevendría la próxima vez.

La investigación sobre adquisición de habilidades es clara: el reconocimiento no es lo mismo que el recuerdo. Puedes reconocer tu error cuando alguien te lo señala. Pero en una partida en vivo, con el reloj corriendo, necesitas recuerdo — la capacidad de ver el peligro antes de que ocurra, sin ayuda.

Esta es la diferencia entre revisar y entrenar. Revisar te dice qué salió mal. Entrenar se asegura de que no vuelva a ocurrir.

## Entrenamiento activo vs revisión

El entrenamiento activo significa que te colocan de vuelta en la posición exacta donde cometiste el error — o una estructuralmente similar — y te obligan a encontrar el movimiento correcto tú mismo. Sin flechas de análisis. Sin sugerencias del motor. Solo tú y el tablero.

Cuando resuelves una posición activamente, estás construyendo el patrón en tu memoria a largo plazo. Cada repetición fortalece la conexión. Después de cinco o seis resoluciones exitosas del mismo motivo, comienzas a verlo en tus partidas sin buscarlo conscientemente.

## Repetición espaciada en ajedrez

La repetición espaciada es la técnica de memorización más eficiente conocida por la ciencia cognitiva. En lugar de practicar un patrón una vez y pasar al siguiente, lo revisitas a intervalos crecientes — después de un día, luego tres días, luego una semana.

Aplicado al ajedrez: los errores que sigues cometiendo deberían resurgir como puzzles con más frecuencia que los que ya has corregido. Esto es entrenamiento dirigido — no resolución aleatoria de puzzles.

## Cómo Cassandra Chess lo automatiza

Cassandra analiza tus partidas reales de Chess.com y Lichess. Cuando cometes un error — un movimiento que pierde 60+ centipeones — extraemos esa posición y la convertimos en un puzzle. El puzzle te muestra la posición antes de tu error y pregunta: ¿qué deberías haber jugado?

Otras plataformas cobran por el análisis de partidas. Nosotros ejecutamos Stockfish en cada partida gratis y convertimos los resultados en entrenamiento personalizado. Conecta tu cuenta y deja de revisar tus errores — empieza a entrenar con ellos.

**[Deja de revisar. Empieza a entrenar →](/connect)**`,
  },
  "es:free-chess-puzzles": {
    title: "Los mejores puzzles de ajedrez gratis en 2026 — Y por qué los personalizados funcionan mejor",
    metaTitle: "Puzzles de ajedrez gratis 2026 — Ilimitados y personalizados",
    metaDescription: "Chess.com cobra por más puzzles y análisis de partidas. Así puedes obtener puzzles de ajedrez gratis ilimitados — incluyendo los creados a partir de tus propias partidas.",
    content: `Los puzzles de ajedrez son la base de la mejora táctica. Pero en 2026, el panorama está dividido: algunas plataformas bloquean su mejor contenido tras muros de pago, mientras que otras ofrecen millones de puzzles gratis.

## La base de datos abierta de Lichess

Lichess mantiene la mayor base de datos de puzzles de ajedrez de código abierto del mundo — más de 4 millones de puzzles, todos gratis, todos derivados de partidas reales. La base de datos se publica bajo CC0, lo que significa que cualquiera puede usarla para cualquier propósito.

Cassandra Chess utiliza esta base de datos para su biblioteca general de puzzles. Cada puzzle que resuelves proviene de una posición de partida real.

## El problema del muro de pago de Chess.com

Chess.com ofrece excelentes puzzles, pero los usuarios gratuitos están limitados a un pequeño número por día. ¿Quieres más? Suscripción premium. ¿Quieres análisis de partidas con evaluaciones del motor? Premium otra vez.

Esto crea una situación frustrante para los jugadores que mejoran. Los jugadores que necesitan más práctica son los que menos pueden permitirse acceso ilimitado.

## Por qué los puzzles genéricos tienen límites

Incluso con puzzles gratis ilimitados, hay un problema fundamental: los puzzles genéricos son genéricos. Provienen de partidas de otras personas, presentando posiciones que quizás nunca encuentres en tu propio juego.

Los puzzles aleatorios mejoran tus tácticas en general. Pero los puzzles dirigidos — los que coinciden con tus debilidades específicas — te mejoran más rápido.

## El concepto de puzzle personalizado

¿Qué pasaría si tu entrenamiento se construyera a partir de tus propias partidas? Cada error se convierte en un puzzle. Cada posición donde fallaste se convierte en un ejercicio.

Esto es lo que hace Cassandra Chess. Conecta tu cuenta de Chess.com o Lichess, y analizamos tus partidas con Stockfish — el mismo análisis que Chess.com cobra. Encontramos tus errores y generamos puzzles personalizados.

El resultado: un banco de puzzles 100% relevante para tu ajedrez real. Sin posiciones genéricas. Sin pagar por análisis. Solo entrenamiento dirigido a tus debilidades reales.

**[Obtén tus puzzles personalizados gratis →](/connect)**`,
  },
  "es:chess-tactics-trainer-personalised": {
    title: "Entrenador de tácticas de ajedrez — Por qué los puzzles aleatorios te frenan",
    metaTitle: "Entrenador de tácticas — Deja los puzzles aleatorios",
    metaDescription: "La mayoría de entrenadores de tácticas te dan posiciones aleatorias. Por qué eso no funciona — y qué hacer en su lugar.",
    content: `Abres tu entrenador de tácticas favorito. Se carga una posición. La resuelves — o no. Se carga otra posición. Repite durante veinte minutos.

Así es como la mayoría de jugadores entrena tácticas. Y funciona, hasta cierto punto. La resolución aleatoria mejorará tu reconocimiento de patrones. Pero hay un techo, y la mayoría de jugadores lo alcanzan sin entender por qué.

## Cómo funcionan los entrenadores de tácticas

Un entrenador típico selecciona posiciones de una gran base de datos, filtradas por tu nivel de dificultad aproximado. A medida que resuelves, tu rating de puzzle se ajusta — acierta y ves posiciones más difíciles, falla y ves más fáciles.

Pero la selección sigue siendo esencialmente aleatoria dentro de tu banda de rating. No hay lógica estratégica en la secuencia.

## El problema con las posiciones aleatorias

El entrenamiento aleatorio trata todas las debilidades por igual. Pero tus debilidades no son iguales. Podrías ser excelente detectando horquillas pero terrible encontrando ataques descubiertos. Un entrenador aleatorio no lo sabe.

El resultado: pasas tiempo significativo en patrones que ya dominas, mientras subentrenar los que realmente te cuestan partidas.

**La especificidad importa.** El entrenamiento más eficiente se dirige a tus debilidades reales, no a una muestra aleatoria de todas las debilidades posibles.

## Entrenando tus debilidades

Cassandra Chess conecta con tus cuentas de Chess.com y Lichess y analiza tus partidas reales. Ejecutamos Stockfish en cada posición e identificamos dónde cometiste errores.

Cada error se convierte en un puzzle. La posición antes de tu fallo se carga en el tablero. Tu trabajo: encontrar lo que deberías haber jugado. Sin pistas. Sin flechas. Solo la posición y el reloj.

Porque estos puzzles provienen de tus propias partidas, se dirigen a tus puntos ciegos específicos.

## Más allá del techo aleatorio

Los jugadores que cambian de entrenamiento aleatorio a personalizado reportan mejoras más rápidas. La razón es simple: cada minuto de entrenamiento es relevante.

**[Conecta tu cuenta y empieza el entrenamiento dirigido →](/connect)**

*¿Quieres probar el desafío diario de Cassandra? **[La Profecía de Cassandra →](/prophecy)** — un nuevo puzzle brillante cada día.*`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FRENCH
  // ═══════════════════════════════════════════════════════════════════════
  "fr:learn-from-chess-blunders": {
    title: "Comment vraiment apprendre de vos erreurs aux échecs (pas seulement les revoir)",
    metaTitle: "Apprendre de ses erreurs aux échecs — Transformez vos fautes en progrès",
    metaDescription: "Revoir ses erreurs ne suffit pas. Voici comment transformer vos fautes aux échecs en amélioration durable grâce à un entraînement ciblé par puzzles.",
    content: `Tous les joueurs d'échecs revoient leurs erreurs. Vous perdez une partie, ouvrez le tableau d'analyse et cliquez sur les coups jusqu'à ce que Stockfish indique le moment où vous avez failli. Vous regardez la position, acquiescez et fermez l'onglet. Trois parties plus tard, vous commettez la même erreur.

## Pourquoi la révision passive échoue

Revoir une erreur après coup est un apprentissage passif. Vous consommez de l'information, vous n'en produisez pas. Votre cerveau enregistre « je n'aurais pas dû faire ça » mais ne construit pas le chemin neuronal qui l'empêcherait la prochaine fois.

La recherche sur l'acquisition de compétences est claire : la reconnaissance n'est pas le rappel. Vous reconnaissez peut-être votre erreur quand quelqu'un vous la montre. Mais en partie réelle, avec l'horloge qui tourne, vous avez besoin du rappel — la capacité de voir le danger avant qu'il ne survienne.

C'est la différence entre réviser et s'entraîner. Réviser vous dit ce qui a mal tourné. S'entraîner fait en sorte que ça ne se reproduise plus.

## Entraînement actif vs révision

L'entraînement actif signifie que vous êtes replacé dans la position exacte où vous avez commis l'erreur et forcé de trouver le bon coup vous-même. Pas de flèches d'analyse. Pas de suggestions du moteur. Juste vous et l'échiquier.

Quand vous résolvez une position activement, vous construisez le motif dans votre mémoire à long terme. Chaque répétition renforce la connexion.

## La répétition espacée aux échecs

La répétition espacée est la technique de mémorisation la plus efficace connue de la science cognitive. Au lieu de pratiquer un motif une fois et de passer au suivant, vous le revisitez à intervalles croissants.

Appliqué aux échecs : les erreurs que vous continuez de commettre devraient resurgir comme puzzles plus souvent que celles que vous avez déjà corrigées. C'est un entraînement ciblé.

## Comment Cassandra Chess automatise cela

Cassandra analyse vos vraies parties de Chess.com et Lichess. Quand vous commettez une erreur — un coup qui perd 60+ centipions — nous extrayons cette position et la transformons en puzzle.

D'autres plateformes facturent l'analyse de parties. Nous exécutons Stockfish sur chaque partie gratuitement. Connectez votre compte et arrêtez de revoir vos erreurs — commencez à vous entraîner dessus.

**[Arrêtez de revoir. Commencez à vous entraîner →](/connect)**`,
  },
  "fr:free-chess-puzzles": {
    title: "Les meilleurs puzzles d'échecs gratuits en 2026 — Et pourquoi les personnalisés marchent mieux",
    metaTitle: "Puzzles d'échecs gratuits 2026 — Illimités et personnalisés",
    metaDescription: "Chess.com facture les puzzles supplémentaires et l'analyse de parties. Voici comment obtenir des puzzles d'échecs gratuits illimités — y compris ceux créés à partir de vos propres parties.",
    content: `Les puzzles d'échecs sont le fondement de l'amélioration tactique. Mais en 2026, le paysage est divisé : certaines plateformes verrouillent leur meilleur contenu derrière des murs de paiement, tandis que d'autres offrent des millions de puzzles gratuitement.

## La base de données ouverte de Lichess

Lichess maintient la plus grande base de données de puzzles d'échecs open source au monde — plus de 4 millions de puzzles, tous gratuits, tous dérivés de vraies parties. La base de données est publiée sous CC0.

Cassandra Chess puise dans cette base de données pour sa bibliothèque générale de puzzles.

## Le problème du mur de paiement de Chess.com

Chess.com offre d'excellents puzzles, mais les utilisateurs gratuits sont limités à un petit nombre par jour. Vous en voulez plus ? Abonnement premium. Vous voulez l'analyse de parties ? Premium encore.

Les joueurs qui ont le plus besoin de pratique sont ceux qui peuvent le moins se permettre un accès illimité.

## Pourquoi les puzzles génériques ont des limites

Les puzzles génériques viennent des parties d'autres personnes, présentant des positions que vous ne rencontrerez peut-être jamais dans votre propre jeu.

Les puzzles aléatoires améliorent vos tactiques en général. Mais les puzzles ciblés — ceux qui correspondent à vos faiblesses spécifiques — vous améliorent plus vite.

## Le concept de puzzle personnalisé

Et si votre entraînement était construit à partir de vos propres parties ? Chaque erreur devient un puzzle. Chaque position où vous avez failli devient un exercice.

C'est ce que fait Cassandra Chess. Connectez votre compte Chess.com ou Lichess, et nous analysons vos parties avec Stockfish — la même analyse que Chess.com facture. Nous trouvons vos erreurs et générons des puzzles personnalisés.

Le résultat : une banque de puzzles 100% pertinente pour votre jeu réel. Sans payer pour l'analyse. Juste un entraînement ciblé sur vos vraies faiblesses.

**[Obtenez vos puzzles personnalisés gratuits →](/connect)**`,
  },
  "fr:chess-tactics-trainer-personalised": {
    title: "Entraîneur de tactiques d'échecs — Pourquoi les puzzles aléatoires vous freinent",
    metaTitle: "Entraîneur de tactiques — Arrêtez les puzzles aléatoires",
    metaDescription: "La plupart des entraîneurs de tactiques vous donnent des positions aléatoires. Pourquoi ça ne marche pas — et quoi faire à la place.",
    content: `Vous ouvrez votre entraîneur de tactiques favori. Une position se charge. Vous la résolvez — ou pas. Une autre position se charge. Répétez pendant vingt minutes.

C'est ainsi que la plupart des joueurs entraînent les tactiques. Et ça marche, jusqu'à un certain point. Mais il y a un plafond, et la plupart des joueurs l'atteignent sans comprendre pourquoi.

## Comment fonctionnent les entraîneurs de tactiques

Un entraîneur typique sélectionne des positions dans une grande base de données, filtrées par votre niveau de difficulté approximatif. La sélection est essentiellement aléatoire dans votre bande de rating.

## Le problème avec les positions aléatoires

L'entraînement aléatoire traite toutes les faiblesses également. Mais vos faiblesses ne sont pas égales. Vous pourriez être excellent pour repérer les fourchettes mais terrible pour trouver les attaques à la découverte.

Le résultat : vous passez du temps significatif sur des motifs que vous maîtrisez déjà, tout en sous-entraînant ceux qui vous coûtent des parties.

**La spécificité compte.** L'entraînement le plus efficace cible vos faiblesses réelles.

## S'entraîner sur ses faiblesses

Cassandra Chess connecte vos comptes Chess.com et Lichess et analyse vos vraies parties. Nous exécutons Stockfish sur chaque position et identifions où vous avez commis des erreurs.

Chaque erreur devient un puzzle. Parce que ces puzzles proviennent de vos propres parties, ils ciblent vos angles morts spécifiques.

## Au-delà du plafond aléatoire

Les joueurs qui passent de l'entraînement aléatoire au personnalisé rapportent des améliorations plus rapides. Chaque minute d'entraînement est pertinente.

**[Connectez votre compte et commencez l'entraînement ciblé →](/connect)**

*Envie d'essayer le défi quotidien ? **[La Prophétie de Cassandra →](/prophecy)** — un nouveau puzzle brillant chaque jour.*`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GERMAN
  // ═══════════════════════════════════════════════════════════════════════
  "de:learn-from-chess-blunders": {
    title: "Wie man wirklich aus seinen Schachfehlern lernt (nicht nur sie durchsieht)",
    metaTitle: "Aus Schachfehlern lernen — Fehler in Verbesserung verwandeln",
    metaDescription: "Fehler durchsehen reicht nicht. So verwandeln Sie Ihre Schachfehler in dauerhafte Verbesserung durch gezieltes Puzzle-Training.",
    content: `Jeder Schachspieler sieht seine Fehler durch. Sie verlieren eine Partie, öffnen das Analysebrett und klicken durch die Züge, bis Stockfish den Moment markiert, wo Sie falsch lagen. Sie betrachten die Stellung, nicken und schließen den Tab. Drei Partien später machen Sie denselben Fehler.

## Warum passive Durchsicht versagt

Einen Fehler im Nachhinein durchzusehen ist passives Lernen. Sie konsumieren Information, produzieren sie aber nicht. Ihr Gehirn registriert „das hätte ich nicht tun sollen", baut aber nicht den neuronalen Pfad auf, der es beim nächsten Mal verhindern würde.

Der Unterschied zwischen Durchsehen und Trainieren: Durchsehen sagt Ihnen, was schiefgelaufen ist. Training stellt sicher, dass es nicht wieder passiert.

## Aktives Üben vs. Durchsehen

Aktives Üben bedeutet, dass Sie zurück in die exakte Position versetzt werden, wo Sie den Fehler gemacht haben, und den richtigen Zug selbst finden müssen. Keine Analysepfeile. Keine Engine-Vorschläge. Nur Sie und das Brett.

Wenn Sie eine Position aktiv lösen, bauen Sie das Muster in Ihr Langzeitgedächtnis ein. Jede Wiederholung stärkt die Verbindung.

## Verteiltes Wiederholen im Schach

Verteiltes Wiederholen ist die effizienteste bekannte Gedächtnistechnik. Statt ein Muster einmal zu üben und weiterzugehen, besuchen Sie es in wachsenden Abständen wieder.

Angewandt auf Schach: Die Fehler, die Sie immer wieder machen, sollten häufiger als Rätsel auftauchen als die, die Sie bereits korrigiert haben.

## Wie Cassandra Chess das automatisiert

Cassandra analysiert Ihre echten Partien von Chess.com und Lichess. Wenn Sie einen Fehler machen — einen Zug, der 60+ Centipawns verliert — extrahieren wir diese Position und verwandeln sie in ein Rätsel.

Andere Plattformen berechnen Geld für die Partieanalyse. Wir führen Stockfish auf jeder Partie kostenlos aus. Verbinden Sie Ihr Konto und hören Sie auf, Ihre Fehler durchzusehen — beginnen Sie, sie zu trainieren.

**[Hören Sie auf durchzusehen. Beginnen Sie zu trainieren →](/connect)**`,
  },
  "de:free-chess-puzzles": {
    title: "Die besten kostenlosen Schachrätsel 2026 — Und warum personalisierte besser funktionieren",
    metaTitle: "Kostenlose Schachrätsel 2026 — Unbegrenzt und personalisiert",
    metaDescription: "Chess.com berechnet Geld für mehr Rätsel und Partieanalyse. So erhalten Sie unbegrenzte kostenlose Schachrätsel — einschließlich solcher aus Ihren eigenen Partien.",
    content: `Schachrätsel sind das Fundament taktischer Verbesserung. Aber 2026 ist die Landschaft geteilt: Einige Plattformen sperren ihren besten Inhalt hinter Paywalls, während andere Millionen von Rätseln kostenlos anbieten.

## Die offene Lichess-Datenbank

Lichess unterhält die größte Open-Source-Schachrätseldatenbank der Welt — über 4 Millionen Rätsel, alle kostenlos, alle aus echten Partien abgeleitet. Die Datenbank wird unter CC0 veröffentlicht.

Cassandra Chess greift auf diese Datenbank für seine allgemeine Rätselbibliothek zurück.

## Das Chess.com-Paywall-Problem

Chess.com bietet hervorragende Rätsel, aber kostenlose Nutzer sind auf eine kleine Anzahl pro Tag begrenzt. Mehr wollen? Premium-Abo. Partieanalyse? Wieder Premium.

Die Spieler, die am meisten Übung brauchen, können sich am wenigsten unbegrenzten Zugang leisten.

## Warum generische Rätsel Grenzen haben

Generische Rätsel stammen aus Partien anderer Leute, mit Stellungen, die Sie in Ihrem eigenen Spiel vielleicht nie antreffen.

Zufällige Rätsel verbessern Ihre Taktik allgemein. Aber gezielte Rätsel — die Ihren spezifischen Schwächen entsprechen — verbessern Sie schneller.

## Das Konzept personalisierter Rätsel

Was wäre, wenn Ihr Training aus Ihren eigenen Partien aufgebaut wäre? Jeder Fehler wird zum Rätsel.

Das ist es, was Cassandra Chess tut. Verbinden Sie Ihr Chess.com- oder Lichess-Konto, und wir analysieren Ihre Partien mit Stockfish — die gleiche Analyse, für die Chess.com Geld verlangt. Wir finden Ihre Fehler und generieren personalisierte Rätsel.

Das Ergebnis: Eine Rätselbank, die zu 100% relevant für Ihr tatsächliches Schach ist. Ohne für Analyse zu bezahlen.

**[Holen Sie sich Ihre kostenlosen personalisierten Rätsel →](/connect)**`,
  },
  "de:chess-tactics-trainer-personalised": {
    title: "Schachtaktik-Trainer — Warum zufällige Rätsel Sie zurückhalten",
    metaTitle: "Schachtaktik-Trainer — Hören Sie auf, zufällige Rätsel zu lösen",
    metaDescription: "Die meisten Schachtaktik-Trainer geben Ihnen zufällige Stellungen. Warum das nicht funktioniert — und was stattdessen zu tun ist.",
    content: `Sie öffnen Ihren Lieblings-Taktiktrainer. Eine Stellung lädt. Sie lösen sie — oder nicht. Eine weitere Stellung lädt. Wiederholen Sie das zwanzig Minuten lang.

So trainieren die meisten Schachspieler Taktik. Und es funktioniert, bis zu einem gewissen Punkt. Aber es gibt eine Obergrenze, und die meisten Spieler erreichen sie, ohne zu verstehen warum.

## Wie Taktiktrainer funktionieren

Ein typischer Taktiktrainer wählt Stellungen aus einer großen Datenbank, gefiltert nach Ihrem ungefähren Schwierigkeitsgrad. Die Auswahl ist im Wesentlichen zufällig innerhalb Ihres Rating-Bandes.

## Das Problem mit zufälligen Stellungen

Zufälliges Training behandelt alle Schwächen gleich. Aber Ihre Schwächen sind nicht gleich. Sie könnten excellent darin sein, Gabeln zu erkennen, aber schlecht darin, Abzugsangriffe zu finden.

**Spezifität zählt.** Das effizienteste Training zielt auf Ihre tatsächlichen Schwächen.

## Auf Ihren Schwächen trainieren

Cassandra Chess verbindet sich mit Ihren Chess.com- und Lichess-Konten und analysiert Ihre echten Partien. Wir führen Stockfish auf jeder Stellung aus und identifizieren, wo Sie Fehler gemacht haben.

Jeder Fehler wird zum Rätsel. Weil diese Rätsel aus Ihren eigenen Partien stammen, zielen sie auf Ihre spezifischen blinden Flecken.

**[Verbinden Sie Ihr Konto und beginnen Sie gezieltes Training →](/connect)**

*Wollen Sie die tägliche Herausforderung probieren? **[Cassandras Prophezeiung →](/prophecy)** — jeden Tag ein neues brillantes Rätsel.*`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PORTUGUESE
  // ═══════════════════════════════════════════════════════════════════════
  "pt:learn-from-chess-blunders": {
    title: "Como realmente aprender com os seus erros no xadrez (não apenas revê-los)",
    metaTitle: "Aprender com erros no xadrez — Transforme falhas em melhoria",
    metaDescription: "Rever erros não é suficiente. Veja como transformar os seus erros no xadrez em melhoria duradoura com treino de puzzles direcionados.",
    content: `Todo jogador de xadrez revê os seus erros. Perde uma partida, abre o tabuleiro de análise e clica nos lances até que o Stockfish assinale o momento em que errou. Olha para a posição, acena e fecha o separador. Três partidas depois, comete o mesmo erro.

## Por que a revisão passiva falha

Rever um erro depois do facto é aprendizagem passiva. Está a consumir informação, não a produzi-la. O seu cérebro regista "não devia ter feito isso" mas não constrói o caminho neuronal que o impediria da próxima vez.

A diferença entre rever e treinar: rever diz-lhe o que correu mal. Treinar garante que não aconteça novamente.

## Treino ativo vs revisão

Treino ativo significa que é colocado de volta na posição exata onde cometeu o erro e forçado a encontrar o lance correto sozinho. Sem setas de análise. Sem sugestões do motor. Apenas você e o tabuleiro.

Quando resolve uma posição ativamente, está a construir o padrão na sua memória a longo prazo.

## Repetição espaçada no xadrez

A repetição espaçada é a técnica de memorização mais eficiente conhecida pela ciência cognitiva. Em vez de praticar um padrão uma vez, revisita-o em intervalos crescentes.

Aplicado ao xadrez: os erros que continua a cometer devem ressurgir como puzzles com mais frequência.

## Como o Cassandra Chess automatiza isto

O Cassandra analisa as suas partidas reais de Chess.com e Lichess. Quando comete um erro — um lance que perde 60+ centipeões — extraímos essa posição e transformamo-la num puzzle.

Outras plataformas cobram pela análise de partidas. Nós executamos o Stockfish em cada partida gratuitamente. Conecte a sua conta e pare de rever os seus erros — comece a treinar com eles.

**[Pare de rever. Comece a treinar →](/connect)**`,
  },
  "pt:free-chess-puzzles": {
    title: "Os melhores puzzles de xadrez grátis em 2026 — E por que os personalizados funcionam melhor",
    metaTitle: "Puzzles de xadrez grátis 2026 — Ilimitados e personalizados",
    metaDescription: "Chess.com cobra por mais puzzles e análise de partidas. Veja como obter puzzles de xadrez grátis ilimitados — incluindo os criados a partir das suas próprias partidas.",
    content: `Os puzzles de xadrez são a base da melhoria tática. Mas em 2026, o panorama está dividido: algumas plataformas bloqueiam o seu melhor conteúdo atrás de paywalls, enquanto outras oferecem milhões de puzzles gratuitamente.

## A base de dados aberta do Lichess

O Lichess mantém a maior base de dados de puzzles de xadrez de código aberto do mundo — mais de 4 milhões de puzzles, todos grátis, todos derivados de partidas reais. A base de dados é publicada sob CC0.

## O problema do paywall do Chess.com

O Chess.com oferece excelentes puzzles, mas os utilizadores gratuitos estão limitados a um pequeno número por dia. Quer mais? Subscrição premium.

Os jogadores que mais precisam de prática são os que menos podem pagar acesso ilimitado.

## Por que os puzzles genéricos têm limites

Os puzzles genéricos vêm de partidas de outras pessoas, apresentando posições que pode nunca encontrar no seu próprio jogo. Puzzles direcionados — que correspondem às suas fraquezas específicas — melhoram-no mais rápido.

## O conceito de puzzle personalizado

E se o seu treino fosse construído a partir das suas próprias partidas? Cada erro torna-se um puzzle.

É isso que o Cassandra Chess faz. Conecte a sua conta Chess.com ou Lichess, e analisamos as suas partidas com Stockfish — a mesma análise que o Chess.com cobra. Encontramos os seus erros e geramos puzzles personalizados.

**[Obtenha os seus puzzles personalizados grátis →](/connect)**`,
  },
  "pt:chess-tactics-trainer-personalised": {
    title: "Treinador de táticas de xadrez — Por que puzzles aleatórios o estão a travar",
    metaTitle: "Treinador de táticas — Pare de resolver puzzles aleatórios",
    metaDescription: "A maioria dos treinadores de táticas dá-lhe posições aleatórias. Por que isso não funciona — e o que fazer em vez disso.",
    content: `Abre o seu treinador de táticas favorito. Uma posição carrega. Resolve-a — ou não. Outra posição carrega. Repita durante vinte minutos.

É assim que a maioria dos jogadores treina táticas. E funciona, até certo ponto. Mas há um teto, e a maioria dos jogadores atinge-o sem perceber porquê.

## Como funcionam os treinadores de táticas

Um treinador típico seleciona posições de uma grande base de dados, filtradas pelo seu nível de dificuldade aproximado. A seleção é essencialmente aleatória dentro da sua faixa de rating.

## O problema com posições aleatórias

O treino aleatório trata todas as fraquezas igualmente. Mas as suas fraquezas não são iguais.

**A especificidade importa.** O treino mais eficiente visa as suas fraquezas reais.

## Treinar as suas fraquezas

O Cassandra Chess conecta-se às suas contas Chess.com e Lichess e analisa as suas partidas reais. Executamos o Stockfish em cada posição e identificamos onde errou.

Cada erro torna-se um puzzle. Porque estes puzzles vêm das suas próprias partidas, visam os seus pontos cegos específicos.

**[Conecte a sua conta e comece o treino direcionado →](/connect)**

*Quer experimentar o desafio diário? **[A Profecia de Cassandra →](/prophecy)** — um novo puzzle brilhante todos os dias.*`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RUSSIAN
  // ═══════════════════════════════════════════════════════════════════════
  "ru:learn-from-chess-blunders": {
    title: "Как действительно учиться на своих шахматных ошибках (а не просто просматривать их)",
    metaTitle: "Учитесь на шахматных ошибках — Превратите промахи в прогресс",
    metaDescription: "Просмотр ошибок недостаточен. Вот как превратить ваши шахматные ошибки в устойчивое улучшение с помощью целенаправленных тренировочных задач.",
    content: `Каждый шахматист просматривает свои ошибки. Проигрываете партию, открываете доску анализа и щёлкаете по ходам, пока Stockfish не укажет момент, где вы ошиблись. Смотрите на позицию, киваете и закрываете вкладку. Через три партии совершаете ту же ошибку.

## Почему пассивный просмотр не работает

Просмотр ошибки постфактум — это пассивное обучение. Вы потребляете информацию, а не производите её. Мозг регистрирует «не надо было так делать», но не строит нейронный путь, который предотвратил бы это в следующий раз.

Разница между просмотром и тренировкой: просмотр говорит, что пошло не так. Тренировка гарантирует, что это не повторится.

## Активная тренировка vs просмотр

Активная тренировка означает, что вас ставят обратно в ту самую позицию, где вы допустили ошибку, и заставляют найти правильный ход самостоятельно. Без стрелок анализа. Без подсказок движка. Только вы и доска.

Когда вы решаете позицию активно, вы закрепляете паттерн в долговременной памяти.

## Интервальное повторение в шахматах

Интервальное повторение — самая эффективная техника запоминания. Вместо того чтобы практиковать паттерн один раз, вы возвращаетесь к нему через увеличивающиеся интервалы.

В шахматах: ошибки, которые вы продолжаете совершать, должны появляться как задачи чаще, чем те, которые вы уже исправили.

## Как Cassandra Chess автоматизирует это

Cassandra анализирует ваши реальные партии с Chess.com и Lichess. Когда вы допускаете ошибку — ход, теряющий 60+ сантипешек — мы извлекаем эту позицию и превращаем её в задачу.

Другие платформы берут деньги за анализ партий. Мы запускаем Stockfish на каждой партии бесплатно. Подключите аккаунт и перестаньте просматривать ошибки — начните тренироваться на них.

**[Перестаньте просматривать. Начните тренироваться →](/connect)**`,
  },
  "ru:free-chess-puzzles": {
    title: "Лучшие бесплатные шахматные задачи 2026 — И почему персонализированные работают лучше",
    metaTitle: "Бесплатные шахматные задачи 2026 — Безлимитные и персонализированные",
    metaDescription: "Chess.com берёт деньги за дополнительные задачи и анализ партий. Вот как получить безлимитные бесплатные шахматные задачи — включая созданные из ваших собственных партий.",
    content: `Шахматные задачи — основа тактического совершенствования. Но в 2026 году ландшафт разделён: одни платформы прячут лучший контент за платной подпиской, другие предлагают миллионы задач бесплатно.

## Открытая база данных Lichess

Lichess поддерживает крупнейшую в мире базу шахматных задач с открытым исходным кодом — более 4 миллионов задач, все бесплатные, все из реальных партий. База данных выпущена под лицензией CC0.

## Проблема платной подписки Chess.com

Chess.com предлагает отличные задачи, но бесплатные пользователи ограничены небольшим количеством в день. Хотите больше? Премиум-подписка.

Игроки, которым больше всего нужна практика, меньше всего могут позволить себе безлимитный доступ.

## Почему у стандартных задач есть ограничения

Стандартные задачи берутся из чужих партий, с позициями, которые вы, возможно, никогда не встретите в своей игре. Целевые задачи — соответствующие вашим конкретным слабостям — улучшают вас быстрее.

## Концепция персонализированных задач

Что если ваш тренинг строился бы из ваших собственных партий? Каждая ошибка становится задачей.

Именно это делает Cassandra Chess. Подключите аккаунт Chess.com или Lichess, и мы проанализируем ваши партии Stockfish — тот же анализ, за который Chess.com берёт деньги. Мы находим ваши ошибки и создаём персонализированные задачи.

**[Получите бесплатные персонализированные задачи →](/connect)**`,
  },
  "ru:chess-tactics-trainer-personalised": {
    title: "Тренажёр шахматной тактики — Почему случайные задачи вас тормозят",
    metaTitle: "Тренажёр тактики — Перестаньте решать случайные задачи",
    metaDescription: "Большинство тренажёров тактики дают случайные позиции. Почему это не работает — и что делать вместо этого.",
    content: `Вы открываете любимый тренажёр тактики. Загружается позиция. Решаете — или нет. Загружается следующая. Повторяете двадцать минут.

Так большинство шахматистов тренирует тактику. И это работает, до определённого момента. Но есть потолок, и большинство игроков достигают его, не понимая почему.

## Как работают тренажёры тактики

Типичный тренажёр выбирает позиции из большой базы данных, отфильтрованные по вашему примерному уровню сложности. Выбор по существу случаен в пределах вашего рейтингового диапазона.

## Проблема случайных позиций

Случайная тренировка относится ко всем слабостям одинаково. Но ваши слабости не равны.

**Специфичность важна.** Самая эффективная тренировка нацелена на ваши реальные слабости.

## Тренировка ваших слабостей

Cassandra Chess подключается к вашим аккаунтам Chess.com и Lichess и анализирует реальные партии. Мы запускаем Stockfish на каждой позиции и определяем, где вы ошиблись.

Каждая ошибка становится задачей. Поскольку эти задачи из ваших собственных партий, они нацелены на ваши конкретные слепые зоны.

**[Подключите аккаунт и начните целевую тренировку →](/connect)**

*Хотите попробовать ежедневный вызов? **[Пророчество Кассандры →](/prophecy)** — новая блестящая задача каждый день.*`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPANISH (new articles)
  // ═══════════════════════════════════════════════════════════════════════
  "es:chess-tactics-trainer-free": {
    title: "El mejor entrenador de tácticas de ajedrez gratuito en 2026",
    metaTitle: "Mejor entrenador gratuito de tácticas de ajedrez 2026 — Sin muro de pago",
    metaDescription: "¿Buscas un entrenador de tácticas de ajedrez gratuito? Descubre por qué los puzzles aleatorios estancan tu mejora y cómo entrenar con tus propias partidas rompe la barrera.",
    content: `Si llevas tiempo entrenando tácticas, probablemente conoces la rutina: abres una aplicación, resuelves treinta puzzles y te sientes satisfecho. Pero tu rating no se mueve. La razón es sencilla: los puzzles aleatorios dejan de funcionar pasado cierto punto.

## El estancamiento de los patrones

Los entrenadores genéricos extraen posiciones de una base de datos enorme y te las sirven según tu nivel aproximado. Al principio, cada puzzle introduce un motivo táctico nuevo — clavadas, horquillas, ataques descubiertos. El progreso es rápido. Pero con el tiempo, empiezas a ver los mismos temas una y otra vez. Los patrones que ya dominas se repiten y los que realmente necesitas reforzar aparecen con la misma frecuencia que cualquier otro. Esto es lo que llamamos el **estancamiento de patrones**: tu vocabulario táctico deja de crecer porque el material de entrenamiento no se adapta a ti.

## Qué necesita un buen entrenador

Un entrenador de tácticas eficaz necesita tres cosas:

- **Relevancia.** Las posiciones deben parecerse a las que encuentras en tus propias partidas — tus aperturas, tus estructuras, tu nivel de rival.
- **Precisión.** Debe apuntar a tus debilidades específicas, no a debilidades genéricas.
- **Retroalimentación útil.** No basta con decir "incorrecto". Necesitas entender por qué fallaste y volver a enfrentarte a la misma posición hasta dominarla.

La mayoría de plataformas cumplen solo el primer punto, si acaso.

## Entrenar con tus propias partidas

Cassandra Chess adopta un enfoque diferente. En lugar de servirte posiciones de desconocidos, analiza tus partidas reales de Chess.com y Lichess con Stockfish. Cada vez que detecta un error significativo — un movimiento que pierde ventaja evaluable — extrae esa posición y la convierte en un puzzle personalizado.

El resultado es un banco de ejercicios que refleja tus puntos ciegos reales. Si siempre fallas en finales de torre, verás finales de torre. Si tus errores se concentran en posiciones con enroques opuestos, eso es lo que entrenas. No hay relleno ni temas irrelevantes.

## Comparación con otros entrenadores gratuitos

**Lichess Puzzles** ofrece más de cuatro millones de puzzles gratuitos bajo licencia abierta. Es un recurso extraordinario para construir vocabulario táctico general, pero la selección sigue siendo genérica — no conoce tus partidas. Para profundizar en la diferencia, lee [Puzzles de Lichess vs puzzles personalizados](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com** limita los puzzles diarios en la versión gratuita y reserva el análisis completo de partidas a la suscripción premium.

**ChessTempo** permite filtrar por tema táctico, lo que añade cierto control, pero sigue ofreciendo posiciones de partidas ajenas.

Cassandra combina lo mejor de ambos mundos: puzzles de calidad de la base de Lichess más un banco personal generado a partir de tus propios errores, todo gratuito.

## Rompe la barrera

Si sientes que tu rating se ha estancado, es probable que estés atrapado en el ciclo de los puzzles aleatorios. El artículo sobre [estancamiento en ajedrez](/learn/chess-improvement-plateaus) explica por qué ocurre y cómo salir. La clave es pasar de entrenamiento genérico a entrenamiento dirigido.

**[Conecta tu cuenta y empieza a entrenar tus debilidades reales →](/connect)**`,
  },
  "es:how-to-analyse-chess-games": {
    title: "Cómo analizar tus partidas de ajedrez (y mejorar de verdad)",
    metaTitle: "Cómo analizar partidas de ajedrez — Convierte el análisis en mejora",
    metaDescription: "La mayoría de jugadores revisan sus partidas de forma pasiva y no aprenden nada. Descubre cómo analizar tus partidas para que las lecciones se fijen y tu rating suba.",
    content: `Hay una diferencia enorme entre revisar una partida y analizarla. Revisar es abrir el tablero, pasar los movimientos y mirar dónde Stockfish marca rojo. Analizar es entender por qué tomaste cada decisión, qué alternativas existían y qué patrón te llevó al error. La primera actividad es pasiva; la segunda es trabajo activo que transforma tu juego.

## La diferencia entre revisar y analizar

Cuando revisas, consumes información. Ves que en la jugada 23 debías haber movido el alfil en lugar del caballo, asientes y pasas a la siguiente partida. Cuando analizas, produces conocimiento. Te preguntas: ¿qué estaba pensando en ese momento? ¿Qué candidatos consideré? ¿Por qué elegí el incorrecto? Esa reflexión construye el patrón que previene errores futuros.

## El método de los cinco pasos

Un análisis productivo sigue una estructura:

1. **Juega la partida sin motor.** Repasa cada movimiento y anota dónde sentiste inseguridad o dónde calculaste variantes.
2. **Identifica los momentos críticos.** Marca las posiciones donde la evaluación cambió drásticamente — no solo tus errores, sino también los de tu rival que no supiste aprovechar.
3. **Analiza cada momento crítico a fondo.** Calcula variantes sin ayuda primero. Luego compara con el motor.
4. **Busca patrones recurrentes.** ¿Siempre fallas en finales? ¿Pierdes ventaja en posiciones abiertas? Agrupa los errores por tema.
5. **Convierte el análisis en entrenamiento.** Cada error identificado debería convertirse en una posición que practicas activamente. Si no entrenas el error, lo repetirás.

## Por qué la mayoría de herramientas se quedan cortas

Las herramientas de análisis convencionales hacen bien el paso 2 — señalan dónde perdiste centipeones — pero se detienen ahí. Te muestran qué salió mal, no te obligan a practicar la corrección. Es como si un profesor señalara los errores en un examen sin enseñarte la materia.

## Del análisis al entrenamiento con Cassandra

Cassandra cierra esa brecha. Analizamos tus partidas con Stockfish, identificamos los errores y los convertimos directamente en puzzles de entrenamiento. No tienes que hacer el trabajo manual de extraer posiciones — el sistema lo hace automáticamente.

Cada vez que cometes un error recurrente, ese puzzle reaparece con mayor frecuencia. Así se entrena la corrección hasta que el patrón correcto reemplaza al incorrecto en tu memoria muscular ajedrecística.

## ¿Con qué frecuencia analizar?

Analiza menos partidas, pero hazlo en profundidad. Una partida bien analizada vale más que diez revisadas superficialmente. Una frecuencia razonable: dos o tres partidas por semana, dedicando veinte minutos a cada una. Para entender cómo transformar errores concretos en ejercicios, consulta [entrenamiento de errores en ajedrez](/learn/chess-blunder-training).

**[Conecta tu cuenta y convierte el análisis en entrenamiento →](/connect)**`,
  },
  "es:chess-improvement-plateaus": {
    title: "Por qué estás atascado en el mismo rating de ajedrez (y cómo superarlo)",
    metaTitle: "Estancamiento en ajedrez — Por qué no subes de rating y cómo romper la barrera",
    metaDescription: "¿Te has estancado en tu rating de ajedrez? El problema no es el esfuerzo — es entrenar con posiciones aleatorias en lugar de tus debilidades reales. Así se rompe la barrera.",
    content: `Llevas meses jugando, resolviendo puzzles y viendo vídeos. Tu rating subió rápido al principio, pero hace tiempo que oscila en la misma franja. Bienvenido al estancamiento — la experiencia más frustrante del ajedrez amateur.

## Por qué ocurren los estancamientos

La curva de mejora en ajedrez sigue una ley de potencias. Los primeros cientos de puntos llegan rápido porque casi todo es nuevo: aprendes tácticas básicas, dejas de colgar piezas y empiezas a desarrollar con sentido. Pero cada punto adicional cuesta más que el anterior. Llega un momento en que el entrenamiento genérico deja de producir ganancias visibles.

## La trampa de los puzzles aleatorios

Muchos jugadores responden al estancamiento haciendo más de lo mismo — más puzzles aleatorios, más partidas rápidas. Pero si el problema es la naturaleza del entrenamiento, aumentar la cantidad no lo resuelve. Es como intentar correr más rápido entrenando siempre la misma distancia al mismo ritmo.

Los puzzles aleatorios refuerzan lo que ya sabes tanto como lo que necesitas aprender. Para una comparación detallada, lee [puzzles de Lichess vs puzzles personalizados](/learn/lichess-puzzles-vs-personal-puzzles).

## Diagnosticar tu estancamiento

Los estancamientos tienen causas identificables. Las tres más comunes:

- **Puntos ciegos tácticos.** Hay motivos tácticos específicos que no ves. No todas las horquillas, sino las horquillas de caballo en ciertas estructuras de peones. No todos los ataques descubiertos, sino los que surgen tras enroques opuestos.
- **Incomprensión posicional.** Ganas tácticas pero pierdes posiciones iguales porque no entiendes los planes. Esto requiere estudio de estructura de peones y finales, no más puzzles.
- **Gestión del tiempo.** Juegas bien los primeros veinte movimientos y luego te derrumbas en apuros de tiempo. La solución es entrenamiento específico de toma de decisiones bajo presión.

## La solución: entrenamiento dirigido con tus propias partidas

La única forma de romper un estancamiento es dejar de entrenar habilidades genéricas y empezar a trabajar en tus debilidades específicas. Eso exige primero identificarlas y luego practicarlas de forma sistemática.

Cassandra Chess analiza tus partidas reales y extrae exactamente las posiciones donde fallas. Convierte cada error en un puzzle dirigido. En lugar de resolver posiciones aleatorias, entrenas los patrones que realmente te cuestan puntos de rating.

Para aprender el método correcto de entrenamiento con errores, consulta [entrenamiento de errores en ajedrez](/learn/chess-blunder-training).

## Rompe la barrera hoy

El estancamiento no se resuelve con más esfuerzo sino con mejor dirección. Conecta tu cuenta y deja que Cassandra identifique exactamente dónde estás perdiendo puntos.

**[Conecta tu cuenta y rompe tu estancamiento →](/connect)**`,
  },
  "es:lichess-puzzles-vs-personal-puzzles": {
    title: "Puzzles de Lichess vs puzzles personalizados: ¿cuál te hace mejorar más rápido?",
    metaTitle: "Puzzles de Lichess vs puzzles personalizados — ¿Cuál es mejor?",
    metaDescription: "Los puzzles de Lichess son excelentes pero genéricos. Los puzzles personalizados de tus propias partidas apuntan a tus debilidades específicas. Qué significa la diferencia para tu mejora.",
    content: `Lichess ofrece la mayor colección gratuita de puzzles de ajedrez del mundo: más de cuatro millones de posiciones extraídas de partidas reales, accesibles sin pagar un céntimo. Es un recurso extraordinario. Pero tiene una limitación fundamental que afecta a tu ritmo de mejora.

## Lo que Lichess hace bien

La base de puzzles de Lichess es impresionante por varias razones:

- **Vocabulario táctico amplio.** Cubren prácticamente todos los motivos tácticos existentes — clavadas, horquillas, ataques dobles, mates en dos, sacrificios posicionales.
- **Rating adaptativo.** Tu puntuación de puzzle se ajusta según tus aciertos y errores, ofreciéndote posiciones de dificultad adecuada.
- **Totalmente gratuito.** Sin límites diarios, sin suscripciones. Código abierto bajo CC0.

Para cualquier jugador que esté construyendo su base táctica, Lichess es insustituible.

## La limitación de los puzzles genéricos

Aquí está el problema: los puzzles de Lichess provienen de partidas de otras personas. Las aperturas son aleatorias respecto a tu repertorio. Las estructuras de peones pueden ser completamente ajenas a tu estilo. Los motivos tácticos se presentan en contextos que quizás nunca encuentres en tus propias partidas.

Esto significa que una parte significativa de tu entrenamiento se invierte en posiciones que tienen poca transferencia a tu juego real. No es tiempo perdido — todo puzzle desarrolla el cálculo general — pero no es el uso más eficiente de tu tiempo de entrenamiento.

## Qué hacen diferente los puzzles personalizados

Los puzzles personalizados se generan a partir de tus propias partidas. Cada posición es un momento donde tú cometiste un error real. La diferencia es triple:

- **Relevancia.** Las aperturas, estructuras y tipos de posición son exactamente los que encuentras en tus partidas.
- **Peso emocional.** Reconoces la posición. Recuerdas la partida. Esa conexión emocional refuerza el aprendizaje.
- **Precisión en debilidades.** Si siempre fallas en finales de caballo, tu banco de puzzles se llenará de finales de caballo. El sistema apunta automáticamente a lo que necesitas.

## La investigación sobre la especificidad

Los estudios en ciencia del aprendizaje confirman que la práctica específica supera a la práctica general. Un estudiante de matemáticas mejora más resolviendo los problemas que le cuestan que haciendo ejercicios aleatorios del libro. En ajedrez, el principio es idéntico.

## Usar ambos juntos

La recomendación no es abandonar Lichess sino combinarlo con puzzles personalizados. Una proporción de **60/40** funciona bien: sesenta por ciento de tu tiempo en puzzles personalizados que atacan tus debilidades, cuarenta por ciento en puzzles generales de Lichess que amplían tu vocabulario.

Para aprender cómo convertir errores en ejercicios, consulta [entrenamiento de errores en ajedrez](/learn/chess-blunder-training). Y si buscas un entrenador que combine ambos enfoques, lee [el mejor entrenador gratuito de tácticas](/learn/chess-tactics-trainer-free).

**[Conecta tu cuenta y genera tus puzzles personalizados →](/connect)**`,
  },
  "es:chess-blunder-training": {
    title: "Cómo entrenar tus errores en ajedrez (de la forma correcta)",
    metaTitle: "Entrenamiento de errores en ajedrez — Practica tus fallos hasta que desaparezcan",
    metaDescription: "Revisar errores de forma pasiva no sirve. Así se entrena correctamente con tus errores en ajedrez para que dejen de repetirse en tus partidas.",
    content: `Un error en ajedrez es un movimiento que empeora drásticamente tu posición — típicamente una pérdida de un peón o más en evaluación del motor. Todos los jugadores los cometen. La diferencia entre quienes mejoran y quienes se estancan no está en la cantidad de errores sino en cómo responden a ellos.

## Tipos de errores

No todos los errores son iguales. Clasificarlos te ayuda a entender qué tipo de entrenamiento necesitas:

- **Errores tácticos.** Dejar una pieza colgada, no ver una horquilla, perder material por un cálculo incompleto. Son los más comunes por debajo de 1600.
- **Errores posicionales.** La jugada no pierde material inmediatamente pero deteriora tu estructura, entrega casillas clave o permite un plan ganador al rival. Más comunes a partir de 1400.
- **Errores por presión de tiempo.** Sabes cuál es la jugada correcta pero no la encuentras con el reloj en contra. Requieren entrenamiento de toma de decisiones rápida.

## Por qué la revisión pasiva no funciona

La mayoría de jugadores "trabajan" sus errores así: abren el análisis, ven que Stockfish recomienda otra jugada, asienten y pasan al siguiente error. Esto es revisión pasiva. Tu cerebro registra la información pero no construye la habilidad de reconocer el patrón en tiempo real.

## El método de tres pasos para entrenamiento activo

El entrenamiento efectivo de errores sigue tres fases:

1. **Extraer.** Identifica la posición exacta antes de tu error. Aísla el momento donde tomaste la decisión equivocada.
2. **Resolver en frío.** Enfrenta esa posición días después, sin recordar la partida original. Sin motor, sin pistas. Tu trabajo es encontrar la jugada correcta por tu cuenta.
3. **Repetir con espaciado.** Vuelve a la misma posición después de tres días, luego una semana, luego dos semanas. Cada repetición exitosa fortalece el patrón correcto en tu memoria.

Este método aprovecha la **repetición espaciada** — la técnica de memorización más eficiente según la ciencia cognitiva.

## Patrones de errores comunes para practicar

Ciertos motivos aparecen una y otra vez en las partidas de jugadores aficionados:

- **Piezas colgadas.** El error más básico y el más frecuente. Entrenar la visión periférica del tablero.
- **Mate de pasillo.** Olvidar crear una casilla de escape para el rey. Surge constantemente en partidas rápidas.
- **Horquillas de caballo.** No prever dónde puede saltar el caballo rival en dos jugadas.
- **Ataques descubiertos.** No ver que al mover una pieza se abre una línea de ataque de otra.

## Cassandra automatiza el proceso

Hacer este trabajo manualmente es tedioso: extraer posiciones, guardarlas, crear un calendario de repetición. Cassandra Chess lo automatiza completamente. Analizamos tus partidas, detectamos errores y generamos puzzles. Los llamamos **Las Escalas** (puzzles de dificultad gradual) y **El Eco** (repetición de errores pasados).

Para entender cómo identificar tus errores en primer lugar, consulta [aprender de errores en ajedrez](/learn/learn-from-chess-blunders).

**[Conecta tu cuenta y convierte tus errores en entrenamiento →](/connect)**`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FRENCH (new articles)
  // ═══════════════════════════════════════════════════════════════════════
  "fr:chess-tactics-trainer-free": {
    title: "Le meilleur entraîneur de tactiques d'échecs gratuit en 2026",
    metaTitle: "Meilleur entraîneur gratuit de tactiques d'échecs 2026 — Sans abonnement",
    metaDescription: "Vous cherchez un entraîneur de tactiques d'échecs gratuit ? Voici pourquoi les puzzles aléatoires plafonnent votre progression, et comment s'entraîner sur ses propres parties permet de franchir le cap.",
    content: `Si vous vous entraînez régulièrement aux tactiques, vous connaissez probablement la routine : vous ouvrez une application, résolvez trente puzzles et vous sentez satisfait. Mais votre classement ne bouge pas. La raison est simple : les puzzles aléatoires cessent de fonctionner au-delà d'un certain point.

## Le plateau des motifs

Les entraîneurs génériques piochent des positions dans une immense base de données et vous les servent selon votre niveau approximatif. Au début, chaque puzzle présente un motif tactique nouveau — clouages, fourchettes, attaques à la découverte. Le progrès est rapide. Mais avec le temps, vous voyez les mêmes thèmes se répéter. Les motifs que vous maîtrisez déjà reviennent aussi souvent que ceux que vous devez réellement travailler. C'est le **plateau des motifs** : votre vocabulaire tactique stagne parce que le matériel d'entraînement ne s'adapte pas à vous.

## Ce que doit offrir un bon entraîneur

Un entraîneur de tactiques efficace a besoin de trois choses :

- **Pertinence.** Les positions doivent ressembler à celles que vous rencontrez dans vos propres parties — vos ouvertures, vos structures, votre niveau d'adversaire.
- **Ciblage.** Il doit viser vos faiblesses spécifiques, pas des faiblesses génériques.
- **Retour utile.** Dire « incorrect » ne suffit pas. Vous devez comprendre pourquoi vous avez échoué et affronter la même position jusqu'à la maîtriser.

La plupart des plateformes ne remplissent que le premier critère, au mieux.

## S'entraîner sur ses propres parties

Cassandra Chess adopte une approche différente. Au lieu de vous servir des positions de parties étrangères, nous analysons vos vraies parties Chess.com et Lichess avec Stockfish. Chaque fois qu'une erreur significative est détectée — un coup qui perd un avantage évaluable — la position est extraite et transformée en puzzle personnalisé.

Le résultat : une banque d'exercices qui reflète vos véritables angles morts. Si vous échouez systématiquement dans les finales de tours, vous verrez des finales de tours. Si vos erreurs se concentrent dans les positions à roques opposés, c'est ce que vous travaillerez.

## Comparaison avec les autres entraîneurs gratuits

**Lichess Puzzles** offre plus de quatre millions de puzzles gratuits sous licence ouverte. C'est une ressource extraordinaire pour développer un vocabulaire tactique général, mais la sélection reste générique. Pour approfondir, lisez [puzzles Lichess vs puzzles personnalisés](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com** limite le nombre de puzzles quotidiens en version gratuite et réserve l'analyse complète aux abonnés premium.

**ChessTempo** permet de filtrer par thème tactique, ce qui offre un certain contrôle, mais les positions proviennent toujours de parties d'autrui.

Cassandra combine le meilleur des deux mondes : des puzzles de qualité issus de la base Lichess plus une banque personnelle générée à partir de vos propres erreurs, le tout gratuitement.

## Franchissez le cap

Si votre classement stagne, vous êtes probablement prisonnier du cycle des puzzles aléatoires. L'article sur [le plateau d'amélioration aux échecs](/learn/chess-improvement-plateaus) explique pourquoi cela arrive et comment en sortir.

**[Connectez votre compte et entraînez vos vraies faiblesses →](/connect)**`,
  },
  "fr:how-to-analyse-chess-games": {
    title: "Comment analyser vos parties d'échecs (et vraiment progresser)",
    metaTitle: "Comment analyser ses parties d'échecs — Transformez l'analyse en progrès",
    metaDescription: "La plupart des joueurs revoient leurs parties passivement et n'apprennent rien. Voici comment analyser vos parties pour que les leçons s'ancrent et que votre classement progresse.",
    content: `Il y a une différence considérable entre revoir une partie et l'analyser. Revoir, c'est ouvrir le tableau, défiler les coups et regarder où Stockfish passe au rouge. Analyser, c'est comprendre pourquoi vous avez pris chaque décision, quelles alternatives existaient et quel schéma de pensée vous a conduit à l'erreur. La première activité est passive ; la seconde est un travail actif qui transforme votre jeu.

## La différence entre revoir et analyser

Quand vous revoyez, vous consommez de l'information. Vous voyez qu'au 23e coup il fallait déplacer le fou plutôt que le cavalier, vous acquiescez et passez à la partie suivante. Quand vous analysez, vous produisez de la connaissance. Vous vous demandez : à quoi pensais-je à ce moment-là ? Quels coups candidats ai-je envisagés ? Pourquoi ai-je choisi le mauvais ? Cette réflexion construit le schéma qui prévient les erreurs futures.

## La méthode en cinq étapes

Une analyse productive suit une structure :

1. **Rejouez la partie sans moteur.** Repassez chaque coup et notez où vous avez ressenti de l'incertitude ou calculé des variantes.
2. **Identifiez les moments critiques.** Marquez les positions où l'évaluation a changé brusquement — pas seulement vos erreurs, mais aussi celles de votre adversaire que vous n'avez pas exploitées.
3. **Analysez chaque moment critique en profondeur.** Calculez les variantes sans aide d'abord. Puis comparez avec le moteur.
4. **Cherchez les schémas récurrents.** Échouez-vous toujours en finales ? Perdez-vous votre avantage dans les positions ouvertes ? Regroupez les erreurs par thème.
5. **Convertissez l'analyse en entraînement.** Chaque erreur identifiée devrait devenir une position que vous pratiquez activement.

## Pourquoi la plupart des outils sont insuffisants

Les outils d'analyse classiques font bien l'étape 2 — ils signalent où vous avez perdu des centipions — mais s'arrêtent là. Ils vous montrent ce qui a mal tourné sans vous forcer à pratiquer la correction. C'est comme un professeur qui marque les erreurs sur un examen sans enseigner la matière.

## De l'analyse à l'entraînement avec Cassandra

Cassandra comble cette lacune. Nous analysons vos parties avec Stockfish, identifions les erreurs et les transformons directement en puzzles d'entraînement. Pas besoin d'extraire les positions manuellement — le système le fait automatiquement.

Chaque fois qu'une erreur récurrente est détectée, le puzzle correspondant réapparaît plus fréquemment. Ainsi, le motif correct remplace progressivement le mauvais dans votre mémoire.

## À quelle fréquence analyser ?

Analysez moins de parties, mais en profondeur. Une partie bien analysée vaut mieux que dix survolées. Un rythme raisonnable : deux ou trois parties par semaine, vingt minutes chacune. Pour savoir comment transformer les erreurs en exercices, consultez [l'entraînement aux erreurs d'échecs](/learn/chess-blunder-training).

**[Connectez votre compte et transformez l'analyse en entraînement →](/connect)**`,
  },
  "fr:chess-improvement-plateaus": {
    title: "Pourquoi vous êtes bloqué au même classement d'échecs (et comment franchir le cap)",
    metaTitle: "Plateau aux échecs — Pourquoi vous stagnez et comment en sortir",
    metaDescription: "Vous avez atteint un plateau aux échecs ? Le problème n'est pas l'effort — c'est de s'entraîner sur des positions aléatoires au lieu de vos vraies faiblesses. Voici comment franchir le cap.",
    content: `Vous jouez depuis des mois, résolvez des puzzles et regardez des vidéos. Votre classement a grimpé vite au début, mais cela fait longtemps qu'il oscille dans la même fourchette. Bienvenue au plateau — l'expérience la plus frustrante du joueur d'échecs amateur.

## Pourquoi les plateaux surviennent

La courbe d'amélioration aux échecs suit une loi de puissance. Les premiers centaines de points arrivent vite parce que presque tout est nouveau : vous apprenez les tactiques de base, vous cessez de laisser des pièces en prise, vous commencez à développer avec logique. Mais chaque point supplémentaire coûte plus que le précédent. Il arrive un moment où l'entraînement générique ne produit plus de gains visibles.

## Le piège des puzzles aléatoires

Beaucoup de joueurs répondent au plateau en faisant davantage de la même chose — plus de puzzles aléatoires, plus de parties rapides. Mais si le problème est la nature de l'entraînement, en augmenter la quantité ne le résout pas. C'est comme essayer de courir plus vite en s'entraînant toujours sur la même distance au même rythme.

Les puzzles aléatoires renforcent autant ce que vous savez déjà que ce que vous devez apprendre. Pour une comparaison détaillée, lisez [puzzles Lichess vs puzzles personnalisés](/learn/lichess-puzzles-vs-personal-puzzles).

## Diagnostiquer votre plateau

Les plateaux ont des causes identifiables. Les trois plus courantes :

- **Angles morts tactiques.** Il existe des motifs tactiques précis que vous ne voyez pas. Pas toutes les fourchettes, mais les fourchettes de cavalier dans certaines structures de pions spécifiques.
- **Incompréhension positionnelle.** Vous gagnez les batailles tactiques mais perdez les positions égales parce que vous ne comprenez pas les plans. Cela nécessite l'étude des structures de pions et des finales, pas plus de puzzles.
- **Gestion du temps.** Vous jouez bien les vingt premiers coups puis vous effondrez en zeitnot. La solution est un entraînement spécifique de prise de décision sous pression.

## La solution : entraînement ciblé sur vos propres parties

La seule manière de briser un plateau est de cesser de travailler des compétences génériques et de commencer à travailler vos faiblesses spécifiques. Cela exige d'abord de les identifier, puis de les pratiquer systématiquement.

Cassandra Chess analyse vos parties réelles et extrait précisément les positions où vous échouez. Chaque erreur devient un puzzle ciblé. Au lieu de résoudre des positions aléatoires, vous entraînez les motifs qui vous coûtent réellement des points.

Pour apprendre la bonne méthode d'entraînement sur les erreurs, consultez [l'entraînement aux erreurs d'échecs](/learn/chess-blunder-training).

## Franchissez le cap aujourd'hui

Le plateau ne se résout pas avec plus d'effort mais avec une meilleure direction. Connectez votre compte et laissez Cassandra identifier exactement où vous perdez des points.

**[Connectez votre compte et brisez votre plateau →](/connect)**`,
  },
  "fr:lichess-puzzles-vs-personal-puzzles": {
    title: "Puzzles Lichess vs puzzles personnalisés : lequel vous fait progresser plus vite ?",
    metaTitle: "Puzzles Lichess vs puzzles personnalisés — Lequel est meilleur ?",
    metaDescription: "Les puzzles Lichess sont excellents mais génériques. Les puzzles personnalisés tirés de vos propres parties ciblent vos faiblesses spécifiques. Voici ce que cette différence signifie pour votre progression.",
    content: `Lichess offre la plus grande collection gratuite de puzzles d'échecs au monde : plus de quatre millions de positions extraites de parties réelles, accessibles sans débourser un centime. C'est une ressource extraordinaire. Mais elle a une limitation fondamentale qui affecte votre rythme de progression.

## Ce que Lichess fait bien

La base de puzzles de Lichess est impressionnante à plusieurs titres :

- **Vocabulaire tactique large.** Elle couvre pratiquement tous les motifs tactiques existants — clouages, fourchettes, attaques doubles, mats en deux, sacrifices positionnels.
- **Classement adaptatif.** Votre score de puzzle s'ajuste selon vos succès et échecs, vous proposant des positions de difficulté appropriée.
- **Entièrement gratuit.** Pas de limite quotidienne, pas d'abonnement. Code ouvert sous CC0.

Pour tout joueur qui construit sa base tactique, Lichess est irremplaçable.

## La limitation des puzzles génériques

Voici le problème : les puzzles Lichess proviennent de parties d'autres joueurs. Les ouvertures sont aléatoires par rapport à votre répertoire. Les structures de pions peuvent être totalement étrangères à votre style. Les motifs tactiques se présentent dans des contextes que vous ne rencontrerez peut-être jamais dans vos propres parties.

Cela signifie qu'une part significative de votre entraînement est investie dans des positions qui ont peu de transfert vers votre jeu réel. Ce n'est pas du temps perdu — tout puzzle développe le calcul — mais ce n'est pas l'utilisation la plus efficiente de votre temps d'entraînement.

## Ce que les puzzles personnalisés font différemment

Les puzzles personnalisés sont générés à partir de vos propres parties. Chaque position est un moment où vous avez commis une erreur réelle. La différence est triple :

- **Pertinence.** Les ouvertures, structures et types de position sont exactement ceux que vous rencontrez dans vos parties.
- **Poids émotionnel.** Vous reconnaissez la position. Vous vous souvenez de la partie. Cette connexion émotionnelle renforce l'apprentissage.
- **Ciblage des faiblesses.** Si vous échouez toujours dans les finales de cavalier, votre banque de puzzles se remplira de finales de cavalier.

## La recherche sur la spécificité

Les études en sciences de l'apprentissage confirment que la pratique spécifique surpasse la pratique générale. Un étudiant en mathématiques progresse plus vite en résolvant les problèmes qui lui coûtent qu'en faisant des exercices aléatoires du manuel. Aux échecs, le principe est identique.

## Utiliser les deux ensemble

La recommandation n'est pas d'abandonner Lichess mais de le combiner avec des puzzles personnalisés. Une répartition **60/40** fonctionne bien : soixante pour cent de votre temps sur des puzzles personnalisés qui attaquent vos faiblesses, quarante pour cent sur des puzzles généraux de Lichess qui élargissent votre vocabulaire.

Pour apprendre à convertir les erreurs en exercices, consultez [l'entraînement aux erreurs d'échecs](/learn/chess-blunder-training). Et si vous cherchez un entraîneur combinant les deux approches, lisez [le meilleur entraîneur gratuit de tactiques](/learn/chess-tactics-trainer-free).

**[Connectez votre compte et générez vos puzzles personnalisés →](/connect)**`,
  },
  "fr:chess-blunder-training": {
    title: "Comment s'entraîner sur ses erreurs d'échecs (la bonne méthode)",
    metaTitle: "Entraînement aux erreurs d'échecs — Répétez vos fautes jusqu'à leur disparition",
    metaDescription: "Revoir ses erreurs passivement ne sert à rien. Voici la bonne méthode pour s'entraîner sur vos erreurs d'échecs afin qu'elles cessent de se reproduire en partie.",
    content: `Une erreur aux échecs est un coup qui détériore drastiquement votre position — typiquement une perte d'un pion ou plus en évaluation moteur. Tous les joueurs en commettent. La différence entre ceux qui progressent et ceux qui stagnent ne réside pas dans le nombre d'erreurs mais dans la façon dont ils y répondent.

## Types d'erreurs

Toutes les erreurs ne se valent pas. Les classifier vous aide à comprendre quel type d'entraînement vous avez besoin :

- **Erreurs tactiques.** Laisser une pièce en prise, ne pas voir une fourchette, perdre du matériel par un calcul incomplet. Les plus courantes en dessous de 1600.
- **Erreurs positionnelles.** Le coup ne perd pas de matériel immédiatement mais détériore votre structure, cède des cases clés ou permet un plan gagnant à l'adversaire. Plus courantes à partir de 1400.
- **Erreurs sous pression temporelle.** Vous connaissez le bon coup mais ne le trouvez pas quand l'horloge vous presse. Nécessitent un entraînement spécifique à la prise de décision rapide.

## Pourquoi la révision passive ne fonctionne pas

La plupart des joueurs « travaillent » leurs erreurs ainsi : ils ouvrent l'analyse, voient que Stockfish recommande un autre coup, acquiescent et passent à l'erreur suivante. C'est de la révision passive. Votre cerveau enregistre l'information mais ne construit pas la capacité à reconnaître le motif en temps réel.

## La méthode en trois étapes pour un entraînement actif

L'entraînement efficace sur les erreurs suit trois phases :

1. **Extraire.** Identifiez la position exacte avant votre erreur. Isolez le moment où vous avez pris la mauvaise décision.
2. **Résoudre à froid.** Affrontez cette position des jours plus tard, sans vous souvenir de la partie originale. Sans moteur, sans indice. Votre travail : trouver le bon coup par vous-même.
3. **Répéter avec espacement.** Revenez à la même position après trois jours, puis une semaine, puis deux semaines. Chaque réussite renforce le bon motif dans votre mémoire.

Cette méthode exploite la **répétition espacée** — la technique de mémorisation la plus efficace selon les sciences cognitives.

## Motifs d'erreurs courants à travailler

Certains motifs reviennent sans cesse dans les parties de joueurs amateurs :

- **Pièces en prise.** L'erreur la plus basique et la plus fréquente. Entraîner la vision périphérique de l'échiquier.
- **Mat du couloir.** Oublier de créer une case de fuite pour le roi. Survient constamment en parties rapides.
- **Fourchettes de cavalier.** Ne pas prévoir où le cavalier adverse peut sauter dans deux coups.
- **Attaques à la découverte.** Ne pas voir qu'en déplaçant une pièce, on ouvre une ligne d'attaque d'une autre.

## Cassandra automatise le processus

Faire ce travail manuellement est fastidieux : extraire les positions, les sauvegarder, créer un calendrier de répétition. Cassandra Chess automatise tout. Nous analysons vos parties, détectons les erreurs et générons les puzzles. Nous les appelons **Les Gammes** (puzzles de difficulté graduelle) et **L'Écho** (répétition d'erreurs passées).

Pour comprendre comment identifier vos erreurs en premier lieu, consultez [apprendre de ses erreurs aux échecs](/learn/learn-from-chess-blunders).

**[Connectez votre compte et transformez vos erreurs en entraînement →](/connect)**`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GERMAN (new articles)
  // ═══════════════════════════════════════════════════════════════════════
  "de:chess-tactics-trainer-free": {
    title: "Der beste kostenlose Schachtaktik-Trainer 2026",
    metaTitle: "Bester kostenloser Schachtaktik-Trainer 2026 — Ohne Bezahlschranke",
    metaDescription: "Suchen Sie einen kostenlosen Schachtaktik-Trainer? Erfahren Sie, warum zufällige Rätsel Ihre Verbesserung blockieren und wie Training mit eigenen Partien den Durchbruch bringt.",
    content: `Wenn Sie regelmäßig Taktik trainieren, kennen Sie wahrscheinlich den Ablauf: Sie öffnen eine App, lösen dreißig Rätsel und fühlen sich zufrieden. Aber Ihr Rating bewegt sich nicht. Der Grund ist einfach: Zufällige Rätsel hören ab einem gewissen Punkt auf zu wirken.

## Das Muster-Plateau

Generische Trainer ziehen Stellungen aus einer riesigen Datenbank und servieren sie Ihnen nach ungefährem Niveau. Am Anfang stellt jedes Rätsel ein neues taktisches Motiv vor — Fesselungen, Gabeln, Abzugsangriffe. Der Fortschritt ist schnell. Aber mit der Zeit sehen Sie dieselben Themen immer wieder. Muster, die Sie bereits beherrschen, wiederholen sich genauso oft wie die, die Sie wirklich üben müssen. Das ist das **Muster-Plateau**: Ihr taktisches Vokabular wächst nicht mehr, weil das Trainingsmaterial sich nicht an Sie anpasst.

## Was ein guter Trainer braucht

Ein effektiver Taktiktrainer braucht drei Dinge:

- **Relevanz.** Die Stellungen müssen denen ähneln, die Sie in Ihren eigenen Partien antreffen — Ihre Eröffnungen, Ihre Strukturen, Ihr Gegnerniveau.
- **Zielgenauigkeit.** Er muss auf Ihre spezifischen Schwächen zielen, nicht auf allgemeine.
- **Nützliches Feedback.** Es reicht nicht, „falsch" zu sagen. Sie müssen verstehen, warum Sie gescheitert sind, und derselben Stellung erneut begegnen.

## Training mit den eigenen Partien

Cassandra Chess verfolgt einen anderen Ansatz. Statt Stellungen aus fremden Partien zu servieren, analysieren wir Ihre echten Chess.com- und Lichess-Partien mit Stockfish. Jedes Mal, wenn ein bedeutender Fehler erkannt wird — ein Zug, der messbaren Vorteil kostet — wird die Stellung extrahiert und in ein personalisiertes Rätsel verwandelt.

Das Ergebnis: Eine Übungsbank, die Ihre tatsächlichen blinden Flecken widerspiegelt. Wenn Sie regelmäßig in Turmendsp ielen scheitern, sehen Sie Turmendspiele. Wenn Ihre Fehler sich auf Stellungen mit gegenseitiger Rochade konzentrieren, trainieren Sie genau das.

## Vergleich mit anderen kostenlosen Trainern

**Lichess Puzzles** bietet über vier Millionen kostenlose Rätsel unter offener Lizenz. Eine außerordentliche Ressource für allgemeines taktisches Vokabular, aber die Auswahl bleibt generisch. Für einen detaillierten Vergleich lesen Sie [Lichess-Rätsel vs personalisierte Rätsel](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com** begrenzt die täglichen Rätsel in der Gratisversion und reserviert die vollständige Analyse für Premium-Abonnenten.

**ChessTempo** ermöglicht Filterung nach taktischem Thema, bietet aber weiterhin Stellungen aus fremden Partien.

Cassandra kombiniert das Beste aus beiden Welten: Qualitätsrätsel aus der Lichess-Basis plus eine persönliche Bank aus Ihren eigenen Fehlern — alles kostenlos.

## Durchbrechen Sie das Plateau

Wenn Ihr Rating stagniert, stecken Sie wahrscheinlich im Kreislauf der zufälligen Rätsel. Der Artikel über [Verbesserungsplateaus im Schach](/learn/chess-improvement-plateaus) erklärt, warum das passiert und wie Sie herauskommen.

**[Verbinden Sie Ihr Konto und trainieren Sie Ihre echten Schwächen →](/connect)**`,
  },
  "de:how-to-analyse-chess-games": {
    title: "Wie Sie Ihre Schachpartien analysieren (und wirklich besser werden)",
    metaTitle: "Schachpartien analysieren — So wird Analyse zur Verbesserung",
    metaDescription: "Die meisten Spieler schauen ihre Partien passiv durch und lernen nichts. So analysieren Sie Ihre Partien, damit die Lektionen haften und Ihr Rating steigt.",
    content: `Es gibt einen gewaltigen Unterschied zwischen dem Durchsehen einer Partie und ihrer Analyse. Durchsehen heißt, das Brett zu öffnen, die Züge durchzuklicken und zu schauen, wo Stockfish rot markiert. Analysieren heißt, zu verstehen, warum Sie jede Entscheidung getroffen haben, welche Alternativen existierten und welches Denkmuster Sie zum Fehler geführt hat. Die erste Aktivität ist passiv; die zweite ist aktive Arbeit, die Ihr Spiel verändert.

## Der Unterschied zwischen Durchsehen und Analysieren

Wenn Sie durchsehen, konsumieren Sie Information. Sie sehen, dass im 23. Zug der Läufer statt des Springers hätte ziehen sollen, nicken und gehen zur nächsten Partie. Wenn Sie analysieren, produzieren Sie Wissen. Sie fragen sich: Was habe ich in dem Moment gedacht? Welche Kandidatenzüge habe ich erwogen? Warum habe ich den falschen gewählt? Diese Reflexion baut das Muster auf, das künftige Fehler verhindert.

## Die Fünf-Schritte-Methode

Eine produktive Analyse folgt einer Struktur:

1. **Spielen Sie die Partie ohne Engine durch.** Gehen Sie jeden Zug durch und notieren Sie, wo Sie unsicher waren oder Varianten berechnet haben.
2. **Identifizieren Sie die kritischen Momente.** Markieren Sie Stellungen, in denen die Bewertung sich drastisch verändert hat — nicht nur Ihre Fehler, sondern auch die Ihres Gegners, die Sie nicht ausgenutzt haben.
3. **Analysieren Sie jeden kritischen Moment gründlich.** Berechnen Sie Varianten zuerst ohne Hilfe. Dann vergleichen Sie mit der Engine.
4. **Suchen Sie wiederkehrende Muster.** Scheitern Sie immer in Endspielen? Verlieren Sie Ihren Vorteil in offenen Stellungen? Gruppieren Sie Fehler nach Thema.
5. **Verwandeln Sie die Analyse in Training.** Jeder identifizierte Fehler sollte zu einer Position werden, die Sie aktiv üben.

## Warum die meisten Werkzeuge nicht ausreichen

Herkömmliche Analysetools machen Schritt 2 gut — sie zeigen, wo Sie Centipawns verloren haben — aber hören dort auf. Sie zeigen, was schiefging, zwingen Sie aber nicht, die Korrektur zu üben.

## Von der Analyse zum Training mit Cassandra

Cassandra schließt diese Lücke. Wir analysieren Ihre Partien mit Stockfish, identifizieren Fehler und verwandeln sie direkt in Trainingsrätsel. Sie müssen keine Stellungen manuell extrahieren — das System macht es automatisch.

Jedes Mal, wenn ein wiederkehrender Fehler erkannt wird, erscheint das entsprechende Rätsel häufiger. So ersetzt das korrekte Muster allmählich das falsche in Ihrem Gedächtnis.

## Wie oft analysieren?

Analysieren Sie weniger Partien, aber dafür gründlich. Eine gut analysierte Partie ist mehr wert als zehn oberflächlich durchgesehene. Ein vernünftiges Tempo: zwei bis drei Partien pro Woche, jeweils zwanzig Minuten. Um zu lernen, wie Sie Fehler in Übungen umwandeln, lesen Sie [Blunder-Training im Schach](/learn/chess-blunder-training).

**[Verbinden Sie Ihr Konto und verwandeln Sie Analyse in Training →](/connect)**`,
  },
  "de:chess-improvement-plateaus": {
    title: "Warum Sie beim gleichen Schach-Rating feststecken (und wie Sie durchbrechen)",
    metaTitle: "Schach-Rating-Plateau — Warum Sie feststecken und wie Sie durchbrechen",
    metaDescription: "An einem Schach-Rating-Plateau angelangt? Das Problem ist nicht der Aufwand — es ist Training mit zufälligen Stellungen statt Ihrer echten Schwächen. So durchbrechen Sie die Barriere.",
    content: `Sie spielen seit Monaten, lösen Rätsel und schauen Videos. Ihr Rating stieg anfangs schnell, aber seit Langem pendelt es in derselben Spanne. Willkommen beim Plateau — der frustrierendsten Erfahrung im Amateurschach.

## Warum Plateaus entstehen

Die Verbesserungskurve im Schach folgt einem Potenzgesetz. Die ersten hundert Punkte kommen schnell, weil fast alles neu ist: Sie lernen grundlegende Taktik, hören auf Figuren hängen zu lassen und beginnen sinnvoll zu entwickeln. Aber jeder weitere Punkt kostet mehr als der vorherige. Es kommt ein Punkt, an dem generisches Training keine sichtbaren Gewinne mehr bringt.

## Die Falle der zufälligen Rätsel

Viele Spieler reagieren auf das Plateau, indem sie mehr vom Gleichen tun — mehr zufällige Rätsel, mehr Schnellpartien. Aber wenn das Problem die Art des Trainings ist, löst eine Erhöhung der Menge es nicht. Es ist, als würde man versuchen schneller zu laufen, indem man immer die gleiche Distanz im gleichen Tempo trainiert.

Zufällige Rätsel verstärken das, was Sie bereits können, genauso wie das, was Sie lernen müssen. Für einen detaillierten Vergleich lesen Sie [Lichess-Rätsel vs personalisierte Rätsel](/learn/lichess-puzzles-vs-personal-puzzles).

## Ihr Plateau diagnostizieren

Plateaus haben identifizierbare Ursachen. Die drei häufigsten:

- **Taktische blinde Flecken.** Es gibt bestimmte taktische Motive, die Sie nicht sehen. Nicht alle Gabeln, sondern Springergabeln in bestimmten Bauernstrukturen.
- **Positionelles Unverständnis.** Sie gewinnen taktische Gefechte, aber verlieren gleiche Stellungen, weil Sie die Pläne nicht verstehen. Das erfordert das Studium von Bauernstrukturen und Endspielen, nicht mehr Rätsel.
- **Zeitmanagement.** Sie spielen die ersten zwanzig Züge gut und brechen dann in Zeitnot zusammen.

## Die Lösung: Gezieltes Training mit eigenen Partien

Der einzige Weg, ein Plateau zu durchbrechen, ist aufzuhören, generische Fähigkeiten zu trainieren, und anzufangen, an Ihren spezifischen Schwächen zu arbeiten. Das erfordert zunächst, sie zu identifizieren, und dann, sie systematisch zu üben.

Cassandra Chess analysiert Ihre echten Partien und extrahiert genau die Stellungen, in denen Sie scheitern. Jeder Fehler wird zum gezielten Rätsel. Statt zufällige Stellungen zu lösen, trainieren Sie die Muster, die Ihnen wirklich Rating-Punkte kosten.

Für die richtige Methode zum Fehlertraining lesen Sie [Blunder-Training im Schach](/learn/chess-blunder-training).

## Durchbrechen Sie die Barriere heute

Das Plateau löst sich nicht durch mehr Aufwand, sondern durch bessere Ausrichtung. Verbinden Sie Ihr Konto und lassen Sie Cassandra genau identifizieren, wo Sie Punkte verlieren.

**[Verbinden Sie Ihr Konto und durchbrechen Sie Ihr Plateau →](/connect)**`,
  },
  "de:lichess-puzzles-vs-personal-puzzles": {
    title: "Lichess-Rätsel vs personalisierte Rätsel: Was lässt Sie schneller besser werden?",
    metaTitle: "Lichess-Rätsel vs personalisierte Rätsel — Was ist besser?",
    metaDescription: "Lichess-Rätsel sind großartig, aber generisch. Personalisierte Rätsel aus Ihren eigenen Partien zielen auf Ihre spezifischen Schwächen. Was der Unterschied für Ihre Verbesserung bedeutet.",
    content: `Lichess bietet die größte kostenlose Sammlung von Schachrätseln der Welt: über vier Millionen Stellungen aus echten Partien, zugänglich ohne einen Cent zu bezahlen. Eine außerordentliche Ressource. Aber sie hat eine fundamentale Einschränkung, die Ihr Verbesserungstempo beeinflusst.

## Was Lichess gut macht

Die Lichess-Rätseldatenbank beeindruckt aus mehreren Gründen:

- **Breites taktisches Vokabular.** Sie deckt praktisch alle existierenden taktischen Motive ab — Fesselungen, Gabeln, Doppelangriffe, Matt in zwei, positionelle Opfer.
- **Adaptives Rating.** Ihre Rätselwertung passt sich nach Erfolgen und Misserfolgen an und bietet Stellungen angemessener Schwierigkeit.
- **Vollständig kostenlos.** Keine Tageslimits, keine Abonnements. Open Source unter CC0.

Für jeden Spieler, der seine taktische Basis aufbaut, ist Lichess unersetzlich.

## Die Einschränkung generischer Rätsel

Hier ist das Problem: Lichess-Rätsel stammen aus Partien anderer Spieler. Die Eröffnungen sind zufällig in Bezug auf Ihr Repertoire. Die Bauernstrukturen können Ihrem Stil völlig fremd sein. Die taktischen Motive erscheinen in Kontexten, denen Sie in Ihren eigenen Partien möglicherweise nie begegnen.

Das bedeutet, dass ein erheblicher Teil Ihres Trainings in Stellungen investiert wird, die wenig Übertragung auf Ihr reales Spiel haben. Es ist keine verschwendete Zeit — jedes Rätsel entwickelt die Berechnung — aber es ist nicht die effizienteste Nutzung Ihrer Trainingszeit.

## Was personalisierte Rätsel anders machen

Personalisierte Rätsel werden aus Ihren eigenen Partien generiert. Jede Stellung ist ein Moment, in dem Sie einen echten Fehler gemacht haben. Der Unterschied ist dreifach:

- **Relevanz.** Die Eröffnungen, Strukturen und Stellungstypen sind genau die, die Sie in Ihren Partien antreffen.
- **Emotionales Gewicht.** Sie erkennen die Stellung. Sie erinnern sich an die Partie. Diese emotionale Verbindung verstärkt das Lernen.
- **Schwächenpräzision.** Wenn Sie immer in Springerendspielen scheitern, wird Ihre Rätselbank sich mit Springerendspielen füllen.

## Die Forschung zur Spezifität

Studien in der Lernwissenschaft bestätigen, dass spezifische Übung allgemeine Übung übertrifft. Ein Mathematikstudent verbessert sich schneller, indem er die Aufgaben löst, die ihm schwerfallen, als mit zufälligen Übungen aus dem Lehrbuch. Im Schach gilt dasselbe Prinzip.

## Beide zusammen nutzen

Die Empfehlung ist nicht, Lichess aufzugeben, sondern es mit personalisierten Rätseln zu kombinieren. Ein Verhältnis von **60/40** funktioniert gut: sechzig Prozent Ihrer Zeit für personalisierte Rätsel, die Ihre Schwächen angreifen, vierzig Prozent für allgemeine Lichess-Rätsel, die Ihr Vokabular erweitern.

Um zu lernen, wie man Fehler in Übungen umwandelt, lesen Sie [Blunder-Training im Schach](/learn/chess-blunder-training). Und wenn Sie einen Trainer suchen, der beide Ansätze kombiniert, lesen Sie [der beste kostenlose Taktik-Trainer](/learn/chess-tactics-trainer-free).

**[Verbinden Sie Ihr Konto und generieren Sie Ihre personalisierten Rätsel →](/connect)**`,
  },
  "de:chess-blunder-training": {
    title: "Wie Sie Ihre Schachfehler trainieren (richtig gemacht)",
    metaTitle: "Schach-Blunder-Training — Üben Sie Ihre Fehler, bis sie verschwinden",
    metaDescription: "Fehler passiv durchzusehen bringt nichts. So trainieren Sie Ihre Schachfehler richtig, damit sie in Ihren Partien tatsächlich aufhören.",
    content: `Ein Blunder im Schach ist ein Zug, der Ihre Stellung drastisch verschlechtert — typischerweise ein Verlust von einem Bauern oder mehr in der Engine-Bewertung. Alle Spieler machen sie. Der Unterschied zwischen denen, die sich verbessern, und denen, die stagnieren, liegt nicht in der Anzahl der Fehler, sondern in der Art, wie sie darauf reagieren.

## Arten von Fehlern

Nicht alle Fehler sind gleich. Sie zu klassifizieren hilft zu verstehen, welches Training Sie brauchen:

- **Taktische Fehler.** Eine Figur hängen lassen, eine Gabel nicht sehen, Material durch unvollständige Berechnung verlieren. Am häufigsten unter 1600.
- **Positionelle Fehler.** Der Zug verliert nicht sofort Material, aber verschlechtert Ihre Struktur, gibt Schlüsselfelder auf oder ermöglicht dem Gegner einen gewinnenden Plan. Häufiger ab 1400.
- **Zeitdruckfehler.** Sie wissen, welcher Zug richtig ist, finden ihn aber unter Zeitdruck nicht. Erfordert spezifisches Training schneller Entscheidungsfindung.

## Warum passive Durchsicht nicht funktioniert

Die meisten Spieler „arbeiten" an ihren Fehlern so: Sie öffnen die Analyse, sehen, dass Stockfish einen anderen Zug empfiehlt, nicken und gehen zum nächsten Fehler. Das ist passive Durchsicht. Ihr Gehirn registriert die Information, baut aber nicht die Fähigkeit auf, das Muster in Echtzeit zu erkennen.

## Die Drei-Schritte-Methode für aktives Training

Effektives Fehlertraining folgt drei Phasen:

1. **Extrahieren.** Identifizieren Sie die exakte Stellung vor Ihrem Fehler. Isolieren Sie den Moment der falschen Entscheidung.
2. **Kalt lösen.** Begegnen Sie dieser Stellung Tage später, ohne sich an die Originalpartie zu erinnern. Ohne Engine, ohne Hinweise. Ihre Aufgabe: den richtigen Zug selbst finden.
3. **Mit Abständen wiederholen.** Kehren Sie zur selben Stellung nach drei Tagen zurück, dann einer Woche, dann zwei Wochen. Jede erfolgreiche Lösung stärkt das korrekte Muster.

Diese Methode nutzt **verteiltes Wiederholen** — die effizienteste Gedächtnistechnik laut Kognitionswissenschaft.

## Häufige Fehlermuster zum Üben

Bestimmte Motive tauchen immer wieder in Partien von Amateurspielern auf:

- **Hängende Figuren.** Der grundlegendste und häufigste Fehler. Trainiert die periphere Wahrnehmung des Bretts.
- **Grundreihenmatt.** Vergessen, ein Fluchtfeld für den König zu schaffen. Tritt ständig in Schnellpartien auf.
- **Springergabeln.** Nicht vorhersehen, wohin der gegnerische Springer in zwei Zügen springen kann.
- **Abzugsangriffe.** Nicht sehen, dass das Bewegen einer Figur eine Angriffslinie einer anderen öffnet.

## Cassandra automatisiert den Prozess

Diese Arbeit manuell zu erledigen ist mühsam: Stellungen extrahieren, speichern, einen Wiederholungsplan erstellen. Cassandra Chess automatisiert alles. Wir analysieren Ihre Partien, erkennen Fehler und generieren Rätsel. Wir nennen sie **Die Tonleitern** (Rätsel mit steigendem Schwierigkeitsgrad) und **Das Echo** (Wiederholung vergangener Fehler).

Um zu verstehen, wie Sie Ihre Fehler überhaupt identifizieren, lesen Sie [aus Schachfehlern lernen](/learn/learn-from-chess-blunders).

**[Verbinden Sie Ihr Konto und verwandeln Sie Ihre Fehler in Training →](/connect)**`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PORTUGUESE (new articles)
  // ═══════════════════════════════════════════════════════════════════════
  "pt:chess-tactics-trainer-free": {
    title: "O melhor treinador gratuito de táticas de xadrez em 2026",
    metaTitle: "Melhor treinador gratuito de táticas de xadrez 2026 — Sem paywall",
    metaDescription: "Procura um treinador de táticas de xadrez gratuito? Saiba por que puzzles aleatórios estagnam a sua melhoria e como treinar com as suas próprias partidas rompe a barreira.",
    content: `Se treina táticas regularmente, provavelmente conhece a rotina: abre uma aplicação, resolve trinta puzzles e sente-se satisfeito. Mas o seu rating não se mexe. A razão é simples: os puzzles aleatórios deixam de funcionar a partir de certo ponto.

## O plateau dos padrões

Os treinadores genéricos extraem posições de uma base de dados enorme e servem-nas segundo o seu nível aproximado. No início, cada puzzle apresenta um motivo tático novo — cravações, garfos, ataques descobertos. O progresso é rápido. Mas com o tempo, começa a ver os mesmos temas repetidamente. Os padrões que já domina repetem-se com a mesma frequência dos que realmente precisa de reforçar. É o **plateau dos padrões**: o seu vocabulário tático deixa de crescer porque o material de treino não se adapta a si.

## O que um bom treinador precisa

Um treinador de táticas eficaz precisa de três coisas:

- **Relevância.** As posições devem assemelhar-se às que encontra nas suas próprias partidas — as suas aberturas, as suas estruturas, o nível dos seus adversários.
- **Precisão.** Deve apontar para as suas fraquezas específicas, não para fraquezas genéricas.
- **Feedback útil.** Não basta dizer "incorreto". Precisa de compreender por que falhou e voltar a enfrentar a mesma posição até dominá-la.

## Treinar com as suas próprias partidas

O Cassandra Chess adota uma abordagem diferente. Em vez de servir posições de desconhecidos, analisa as suas partidas reais de Chess.com e Lichess com Stockfish. Cada vez que deteta um erro significativo — um lance que perde vantagem avaliável — extrai a posição e converte-a num puzzle personalizado.

O resultado é um banco de exercícios que reflete os seus verdadeiros pontos cegos. Se falha sempre em finais de torre, verá finais de torre. Se os seus erros se concentram em posições com roques opostos, é isso que treina.

## Comparação com outros treinadores gratuitos

**Lichess Puzzles** oferece mais de quatro milhões de puzzles gratuitos sob licença aberta. Um recurso extraordinário para construir vocabulário tático geral, mas a seleção permanece genérica. Para aprofundar, leia [puzzles Lichess vs puzzles personalizados](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com** limita os puzzles diários na versão gratuita e reserva a análise completa para subscritores premium.

**ChessTempo** permite filtrar por tema tático, mas continua a oferecer posições de partidas alheias.

O Cassandra combina o melhor dos dois mundos: puzzles de qualidade da base Lichess mais um banco pessoal gerado a partir dos seus próprios erros — tudo gratuito.

## Rompa a barreira

Se sente que o seu rating estagnou, é provável que esteja preso no ciclo dos puzzles aleatórios. O artigo sobre [plateaus de melhoria no xadrez](/learn/chess-improvement-plateaus) explica por que acontece e como sair.

**[Conecte a sua conta e treine as suas fraquezas reais →](/connect)**`,
  },
  "pt:how-to-analyse-chess-games": {
    title: "Como analisar as suas partidas de xadrez (e melhorar a sério)",
    metaTitle: "Como analisar partidas de xadrez — Transforme a análise em melhoria",
    metaDescription: "A maioria dos jogadores revê as partidas passivamente e não aprende nada. Saiba como analisar as suas partidas para que as lições se fixem e o seu rating suba.",
    content: `Há uma diferença enorme entre rever uma partida e analisá-la. Rever é abrir o tabuleiro, passar os lances e ver onde o Stockfish marca vermelho. Analisar é compreender por que tomou cada decisão, que alternativas existiam e que padrão de pensamento o levou ao erro. A primeira atividade é passiva; a segunda é trabalho ativo que transforma o seu jogo.

## A diferença entre rever e analisar

Quando revê, consome informação. Vê que no lance 23 devia ter mexido o bispo em vez do cavalo, acena e passa à partida seguinte. Quando analisa, produz conhecimento. Pergunta-se: o que estava eu a pensar naquele momento? Que candidatos considerei? Por que escolhi o errado? Esta reflexão constrói o padrão que previne erros futuros.

## O método dos cinco passos

Uma análise produtiva segue uma estrutura:

1. **Jogue a partida sem motor.** Reveja cada lance e anote onde sentiu insegurança ou calculou variantes.
2. **Identifique os momentos críticos.** Marque as posições onde a avaliação mudou drasticamente — não só os seus erros, mas também os do adversário que não soube explorar.
3. **Analise cada momento crítico a fundo.** Calcule variantes sem ajuda primeiro. Depois compare com o motor.
4. **Procure padrões recorrentes.** Falha sempre em finais? Perde vantagem em posições abertas? Agrupe os erros por tema.
5. **Converta a análise em treino.** Cada erro identificado deve tornar-se uma posição que pratica ativamente.

## Por que a maioria das ferramentas fica aquém

As ferramentas de análise convencionais fazem bem o passo 2 — assinalam onde perdeu centipeões — mas param aí. Mostram o que correu mal sem o forçar a praticar a correção.

## Da análise ao treino com Cassandra

O Cassandra preenche essa lacuna. Analisamos as suas partidas com Stockfish, identificamos os erros e transformamo-los diretamente em puzzles de treino. Não precisa de fazer o trabalho manual de extrair posições — o sistema fá-lo automaticamente.

Cada vez que é detetado um erro recorrente, o puzzle correspondente reaparece com maior frequência. Assim, o padrão correto substitui progressivamente o incorreto na sua memória.

## Com que frequência analisar?

Analise menos partidas, mas em profundidade. Uma partida bem analisada vale mais do que dez revistas superficialmente. Uma frequência razoável: duas a três partidas por semana, vinte minutos cada. Para saber como transformar erros em exercícios, consulte [treino de erros no xadrez](/learn/chess-blunder-training).

**[Conecte a sua conta e converta a análise em treino →](/connect)**`,
  },
  "pt:chess-improvement-plateaus": {
    title: "Por que está preso no mesmo rating de xadrez (e como ultrapassar a barreira)",
    metaTitle: "Plateau no xadrez — Por que estagnou e como romper a barreira",
    metaDescription: "Atingiu um plateau no rating de xadrez? O problema não é o esforço — é treinar com posições aleatórias em vez das suas fraquezas reais. Saiba como romper a barreira.",
    content: `Joga há meses, resolve puzzles e vê vídeos. O seu rating subiu rápido no início, mas há muito que oscila na mesma faixa. Bem-vindo ao plateau — a experiência mais frustrante do xadrez amador.

## Por que os plateaus acontecem

A curva de melhoria no xadrez segue uma lei de potência. Os primeiros centos de pontos chegam depressa porque quase tudo é novo: aprende táticas básicas, deixa de pendurar peças e começa a desenvolver com sentido. Mas cada ponto adicional custa mais que o anterior. Chega um momento em que o treino genérico deixa de produzir ganhos visíveis.

## A armadilha dos puzzles aleatórios

Muitos jogadores respondem ao plateau fazendo mais do mesmo — mais puzzles aleatórios, mais partidas rápidas. Mas se o problema é a natureza do treino, aumentar a quantidade não o resolve. É como tentar correr mais rápido treinando sempre a mesma distância ao mesmo ritmo.

Os puzzles aleatórios reforçam tanto o que já sabe como o que precisa de aprender. Para uma comparação detalhada, leia [puzzles Lichess vs puzzles personalizados](/learn/lichess-puzzles-vs-personal-puzzles).

## Diagnosticar o seu plateau

Os plateaus têm causas identificáveis. As três mais comuns:

- **Pontos cegos táticos.** Existem motivos táticos específicos que não vê. Não todos os garfos, mas garfos de cavalo em certas estruturas de peões.
- **Incompreensão posicional.** Ganha batalhas táticas mas perde posições iguais porque não compreende os planos. Isto requer estudo de estruturas de peões e finais, não mais puzzles.
- **Gestão do tempo.** Joga bem os primeiros vinte lances e depois desmorona em apuros de tempo.

## A solução: treino dirigido com as suas próprias partidas

A única forma de romper um plateau é deixar de treinar competências genéricas e começar a trabalhar nas suas fraquezas específicas. Isso exige primeiro identificá-las e depois praticá-las sistematicamente.

O Cassandra Chess analisa as suas partidas reais e extrai exatamente as posições onde falha. Cada erro torna-se num puzzle dirigido. Em vez de resolver posições aleatórias, treina os padrões que realmente lhe custam pontos de rating.

Para aprender o método correto de treino com erros, consulte [treino de erros no xadrez](/learn/chess-blunder-training).

## Rompa a barreira hoje

O plateau não se resolve com mais esforço mas com melhor direção. Conecte a sua conta e deixe o Cassandra identificar exatamente onde está a perder pontos.

**[Conecte a sua conta e rompa o seu plateau →](/connect)**`,
  },
  "pt:lichess-puzzles-vs-personal-puzzles": {
    title: "Puzzles Lichess vs puzzles personalizados: qual o faz melhorar mais rápido?",
    metaTitle: "Puzzles Lichess vs puzzles personalizados — Qual é melhor?",
    metaDescription: "Os puzzles Lichess são excelentes mas genéricos. Os puzzles personalizados das suas próprias partidas visam as suas fraquezas específicas. O que a diferença significa para a sua melhoria.",
    content: `O Lichess oferece a maior coleção gratuita de puzzles de xadrez do mundo: mais de quatro milhões de posições extraídas de partidas reais, acessíveis sem pagar um cêntimo. É um recurso extraordinário. Mas tem uma limitação fundamental que afeta o seu ritmo de melhoria.

## O que o Lichess faz bem

A base de puzzles do Lichess é impressionante por várias razões:

- **Vocabulário tático amplo.** Cobre praticamente todos os motivos táticos existentes — cravações, garfos, ataques duplos, mates em dois, sacrifícios posicionais.
- **Rating adaptativo.** A sua pontuação de puzzle ajusta-se segundo os seus acertos e erros, oferecendo posições de dificuldade adequada.
- **Totalmente gratuito.** Sem limites diários, sem subscrições. Código aberto sob CC0.

Para qualquer jogador que esteja a construir a sua base tática, o Lichess é insubstituível.

## A limitação dos puzzles genéricos

Eis o problema: os puzzles Lichess provêm de partidas de outros jogadores. As aberturas são aleatórias em relação ao seu repertório. As estruturas de peões podem ser totalmente estranhas ao seu estilo. Os motivos táticos apresentam-se em contextos que talvez nunca encontre nas suas próprias partidas.

Isto significa que uma parte significativa do seu treino é investida em posições com pouca transferência para o seu jogo real.

## O que os puzzles personalizados fazem de diferente

Os puzzles personalizados são gerados a partir das suas próprias partidas. Cada posição é um momento em que cometeu um erro real. A diferença é tripla:

- **Relevância.** As aberturas, estruturas e tipos de posição são exatamente os que encontra nas suas partidas.
- **Peso emocional.** Reconhece a posição. Lembra-se da partida. Essa ligação emocional reforça a aprendizagem.
- **Precisão nas fraquezas.** Se falha sempre em finais de cavalo, o seu banco de puzzles encher-se-á de finais de cavalo.

## A investigação sobre a especificidade

Os estudos em ciência da aprendizagem confirmam que a prática específica supera a prática geral. Um estudante de matemática melhora mais ao resolver os problemas que lhe custam do que ao fazer exercícios aleatórios do manual. No xadrez, o princípio é idêntico.

## Usar ambos juntos

A recomendação não é abandonar o Lichess mas combiná-lo com puzzles personalizados. Uma proporção de **60/40** funciona bem: sessenta por cento do seu tempo em puzzles personalizados que atacam as suas fraquezas, quarenta por cento em puzzles gerais do Lichess que alargam o seu vocabulário.

Para aprender a converter erros em exercícios, consulte [treino de erros no xadrez](/learn/chess-blunder-training). E se procura um treinador que combine ambas as abordagens, leia [o melhor treinador gratuito de táticas](/learn/chess-tactics-trainer-free).

**[Conecte a sua conta e gere os seus puzzles personalizados →](/connect)**`,
  },
  "pt:chess-blunder-training": {
    title: "Como treinar os seus erros no xadrez (da forma correta)",
    metaTitle: "Treino de erros no xadrez — Pratique os seus falhos até desaparecerem",
    metaDescription: "Rever erros passivamente não serve de nada. Saiba como treinar corretamente os seus erros no xadrez para que deixem de se repetir nas suas partidas.",
    content: `Um erro no xadrez é um lance que deteriora drasticamente a sua posição — tipicamente uma perda de um peão ou mais na avaliação do motor. Todos os jogadores os cometem. A diferença entre quem melhora e quem estagna não está na quantidade de erros mas na forma como responde a eles.

## Tipos de erros

Nem todos os erros são iguais. Classificá-los ajuda a compreender que tipo de treino precisa:

- **Erros táticos.** Deixar uma peça a pender, não ver um garfo, perder material por cálculo incompleto. Os mais comuns abaixo de 1600.
- **Erros posicionais.** O lance não perde material imediatamente mas deteriora a estrutura, entrega casas-chave ou permite um plano ganho ao adversário. Mais comuns a partir de 1400.
- **Erros por pressão de tempo.** Sabe qual é o lance correto mas não o encontra com o relógio a pressionar. Requerem treino específico de tomada de decisão rápida.

## Por que a revisão passiva não funciona

A maioria dos jogadores "trabalha" os seus erros assim: abre a análise, vê que o Stockfish recomenda outro lance, acena e passa ao erro seguinte. Isto é revisão passiva. O seu cérebro regista a informação mas não constrói a capacidade de reconhecer o padrão em tempo real.

## O método de três passos para treino ativo

O treino eficaz de erros segue três fases:

1. **Extrair.** Identifique a posição exata antes do seu erro. Isole o momento em que tomou a decisão errada.
2. **Resolver a frio.** Enfrente essa posição dias depois, sem recordar a partida original. Sem motor, sem pistas. O seu trabalho: encontrar o lance correto por si próprio.
3. **Repetir com espaçamento.** Volte à mesma posição após três dias, depois uma semana, depois duas semanas. Cada repetição bem-sucedida fortalece o padrão correto.

Este método aproveita a **repetição espaçada** — a técnica de memorização mais eficiente segundo a ciência cognitiva.

## Padrões de erros comuns para praticar

Certos motivos aparecem repetidamente nas partidas de jogadores amadores:

- **Peças a pender.** O erro mais básico e frequente. Treinar a visão periférica do tabuleiro.
- **Mate de corredor.** Esquecer de criar uma casa de fuga para o rei. Surge constantemente em partidas rápidas.
- **Garfos de cavalo.** Não prever onde o cavalo adversário pode saltar em dois lances.
- **Ataques descobertos.** Não ver que ao mover uma peça se abre uma linha de ataque de outra.

## O Cassandra automatiza o processo

Fazer este trabalho manualmente é entediante: extrair posições, guardá-las, criar um calendário de repetição. O Cassandra Chess automatiza tudo. Analisamos as suas partidas, detetamos erros e geramos puzzles. Chamamos-lhes **As Escalas** (puzzles de dificuldade gradual) e **O Eco** (repetição de erros passados).

Para compreender como identificar os seus erros em primeiro lugar, consulte [aprender com erros no xadrez](/learn/learn-from-chess-blunders).

**[Conecte a sua conta e converta os seus erros em treino →](/connect)**`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RUSSIAN (new articles)
  // ═══════════════════════════════════════════════════════════════════════
  "ru:chess-tactics-trainer-free": {
    title: "Лучший бесплатный тренажёр шахматной тактики в 2026 году",
    metaTitle: "Лучший бесплатный тренажёр шахматной тактики 2026 — Без подписки",
    metaDescription: "Ищете бесплатный тренажёр шахматной тактики? Узнайте, почему случайные задачи останавливают ваш рост и как тренировка на собственных партиях помогает прорваться.",
    content: `Если вы регулярно тренируете тактику, вам наверняка знаком этот ритуал: открываете приложение, решаете тридцать задач и чувствуете удовлетворение. Но рейтинг не двигается. Причина проста: случайные задачи перестают работать после определённого порога.

## Плато паттернов

Типичные тренажёры берут позиции из огромной базы данных и подбирают их по вашему приблизительному уровню. Поначалу каждая задача знакомит с новым тактическим мотивом — связки, вилки, открытые нападения. Прогресс идёт быстро. Но со временем одни и те же темы начинают повторяться. Паттерны, которые вы уже освоили, появляются так же часто, как те, над которыми действительно нужно работать. Это **плато паттернов**: тактический словарь перестаёт расти, потому что тренировочный материал не адаптируется к вам.

## Что нужно хорошему тренажёру

Эффективный тренажёр тактики требует трёх вещей:

- **Релевантность.** Позиции должны быть похожи на те, что встречаются в ваших собственных партиях — ваши дебюты, ваши структуры, уровень ваших соперников.
- **Точность.** Он должен целиться в ваши конкретные слабости, а не в обобщённые.
- **Полезная обратная связь.** Недостаточно сказать «неправильно». Нужно понять, почему вы ошиблись, и снова столкнуться с той же позицией, пока не освоите её.

## Тренировка на собственных партиях

Cassandra Chess использует другой подход. Вместо позиций из чужих партий мы анализируем ваши реальные партии с Chess.com и Lichess при помощи Stockfish. Каждый раз, когда обнаруживается значительная ошибка — ход, теряющий оценимое преимущество — позиция извлекается и превращается в персонализированную задачу.

Результат — банк упражнений, который отражает ваши настоящие слепые зоны. Если вы постоянно ошибаетесь в ладейных эндшпилях, вы увидите ладейные эндшпили. Если ваши ошибки сосредоточены в позициях с разносторонними рокировками, именно это вы и будете тренировать.

## Сравнение с другими бесплатными тренажёрами

**Lichess Puzzles** предлагает более четырёх миллионов бесплатных задач под открытой лицензией. Выдающийся ресурс для общего тактического словаря, но подборка остаётся случайной. Подробнее читайте в статье [задачи Lichess vs персональные задачи](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com** ограничивает ежедневные задачи в бесплатной версии и оставляет полный анализ для платных подписчиков.

**ChessTempo** позволяет фильтровать по тактической теме, но позиции по-прежнему из чужих партий.

Cassandra объединяет лучшее из обоих миров: качественные задачи из базы Lichess плюс персональный банк из ваших собственных ошибок — всё бесплатно.

## Прорвитесь через плато

Если ваш рейтинг застыл, вероятно, вы застряли в цикле случайных задач. Статья о [плато улучшения в шахматах](/learn/chess-improvement-plateaus) объясняет, почему это происходит и как выйти.

**[Подключите аккаунт и тренируйте свои настоящие слабости →](/connect)**`,
  },
  "ru:how-to-analyse-chess-games": {
    title: "Как анализировать свои шахматные партии (и действительно улучшаться)",
    metaTitle: "Как анализировать шахматные партии — Превратите разбор в улучшение",
    metaDescription: "Большинство игроков просматривают партии пассивно и ничего не усваивают. Вот как анализировать партии, чтобы уроки закреплялись и рейтинг рос.",
    content: `Между просмотром партии и её анализом — огромная разница. Просмотр — это открыть доску, пролистать ходы и посмотреть, где Stockfish подсвечивает красным. Анализ — это понять, почему вы приняли каждое решение, какие альтернативы существовали и какой образ мышления привёл к ошибке. Первое — пассивное потребление; второе — активная работа, которая трансформирует вашу игру.

## Разница между просмотром и анализом

Когда вы просматриваете, вы потребляете информацию. Видите, что на 23-м ходу нужно было сыграть слоном, а не конём, киваете и переходите к следующей партии. Когда анализируете, вы производите знание. Спрашиваете: о чём я думал в тот момент? Какие ходы-кандидаты рассматривал? Почему выбрал неправильный? Эта рефлексия строит паттерн, предотвращающий будущие ошибки.

## Метод пяти шагов

Продуктивный анализ следует структуре:

1. **Разыграйте партию без движка.** Пройдите каждый ход и отметьте, где чувствовали неуверенность или считали варианты.
2. **Определите критические моменты.** Отметьте позиции, где оценка резко изменилась — не только ваши ошибки, но и ошибки соперника, которые вы не использовали.
3. **Проанализируйте каждый критический момент глубоко.** Посчитайте варианты сначала без помощи. Затем сравните с движком.
4. **Ищите повторяющиеся паттерны.** Вы всегда проигрываете эндшпили? Теряете преимущество в открытых позициях? Группируйте ошибки по темам.
5. **Превратите анализ в тренировку.** Каждая выявленная ошибка должна стать позицией, которую вы активно решаете.

## Почему большинство инструментов недостаточны

Стандартные аналитические инструменты хорошо справляются с шагом 2 — показывают, где вы потеряли сантипешки — но на этом останавливаются. Они показывают, что пошло не так, но не заставляют практиковать исправление.

## От анализа к тренировке с Cassandra

Cassandra закрывает этот пробел. Мы анализируем ваши партии Stockfish, находим ошибки и превращаем их непосредственно в тренировочные задачи. Не нужно извлекать позиции вручную — система делает это автоматически.

Каждый раз, когда обнаруживается повторяющаяся ошибка, соответствующая задача появляется чаще. Так правильный паттерн постепенно вытесняет неправильный в вашей памяти.

## Как часто анализировать?

Анализируйте меньше партий, но глубже. Одна хорошо разобранная партия ценнее десяти бегло просмотренных. Разумный ритм: две-три партии в неделю, по двадцать минут на каждую. Чтобы узнать, как превратить ошибки в упражнения, читайте [тренировка шахматных ошибок](/learn/chess-blunder-training).

**[Подключите аккаунт и превратите анализ в тренировку →](/connect)**`,
  },
  "ru:chess-improvement-plateaus": {
    title: "Почему вы застряли на одном рейтинге в шахматах (и как прорваться)",
    metaTitle: "Плато шахматного рейтинга — Почему вы застряли и как прорваться",
    metaDescription: "Уперлись в плато шахматного рейтинга? Проблема не в усердии — а в тренировке на случайных позициях вместо ваших реальных слабостей. Вот как прорваться.",
    content: `Вы играете месяцами, решаете задачи и смотрите видео. Рейтинг рос быстро вначале, но давно колеблется в одном диапазоне. Добро пожаловать на плато — самый разочаровывающий опыт в любительских шахматах.

## Почему плато возникают

Кривая улучшения в шахматах следует степенному закону. Первые сотни очков набираются быстро, потому что почти всё ново: вы осваиваете базовую тактику, перестаёте зевать фигуры, начинаете осмысленно развиваться. Но каждый следующий пункт стоит дороже предыдущего. Наступает момент, когда общая тренировка перестаёт приносить заметные результаты.

## Ловушка случайных задач

Многие игроки реагируют на плато, делая больше того же самого — больше случайных задач, больше быстрых партий. Но если проблема в характере тренировки, увеличение объёма её не решает. Это как пытаться бегать быстрее, тренируясь всегда на одной дистанции в одном темпе.

Случайные задачи укрепляют то, что вы уже знаете, в той же мере, что и то, чему нужно учиться. Подробное сравнение читайте в статье [задачи Lichess vs персональные задачи](/learn/lichess-puzzles-vs-personal-puzzles).

## Диагностика плато

У плато есть конкретные причины. Три самые распространённые:

- **Тактические слепые зоны.** Есть конкретные тактические мотивы, которые вы не видите. Не все вилки, а вилки коня в определённых пешечных структурах.
- **Позиционное непонимание.** Вы выигрываете тактические стычки, но проигрываете равные позиции, потому что не понимаете планы. Это требует изучения пешечных структур и эндшпилей, а не новых задач.
- **Управление временем.** Вы играете хорошо первые двадцать ходов, а потом рушитесь в цейтноте.

## Решение: целевая тренировка на собственных партиях

Единственный способ прорвать плато — перестать тренировать общие навыки и начать работать над конкретными слабостями. Для этого сначала нужно их выявить, а затем систематически практиковать.

Cassandra Chess анализирует ваши реальные партии и извлекает именно те позиции, где вы ошибаетесь. Каждая ошибка становится целевой задачей. Вместо решения случайных позиций вы тренируете паттерны, которые реально стоят вам рейтинговых очков.

Правильный метод тренировки ошибок описан в статье [тренировка шахматных ошибок](/learn/chess-blunder-training).

## Прорвитесь через барьер сегодня

Плато решается не большим усердием, а лучшей направленностью. Подключите аккаунт и позвольте Cassandra точно определить, где вы теряете очки.

**[Подключите аккаунт и прорвите своё плато →](/connect)**`,
  },
  "ru:lichess-puzzles-vs-personal-puzzles": {
    title: "Задачи Lichess vs персональные задачи: что улучшает вас быстрее?",
    metaTitle: "Задачи Lichess vs персональные задачи — Что лучше?",
    metaDescription: "Задачи Lichess отличные, но обобщённые. Персональные задачи из ваших собственных партий целятся в ваши конкретные слабости. Вот что эта разница значит для вашего прогресса.",
    content: `Lichess предлагает крупнейшую бесплатную коллекцию шахматных задач в мире: более четырёх миллионов позиций из реальных партий, доступных без единого рубля. Это выдающийся ресурс. Но у него есть фундаментальное ограничение, которое влияет на темп вашего улучшения.

## Что Lichess делает хорошо

База задач Lichess впечатляет по нескольким причинам:

- **Широкий тактический словарь.** Охватывает практически все существующие тактические мотивы — связки, вилки, двойные удары, мат в два хода, позиционные жертвы.
- **Адаптивный рейтинг.** Ваш рейтинг задач подстраивается по успехам и неудачам, предлагая позиции подходящей сложности.
- **Полностью бесплатно.** Без дневных лимитов, без подписок. Открытый код под CC0.

Для любого шахматиста, строящего тактическую базу, Lichess незаменим.

## Ограничение обобщённых задач

Вот в чём проблема: задачи Lichess взяты из партий других людей. Дебюты случайны относительно вашего репертуара. Пешечные структуры могут быть совершенно чужды вашему стилю. Тактические мотивы появляются в контекстах, с которыми вы, возможно, никогда не столкнётесь в собственных партиях.

Это означает, что значительная часть тренировки вкладывается в позиции с малой переносимостью на вашу реальную игру. Это не потерянное время — любая задача развивает расчёт — но и не самое эффективное использование тренировочного времени.

## Чем отличаются персональные задачи

Персональные задачи генерируются из ваших собственных партий. Каждая позиция — это момент, где вы допустили реальную ошибку. Отличие тройное:

- **Релевантность.** Дебюты, структуры и типы позиций — именно те, что встречаются в ваших партиях.
- **Эмоциональный вес.** Вы узнаёте позицию. Помните партию. Эта эмоциональная связь усиливает обучение.
- **Точность в слабостях.** Если вы всегда ошибаетесь в коневых эндшпилях, ваш банк задач заполнится коневыми эндшпилями.

## Исследования о специфичности

Исследования в науке обучения подтверждают: специфическая практика превосходит общую. Студент математики улучшается быстрее, решая задачи, которые ему даются с трудом, чем делая случайные упражнения из учебника. В шахматах принцип тот же.

## Использовать оба вместе

Рекомендация не в том, чтобы бросить Lichess, а в том, чтобы сочетать его с персональными задачами. Пропорция **60/40** работает хорошо: шестьдесят процентов времени на персональные задачи, атакующие ваши слабости, сорок процентов на общие задачи Lichess, расширяющие словарь.

Как превращать ошибки в упражнения, читайте в статье [тренировка шахматных ошибок](/learn/chess-blunder-training). А если ищете тренажёр, сочетающий оба подхода, читайте [лучший бесплатный тренажёр тактики](/learn/chess-tactics-trainer-free).

**[Подключите аккаунт и сгенерируйте персональные задачи →](/connect)**`,
  },
  "ru:chess-blunder-training": {
    title: "Как тренировать свои шахматные ошибки (правильный подход)",
    metaTitle: "Тренировка шахматных ошибок — Решайте свои промахи, пока они не исчезнут",
    metaDescription: "Пассивный просмотр ошибок бесполезен. Вот правильный способ тренировки шахматных ошибок, чтобы они перестали повторяться в ваших партиях.",
    content: `Зевок в шахматах — это ход, который резко ухудшает вашу позицию, обычно потеря пешки или более в оценке движка. Все игроки их допускают. Разница между теми, кто растёт, и теми, кто стоит на месте — не в количестве ошибок, а в том, как они на них реагируют.

## Типы ошибок

Не все ошибки одинаковы. Их классификация помогает понять, какой тренинг нужен:

- **Тактические ошибки.** Зевнуть фигуру, не увидеть вилку, потерять материал из-за неполного расчёта. Самые частые ниже 1600.
- **Позиционные ошибки.** Ход не теряет материал сразу, но портит структуру, отдаёт ключевые поля или позволяет сопернику выстроить выигрышный план. Чаще встречаются начиная с 1400.
- **Ошибки под цейтнотом.** Вы знаете правильный ход, но не находите его, когда часы давят. Требуют специфической тренировки быстрого принятия решений.

## Почему пассивный просмотр не работает

Большинство игроков «работают» над ошибками так: открывают анализ, видят, что Stockfish рекомендует другой ход, кивают и переходят к следующей ошибке. Это пассивный просмотр. Мозг регистрирует информацию, но не формирует навык распознавания паттерна в реальном времени.

## Трёхшаговый метод активной тренировки

Эффективная тренировка ошибок проходит три фазы:

1. **Извлечь.** Определите точную позицию перед вашей ошибкой. Выделите момент принятия неправильного решения.
2. **Решить вхолодную.** Столкнитесь с этой позицией через несколько дней, не помня оригинальную партию. Без движка, без подсказок. Ваша задача — найти правильный ход самостоятельно.
3. **Повторить с интервалами.** Вернитесь к той же позиции через три дня, потом через неделю, потом через две недели. Каждое успешное решение закрепляет правильный паттерн.

Этот метод использует **интервальное повторение** — самую эффективную технику запоминания по данным когнитивной науки.

## Типичные паттерны ошибок для отработки

Определённые мотивы появляются снова и снова в партиях любителей:

- **Зевки фигур.** Самая базовая и частая ошибка. Тренирует периферийное зрение доски.
- **Мат по последней горизонтали.** Забыть создать форточку для короля. Постоянно возникает в быстрых партиях.
- **Вилки коня.** Не предвидеть, куда вражеский конь может прыгнуть через два хода.
- **Открытые нападения.** Не видеть, что перемещение одной фигуры открывает линию атаки другой.

## Cassandra автоматизирует процесс

Делать эту работу вручную утомительно: извлекать позиции, сохранять, создавать график повторений. Cassandra Chess автоматизирует всё. Мы анализируем ваши партии, находим ошибки и генерируем задачи. Мы называем их **Гаммы** (задачи с нарастающей сложностью) и **Эхо** (повторение прошлых ошибок).

Чтобы понять, как выявлять свои ошибки в первую очередь, читайте [как учиться на шахматных ошибках](/learn/learn-from-chess-blunders).

**[Подключите аккаунт и превратите свои ошибки в тренировку →](/connect)**`,
  },
};
