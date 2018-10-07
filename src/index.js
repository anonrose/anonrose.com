import "./index.css"
import { Manifest, ServiceWorkerRegister } from 'progressive-web-app-helper';
import { config } from '../config/manifest';

import CircleThing from './circle-thing';

window.onresize = window.onload = new CircleThing('circle-svg').paint();

Manifest.inject(config);

; (async () => {
  const sw = new ServiceWorkerRegister();

  const messenger = await sw.register({ resource: '/sw.js' });

  messenger.postMessage({
    action: 'set-settings',
    settings: {
      content: '<h1>miss me with that offline ish</h1>',
      assets: ['/bundle.js', '/']
    }
  });
})()