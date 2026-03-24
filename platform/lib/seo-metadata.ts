/**
 * Locale-specific SEO metadata for pages that use cookie-based locale switching.
 * Since these pages share the same URL across locales, Google sees the English
 * version (no cookie). Users see their locale's version via generateMetadata().
 */

export type LocaleKey = "en" | "es" | "fr" | "de" | "pt" | "ru";

interface PageMeta {
  title: string;
  description: string;
}

// ─── Homepage ────────────────────────────────────────────────────────────────

export const homeMeta: Record<LocaleKey, PageMeta> = {
  en: {
    title: "Cassandra — Free Chess Puzzles From Your Own Games | Tactics Trainer",
    description:
      "Cassandra analyses your Chess.com and Lichess games and turns your mistakes into personalised puzzles. Free game review, accuracy tracking, and tactics training — no paywall.",
  },
  es: {
    title: "Cassandra — Puzzles de ajedrez gratis de tus propias partidas | Entrenador táctico",
    description:
      "Cassandra analiza tus partidas de Chess.com y Lichess y convierte tus errores en puzzles personalizados. Revisión de partidas, seguimiento de precisión y entrenamiento táctico — gratis y sin muro de pago.",
  },
  fr: {
    title: "Cassandra — Puzzles d'échecs gratuits tirés de vos parties | Entraîneur tactique",
    description:
      "Cassandra analyse vos parties Chess.com et Lichess et transforme vos erreurs en puzzles personnalisés. Analyse de parties, suivi de précision et entraînement tactique — gratuit, sans abonnement.",
  },
  de: {
    title: "Cassandra — Kostenlose Schachaufgaben aus deinen eigenen Partien | Taktiktrainer",
    description:
      "Cassandra analysiert deine Chess.com- und Lichess-Partien und verwandelt deine Fehler in personalisierte Schachaufgaben für Anfänger und Fortgeschrittene. Partieanalyse, Genauigkeitstracking und Taktiktraining — kostenlos und ohne Bezahlschranke.",
  },
  pt: {
    title: "Cassandra — Puzzles de xadrez grátis das suas próprias partidas | Treinador tático",
    description:
      "Cassandra analisa as suas partidas de Chess.com e Lichess e transforma os seus erros em puzzles personalizados. Análise de partidas de xadrez rápido e clássico, acompanhamento de precisão e treino tático — grátis e sem paywall.",
  },
  ru: {
    title: "Кассандра — Бесплатные шахматные задачи из ваших партий | Тактический тренажёр",
    description:
      "Кассандра анализирует ваши партии с Chess.com и Lichess и превращает ошибки в персональные задачи. Разбор партий, отслеживание точности и тактические тренировки — бесплатно, без подписки.",
  },
};

// ─── About ───────────────────────────────────────────────────────────────────

export const aboutMeta: Record<LocaleKey, PageMeta> = {
  en: {
    title: "About Cassandra — Why We Built a Better Chess Trainer",
    description:
      "Cassandra was built because 16,000 generic puzzles didn't move the needle. Learn why personalised puzzles from your own games change everything.",
  },
  es: {
    title: "Sobre Cassandra — Por qué creamos un entrenador de ajedrez diferente",
    description:
      "Cassandra nació porque 16.000 puzzles genéricos no bastaban. Descubre por qué los puzzles personalizados de tus propias partidas lo cambian todo.",
  },
  fr: {
    title: "À propos de Cassandra — Pourquoi nous avons créé un meilleur entraîneur d'échecs",
    description:
      "Cassandra est née du constat que 16 000 puzzles génériques ne suffisent pas. Découvrez pourquoi les puzzles tirés de vos parties changent tout.",
  },
  de: {
    title: "Über Cassandra — Warum wir einen besseren Schachtrainer gebaut haben",
    description:
      "Cassandra entstand, weil 16.000 generische Schachaufgaben nicht reichten. Erfahre, warum personalisierte Aufgaben aus deinen eigenen Partien alles verändern.",
  },
  pt: {
    title: "Sobre a Cassandra — Por que construímos um treinador de xadrez melhor",
    description:
      "A Cassandra nasceu porque 16.000 puzzles genéricos não faziam diferença. Descubra por que puzzles personalizados das suas próprias partidas mudam tudo.",
  },
  ru: {
    title: "О Кассандре — Почему мы создали лучший шахматный тренажёр",
    description:
      "Кассандра появилась потому, что 16 000 типовых задач не помогали расти. Узнайте, почему персональные задачи из ваших партий меняют всё.",
  },
};

// ─── Feedback ────────────────────────────────────────────────────────────────

export const feedbackMeta: Record<LocaleKey, PageMeta> = {
  en: {
    title: "Feedback — Cassandra Chess",
    description:
      "Found a bug or have an idea? Every message goes directly to Josh. Help shape what gets built next.",
  },
  es: {
    title: "Comentarios — Cassandra Chess",
    description:
      "¿Encontraste un error o tienes una idea? Cada mensaje llega directamente a Josh. Ayuda a decidir qué se construye a continuación.",
  },
  fr: {
    title: "Retour d'expérience — Cassandra Chess",
    description:
      "Un bug ou une idée ? Chaque message arrive directement à Josh. Aidez à décider de la prochaine fonctionnalité.",
  },
  de: {
    title: "Feedback — Cassandra Chess",
    description:
      "Einen Fehler gefunden oder eine Idee? Jede Nachricht geht direkt an Josh. Hilf mit zu entscheiden, was als Nächstes gebaut wird.",
  },
  pt: {
    title: "Feedback — Cassandra Chess",
    description:
      "Encontrou um bug ou tem uma ideia? Cada mensagem vai diretamente para o Josh. Ajude a decidir o que será construído a seguir.",
  },
  ru: {
    title: "Обратная связь — Кассандра Chess",
    description:
      "Нашли ошибку или есть идея? Каждое сообщение попадает напрямую к Джошу. Помогите решить, что будет создано дальше.",
  },
};
