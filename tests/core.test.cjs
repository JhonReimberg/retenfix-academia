const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createExam,publicExam,grade,candidate,validateName,csvCell}=require('../src/core.cjs');
const {Store}=require('../src/store.cjs');
const {questions,families,lessons}=require('../src/content.cjs');
const sources=require('../src/data/sources.json');
test('60 questões únicas, com fontes existentes e alternativas distintas',()=>{
 assert.equal(questions.length,60);assert.equal(new Set(questions.map(q=>q.id)).size,60);
 for(const q of questions){assert.equal(new Set(q.options).size,4);assert.ok(q.correct>=0&&q.correct<4);const source=sources.find(s=>s.id===q.source.id);assert.ok(source,q.id);assert.ok(q.source.page<=source.pages,q.id);assert.ok(q.explanation.length>40);}
 assert.equal(lessons.length,12);assert.equal(families.length,9);
});
test('cada avaliação tem 20 questões e 5 por competência sem duplicatas',()=>{
 for(const track of ['vendas','estoque'])for(let i=0;i<20;i++){const qs=createExam(questions,track);assert.equal(qs.length,20);assert.equal(new Set(qs.map(q=>q.id)).size,20);const cats=qs.reduce((a,q)=>(a[q.category]=(a[q.category]||0)+1,a),{});assert.deepEqual(Object.values(cats),[5,5,5,5]);assert.ok(qs.every(q=>q.options.length===4));assert.ok(cats[track==='vendas'?'Atendimento':'Estoque']);}
});
test('gabarito não é exposto antes da conclusão',()=>{const exam=publicExam({questions:createExam(questions,'vendas'),answers:{}});assert.ok(exam.questions.every(q=>!('correct' in q)&&!('explanation' in q)&&!('source' in q)));});
test('correção resulta em 0, 80 e 100 pontos e recusa questões sem resposta',()=>{
 const qs=createExam(questions,'estoque');const ans=Object.fromEntries(qs.map(q=>[q.id,String(q.correct)]));assert.equal(grade(qs,ans).score,100);
 for(let i=0;i<4;i++)ans[qs[i].id]='1';assert.equal(grade(qs,ans).score,80);assert.equal(grade(qs,ans).passed,true);
 for(const q of qs)ans[q.id]='1';assert.equal(grade(qs,ans).score,0);assert.throws(()=>grade(qs,{}),/Responda/);
});
test('nome é obrigatório e caracteres perigosos são recusados',()=>{assert.throws(()=>validateName('  '));assert.throws(()=>validateName('<teste>'));assert.equal(validateName('  José   Silva  '),'José Silva');assert.ok(csvCell('=1+1').startsWith('"\''));});
test('pré-seleção cobre as nove funções e nunca aprova especificação incompleta',()=>{
 for(const functionName of ['estatica','haste','pistao','rotativa','sujeira','lateral','extrusao','pesada','direcao']){const r=candidate({function:functionName});assert.equal(r.specification,false);assert.equal(r.missing.length,4);assert.ok(families.find(f=>f.id===r.family));}
 assert.throws(()=>candidate({function:'haste',pressure:-1}));assert.throws(()=>candidate({function:'inexistente'}));
 const r=candidate({function:'haste',fluid:'Água',pressure:'300',temperature:'130',dimensions:'50 x 65 x 10'});assert.equal(r.caution.length,3);assert.equal(r.specification,false);
});
test('sessão e resultado sobrevivem ao fechamento; finalizar duas vezes é idempotente',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retenfix-test-'));const file=path.join(dir,'test.sqlite');let s;
 try{s=new Store(file,questions);const exam=s.start('José de Teste','vendas');assert.throws(()=>s.finish(exam.id),/Responda/);assert.throws(()=>s.answer(exam.id,'bad','0'));
 const real=s.session(exam.id);s.answer(exam.id,real.questions[0].id,'0');s.close();s=new Store(file,questions);assert.equal(s.start(' JOSE de Teste ','vendas').id,exam.id);assert.equal(Object.keys(s.report(exam.id).answers).length,1);
 for(const q of real.questions)s.answer(exam.id,q.id,String(q.correct));const done=s.finish(exam.id);assert.equal(done.result.score,100);assert.equal(s.finish(exam.id).finished,done.finished);assert.throws(()=>s.answer(exam.id,real.questions[0].id,'1'),/concluída/);
 s.close();s=new Store(file,questions);assert.equal(s.history().length,1);assert.equal(s.report(exam.id).score,100);assert.notEqual(s.start('José de Teste','vendas').id,exam.id);
 }finally{s?.close();const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('retenfix-test-'))fs.rmSync(resolved,{recursive:true,force:true});}
});
