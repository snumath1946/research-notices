(function (root) {
  'use strict';
  function base64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  }
  function utf8FromBase64(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
    return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));
  }
  function createClient({ owner, repo, token, fetcher = root.fetch.bind(root) }) {
    if (owner !== 'snumath1946' || !/^[a-zA-Z0-9._-]+$/.test(repo || '') || repo === '.' || repo === '..') throw new Error('저장 대상은 snumath1946 계정의 지정 저장소여야 합니다.');
    let connected = false, branch = 'main', sessionToken = String(token || '');
    token = '';
    if (!sessionToken) throw new Error('GitHub 저장용 인증값을 입력해 주세요.');
    const prefix = `/repos/${owner}/${repo}`;
    async function request(route, method, body) {
      if (!sessionToken) throw new Error('GitHub 연결이 해제되었습니다. 다시 연결해 주세요.');
      const res = await fetcher('https://api.github.com' + route, { method: method || 'GET', headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + sessionToken, 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', credentials: 'omit', cache: 'no-store' });
      if (!res.ok) {
        const labels = { 401: 'GitHub 인증이 만료되었거나 올바르지 않습니다.', 403: '이 저장소에 쓸 권한이 없습니다. Contents 읽기·쓰기 권한을 확인해 주세요.', 404: '저장소 또는 파일을 찾지 못했습니다. 저장소를 만들고 최신 소스를 먼저 올려 주세요.', 409: '다른 변경이 있습니다. 최신 목록을 다시 불러와 주세요.', 422: '저장소가 변경되었거나 브랜치 규칙에 의해 저장이 거부됐습니다. 다시 불러오거나 관리자에게 확인해 주세요.' };
        throw new Error(labels[res.status] || 'GitHub 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      return res.json();
    }
    async function head() { return (await request(prefix + '/git/ref/heads/' + encodeURIComponent(branch))).object.sha; }
    return {
      async connect() {
        const user = await request('/user');
        if (user.login?.toLowerCase() !== 'snumath1946') throw new Error('snumath1946 계정에서 발급한 인증값으로 연결해 주세요. 다른 계정에는 저장하지 않습니다.');
        const meta = await request(prefix);
        if (meta.permissions && !meta.permissions.push) throw new Error('지정 저장소의 쓰기 권한이 필요합니다.');
        branch = meta.default_branch || 'main'; connected = true;
        return { owner, repo, branch, head: await head() };
      },
      async load() {
        if (!connected) throw new Error('GitHub에 먼저 연결해 주세요.');
        const sha = await head();
        const file = await request(prefix + '/contents/dist/data/notices.js?ref=' + encodeURIComponent(sha));
        if (file.encoding !== 'base64' || !file.content) throw new Error('저장소 공고 데이터를 읽지 못했습니다.');
        return { head: sha, script: utf8FromBase64(file.content) };
      },
      async save({ expectedHead, data, files, message = '공모 안내 및 첨부자료 업데이트' }) {
        if (!connected) throw new Error('GitHub에 먼저 연결해 주세요.');
        if (!expectedHead || await head() !== expectedHead) throw new Error('저장소에 다른 수정이 있습니다. 최신 목록을 다시 불러온 후 저장해 주세요.');
        const C = typeof module !== 'undefined' && module.exports ? require('./admin-core.js') : root.ResearchNoticesAdminCore;
        const entries = [...files, { path: 'data/notices.js', bytes: new TextEncoder().encode(C.catalogScript(data)) }];
        const seen = new Set();
        for (const f of entries) {
          if (!/^(files\/[0-9]{4}\/[a-z0-9-]+\/(?:attachments\/)?[a-zA-Z0-9._-]+|data\/notices\.js)$/.test(f.path) || f.path.split('/').some(p => p === '.' || p === '..') || seen.has(f.path)) throw new Error('허용되지 않거나 중복된 업로드 경로입니다.');
          if (!(f.bytes instanceof Uint8Array) || f.bytes.byteLength > 25 * 1024 * 1024) throw new Error('업로드 파일 크기를 확인해 주세요.');
          seen.add(f.path);
        }
        const parent = await request(prefix + '/git/commits/' + expectedHead);
        const tree = [];
        for (const file of entries) {
          const blob = await request(prefix + '/git/blobs', 'POST', { content: base64(file.bytes), encoding: 'base64' });
          tree.push({ path: 'dist/' + file.path, mode: '100644', type: 'blob', sha: blob.sha });
        }
        const nextTree = await request(prefix + '/git/trees', 'POST', { base_tree: parent.tree.sha, tree });
        const commit = await request(prefix + '/git/commits', 'POST', { message, tree: nextTree.sha, parents: [expectedHead] });
        await request(prefix + '/git/refs/heads/' + encodeURIComponent(branch), 'PATCH', { sha: commit.sha, force: false });
        return { sha: commit.sha, url: `https://github.com/${owner}/${repo}/commit/${commit.sha}` };
      },
      disconnect() { connected = false; sessionToken = ''; }
    };
  }
  const api = { createClient };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResearchNoticesGitHub = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
