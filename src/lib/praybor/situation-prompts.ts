export type SituationPrompt = {
  id: string;
  category: string;
  label: string;
  phrase: string;
  title: string;
};

export const situationPrompts: SituationPrompt[] = [
  {
    id: 'relationship_conflict',
    category: 'People and family',
    label: 'For a hard conversation',
    phrase: 'a hard conversation to become gentle and honest',
    title: 'Prayer for a hard conversation',
  },
  {
    id: 'relationship_repair',
    category: 'People and family',
    label: 'For reconciliation',
    phrase: 'reconciliation and softened hearts',
    title: 'Prayer for reconciliation',
  },
  {
    id: 'relationship_closeness',
    category: 'People and family',
    label: 'For restored trust',
    phrase: 'restored trust in a relationship',
    title: 'Prayer for restored trust',
  },
  {
    id: 'family_tension',
    category: 'People and family',
    label: 'For peace at home',
    phrase: 'peace at home where there is tension',
    title: 'Prayer for family peace',
  },
  {
    id: 'forgiveness',
    category: 'People and family',
    label: 'For forgiving someone',
    phrase: 'the grace to forgive without bitterness',
    title: 'Prayer for forgiveness',
  },
  {
    id: 'loneliness',
    category: 'People and family',
    label: 'For a lonely season',
    phrase: 'comfort in a lonely season',
    title: 'Prayer for loneliness',
  },
  {
    id: 'friendship_drift',
    category: 'People and family',
    label: 'For a drifting friend',
    phrase: 'a drifting friendship to be cared for wisely',
    title: 'Prayer for friendship',
  },
  {
    id: 'dating_wisdom',
    category: 'People and family',
    label: 'For dating with wisdom',
    phrase: 'wisdom and purity in dating',
    title: 'Prayer for dating wisdom',
  },
  {
    id: 'church_community',
    category: 'People and family',
    label: 'For church belonging',
    phrase: 'belonging and friendship in church community',
    title: 'Prayer for community',
  },
  {
    id: 'marriage_tension',
    category: 'People and family',
    label: 'For marriage peace',
    phrase: 'peace and tenderness in marriage',
    title: 'Prayer for marriage peace',
  },
  {
    id: 'parent_child',
    category: 'People and family',
    label: 'For parent-child peace',
    phrase: 'patience and understanding between parent and child',
    title: 'Prayer for family understanding',
  },
  {
    id: 'anxiety',
    category: 'Heart and mind',
    label: 'For peace from anxiety',
    phrase: 'peace where anxiety feels loud',
    title: 'Prayer for peace',
  },
  {
    id: 'exhaustion',
    category: 'Heart and mind',
    label: 'For deep rest',
    phrase: 'deep rest from emotional exhaustion',
    title: 'Prayer for rest',
  },
  {
    id: 'grief',
    category: 'Heart and mind',
    label: 'For grief to be held',
    phrase: 'comfort while grief feels heavy',
    title: 'Prayer for grief',
  },
  {
    id: 'discouragement',
    category: 'Heart and mind',
    label: 'For hope again',
    phrase: 'hope to rise again in discouragement',
    title: 'Prayer for hope',
  },
  {
    id: 'anger',
    category: 'Heart and mind',
    label: 'For patience with anger',
    phrase: 'patience and self-control where anger is near',
    title: 'Prayer for patience',
  },
  {
    id: 'shame',
    category: 'Heart and mind',
    label: 'For freedom from shame',
    phrase: 'freedom from shame and harsh self-judgment',
    title: 'Prayer for freedom',
  },
  {
    id: 'overthinking',
    category: 'Heart and mind',
    label: 'For a quiet mind',
    phrase: 'a quiet mind while overthinking',
    title: 'Prayer for a quiet mind',
  },
  {
    id: 'fear_future',
    category: 'Heart and mind',
    label: 'For fear of the future',
    phrase: 'trust when the future feels uncertain',
    title: 'Prayer for trust',
  },
  {
    id: 'self_worth',
    category: 'Heart and mind',
    label: 'For remembering worth',
    phrase: 'a clear reminder of God-given worth',
    title: 'Prayer for worth',
  },
  {
    id: 'health_recovery',
    category: 'Health and care',
    label: 'For healing and recovery',
    phrase: 'healing and steady recovery',
    title: 'Prayer for healing',
  },
  {
    id: 'treatment',
    category: 'Health and care',
    label: 'For treatment strength',
    phrase: 'strength and courage during treatment',
    title: 'Prayer during treatment',
  },
  {
    id: 'sleep',
    category: 'Health and care',
    label: 'For restful sleep',
    phrase: 'restful sleep',
    title: 'Prayer for sleep',
  },
  {
    id: 'chronic_pain',
    category: 'Health and care',
    label: 'For chronic pain',
    phrase: 'endurance through chronic pain',
    title: 'Prayer through pain',
  },
  {
    id: 'caregiver_strength',
    category: 'Health and care',
    label: 'For caregiving strength',
    phrase: 'strength for caregiving',
    title: 'Prayer for caregiving',
  },
  {
    id: 'mental_health',
    category: 'Health and care',
    label: 'For mental health support',
    phrase: 'steady support for mental health',
    title: 'Prayer for mental health',
  },
  {
    id: 'doctor_wisdom',
    category: 'Health and care',
    label: 'For doctors wisdom',
    phrase: 'wisdom for doctors and caregivers',
    title: 'Prayer for doctors',
  },
  {
    id: 'surgery',
    category: 'Health and care',
    label: 'For surgery peace',
    phrase: 'peace and protection around surgery',
    title: 'Prayer for surgery',
  },
  {
    id: 'medical_answers',
    category: 'Health and care',
    label: 'For clear answers',
    phrase: 'clear answers in medical uncertainty',
    title: 'Prayer for medical answers',
  },
  {
    id: 'decision',
    category: 'Work and future',
    label: 'For a wise decision',
    phrase: 'wisdom for a decision',
    title: 'Prayer for wisdom',
  },
  {
    id: 'interview',
    category: 'Work and future',
    label: 'For interview peace',
    phrase: 'peace and clarity for an interview',
    title: 'Prayer for an interview',
  },
  {
    id: 'exam',
    category: 'Work and future',
    label: 'For exam focus',
    phrase: 'focus while preparing for an exam',
    title: 'Prayer for focus',
  },
  {
    id: 'financial_pressure',
    category: 'Work and future',
    label: 'For provision',
    phrase: 'provision under financial pressure',
    title: 'Prayer for provision',
  },
  {
    id: 'burnout',
    category: 'Work and future',
    label: 'For burnout recovery',
    phrase: 'rest from burnout',
    title: 'Prayer for burnout',
  },
  {
    id: 'new_job',
    category: 'Work and future',
    label: 'For a new job',
    phrase: 'courage in a new job',
    title: 'Prayer for a new job',
  },
  {
    id: 'team_conflict',
    category: 'Work and future',
    label: 'For work conflict',
    phrase: 'peace in team conflict',
    title: 'Prayer for work peace',
  },
  {
    id: 'time_pressure',
    category: 'Work and future',
    label: 'For time pressure',
    phrase: 'clarity under time pressure',
    title: 'Prayer under pressure',
  },
  {
    id: 'job_search',
    category: 'Work and future',
    label: 'For a job search',
    phrase: 'open doors and patience in a job search',
    title: 'Prayer for a job search',
  },
  {
    id: 'future_direction',
    category: 'Work and future',
    label: 'For future direction',
    phrase: 'direction for the next season',
    title: 'Prayer for direction',
  },
  {
    id: 'faith_strength',
    category: 'Faith and church',
    label: 'For renewed faith',
    phrase: 'renewed faith',
    title: 'Prayer for renewed faith',
  },
  {
    id: 'guidance',
    category: 'Faith and church',
    label: "For God's guidance",
    phrase: "God's guidance and patience",
    title: 'Prayer for guidance',
  },
  {
    id: 'gratitude',
    category: 'Faith and church',
    label: 'For a thankful heart',
    phrase: 'a grateful heart',
    title: 'Prayer of gratitude',
  },
  {
    id: 'protection',
    category: 'Faith and church',
    label: 'For protection',
    phrase: 'protection and steady courage',
    title: 'Prayer for protection',
  },
  {
    id: 'doubt',
    category: 'Faith and church',
    label: 'For honest doubt',
    phrase: 'honest faith in doubt',
    title: 'Prayer through doubt',
  },
  {
    id: 'obedience',
    category: 'Faith and church',
    label: 'For courage to obey',
    phrase: 'courage to obey',
    title: 'Prayer for obedience',
  },
  {
    id: 'spiritual_dryness',
    category: 'Faith and church',
    label: 'For a dry season',
    phrase: 'renewal in a spiritually dry season',
    title: 'Prayer for renewal',
  },
  {
    id: 'answered_prayer',
    category: 'Faith and church',
    label: 'For an answered prayer',
    phrase: 'gratitude for an answered prayer',
    title: 'Prayer of thanks',
  },
  {
    id: 'scripture_desire',
    category: 'Faith and church',
    label: 'For love of Scripture',
    phrase: 'a renewed love for Scripture',
    title: 'Prayer for Scripture',
  },
  {
    id: 'serving_church',
    category: 'Faith and church',
    label: 'For serving faithfully',
    phrase: 'humility and joy while serving the church',
    title: 'Prayer for serving',
  },
];

export const situationCategories = Array.from(
  new Set(situationPrompts.map((prompt) => prompt.category)),
);

export function getSituationPrompt(id: string) {
  return situationPrompts.find((prompt) => prompt.id === id);
}

export function buildSituationBody(prompts: SituationPrompt[]) {
  return `Please pray for ${formatPromptList(prompts.map((prompt) => prompt.phrase))}. Thank you.`;
}

export function buildSituationPrayer(promptIds: string[]) {
  const prompts = promptIds
    .map((id) => getSituationPrompt(id))
    .filter((prompt): prompt is SituationPrompt => Boolean(prompt));
  const firstPrompt = prompts[0] ?? situationPrompts[0];

  return {
    title: firstPrompt.title,
    body: buildSituationBody(prompts.length ? prompts : [firstPrompt]),
  };
}

function formatPromptList(items: string[]) {
  const uniqueItems = Array.from(new Set(items));

  if (uniqueItems.length === 0) {
    return 'what is hard to put into words';
  }

  if (uniqueItems.length === 1) {
    return uniqueItems[0];
  }

  if (uniqueItems.length === 2) {
    return `${uniqueItems[0]} and ${uniqueItems[1]}`;
  }

  return `${uniqueItems.slice(0, -1).join(', ')}, and ${uniqueItems[uniqueItems.length - 1]}`;
}
