import fs from 'node:fs';

export function writeFilesWithMkdir(directory: string, file: string, content: string) {
  if (file.includes('/')) {
    const path = file.split('/').slice(0, -1).join('/');

    fs.mkdirSync(`${directory}/${path}`, {recursive: true});
    fs.writeFileSync(`${directory}/${file}`, content, 'utf8');
  } else {
    fs.writeFileSync(`${directory}/${file}`, content, 'utf8');
  }
}
