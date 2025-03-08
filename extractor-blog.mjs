import express from 'express';
import { extract } from '@extractus/article-extractor';
import mercuryParser from '@postlight/mercury-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import validator from 'validator';
import swaggerSetup from './swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3003;

swaggerSetup(app);

app.use(express.json());

// Función para transformar y unificar los artículos
function transformarArticulo(articuloExtractor, articuloMercury) {
  return {
    url: articuloExtractor?.url || articuloMercury?.url || null,
    title: articuloExtractor?.title || articuloMercury?.title || null,
    author: articuloExtractor?.author || articuloMercury?.author || null,
    date_published: articuloExtractor?.published || articuloMercury?.date_published || null,
    image: articuloExtractor?.image || articuloMercury?.image || null,
    content: articuloExtractor?.content || articuloMercury?.content || null,
    source: articuloExtractor?.source || articuloMercury?.source || null,
    excerpt: articuloExtractor?.description || articuloMercury?.excerpt || null,
    word_count: articuloMercury?.word_count || null,
    direction: articuloMercury?.direction || null,
    total_pages: articuloMercury?.total_pages || null,
    rendered_pages: articuloMercury?.rendered_pages || null,
    favicon: articuloExtractor?.favicon || null,
    ttr: articuloExtractor?.ttr || null,
    type: articuloExtractor?.type || null,
    links: articuloExtractor?.links || null
  };
}

// Función para obtener la fecha actual
function obtenerFechaActual() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

// Función para generar logs
function generarLog(respuesta, url, opcion) {
  const fechaActual = obtenerFechaActual();
  const nombreArchivo = `logHelper-${fechaActual}.txt`;
  const rutaDirectorio = join(__dirname, 'Log');
  const rutaArchivo = join(rutaDirectorio, nombreArchivo);
  const respuestaJson = JSON.stringify(respuesta);

  if (!fs.existsSync(rutaDirectorio)) {
    fs.mkdirSync(rutaDirectorio);
  }

  const logEntrada = JSON.stringify({
    timestamp: new Date(),
    url: url,
    option: opcion,
    data: respuestaJson
  });

  fs.appendFile(rutaArchivo, logEntrada + '\n', (err) => {
    if (err) {
      console.error('Error al escribir en el archivo de registro:', err);
      throw new Error('Error al escribir en el archivo de registro');
    }
  });
}

// Función para validar la URL
function validarEsquemaUrl(url) {
  return validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true });
}

// Endpoint para extraer artículos

/**
 * @openapi
 * /ip-extractor:
 *   post:
 *     summary: Extrae contenido de un artículo web
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL del artículo a extraer
 *     responses:
 *       200:
 *         description: Contenido extraído exitosamente
 *       400:
 *         description: URL inválida o faltante
 *       500:
 *         description: Error al procesar la URL
 */
app.post('/extractor-blog', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'La URL es requerida' });
  }

  if (!validarEsquemaUrl(url)) {
    return res.status(400).json({ error: 'La URL debe empezar con http:// o https://' });
  }

  try {
    // Ejecutar ambos servicios de manera asíncrona
    const [extractResult, mercuryResult] = await Promise.allSettled([
      extract(url),
      mercuryParser.parse(url)
    ]);

    // Verificar los resultados
    const articuloExtractor = extractResult.status === 'fulfilled' ? extractResult.value : null;
    const articuloMercury = mercuryResult.status === 'fulfilled' ? mercuryResult.value : null;

    // Si ambos fallan, lanzar un error
    if (!articuloExtractor && !articuloMercury) {
      throw new Error('No se pudo obtener la información para la URL proporcionada.');
    }

    // Unificar los resultados
    const respuesta = transformarArticulo(articuloExtractor, articuloMercury);

    // Devolver la respuesta
    res.json(respuesta);

    // Generar log
    generarLog(respuesta, url, articuloExtractor ? 'article-extractor' : 'mercury');
  } catch (error) {
    console.error('Error procesando la URL:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información para la URL proporcionada.' });

    // Generar log de error
    generarLog(error.message, url, 'error');
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Api corriendo en http://localhost:${port}`);
});