import { SaxesParser } from 'saxes';
import { parseJson, redactText, SafeInputError, assertSafeRelativePath } from '@zof-ai/evidence-spec';
import type { Evidence, Finding, TestResult } from '@zof-ai/evidence-spec';
import type { ParsedReport } from './types.js';
const fail=():never=>{throw new SafeInputError('INVALID_REPORT','Report does not match the supported format.');};
function object(value: unknown): Record<string,unknown> { if(!value||typeof value!=='object'||Array.isArray(value)) return fail();return value as Record<string,unknown>; }
function string(value:unknown,max=512):string { if(typeof value!=='string'||!value||value.length>4096) return fail();return redactText(value).slice(0,max); }
function count(value:unknown):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>10000)return fail();return value;}
function execution(value:unknown):'completed'|'partial'|'error' {if(value!=='completed'&&value!=='partial'&&value!=='error')return fail();return value;}
function outcome(status:ParsedReport['status'],tests:TestResult[],knownFailure=false):Evidence['execution']['result'] {
 if(knownFailure||tests.some(t=>t.status==='failed'||t.status==='error'))return 'fail';
 if(status!=='completed'||!tests.some(t=>t.status==='passed'))return 'unknown';
 return 'pass';
}
export function parseGenericJson(text:string):ParsedReport {
 const obj=object(parseJson(text)); const declared=execution(obj.status);
 if(!Array.isArray(obj.tests)||obj.tests.length>10000)return fail();
 const tests:TestResult[]=obj.tests.map(item=>{
  const t=object(item); if(!['passed','failed','skipped','error'].includes(String(t.status)))return fail();
  const result:TestResult={name:string(t.name),status:t.status as TestResult['status']};
  if(t.durationMs!==undefined){if(typeof t.durationMs!=='number'||!Number.isFinite(t.durationMs)||t.durationMs<0||t.durationMs>1e12)return fail();result.durationMs=t.durationMs;}
  return result;
 });
 const warnings:string[]=[];let status:ParsedReport['status']=declared;
 if(obj.expectedTests!==undefined&&count(obj.expectedTests)!==tests.length){status='partial';warnings.push('Declared test count differs from reported cases.');}
 if(!tests.length&&declared!=='error'){status='missing';warnings.push('No test cases were reported.');}
 else if(tests.every(t=>t.status==='skipped')&&declared==='completed'){status='partial';warnings.push('All reported tests were skipped.');}
 return {tests,findings:[],status,result:outcome(status,tests),warnings};
}
export function parseStaticJson(text:string):ParsedReport {
 const obj=object(parseJson(text));let status:ParsedReport['status']=execution(obj.status);const checked=count(obj.checkedRules);
 if(!Array.isArray(obj.findings)||obj.findings.length>10000)return fail();
 const findings:Finding[]=obj.findings.map(item=>{
  const f=object(item);if(!['info','low','medium','high','critical'].includes(String(f.severity)))return fail();
  const finding:Finding={id:string(f.id,200),severity:f.severity as Finding['severity'],message:string(f.message,4096)};
  if(f.path!==undefined){if(typeof f.path!=='string')return fail();assertSafeRelativePath(f.path);finding.path=redactText(f.path);}
  if(f.line!==undefined){if(typeof f.line!=='number'||!Number.isSafeInteger(f.line)||f.line<1||f.line>1e8)return fail();finding.line=f.line;}
  return finding;
 });
 const warnings:string[]=[];if(!checked){status='missing';warnings.push('No static analysis rules were reported as executed.');}
 const knownFailure=findings.some(f=>f.severity==='high'||f.severity==='critical');
 return {tests:[],findings,status,result:knownFailure?'fail':status==='completed'?'pass':'unknown',warnings};
}
export function parseJUnit(text:string):ParsedReport {
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text))throw new SafeInputError('XML_DTD','XML document types and entities are prohibited.');
 const tests:TestResult[]=[];const warnings:string[]=[];
 const stack:Array<{name:string;start:number;expected?:number;failures?:number;errors?:number}>=[];
 let current:TestResult|undefined,roots=0,partial=false,knownFailure=false;
 const parser=new SaxesParser({xmlns:false});
 const attrCount=(v:string|undefined):number|undefined=>{if(v===undefined)return; if(!/^\d{1,6}$/.test(v))return fail();return count(Number(v));};
 const allowed:Record<string,string[]>={testsuites:['testsuite'],testsuite:['testsuite','testcase','properties','system-out','system-err'],testcase:['failure','error','skipped','properties','system-out','system-err'],properties:['property']};
 parser.on('doctype',()=>{throw new SafeInputError('XML_DTD','XML document types and entities are prohibited.');});
 parser.on('error',()=>fail());
 const checkText=(text:string)=>{if(text.trim()&&!['failure','error','skipped','system-out','system-err','property'].includes(stack.at(-1)?.name??''))return fail();};
 parser.on('text',checkText);parser.on('cdata',checkText);
 parser.on('opentag',node=>{
  if(stack.length>=32||Object.keys(node.attributes).length>100)return fail();
  const name=node.name;const parent=stack.at(-1)?.name;
  if(!parent){if(++roots!==1||!['testsuite','testsuites'].includes(name))return fail();}
  else if(!allowed[parent]?.includes(name))return fail();
  const entry:{name:string;start:number;expected?:number;failures?:number;errors?:number}={name,start:tests.length};
  if(name==='testsuite'||name==='testsuites'){
   const expected=attrCount(node.attributes.tests); const failures=attrCount(node.attributes.failures);const errors=attrCount(node.attributes.errors);
   if(expected!==undefined)entry.expected=expected;if(failures!==undefined)entry.failures=failures;if(errors!==undefined)entry.errors=errors;
   if((failures??0)>0||(errors??0)>0)knownFailure=true;
  }
  if(name==='testcase'){
   if(tests.length>=10000||current)return fail();current={name:string(node.attributes.name),status:'passed'};
   if(node.attributes.time!==undefined){if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(node.attributes.time))return fail();const ms=Number(node.attributes.time)*1000;if(!Number.isFinite(ms)||ms>1e12)return fail();current.durationMs=ms;}
  }
  if(current&&['failure','error','skipped'].includes(name)){if(current.status!=='passed')return fail();current.status=name==='failure'?'failed':name==='error'?'error':'skipped';}
  stack.push(entry);
 });
 parser.on('closetag',()=>{
  const entry=stack.pop();if(!entry)return fail();
  if(entry.name==='testcase'){if(!current)return fail();tests.push(current);current=undefined;}
  if(entry.name==='testsuite'||entry.name==='testsuites'){
   const cases=tests.slice(entry.start);
   if((entry.expected!==undefined&&entry.expected!==cases.length)||(entry.failures!==undefined&&entry.failures!==cases.filter(t=>t.status==='failed').length)||(entry.errors!==undefined&&entry.errors!==cases.filter(t=>t.status==='error').length))partial=true;
  }
 });
 try {parser.write(text).close();}catch(error){if(error instanceof SafeInputError)throw error;return fail();}
 if(roots!==1||stack.length||current)return fail();
 let status:ParsedReport['status']=partial?'partial':'completed';
 if(partial)warnings.push('Declared test counters differ from reported cases.');
 if(!tests.length){status='missing';warnings.push('No test cases were reported.');}
 else if(tests.every(t=>t.status==='skipped')){status='partial';warnings.push('All reported tests were skipped.');}
 return {tests,findings:[],status,result:outcome(status,tests,knownFailure),warnings};
}
