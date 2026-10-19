#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { serializeEvidence } from '@zof-ai/evidence-spec';
import { normalizeArtifacts } from './index.js';
import type { ReportFormat } from './types.js';
try {
 const {values,positionals}=parseArgs({options:{root:{type:'string',default:'.'},format:{type:'string',default:'junit'},repository:{type:'string'},commit:{type:'string'},ci:{type:'string'},'run-id':{type:'string'},help:{type:'boolean'},version:{type:'boolean'}},allowPositionals:true});
 if(values.help)console.log('Usage: zof-ci-evidence normalize <relative-report...> --format junit|json|static-json [--root directory]\nOptional attribution: --repository owner/name --commit SHA --ci github --run-id ID\nExit codes: 0 completed/pass; 1 known failure; 2 partial/missing/error/input. Writes redacted evidence JSON to stdout.');
 else if(values.version)console.log('0.1.0');
 else {
  if(positionals.shift()!=='normalize'||!['junit','json','static-json'].includes(values.format!))throw new Error('usage');
  const metadata:Record<string,string>={};if(values.ci)metadata.ci=values.ci;if(values['run-id'])metadata.runId=values['run-id'];
  const evidence=await normalizeArtifacts({root:values.root!,files:positionals.map(path=>({path,format:values.format as ReportFormat})),source:{repository:values.repository??null,commit:values.commit??null},metadata});
  process.stdout.write(serializeEvidence(evidence));process.exitCode=evidence.execution.result==='fail'?1:evidence.execution.status==='completed'&&evidence.execution.result==='pass'?0:2;
 }
}catch{console.error(JSON.stringify({code:'INPUT',message:'Invalid command or input. Use --help for supported options.'}));process.exitCode=2;}
