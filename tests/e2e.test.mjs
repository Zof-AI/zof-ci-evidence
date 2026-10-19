import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateEvidence } from '@zof-ai/evidence-spec';
const cli=(...args)=>spawnSync(process.execPath,['dist/cli.js',...args],{encoding:'utf8'});
for(const [file,format,code] of [['junit.xml','junit',0],['tests.json','json',2],['static.json','static-json',1]])test(`documented ${format} CLI example`,()=>{const r=cli('normalize',file,'--format',format,'--root','examples');assert.equal(r.status,code,r.stderr);assert.equal(validateEvidence(JSON.parse(r.stdout)).valid,true);});
test('CLI missing and malicious inputs never exit zero',()=>{for(const args of [['normalize','not-found'],['normalize','../secret'],['normalize','https://example.invalid/private'],['normalize'],['--token=synthetic-secret']]){const r=cli(...args);assert.equal(r.status,2);assert.doesNotMatch(r.stdout+r.stderr,/synthetic-secret|example.invalid|private/);}});
test('CLI known failed report exits one without raw failure',()=>{const r=cli('normalize','failed.xml','--root','tests/fixtures');assert.equal(r.status,1);assert.doesNotMatch(r.stdout+r.stderr,/synthetic-/);});
test('CLI help and version do not read input',()=>{assert.equal(cli('--help').status,0);assert.equal(cli('--version').stdout.trim(),'0.1.1');});
