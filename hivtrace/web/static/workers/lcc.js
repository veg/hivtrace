importScripts('./worker-vendor.js');

onmessage = function(event) {
    try {
      datamonkey.hivtrace.compute_local_clustering(event.data);
      postMessage(event.data);
      self.close();
    } catch(e) {
        var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
          .replace(/^\s+at\s+/gm, '')
          .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
          .split('\n');
    };
};

