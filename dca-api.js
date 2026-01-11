import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;



// =============== DATABASE SIMULATION ===============
const users = new Map([
    ['admin@fedex.com', { password: 'admin123', role: 'ADMIN', name: 'Admin User', company: 'FedEx' }],
    ['dca1@company.com', { password: 'dca123', role: 'DCA', name: 'DCA Agent 1', company: 'DCA Corp', dcaId: 'DCA-001' }],
    ['dca2@company.com', { password: 'dca123', role: 'DCA', name: 'DCA Agent 2', company: 'DCA Corp', dcaId: 'DCA-002' }],
    ['fedex@company.com', { password: 'fedex123', role: 'FEDEX', name: 'FedEx Case Manager', company: 'FedEx' }],
]);

const sessions = new Map();
const caseRegistry = new Map();
const dcaProfiles = new Map([
    ['DCA-001', {
        dcaId: 'DCA-001',
        name: 'John Smith',
        capacity: 5,
        currentLoad: 0,
        historicalRecoveryRate: 0.82,
        specialization: ['High-Value', 'Corporate'],
        geoRegion: 'North-East',
        complianceScore: 0.95,
        cases: [],
        slaBreaches: 0,
        recoveredAmount: 450000,
        averageResolutionDays: 22
    }],
    ['DCA-002', {
        dcaId: 'DCA-002',
        name: 'Sarah Johnson',
        capacity: 5,
        currentLoad: 0,
        historicalRecoveryRate: 0.78,
        specialization: ['Small-Medium', 'Individuals'],
        geoRegion: 'South-West',
        complianceScore: 0.88,
        cases: [],
        slaBreaches: 1,
        recoveredAmount: 320000,
        averageResolutionDays: 28
    }],
    ['DCA-003', {
        dcaId: 'DCA-003',
        name: 'Mike Davis',
        capacity: 5,
        currentLoad: 0,
        historicalRecoveryRate: 0.75,
        specialization: ['Disputed', 'Complex'],
        geoRegion: 'Central',
        complianceScore: 0.92,
        cases: [],
        slaBreaches: 0,
        recoveredAmount: 280000,
        averageResolutionDays: 35
    }],
    ['DCA-004', {
        dcaId: 'DCA-004',
        name: 'Emma Wilson',
        capacity: 5,
        currentLoad: 0,
        historicalRecoveryRate: 0.80,
        specialization: ['Collections', 'Escalations'],
        geoRegion: 'West-Coast',
        complianceScore: 0.90,
        cases: [],
        slaBreaches: 0,
        recoveredAmount: 410000,
        averageResolutionDays: 24
    }]
]);

const sopRules = {
    CASE_HANDLING: [
        'Access only assigned cases',
        'Verify customer identity before discussion',
        'Clearly explain invoice and dues',
        'Update case status after every interaction'
    ],
    COMMUNICATION: [
        'Use professional, non-harassing language',
        'Contact only during permitted hours (9 AM - 6 PM)',
        'Use approved channels (call/email/SMS)',
        'Log all communications in the system'
    ],
    ESCALATION: [
        'Mark disputed cases within 24 hours',
        'Escalate after SLA breach',
        'Route legal cases to specialized DCA',
        'Document escalation reason'
    ],
    DATA_SECURITY: [
        'No data downloads or screenshots',
        'Role-based access enforcement',
        'Mandatory activity logging',
        'Encryption of sensitive data'
    ],
    COMPLIANCE: [
        'Follow country-specific debt collection laws',
        'Maintain compliance scoring',
        'Report violations',
        'Violations reduce future allocation'
    ]
};

const slaConfig = {
    CRITICAL: { firstActionHours: 24, followUpDays: 2, resolutionDays: 7 },
    HIGH: { firstActionHours: 48, followUpDays: 3, resolutionDays: 15 },
    MEDIUM: { firstActionHours: 72, followUpDays: 4, resolutionDays: 20 },
    LOW: { firstActionHours: 96, followUpDays: 7, resolutionDays: 30 }
};

let caseIdCounter = 1000;

// =============== MIDDLEWARE ===============
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// =============== AUTHENTICATION ===============
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.get(email);

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    sessions.set(sessionId, { email, role: user.role, name: user.name, timestamp: Date.now() });

    res.json({
        sessionId,
        user: { email, role: user.role, name: user.name, company: user.company, dcaId: user.dcaId }
    });
});

function verifySession(req) {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
        return null;
    }
    return sessions.get(sessionId);
}

// =============== CASE MANAGEMENT ===============
app.post('/api/cases/ingest', (req, res) => {
    const session = verifySession(req);
    if (!session || session.role !== 'FEDEX') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { trackingNumber, debtor, debtAmount, debtAge, phone, email, notes, geoRegion } = req.body;

    const caseId = `FDX-${++caseIdCounter}`;
    const riskLevel = assessRisk(debtAmount, debtAge);

    const newCase = {
        caseId,
        trackingNumber,
        debtor,
        debtAmount,
        debtAge,
        phone,
        email,
        notes,
        geoRegion: geoRegion || 'Unknown',
        status: 'RECEIVED',
        riskLevel,
        recoveryProbability: calculateRecoveryProbability(debtAmount, debtAge),
        priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][riskLevel],
        allocatedDCA: null,
        allocationScore: null,
        createdAt: new Date().toISOString(),
        slaDeadlines: null,
        slaBreached: false,
        interactions: [],
        documents: [],
        disputes: [],
        auditTrail: [{
            action: 'CASE_CREATED',
            user: session.email,
            timestamp: new Date().toISOString(),
            details: 'Case received from FedEx'
        }]
    };

    caseRegistry.set(caseId, newCase);
    allocateCaseIntelligently(caseId);

    res.status(201).json({ message: 'Case ingested', caseId, case: newCase });
});

function assessRisk(amount, age) {
    if (amount > 100000 || age > 180) return 0; // CRITICAL
    if (amount > 50000 || age > 120) return 1;  // HIGH
    if (amount > 20000 || age > 60) return 2;   // MEDIUM
    return 3;                                    // LOW
}

function calculateRecoveryProbability(amount, age) {
    // P(recovery) = (1 - age_factor) * (1 - amount_factor) + random noise
    const ageFactor = Math.min(age / 360, 0.5); // Max 50% reduction from age
    const amountFactor = Math.min(amount / 500000, 0.4); // Max 40% reduction from amount
    const base = (1 - ageFactor) * (1 - amountFactor);
    const noise = (Math.random() * 0.15 - 0.075); // ±7.5% noise
    return Math.max(0.2, Math.min(1, base + noise));
}

function allocateCaseIntelligently(caseId) {
    const caseData = caseRegistry.get(caseId);
    const riskIndex = caseData.recoveryProbability;

    let bestDCA = null;
    let bestScore = -Infinity;
    const candidateDetails = [];

    dcaProfiles.forEach((dca) => {
        if (dca.currentLoad >= dca.capacity) return;

        // DCA Suitability Score
        const w1 = 0.3, w2 = 0.25, w3 = 0.2, w4 = 0.15, w5 = 0.1;

        const historicalScore = dca.historicalRecoveryRate;
        const specializationMatch = caseData.priority === 'CRITICAL' && dca.specialization.includes('High-Value') ? 1 : 0.7;
        const geoMatch = dca.geoRegion === caseData.geoRegion ? 1 : 0.8;
        const loadPenalty = dca.currentLoad / dca.capacity;
        const complianceRisk = 1 - dca.complianceScore;

        const dcaScore = (w1 * historicalScore) + (w2 * specializationMatch) + (w3 * geoMatch) - 
                        (w4 * loadPenalty) - (w5 * complianceRisk);

        // Business Priority Factor
        const priorityFactor = { CRITICAL: 1.5, HIGH: 1.3, MEDIUM: 1.0, LOW: 0.8 }[caseData.priority];

        // Final Assignment Score
        const finalScore = riskIndex * dcaScore * priorityFactor;

        candidateDetails.push({
            dcaId: dca.dcaId,
            dcaScore: Number(dcaScore.toFixed(4)),
            priorityFactor,
            finalScore: Number(finalScore.toFixed(6))
        });

        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestDCA = dca;
        }
    });

    if (bestDCA) {
        caseData.allocatedDCA = bestDCA.dcaId;
        caseData.allocationScore = bestScore.toFixed(4);
        caseData.allocationCandidates = candidateDetails;
        caseData.allocationChosen = { dcaId: bestDCA.dcaId, score: Number(bestScore.toFixed(6)) };
        caseData.status = 'ALLOCATED';

        // Set SLA deadlines
        const riskKey = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][assessRisk(caseData.debtAmount, caseData.debtAge)];
        const sla = slaConfig[riskKey];
        const now = new Date();

        caseData.slaDeadlines = {
            firstAction: new Date(now.getTime() + sla.firstActionHours * 3600000).toISOString(),
            followUp: new Date(now.getTime() + sla.followUpDays * 24 * 3600000).toISOString(),
            resolution: new Date(now.getTime() + sla.resolutionDays * 24 * 3600000).toISOString()
        };

        bestDCA.currentLoad++;
        bestDCA.cases.push(caseId);

        caseData.auditTrail.push({
            action: 'CASE_ALLOCATED',
            user: 'SYSTEM',
            timestamp: new Date().toISOString(),
            details: `Allocated to ${bestDCA.dcaId} with score ${bestScore.toFixed(4)}`
        });

        console.log(`✅ ALLOCATED: ${caseId} → ${bestDCA.dcaId} (Score: ${bestScore.toFixed(4)})`);
    }
}

// =============== CASE ENDPOINTS ===============
app.get('/api/cases', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    let cases = Array.from(caseRegistry.values());

    // Filter by role
    if (session.role === 'DCA') {
        const userDCA = users.get(session.email).dcaId;
        cases = cases.filter(c => c.allocatedDCA === userDCA);
    }

    res.json({
        stats: {
            total: cases.length,
            critical: cases.filter(c => c.priority === 'CRITICAL').length,
            breached: cases.filter(c => c.slaBreached).length,
            resolved: cases.filter(c => c.status === 'RESOLVED').length
        },
        cases
    });
});

app.get('/api/cases/:caseId', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    res.json(caseData);
});

// =============== DCA ENDPOINTS ===============
app.get('/api/dcas', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const dcas = Array.from(dcaProfiles.values()).map(dca => ({
        dcaId: dca.dcaId,
        name: dca.name,
        capacity: dca.capacity,
        currentLoad: dca.currentLoad,
        utilizationRate: ((dca.currentLoad / dca.capacity) * 100).toFixed(1) + '%',
        historicalRecoveryRate: (dca.historicalRecoveryRate * 100).toFixed(1) + '%',
        complianceScore: (dca.complianceScore * 100).toFixed(1) + '%',
        slaBreaches: dca.slaBreaches,
        recoveredAmount: dca.recoveredAmount,
        averageResolutionDays: dca.averageResolutionDays
    }));

    res.json(dcas);
});

// =============== SOP & COMPLIANCE ===============
app.get('/api/sops', (req, res) => {
    res.json(sopRules);
});

app.post('/api/cases/:caseId/interaction', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const { type, details, result } = req.body;

    caseData.interactions.push({
        type, // CALL, EMAIL, SMS, VISIT
        details,
        result, // SUCCESS, CALLBACK, DISPUTE, NO_ANSWER
        timestamp: new Date().toISOString(),
        dcaId: users.get(session.email).dcaId
    });

    // Check SOP compliance
    if (type === 'CALL' && !isWithinPermittedHours()) {
        caseData.auditTrail.push({
            action: 'SOP_VIOLATION',
            user: session.email,
            timestamp: new Date().toISOString(),
            details: 'Contact outside permitted hours'
        });
    }

    if (result === 'DISPUTE') {
        caseData.disputes.push({
            reason: details,
            createdAt: new Date().toISOString(),
            status: 'PENDING'
        });
    }

    caseData.status = 'IN_PROGRESS';
    caseData.auditTrail.push({
        action: 'INTERACTION_LOGGED',
        user: session.email,
        timestamp: new Date().toISOString(),
        details: `${type} interaction: ${result}`
    });

    

    res.json({ message: 'Interaction logged', case: caseData });
});

function isWithinPermittedHours() {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 18;
}

app.post('/api/cases/:caseId/document', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const { fileName, type, content } = req.body;

    caseData.documents.push({
        docId: crypto.randomBytes(8).toString('hex'),
        fileName,
        type, // PAYMENT_PROOF, NOTE, LEGAL, OTHER
        uploadedBy: session.email,
        uploadedAt: new Date().toISOString(),
        contentPreview: content.substring(0, 200)
    });

    caseData.auditTrail.push({
        action: 'DOCUMENT_UPLOADED',
        user: session.email,
        timestamp: new Date().toISOString(),
        details: `Document: ${fileName}`
    });

    res.json({ message: 'Document uploaded', case: caseData });
});

// =============== SLA & MONITORING ===============
app.get('/api/sla/status', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const now = new Date();
    const slaStatus = [];

    caseRegistry.forEach((caseData, caseId) => {
        if (caseData.status === 'RESOLVED' || !caseData.slaDeadlines) return;

        const breached = now > new Date(caseData.slaDeadlines.resolution);
        if (breached) {
            caseData.slaBreached = true;
            
            // Apply penalty
            if (caseData.allocatedDCA) {
                const dca = dcaProfiles.get(caseData.allocatedDCA);
                if (dca) dca.slaBreaches++;
            }
            
        }

        slaStatus.push({
            caseId: caseData.caseId,
            debtor: caseData.debtor,
            priority: caseData.priority,
            allocatedDCA: caseData.allocatedDCA,
            slaDeadlines: caseData.slaDeadlines,
            breached,
            hoursRemaining: Math.max(0, 
                (new Date(caseData.slaDeadlines.resolution) - now) / 3600000
            ).toFixed(1)
        });
    });

    res.json(slaStatus);
});

// =============== AUDIT TRAIL ===============
app.get('/api/audit/:caseId', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    res.json({
        caseId: req.params.caseId,
        auditTrail: caseData.auditTrail
    });
});

// =============== ESCALATION ===============
app.post('/api/cases/:caseId/escalate', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const { reason, targetRole } = req.body;

    caseData.status = 'ESCALATED';
    caseData.auditTrail.push({
        action: 'ESCALATION',
        user: session.email,
        timestamp: new Date().toISOString(),
        details: `Escalated to ${targetRole}: ${reason}`
    });

    res.json({ message: 'Case escalated', case: caseData });
});

// =============== RESOLUTION ===============
app.post('/api/cases/:caseId/resolve', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const { resolutionType, recoveredAmount, notes } = req.body;

    caseData.status = 'RESOLVED';
    caseData.resolutionType = resolutionType; // RECOVERED, WRITTEN_OFF, SETTLED
    caseData.recoveredAmount = recoveredAmount || 0;
    caseData.resolvedAt = new Date().toISOString();

    // Update DCA stats
    if (caseData.allocatedDCA) {
        const dca = dcaProfiles.get(caseData.allocatedDCA);
        if (dca && recoveredAmount) {
            dca.recoveredAmount += recoveredAmount;
        }
    }

    caseData.auditTrail.push({
        action: 'CASE_RESOLVED',
        user: session.email,
        timestamp: new Date().toISOString(),
        details: `${resolutionType}: $${recoveredAmount} recovered. ${notes}`
    });

    res.json({ message: 'Case resolved', case: caseData });
});

// =============== SERVE DASHBOARD ===============
// Dashboard route removed to keep API-only mode

// =============== METRICS / REPORTS ===============
app.get('/api/cases/:caseId/report', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const caseData = caseRegistry.get(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const report = {
        caseId: caseData.caseId,
        recoveryProbability: caseData.recoveryProbability,
        priority: caseData.priority,
        allocationScore: caseData.allocationScore,
        allocationChosen: caseData.allocationChosen || null,
        allocationCandidates: caseData.allocationCandidates || [],
        slaDeadlines: caseData.slaDeadlines,
        slaBreached: caseData.slaBreached,
        status: caseData.status,
        interactions: caseData.interactions,
        documents: caseData.documents,
        auditTrail: caseData.auditTrail,
        recoveredAmount: caseData.recoveredAmount || 0
    };

    res.json(report);
});

app.get('/api/metrics', (req, res) => {
    const session = verifySession(req);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const cases = Array.from(caseRegistry.values());
    const resolved = cases.filter(c => c.status === 'RESOLVED');

    // Compute prediction vs outcome stats (use recoveredAmount>0 as positive outcome)
    const n = resolved.length;
    let mae = 0, mse = 0, successfulAllocations = 0, allocScoresSum = 0, allocChosenCount = 0;

    resolved.forEach(c => {
        const actual = c.recoveredAmount && c.recoveredAmount > 0 ? 1 : 0;
        const pred = typeof c.recoveryProbability === 'number' ? c.recoveryProbability : (parseFloat(c.recoveryProbability) || 0);
        const err = Math.abs(pred - actual);
        mae += err;
        mse += (pred - actual) * (pred - actual);
        if (actual === 1 && c.allocatedDCA) successfulAllocations++;
        if (c.allocationChosen && typeof c.allocationChosen.score === 'number') {
            allocScoresSum += c.allocationChosen.score;
            allocChosenCount++;
        }
    });

    const recoveryPredictionMAE = n ? Number((mae / n).toFixed(4)) : 0;
    const recoveryPredictionRMSE = n ? Number(Math.sqrt(mse / n).toFixed(4)) : 0;
    const allocationSuccessRate = n ? Number((successfulAllocations / n).toFixed(4)) : 0;
    const avgAllocationScore = allocChosenCount ? Number((allocScoresSum / allocChosenCount).toFixed(6)) : 0;

    const perDCA = Array.from(dcaProfiles.values()).map(dca => ({
        dcaId: dca.dcaId,
        name: dca.name,
        currentLoad: dca.currentLoad,
        slaBreaches: dca.slaBreaches,
        recoveredAmount: dca.recoveredAmount,
        historicalRecoveryRate: dca.historicalRecoveryRate
    }));

    res.json({
        totalCases: cases.length,
        resolvedCases: n,
        recoveryPredictionMAE,
        recoveryPredictionRMSE,
        allocationSuccessRate,
        avgAllocationScore,
        perDCA
    });
});

// =============== START SERVER ===============
app.listen(port, () => {
    console.log(`\n🚀 DCA Platform API running on port ${port}`);
    console.log(`📚 Endpoints available`);
    console.log(``);
});
