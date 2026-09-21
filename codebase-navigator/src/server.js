import { app } from './app.js';
import { config } from './config.js';

const port = config.port;
app.listen(port, '0.0.0.0', () => console.log(`Practice API listening on port ${port}`));
