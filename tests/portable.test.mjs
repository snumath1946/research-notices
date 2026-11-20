import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {browserCommand} from '../scripts/start-converter.mjs';
const require=createRequire(import.meta.url),JSZip=require('../dist/vendor/jszip/jszip.min.js');
const archive=await readFile(new URL('../dist/tools/research-notice-converter.zip',import.meta.url));
test('Windows·Mac 패키지는 개인 경로·공고·인증값 없이 독립 실행 파일을 포함한다',async()=>{
  const zip=await JSZip.loadAsync(archive,{checkCRC32:true}),names=Object.keys(zip.files).filter(n=>!zip.files[n].dir);
  for(const name of ['start-converter.cmd','start-converter.command','scripts/start-converter.mjs','scripts/convert-notice.mjs','package.json','package-lock.json','dist/assets/notice-text.js'])assert.ok(names.includes(name));
  assert.equal(names.some(n=>/node_modules|\.env|notices\.js|dist\/files|\.npmrc/.test(n)),false);
  assert.equal((zip.file('start-converter.command').unixPermissions&0o111),0o111);
  assert.match(await zip.file('start-converter.cmd').async('string'),/\r\n/);
  assert.doesNotMatch(await zip.file('start-converter.command').async('string'),/\/Users\/|\/Cellar\//);
});
test('운영체제별 브라우저 실행은 고정된 로컬 주소만 전달한다',()=>{
  for(const platform of ['win32','darwin','linux']){
    const [command,args]=browserCommand(platform);assert.ok(command);assert.equal(args.at(-1),'http://127.0.0.1:4184/');assert.ok(!args.join(' ').includes('token'));
  }
});
test('공백·한글 폴더에 푼 패키지는 최초 설치 후 독립적으로 실행 준비된다',{timeout:180000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),'research converter 공문 '));
  try{
    const zip=await JSZip.loadAsync(archive,{checkCRC32:true});
    for(const name of Object.keys(zip.files)){
      const file=zip.files[name];if(file.dir)continue;
      assert.ok(!name.includes('..')&&!name.startsWith('/'));
      const target=join(dir,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,await file.async('nodebuffer'));
    }
    const result=spawnSync(process.execPath,[join(dir,'scripts/start-converter.mjs'),'--check'],{cwd:dir,encoding:'utf8',timeout:150000,windowsHide:true});
    assert.equal(result.status,0,'Portable first-run dependency installation and launcher check must succeed');
    const last=result.stdout.trim().split(/\r?\n/).at(-1);assert.equal(JSON.parse(last).ready,true);
    const extracted=require(join(dir,'dist/assets/notice-text.js'));assert.equal(extracted.SCHEMA,'research-notice-text/v1');
  }finally{await rm(dir,{recursive:true,force:true});}
});
