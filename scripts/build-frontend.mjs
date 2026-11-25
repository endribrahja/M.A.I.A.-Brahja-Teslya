import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';

const source = new URL('../node_modules/three/', import.meta.url);
const destination = new URL('../frontend/vendor/', import.meta.url);
await mkdir(destination, {recursive: true});
for (const path of ['three.module.min.js', 'three.core.min.js']) {
  await cp(new URL('build/' + path, source), new URL(path, destination));
}
await cp(new URL('LICENSE', source), new URL('three.LICENSE.txt', destination));
const controls = await readFile(new URL('examples/jsm/controls/OrbitControls.js', source), 'utf8');
await writeFile(new URL('OrbitControls.js', destination), controls.replace("from 'three'", "from './three.module.min.js'"));
