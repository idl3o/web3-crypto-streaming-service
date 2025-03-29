import express from 'express';
import { setRoutes } from './routes';
import { json } from 'body-parser';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use(express.static(path.join(__dirname, '../public')));

setRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});