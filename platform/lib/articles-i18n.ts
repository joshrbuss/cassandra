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
};
