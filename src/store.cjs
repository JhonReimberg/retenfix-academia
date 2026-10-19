const { DatabaseSync } = require('node:sqlite');
const { normalize, createExam, publicExam, grade, validateName, randomUUID } = require('./core.cjs');
class Store {
  constructor(path, bank) {
    this.bank = bank;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS exams(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL,track TEXT NOT NULL,started TEXT NOT NULL,finished TEXT,questions TEXT NOT NULL,answers TEXT NOT NULL DEFAULT '{}',score INTEGER,result TEXT);
      CREATE INDEX IF NOT EXISTS idx_exams_name_track ON exams(name_key,track,finished);
      CREATE INDEX IF NOT EXISTS idx_exams_finished ON exams(finished);
      PRAGMA user_version=1;`);
  }
  session(id) {
    const row = this.db.prepare('SELECT * FROM exams WHERE id=?').get(id);
    if (!row) throw new Error('Avaliação não encontrada.');
    return {...row,questions:JSON.parse(row.questions),answers:JSON.parse(row.answers),result:row.result ? JSON.parse(row.result) : null};
  }
  start(nameValue, track) {
    const name=validateName(nameValue);
    if (!['vendas','estoque'].includes(track)) throw new Error('Trilha inválida.');
    const existing=this.db.prepare('SELECT id FROM exams WHERE name_key=? AND track=? AND finished IS NULL ORDER BY started DESC LIMIT 1').get(normalize(name),track);
    if (existing) return publicExam(this.session(existing.id));
    const id=randomUUID(), questions=createExam(this.bank,track);
    this.db.prepare('INSERT INTO exams(id,name,name_key,track,started,questions) VALUES(?,?,?,?,?,?)').run(id,name,normalize(name),track,new Date().toISOString(),JSON.stringify(questions));
    return publicExam(this.session(id));
  }
  answer(id,qid,choice) {
    const session=this.session(id);
    if (session.finished) throw new Error('Esta avaliação já foi concluída.');
    const q=session.questions.find(q=>q.id===qid);
    if (!q || !q.options.some(o=>o.id===choice)) throw new Error('Resposta inválida.');
    session.answers[qid]=choice;
    this.db.prepare('UPDATE exams SET answers=? WHERE id=? AND finished IS NULL').run(JSON.stringify(session.answers),id);
    return true;
  }
  finish(id) {
    const session=this.session(id);
    if(session.finished) return session;
    const result=grade(session.questions,session.answers), finished=new Date().toISOString();
    this.db.prepare('UPDATE exams SET finished=?,score=?,result=? WHERE id=? AND finished IS NULL').run(finished,result.score,JSON.stringify(result),id);
    return this.session(id);
  }
  history() { return this.db.prepare('SELECT id,name,track,started,finished,score FROM exams ORDER BY started DESC').all(); }
  report(id) { const s=this.session(id); return s.finished?s:publicExam(s); }
  close() {this.db.close();}
}
module.exports={Store};
