import { Router } from 'express';
import { StreamController } from '../controllers/streamController';

const router = Router();
const streamController = new StreamController();

export function setRoutes(app) {
    app.use('/api/stream', router);
    router.post('/create', streamController.createStream.bind(streamController));
    router.get('/status', streamController.getStreamStatus.bind(streamController));
}