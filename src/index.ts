import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { createEvidence, safeReadFile, redactText, SafeInputError, assertBounded } from '@zof-ai/evidence-spec';
import type { Evidence, EvidenceInput, Artifact } from '@zof-ai/evidence-spec';
import { parseGenericJson, parseJUnit, parseStaticJson } from './parsers.js';
import type { ArtifactOptions, NormalizeOptions, ParsedReport } from './types.js';
export * from './types.js';
export const MAX_REPORT_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const MAX_REPORTS = 32;
const errorReport=(code='INVALID_REPORT',missing=false):ParsedReport=>({tests:[],findings:[],status:missing?'missing':'error',result:'unknown',warnings:[code]});
function readMetadata(value:unknown):Pick<Evidence,'provenance'|'environment'> {
 if(value===undefined)return {};assertBounded(value);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SafeInputError('METADATA','Metadata must be an object.');
 const input=value as Record<string,unknown>;const provenance:NonNullable<Evidence['provenance']>={},environment:NonNullable<Evidence['environment']>={};
 for(const key of ['runId','workflow','producer'] as const)if(typeof input[key]==='string')provenance[key]=redactText(input[key]).slice(0,key==='producer'?100:200);
 for(const key of ['os','architecture','runtime','ci'] as const)if(typeof input[key]==='string')environment[key]=redactText(input[key]).slice(0,100);
 return {...(Object.keys(provenance).length?{provenance}:{}),...(Object.keys(environment).length?{environment}:{})};
}
function build(reports:ParsedReport[],options:Omit<NormalizeOptions,'format'>,artifacts:Artifact[]=[]):Evidence {
 try {
  const tests=reports.flatMap(r=>r.tests);const findings=reports.flatMap(r=>r.findings);
  const warnings=reports.flatMap((r,index)=>r.warnings.map((message,warningIndex)=>({id:`report-${index+1}-warning-${warningIndex+1}`,severity:'info' as const,message})));
  const failure=reports.some(r=>r.result==='fail');
  const allComplete=reports.length>0&&reports.every(r=>r.status==='completed');
  const hasUsable=reports.some(r=>r.status==='completed'||r.status==='partial');
  const status:Evidence['execution']['status']=allComplete?'completed':hasUsable?'partial':reports.some(r=>r.status==='error')?'error':'missing';
  const result:Evidence['execution']['result']=failure?'fail':allComplete&&reports.every(r=>r.result==='pass')?'pass':'unknown';
  const input:EvidenceInput={tool:{name:'zof-ci-evidence',version:'0.1.0'},type:'ci',execution:{status,result},tests,findings:[...findings,...warnings],artifacts,extensions:{'org.zof.ci':{reports:reports.length,warnings:warnings.length}},...readMetadata(options.metadata)};
  if(options.source!==undefined)input.source=options.source;if(options.id!==undefined)input.id=options.id;if(options.createdAt!==undefined)input.createdAt=options.createdAt;
  return createEvidence(input);
 } catch {
  return createEvidence({tool:{name:'zof-ci-evidence',version:'0.1.0'},type:'ci',execution:{status:'error',result:'unknown'},findings:[{id:'invalid-output',severity:'info',message:'Input or combined output exceeds the supported evidence contract.'}]});
 }
}
function parse(input:string|Buffer,format:NormalizeOptions['format']):ParsedReport {
 try {
  const bytes=typeof input==='string'?Buffer.byteLength(input):Buffer.isBuffer(input)?input.length:MAX_REPORT_BYTES+1;
  if(bytes>MAX_REPORT_BYTES)return errorReport('SIZE');
  const buffer=typeof input==='string'?Buffer.from(input):input;
  const hex=buffer.subarray(0,6).toString('hex');
  if(hex.startsWith('1f8b')||hex.startsWith('504b')||hex.startsWith('425a68')||hex.startsWith('fd377a585a00')||hex.startsWith('377abcaf271c')||hex.startsWith('28b52ffd')||buffer.subarray(257,262).toString()==='ustar')return errorReport('ARCHIVE_UNSUPPORTED');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
  if(format==='junit')return parseJUnit(text);if(format==='json')return parseGenericJson(text);if(format==='static-json')return parseStaticJson(text);
  return errorReport('FORMAT_UNSUPPORTED');
 }catch(error){return errorReport(error instanceof SafeInputError?error.code:'INVALID_REPORT');}
}
/** No environment capture, network, log copying, code execution, or archive extraction. */
export function normalizeReport(input:string|Buffer,options:NormalizeOptions):Evidence {
 return build([parse(input,options.format)],options);
}
/** Import explicitly selected, already-downloaded files inside a stable artifact staging root. */
export async function normalizeArtifacts(options:ArtifactOptions):Promise<Evidence> {
 if(!Array.isArray(options.files)||options.files.length>MAX_REPORTS)return build([errorReport('REPORT_LIMIT')],options);
 const reports:ParsedReport[]=[],artifacts:Artifact[]=[];let total=0;
 for(const item of options.files){
  try {
   if(typeof item.path!=='string'||/\.(zip|tar|gz|tgz|bz2|xz|7z|zst)$/i.test(item.path)){reports.push(errorReport('ARCHIVE_UNSUPPORTED'));continue;}
   const buffer=await safeReadFile(options.root,item.path,MAX_REPORT_BYTES);total+=buffer.length;
   if(total>MAX_TOTAL_BYTES){reports.push(errorReport('TOTAL_SIZE'));break;}
   const report=parse(buffer,item.format);reports.push(report);
   // Metadata references only; never embed the report, failure bodies, properties, logs or environment.
   if(report.status==='completed'||report.status==='partial')artifacts.push({name:`report-${reports.length}`,path:redactText(item.path),sizeBytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),mediaType:item.format==='junit'?'application/xml':'application/json'});
  }catch(error){const code=error instanceof SafeInputError?error.code:'INVALID_REPORT';reports.push(errorReport(code,code==='FILE_READ'));}
 }
 if(!reports.length)reports.push(errorReport('NO_REPORTS',true));
 return build(reports,options,artifacts);
}
