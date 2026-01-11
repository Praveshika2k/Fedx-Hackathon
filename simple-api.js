import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// In-memory storage for cases and DCA availability
const caseRegistry = new Map();  // caseId -> case object
const allocationQueue = [];      // pending cases to allocate
const dcaWorkload = {            // DCA availability
    'DCA-001': { capacity: 5, current: 2, cases: [] },
    'DCA-002': { capacity: 5, current: 1, cases: [] },
    'DCA-003': { capacity: 5, current: 3, cases: [] },
    'DCA-004': { capacity: 5, current: 0, cases: [] },
};

let caseIdCounter = 1000;

app.use(cors());
app.use(express.json());

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============ CASE INTAKE ENDPOINTS ============

// 1. INGEST NEW CASE (From FedEx)
app.post('/api/cases/ingest', (req, res) => {
    const {
        trackingNumber,
        debtor,
        debtAmount,
        debtAge = 0,
        phone,
        email,
        notes
    } = req.body;
    
    if (!trackingNumber || !debtor || !debtAmount) {
        return res.status(400).json({
            error: 'Missing required fields: trackingNumber, debtor, debtAmount'
        });
    }
    
    const caseId = `FDX-${++caseIdCounter}`;
    const newCase = {
        caseId,
        trackingNumber,
        debtor,
        debtAmount,
        debtAge,
        phone,
        email,
        notes,
        status: 'RECEIVED',
        priority: null,
        allocatedDCA: null,
        allocationScore: null,
        recoveryProbability: null,
        createdAt: new Date().toISOString(),
        prioritizedAt: null,
        allocatedAt: null
    };
    
    // Store case
    caseRegistry.set(caseId, newCase);
    allocationQueue.push(caseId);
    
    console.log(`📥 NEW CASE RECEIVED: ${caseId} | Debtor: ${debtor} | Amount: $${debtAmount}`);
    
    // Trigger auto-allocation
    setTimeout(() => allocatePendingCases(), 100);
    
    res.status(201).json({
        message: 'Case received and queued for allocation',
        caseId,
        caseObject: newCase
    });
});

// 2. GET ALL CASES
app.get('/api/cases', (req, res) => {
    const cases = Array.from(caseRegistry.values());
    const stats = {
        total: cases.length,
        received: cases.filter(c => c.status === 'RECEIVED').length,
        prioritized: cases.filter(c => c.status === 'PRIORITIZED').length,
        allocated: cases.filter(c => c.status === 'ALLOCATED').length
    };
    
    res.json({
        stats,
        cases: cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
});

// 3. GET SINGLE CASE
app.get('/api/cases/:caseId', (req, res) => {
    const caseData = caseRegistry.get(req.params.caseId);
    
    if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
    }
    
    res.json(caseData);
});

// 4. GET PENDING CASES (In Queue)
app.get('/api/cases/queue/pending', (req, res) => {
    const pendingCases = allocationQueue
        .map(caseId => caseRegistry.get(caseId))
        .filter(c => c && c.status !== 'ALLOCATED');
    
    res.json({
        queueLength: pendingCases.length,
        cases: pendingCases
    });
});

// ============ AUTO-ALLOCATION LOGIC ============

function allocatePendingCases() {
    while (allocationQueue.length > 0) {
        const caseId = allocationQueue[0];
        const caseData = caseRegistry.get(caseId);
        
        if (!caseData) {
            allocationQueue.shift();
            continue;
        }
        
        // Step 1: Prioritize the case
        if (caseData.status === 'RECEIVED') {
            prioritizeCase(caseId);
        }
        
        // Step 2: Allocate to DCA
        if (caseData.status === 'PRIORITIZED') {
            const allocated = allocateCase(caseId);
            if (allocated) {
                allocationQueue.shift();
            } else {
                // No available DCAs, keep in queue
                break;
            }
        }
    }
}

function prioritizeCase(caseId) {
    const caseData = caseRegistry.get(caseId);
    const { debtAmount, debtAge } = caseData;
    
    // Smart prioritization logic
    let priority = 'LOW';
    let score = 10;
    
    if (debtAmount > 100000) {
        priority = 'CRITICAL';
        score = 95;
    } else if (debtAmount > 50000 || debtAge > 120) {
        priority = 'HIGH';
        score = 75;
    } else if (debtAmount > 20000 || debtAge > 60) {
        priority = 'MEDIUM';
        score = 50;
    } else {
        priority = 'LOW';
        score = 20;
    }
    
    // Add recovery probability
    const recoveryProbability = (Math.random() * 0.4 + 0.5).toFixed(4);
    
    caseData.priority = priority;
    caseData.recoveryProbability = parseFloat(recoveryProbability);
    caseData.status = 'PRIORITIZED';
    caseData.prioritizedAt = new Date().toISOString();
    
    console.log(`🎯 PRIORITIZED: ${caseId} | ${priority} | Score: ${score} | Recovery: ${recoveryProbability}`);
}

function allocateCase(caseId) {
    const caseData = caseRegistry.get(caseId);
    const { priority, debtAmount } = caseData;
    
    // Find best DCA based on priority and workload
    let bestDCA = null;
    let bestScore = 0;
    
    Object.entries(dcaWorkload).forEach(([dcaId, workload]) => {
        // Check capacity
        if (workload.current >= workload.capacity) return;
        
        // Calculate allocation score (lower workload = higher score)
        const capacityScore = (workload.capacity - workload.current) / workload.capacity;
        
        // Priority multiplier
        const priorityMultiplier = {
            'CRITICAL': 1.5,
            'HIGH': 1.3,
            'MEDIUM': 1.0,
            'LOW': 0.8
        }[priority] || 1.0;
        
        const finalScore = capacityScore * priorityMultiplier * (Math.random() * 0.2 + 0.9);
        
        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestDCA = dcaId;
        }
    });
    
    if (!bestDCA) {
        console.log(`⚠️  No available DCA for ${caseId} - all at capacity`);
        return false;
    }
    
    // Allocate case to DCA
    dcaWorkload[bestDCA].current++;
    dcaWorkload[bestDCA].cases.push(caseId);
    
    caseData.allocatedDCA = bestDCA;
    caseData.allocationScore = bestScore.toFixed(4);
    caseData.status = 'ALLOCATED';
    caseData.allocatedAt = new Date().toISOString();
    
    console.log(`✅ ALLOCATED: ${caseId} → ${bestDCA} (Score: ${bestScore.toFixed(4)}) | Workload: ${dcaWorkload[bestDCA].current}/${dcaWorkload[bestDCA].capacity}`);
    
    return true;
}

// ============ DCA MANAGEMENT ENDPOINTS ============

// 5. GET DCA WORKLOAD STATUS
app.get('/api/dcas/status', (req, res) => {
    const dcaStatus = Object.entries(dcaWorkload).map(([dcaId, workload]) => ({
        dcaId,
        capacity: workload.capacity,
        currentLoad: workload.current,
        availableSlots: workload.capacity - workload.current,
        utilization: ((workload.current / workload.capacity) * 100).toFixed(1) + '%',
        assignedCases: workload.cases
    }));
    
    res.json({
        timestamp: new Date().toISOString(),
        dcas: dcaStatus,
        totalCapacity: dcaStatus.reduce((sum, d) => sum + d.capacity, 0),
        totalUtilization: dcaStatus.reduce((sum, d) => sum + d.currentLoad, 0)
    });
});

// 6. GET DCA CASES
app.get('/api/dcas/:dcaId/cases', (req, res) => {
    const dcaId = req.params.dcaId;
    const workload = dcaWorkload[dcaId];
    
    if (!workload) {
        return res.status(404).json({ error: 'DCA not found' });
    }
    
    const cases = workload.cases.map(caseId => caseRegistry.get(caseId));
    
    res.json({
        dcaId,
        capacity: workload.capacity,
        currentLoad: workload.current,
        cases
    });
});

// 7. MANUAL CASE ALLOCATION (Override)
app.post('/api/cases/:caseId/allocate/:dcaId', (req, res) => {
    const { caseId, dcaId } = req.params;
    const caseData = caseRegistry.get(caseId);
    const workload = dcaWorkload[dcaId];
    
    if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
    }
    
    if (!workload) {
        return res.status(404).json({ error: 'DCA not found' });
    }
    
    // Remove from old allocation if exists
    if (caseData.allocatedDCA && dcaWorkload[caseData.allocatedDCA]) {
        const oldIndex = dcaWorkload[caseData.allocatedDCA].cases.indexOf(caseId);
        if (oldIndex > -1) {
            dcaWorkload[caseData.allocatedDCA].cases.splice(oldIndex, 1);
            dcaWorkload[caseData.allocatedDCA].current--;
        }
    }
    
    // Allocate to new DCA
    caseData.allocatedDCA = dcaId;
    caseData.status = 'ALLOCATED';
    caseData.allocatedAt = new Date().toISOString();
    workload.cases.push(caseId);
    workload.current++;
    
    res.json({
        message: `Case ${caseId} reallocated to ${dcaId}`,
        caseData
    });
});

// ============ EXISTING ENDPOINTS ============

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'mock-inference',
        message: 'FedEx DCA AI Platform API running'
    });
});

// Recovery prediction
app.post('/api/predict/recovery', (req, res) => {
    const { caseAmount = 5000, caseAge = 30, attempts = 2 } = req.body;
    
    res.json({
        caseId: `CASE-${Date.now()}`,
        recoveryProbability: (Math.random() * 0.4 + 0.6).toFixed(4),
        riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        confidence: (Math.random() * 0.3 + 0.7).toFixed(4),
        estimatedRecoveryAmount: (caseAmount * (Math.random() * 0.4 + 0.5)).toFixed(2),
        keyFactors: ['Case Amount', 'Age', 'Recovery History'],
        explanation: 'Prediction based on case amount and historical recovery patterns',
        timestamp: new Date().toISOString()
    });
});

// Case prioritization
app.post('/api/prioritize/case', (req, res) => {
    const { caseAmount = 5000, caseAge = 30 } = req.body;
    
    let priority = 'Medium';
    if (caseAmount > 50000) priority = 'Critical';
    else if (caseAmount > 20000 || caseAge > 60) priority = 'High';
    else if (caseAge > 120) priority = 'Critical';
    
    res.json({
        caseId: `CASE-${Date.now()}`,
        priority: priority,
        score: (Math.random() * 100).toFixed(2),
        reasoning: `High case amount requires priority handling (Amount: $${caseAmount}, Age: ${caseAge} days)`,
        recommendedAction: priority === 'Critical' ? 'Assign immediately' : 'Review in next batch',
        timestamp: new Date().toISOString()
    });
});

// DCA Optimization
app.post('/api/optimize/dca', (req, res) => {
    const { caseAmount = 5000, dcas = [] } = req.body;
    
    res.json({
        optimalDCA: dcas.length > 0 ? dcas[0] : 'DCA-001',
        allocationScore: (Math.random() * 0.3 + 0.7).toFixed(4),
        estimatedResolution: `${Math.floor(Math.random() * 60 + 30)} days`,
        reasoning: 'Allocation based on DCA workload and expertise match',
        timestamp: new Date().toISOString()
    });
});

// Sentiment analysis
app.post('/api/analyze/sentiment', (req, res) => {
    const { text = '' } = req.body;
    
    const hasPositive = text.toLowerCase().match(/good|great|excellent|satisfied|happy/);
    const hasNegative = text.toLowerCase().match(/bad|poor|disappointed|angry|upset/);
    
    let sentiment = 'Neutral';
    if (hasPositive && !hasNegative) sentiment = 'Positive';
    else if (hasNegative && !hasPositive) sentiment = 'Negative';
    
    res.json({
        text: text.substring(0, 100),
        sentiment: sentiment,
        score: (Math.random() * 0.5 + 0.5).toFixed(4),
        keywords: text.split(/\s+/).slice(0, 5),
        timestamp: new Date().toISOString()
    });
});

// Model metrics
app.get('/api/models/metrics', (req, res) => {
    res.json({
        recoveryPredictor: {
            accuracy: '0.8912',
            precision: '0.8654',
            recall: '0.8701',
            f1Score: '0.8677'
        },
        casePrioritizer: {
            accuracy: '0.9123',
            precision: '0.9087',
            recall: '0.9156',
            f1Score: '0.9121'
        },
        dcaOptimizer: {
            allocationAccuracy: '0.8765',
            efficiencyGain: '23.4%'
        },
        sentimentAnalyzer: {
            accuracy: '0.8945',
            precision: '0.8876'
        },
        lastUpdated: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`🚀 Inference API running on port ${port}`);
    console.log(`\n📚 CASE INTAKE & ALLOCATION API:`);
    console.log(`   POST /api/cases/ingest - Ingest new case from FedEx`);
    console.log(`   GET  /api/cases - Get all cases`);
    console.log(`   GET  /api/cases/:caseId - Get single case`);
    console.log(`   GET  /api/cases/queue/pending - Get pending cases`);
    console.log(`   GET  /api/dcas/status - Get DCA workload status`);
    console.log(`   GET  /api/dcas/:dcaId/cases - Get cases for specific DCA`);
    console.log(`   POST /api/cases/:caseId/allocate/:dcaId - Manual allocation`);
    console.log(`\n💾 LEGACY ENDPOINTS:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   GET  /api/models/metrics - Model metrics`);
    console.log(`   POST /api/predict/recovery - Predict recovery probability`);
    console.log(`   POST /api/prioritize/case - Get case priority`);
    console.log(`   POST /api/optimize/dca - Optimize DCA allocation`);
    console.log(`   POST /api/analyze/sentiment - Analyze text sentiment`);
    console.log(`\n✨ API ready! Send POST /api/cases/ingest to test.`);
});
