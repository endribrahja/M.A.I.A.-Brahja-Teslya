export default [
  {ignores:['frontend/vendor/**','node_modules/**']},
  {
    files:['frontend/*.js'],
    languageOptions:{
      ecmaVersion:'latest',
      sourceType:'module',
      globals:Object.fromEntries([
        'AbortController','Blob','confirm','crypto','devicePixelRatio','document','fetch','FormData',
        'IntersectionObserver','localStorage','location','matchMedia','Notification','navigator','performance',
        'prompt','ResizeObserver','self','caches','TextDecoderStream','URL','URLSearchParams','WebSocket',
        'window','setTimeout','clearTimeout','atob','requestAnimationFrame','Response','Headers'
      ].map(name=>[name,'readonly']))
    },
    rules:{'no-undef':'error','no-unreachable':'error','no-dupe-keys':'error','no-unexpected-multiline':'error'}
  }
];
