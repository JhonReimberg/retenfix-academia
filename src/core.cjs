const { randomUUID, randomInt } = require('node:crypto');
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function createExam(bank, track) {
  if (!['vendas','estoque'].includes(track)) throw new Error('Escolha vendas ou estoque.');
  const categories = ['Aplicação', 'Materiais', 'Identificação', track === 'estoque' ? 'Estoque' : 'Atendimento'];
  const questions = categories.flatMap(category => shuffle(bank.filter(q => q.category === category)).slice(0, 5));
  if (questions.length !== 20) throw new Error('Banco de questões incompleto.');
  return shuffle(questions).map(q => ({ ...q, options: shuffle(q.options.map((text, i) => ({ id: String(i), text }))) }));
}
function publicExam(session) {
  return { ...session, questions: session.questions.map(({correct, explanation, source, ...q}) => q) };
}
function grade(questions, answers) {
  if (!questions.length || questions.some(q => !q.options.some(o => o.id === answers[q.id]))) throw new Error('Responda todas as questões antes de concluir.');
  const review = questions.map(q => ({ ...q, selected: answers[q.id], isCorrect: answers[q.id] === String(q.correct) }));
  const correct = review.filter(q => q.isCorrect).length;
  const score = Math.round(correct / questions.length * 100);
  const categories = [...new Set(review.map(q => q.category))].map(name => {
    const list = review.filter(q => q.category === name);
    return { name, correct: list.filter(q => q.isCorrect).length, total: list.length };
  });
  return { score, correct, total: questions.length, passed: score >= 80, review, categories };
}
function candidate(input) {
  const map = {estatica:'oring',haste:'haste',pistao:'pistao',rotativa:'retentor',sujeira:'raspador',lateral:'guia',extrusao:'apoio',pesada:'chevron',direcao:'kit'};
  if (!map[input.function]) throw new Error('Informe a função da peça.');
  const missing = ['fluid','pressure','temperature','dimensions'].filter(k => input[k] == null || String(input[k]).trim() === '');
  if (!missing.includes('pressure') && (!Number.isFinite(Number(input.pressure)) || Number(input.pressure) < 0)) throw new Error('Pressão deve ser um número positivo ou zero.');
  if (!missing.includes('temperature') && !Number.isFinite(Number(input.temperature))) throw new Error('Informe uma temperatura válida.');
  const caution = [];
  if (normalize(input.fluid).match(/agua|vapor|glicol|freio|acido|amonia|cetona/)) caution.push('Confirme a compatibilidade química do composto na condição informada. Não presuma que NBR ou FKM atendem a esse fluido.');
  if (Number(input.temperature) > 100) caution.push('Temperatura elevada: valide o limite do perfil e do composto específico; não extrapole o limite de outro produto.');
  if (Number(input.pressure) > 250) caution.push('Verifique picos de pressão, folga de extrusão e necessidade de anéis de apoio no projeto.');
  return { family: map[input.function], missing, caution, status: 'Pré-seleção por função', specification: false };
}
function validateName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  if (name.length < 3 || name.length > 80 || !/[a-zÀ-ÿ]/i.test(name) || /[\x00-\x1f<>]/.test(name)) throw new Error('Informe um nome válido, de 3 a 80 caracteres.');
  return name;
}
const csvCell = value => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
module.exports = { normalize, shuffle, createExam, publicExam, grade, candidate, validateName, csvCell, randomUUID };
