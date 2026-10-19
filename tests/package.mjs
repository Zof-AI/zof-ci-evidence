import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
assert.ok(process.argv[2],'Pass the reviewed evidence-spec tarball as the first argument.');
const dependency=path.resolve(process.argv[2]);const temp=await mkdtemp(path.join(tmpdir(),'zof-ci-package-'));
const run=(cmd,args,cwd=process.cwd(),expected=0)=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8'});assert.equal(r.status,expected,`Command failed: ${cmd} ${r.stderr}`);return r.stdout;};
try {
 const packed=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',temp]))[0];
 assert.ok(packed.files.some(f=>f.path==='dist/index.d.ts'));assert.ok(packed.files.every(f=>!/(?:^|\/)(?:src|tests|orchestration|\.git)(?:\/|$)|\.map$/.test(f.path)));
 await writeFile(path.join(temp,'package.json'),'{"private":true,"type":"module"}');
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund',dependency,path.join(temp,packed.filename)],temp);
 run(process.execPath,['--input-type=module','-e',"import {normalizeReport} from '@zofai/ci-evidence'; import {validateEvidence} from '@zofai/evidence-spec'; const e=normalizeReport('<testsuite><testcase name=\"works\"/></testsuite>',{format:'junit'});if(!validateEvidence(e).valid||e.execution.result!=='pass')process.exit(1);"],temp);
 const base=path.join(temp,'node_modules/@zofai/ci-evidence');
 run(process.execPath,[path.join(base,'dist/cli.js'),'normalize','junit.xml','--format','junit','--root',path.join(base,'examples')],temp);
 run(process.execPath,[path.join(base,'dist/cli.js'),'normalize','tests.json','--format','json','--root',path.join(base,'examples')],temp,2);
 console.log(JSON.stringify({package:'passed',entries:packed.files.length,tests:5}));
} finally {await rm(temp,{recursive:true,force:true});}
