import { Router } from 'express';
import { StreamController } from '../controllers/streamController';

const router = Router();
const streamController = new StreamController();

export function setRoutes(app) {
    app.use('/api/stream', router);
    router.post('/create', (req, res) => {
        const { streamId, streamData } = req.body;
        try {
            const message = streamController.createStream(streamId, streamData);
            res.status(201).json({ success: true, message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    });

    router.get('/status/:streamId', (req, res) => {
        const { streamId } = req.params;
        try {
            const message = streamController.getStreamStatus(streamId);
            res.status(200).json({ success: true, message });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    });
}