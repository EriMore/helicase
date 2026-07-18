const records = new Map();

const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

function scoreRecord(record, terms) {
  const fields = {
    identifier: normalize(`${record.id} ${record.entry}`),
    name: normalize(record.name),
    function: normalize(`${record.name} ${record.family}`),
    organism: normalize(record.organism),
    family: normalize(record.family),
    class: normalize(record.region),
  };
  const weights = { identifier: 8, name: 6, family: 5, function: 4, organism: 3, class: 2 };
  const matchedBy = [];
  let score = 0;
  for (const [field, value] of Object.entries(fields)) {
    const matches = terms.filter((term) => value.includes(term)).length;
    if (!matches) continue;
    matchedBy.push(field);
    score += matches * weights[field];
    if (terms.every((term) => value.includes(term))) score += weights[field] * 1.5;
  }
  return { score, matchedBy };
}

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === "ADD_RECORDS") {
    for (const record of message.records) records.set(record.id, record);
    self.postMessage({ type: "INDEX_SIZE", count: records.size });
    return;
  }
  if (message.type === "QUERY") {
    const terms = normalize(message.query).split(" ").filter(Boolean);
    if (!terms.length) {
      self.postMessage({ type: "RESULTS", requestId: message.requestId, results: [] });
      return;
    }
    const results = [];
    for (const record of records.values()) {
      const match = scoreRecord(record, terms);
      if (match.score > 0) results.push({ id: record.id, score: match.score, matchedBy: match.matchedBy });
    }
    results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    self.postMessage({ type: "RESULTS", requestId: message.requestId, results: results.slice(0, 240) });
  }
};
