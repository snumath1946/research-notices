(function (root) {
  'use strict';
  let database;
  async function db() {
    if (database) return database;
    database = await new Promise((resolve, reject) => {
      const req = indexedDB.open('snumath-research-notices', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('drafts', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('이 브라우저의 임시보관함을 열지 못했습니다. 업데이트 ZIP으로 보관해 주세요.'));
    });
    return database;
  }
  async function run(mode, action) {
    const connection = await db();
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('drafts', mode);
      const req = action(tx.objectStore('drafts'));
      let result;
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => reject(new Error('임시보관에 실패했습니다. 저장 공간을 확인하거나 ZIP으로 내보내 주세요.'));
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error('임시보관을 완료하지 못했습니다.'));
    });
  }
  root.ResearchNoticesDrafts = { put: value => run('readwrite', store => store.put(value)), get: id => run('readonly', store => store.get(id)), list: () => run('readonly', store => store.getAll()) };
})(window);
