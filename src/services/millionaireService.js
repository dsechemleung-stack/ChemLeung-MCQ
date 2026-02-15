export const MILLIONAIRE_LEVELS = 15;

export function isValidMillionaireQuestion(q) {
  return !!(
    q &&
    q.ID &&
    q.Question &&
    q.OptionA &&
    q.OptionB &&
    q.OptionC &&
    q.OptionD &&
    q.CorrectOption
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fetchMillionaireQuestionsFiltered(allQuestions = [], availableTopics = [], count = MILLIONAIRE_LEVELS) {
  const pool = (Array.isArray(allQuestions) ? allQuestions : [])
    .filter(isValidMillionaireQuestion)
    .filter(q => {
      if (!Array.isArray(availableTopics) || availableTopics.length === 0) return true;
      return availableTopics.includes(q.Topic);
    });

  const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

  if (selected.length < count) {
    const err = new Error(`Not enough valid questions for Millionaire. Need ${count}, got ${selected.length}.`);
    err.code = 'MILLIONAIRE_INSUFFICIENT_QUESTIONS';
    throw err;
  }

  return selected;
}