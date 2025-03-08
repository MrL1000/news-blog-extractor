import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog Extractor API',
      version: '1.0.0',
      description: 'API para extraer contenido de artículos web',
    },
    servers: [
      {
        url: 'http://localhost:3003',
        description: 'Servidor local'
      },
    ],
  },
  apis: ['./extractor-blog.mjs'], 
};

const specs = swaggerJsdoc(options);

export default (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};