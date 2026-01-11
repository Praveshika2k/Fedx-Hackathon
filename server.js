import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Import AI Services
import { RecoveryPredictor } from './ai-engine/ml-models/recovery-predictor.js';
import { CasePrioritizer } from './ai-engine/ml-models/case-prioritizer.js';
import { DCAOptimizer } from './ai-engine/ml-models/dca-optimizer.js';
import { SentimentAnalyzer } from './ai-engine/ml-models/sentiment-analyzer.js';
import { APIService } from './services/api-service.js';

// Initialize AI Models
const recoveryPredictor = new RecoveryPredictor();
const casePrioritizer = new CasePrioritizer();
const dcaOptimizer = new DCAOptimizer();
const sentimentAnalyzer = new SentimentAnalyzer();
const apiService = new APIService();

// Load trained models
Promise.all([
  recoveryPredictor.loadModel(),
  casePrioritizer.loadModel(),
  dcaOptimizer.loadModel(),
  sentimentAnalyzer.loadModel()
]).then(() => {
  console.log('✅ All AI models loaded successfully');
}).catch(err => {
  console.error('❌ Error loading models:', err);
});

// API Endpoints for Phase 2
app.post('/api/ai/predict-recovery', async (req, res) => {
  try {
    const caseData = req.body;
    const prediction = await recoveryPredictor.predict(caseData);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/prioritize-case', async (req, res) => {
  try {
    const caseData = req.body;
    const priority = await casePrioritizer.getPriority(caseData);
    res.json(priority);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/optimize-dca', async (req, res) => {
  try {
    const { caseData, dcaList } = req.body;
    const optimization = await dcaOptimizer.optimizeAllocation(caseData, dcaList);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/analyze-sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    const sentiment = await sentimentAnalyzer.analyze(text);
    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/model-metrics', async (req, res) => {
  try {
    const metrics = {
      recoveryPredictor: await recoveryPredictor.getMetrics(),
      casePrioritizer: await casePrioritizer.getMetrics(),
      dcaOptimizer: await dcaOptimizer.getMetrics(),
      sentimentAnalyzer: await sentimentAnalyzer.getMetrics()
    };
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time WebSocket
io.on('connection', (socket) => {
  console.log('🔗 New client connected:', socket.id);

  socket.on('predict-batch', async (cases) => {
    try {
      const predictions = await Promise.all(
        cases.map(caseData => recoveryPredictor.predict(caseData))
      );
      socket.emit('batch-predictions', predictions);
    } catch (error) {
      socket.emit('prediction-error', error.message);
    }
  });

  socket.on('optimize-dca-allocation', async (data) => {
    try {
      const optimized = await dcaOptimizer.optimizeBatch(data.cases, data.dcas);
      socket.emit('optimization-results', optimized);
    } catch (error) {
      socket.emit('optimization-error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI API available at http://localhost:${PORT}/api/ai`);
  console.log(`📊 WebSocket ready at ws://localhost:${PORT}`);
});