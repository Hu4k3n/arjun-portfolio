// This file contains the Godot game initialization logic extracted from the Godot export HTML.
// It exposes a function `init_godot_game()` that can be called from React to start the game.

function init_godot_game() {
  // Get base path from the base tag (set by React's homepage in package.json)
  const baseTag = document.querySelector('base');
  const basePath = baseTag ? new URL(baseTag.href).pathname : '/';
  
  const GODOT_CONFIG = {
    "args":[],
    "canvasResizePolicy":1,
    "ensureCrossOriginIsolationHeaders":true,
    "executable":"index",
    "experimentalVK":false,
    "fileSizes":{"index.pck":96177152,"index.wasm":52106500},
    "focusCanvas":true,
    "gdextensionLibs":[],
    // Add the locateFile function to tell Godot where to find its files
    "locateFile": function(file) {
      return basePath + file;
    }
  };
  const GODOT_THREADS_ENABLED = false;
  const engine = new window.Engine(GODOT_CONFIG);

  (function () {
    const statusOverlay = document.getElementById('status');
    const statusProgress = document.getElementById('status-progress');
    const statusNotice = document.getElementById('status-notice');

    let initializing = true;
    let statusMode = '';

    function setStatusMode(mode) {
      if (statusMode === mode || !initializing) {
        return;
      }
      if (mode === 'hidden') {
        statusOverlay.remove();
        initializing = false;
        return;
      }
      statusOverlay.style.visibility = 'visible';
      statusProgress.style.display = mode === 'progress' ? 'block' : 'none';
      statusNotice.style.display = mode === 'notice' ? 'block' : 'none';
      statusMode = mode;
    }

    function setStatusNotice(text) {
      while (statusNotice.lastChild) {
        statusNotice.removeChild(statusNotice.lastChild);
      }
      const lines = text.split('\n');
      lines.forEach((line) => {
        statusNotice.appendChild(document.createTextNode(line));
        statusNotice.appendChild(document.createElement('br'));
      });
    }

    function displayFailureNotice(err) {
      console.error(err);
      if (err instanceof Error) {
        setStatusNotice(err.message);
      } else if (typeof err === 'string') {
        setStatusNotice(err);
      } else {
        setStatusNotice('An unknown error occurred.');
      }
      setStatusMode('notice');
      initializing = false;
    }

    const missing = window.Engine.getMissingFeatures({
      threads: GODOT_THREADS_ENABLED,
    });

    if (missing.length !== 0) {
      if (GODOT_CONFIG['serviceWorker'] && GODOT_CONFIG['ensureCrossOriginIsolationHeaders'] && 'serviceWorker' in navigator) {
        let serviceWorkerRegistrationPromise;
        try {
          serviceWorkerRegistrationPromise = navigator.serviceWorker.getRegistration();
        } catch (err) {
          serviceWorkerRegistrationPromise = Promise.reject(new Error('Service worker registration failed.'));
        }
        Promise.race([
          serviceWorkerRegistrationPromise.then((registration) => {
            if (registration != null) {
              return Promise.reject(new Error('Service worker already exists.'));
            }
            return registration;
          }).then(() => engine.installServiceWorker()),
          new Promise((resolve) => {
            setTimeout(() => resolve(), 2000);
          }),
        ]).then(() => {
          window.location.reload();
        }).catch((err) => {
          console.error('Error while registering service worker:', err);
        });
      } else {
        const missingMsg = 'Error\nThe following features required to run Godot projects on the Web are missing:\n';
        displayFailureNotice(missingMsg + missing.join('\n'));
      }
    } else {
      setStatusMode('progress');
      engine.startGame({
        'onProgress': function (current, total) {
          if (current > 0 && total > 0) {
            statusProgress.value = current;
            statusProgress.max = total;
          } else {
            statusProgress.removeAttribute('value');
            statusProgress.removeAttribute('max');
          }
        },
      }).then(() => {
        setStatusMode('hidden');
      }, displayFailureNotice);
    }
  })();
}
