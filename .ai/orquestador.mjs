#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: node .ai/orquestador.mjs <ruta-a-tarea.json>');
  process.exit(1);
}

const taskPath = path.resolve(args[0]);
let task;
try {
  task = JSON.parse(readFileSync(taskPath, 'utf-8'));
} catch (error) {
  console.error('No se pudo leer la tarea:', error.message);
  process.exit(1);
}

const promptPath = path.resolve('.ai/agentes', `${task.agente}.prompt.md`);
let basePrompt = '';
try {
  basePrompt = readFileSync(promptPath, 'utf-8');
} catch {
  basePrompt = readFileSync(path.resolve('.ai/agentes', 'explore.prompt.md'), 'utf-8');
}

const fullPrompt = `${basePrompt}

---

## Tarea a ejecutar

**ID:** ${task.id}
**Agente:** ${task.agente}
**Objetivo:** ${task.objetivo}

### Contexto
${task.contexto}

### Archivos a crear o modificar
${task.archivos_afectados.map((f) => `- ${f}`).join('\n')}

### Criterios de aceptación
${task.criterios_aceptacion.map((c) => `- ${c}`).join('\n')}

### Verificación
Ejecutar: \`${task.verificacion}\`

Al terminar, devuelve:
1. Lista exacta de archivos creados/modificados.
2. Resumen de cambios.
3. Resultado del comando de verificación (o el comando a ejecutar).
`;

console.log(fullPrompt);
