import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  HardDrive,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileJson,
  DollarSign,
  ArrowRight,
  Download,
  Upload,
  Trash2,
  MapPin,
  Truck,
  Database,
  BarChart2,
  Info,
  Calendar,
  Layers,
  Settings,
  X,
  AlertCircle,
  UserCheck,
  ShoppingBag,
  BookOpen,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QualityGrade,
  HarvesterRecord,
  ProcessingBatch,
  OutboundConsignment,
  Vendor,
  SyncPayload,
  ZIM_REGIONS,
  ETHICAL_BASE_PRICES,
  SACHET_RETAIL_PRICE,
  SACHET_VENDOR_COST,
  TARGET_MARGIN_MIN,
  TARGET_MARGIN_MAX
} from './types';
import {
  INITIAL_HARVESTERS,
  INITIAL_VENDORS,
  INITIAL_HUBS,
  INITIAL_DISPATCHERS,
  HISTORICAL_HARVESTS,
  HISTORICAL_BATCHES,
  HISTORICAL_CONSIGNMENTS
} from './initialData';

export default function App() {
  // Operational State (Synced Server State)
  const [syncedHarvests, setSyncedHarvests] = useState<HarvesterRecord[]>(() => {
    const saved = localStorage.getItem('akudha_synced_harvests');
    return saved ? JSON.parse(saved) : HISTORICAL_HARVESTS;
  });

  const [syncedBatches, setSyncedBatches] = useState<ProcessingBatch[]>(() => {
    const saved = localStorage.getItem('akudha_synced_batches');
    return saved ? JSON.parse(saved) : HISTORICAL_BATCHES;
  });

  const [syncedConsignments, setSyncedConsignments] = useState<OutboundConsignment[]>(() => {
    const saved = localStorage.getItem('akudha_synced_consignments');
    return saved ? JSON.parse(saved) : HISTORICAL_CONSIGNMENTS;
  });

  // Offline / Online Status
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Simulated Service Worker Pending Queue
  const [offlineQueue, setOfflineQueue] = useState<SyncPayload[]>(() => {
    const saved = localStorage.getItem('akudha_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // Client State for Inputs
  const [activeTab, setActiveTab] = useState<'harvest' | 'process' | 'distribute' | 'diagnostics' | 'backlog' | 'schemas'>('harvest');
  const [backlogFilter, setBacklogFilter] = useState<'all' | 'sourcing' | 'processing' | 'distribution'>('all');
  const [expandedStory, setExpandedStory] = useState<string | null>('AKU-101');
  const [activeSchemaView, setActiveSchemaView] = useState<'sourcing' | 'processing' | 'vendor'>('sourcing');

  // Mongoose Sandbox States
  const [sandboxSourcingWeight, setSandboxSourcingWeight] = useState<string>('45.0');
  const [sandboxSourcingGrade, setSandboxSourcingGrade] = useState<'A' | 'B' | 'C'>('A');
  const [sandboxSourcingPayout, setSandboxSourcingPayout] = useState<string>('67.50');
  const [sandboxSourcingSyncId, setSandboxSourcingSyncId] = useState<string>('');
  const [sandboxSourcingDuplicate, setSandboxSourcingDuplicate] = useState<boolean>(false);
  const [sandboxSourcingResult, setSandboxSourcingResult] = useState<{success: boolean; message: string; data?: any} | null>(null);

  const [sandboxBatchWeight, setSandboxBatchWeight] = useState<string>('25.0');
  const [sandboxBatchSachets, setSandboxBatchSachets] = useState<string>('250');
  const [sandboxBatchResult, setSandboxBatchResult] = useState<{success: boolean; message: string; data?: any} | null>(null);

  const [sandboxVendorDispatched, setSandboxVendorDispatched] = useState<string>('80');
  const [sandboxVendorReturned, setSandboxVendorReturned] = useState<string>('2');
  const [sandboxVendorSold, setSandboxVendorSold] = useState<string>('75');
  const [sandboxVendorResult, setSandboxVendorResult] = useState<{success: boolean; message: string; data?: any} | null>(null);

  const runSandboxSourcing = () => {
    const weight = parseFloat(sandboxSourcingWeight);
    const grade = sandboxSourcingGrade;
    const payout = parseFloat(sandboxSourcingPayout);
    
    if (isNaN(weight) || weight <= 0) {
      setSandboxSourcingResult({ success: false, message: 'ValidationError: weightKg: Weight must be a positive number.' });
      return;
    }
    if (isNaN(payout) || payout <= 0) {
      setSandboxSourcingResult({ success: false, message: 'ValidationError: payoutUsd: Payout must be a positive number.' });
      return;
    }

    // 1. Ethical audit check
    let minPremium = 0.7;
    if (grade === 'A') minPremium = 1.5;
    else if (grade === 'B') minPremium = 1.0;

    const minimumFairPayout = weight * minPremium;
    if (payout < minimumFairPayout - 0.01) {
      setSandboxSourcingResult({
        success: false,
        message: `ValidationError: payoutUsd: ETHICAL AUDIT FAILED: Input payout ($${payout.toFixed(2)} USD) is below the minimum fair premium floor of $${minimumFairPayout.toFixed(2)} USD for Grade ${grade} ($${minPremium.toFixed(2)}/kg). Harvest gatherer must be fairly compensated.`
      });
      return;
    }

    // 2. Idempotency duplication pre-save validation
    if (sandboxSourcingDuplicate) {
      setSandboxSourcingResult({
        success: false,
        message: `MongoError: IDEMPOTENCY CONFLICT: A sourcing transaction with syncId "${sandboxSourcingSyncId || 'sync_id_dummy'}" has already been processed and logged in the central Zimbabwean Ledger.`
      });
      return;
    }

    // Success simulation
    setSandboxSourcingResult({
      success: true,
      message: 'Mongoose Validation Passed. Document successfully committed to MongoDB.',
      data: {
        harvesterId: 'H-001',
        name: 'Seke Rural Cooperative',
        region: 'Chimanimani',
        phone: '+263 77 123 4567',
        weightKg: weight,
        qualityGrade: grade,
        payoutUsd: payout,
        offlineCreatedAt: new Date().toISOString(),
        syncId: sandboxSourcingSyncId || 'sync_zimbabwe_' + Math.random().toString(36).substring(2, 9),
        _id: '64a938b29ce8ad2a74ff89' + Math.floor(Math.random() * 90)
      }
    });
  };

  const runSandboxBatch = () => {
    const weight = parseFloat(sandboxBatchWeight);
    const sachetCount = parseInt(sandboxBatchSachets);

    if (isNaN(weight) || weight < 1) {
      setSandboxBatchResult({ success: false, message: 'ValidationError: inputRawWeightKg: Minimum input weight for batch operations is 1 kg.' });
      return;
    }
    if (isNaN(sachetCount) || sachetCount < 0) {
      setSandboxBatchResult({ success: false, message: 'ValidationError: outputSachetCount: Completed sachet count cannot be negative.' });
      return;
    }

    // Compute wastage loss relative to baseline 10 sachets / 1kg standard
    const actualRatio = sachetCount / weight;
    const optimalRatio = 10.0;
    let wastage = 0;
    if (actualRatio < optimalRatio) {
      const expectedSachets = weight * optimalRatio;
      const lossCount = expectedSachets - sachetCount;
      wastage = Math.round((lossCount / expectedSachets) * 100 * 100) / 100;
    }

    setSandboxBatchResult({
      success: true,
      message: 'Mongoose Pre-Save: Auto Calculations and validations executed.',
      data: {
        batchId: 'B-BATCH-' + Math.floor(Math.random() * 900 + 100),
        inputRawWeightKg: weight,
        outputSachetCount: sachetCount,
        wastageLossPercentage: wastage,
        operatorId: 'OP-CHIMAN',
        processingDate: new Date().toISOString(),
        _id: '64a938b29ce8ad2a74ee41' + Math.floor(Math.random() * 90)
      }
    });
  };

  const runSandboxVendor = () => {
    const dispatched = parseInt(sandboxVendorDispatched);
    const returned = parseInt(sandboxVendorReturned);
    const sold = parseInt(sandboxVendorSold);

    if (isNaN(dispatched) || dispatched < 1) {
      setSandboxVendorResult({ success: false, message: 'ValidationError: sachetsDispatched: Must dispatch at least 1 sachet.' });
      return;
    }
    if (isNaN(returned) || returned < 0) {
      setSandboxVendorResult({ success: false, message: 'ValidationError: sachetsReturnedSpoiled: Returned counts cannot be negative.' });
      return;
    }
    if (isNaN(sold) || sold < 0) {
      setSandboxVendorResult({ success: false, message: 'ValidationError: sachetsSold: Sold counts cannot be negative.' });
      return;
    }

    // Sum validation Gherkin check
    if ((sold + returned) > dispatched) {
      setSandboxVendorResult({
        success: false,
        message: 'ValidationError: QUANTITY INCONSISTENCY: The sum of sold sachets and returned/spoiled assets cannot exceed raw initialized dispatches.'
      });
      return;
    }

    // Finance calculations
    const retailPrice = 0.50;
    const wholesaleCost = 0.25;
    const marginPerSachet = 0.25;

    const grossCollectedUsd = sold * retailPrice;
    const grossProfit = sold * marginPerSachet;
    const spoilageDebit = returned * wholesaleCost;
    const netVendorMarginUsd = Math.round((grossProfit - spoilageDebit) * 100) / 100;

    // Status auto auditing
    const cumulative = sold + returned;
    let status: 'DISPATCHED' | 'SETTLED' | 'AUDIT_REQUIRED' | 'SHORTFALL' = 'DISPATCHED';
    if (cumulative < dispatched) {
      status = 'SHORTFALL';
    } else if (cumulative > dispatched) {
      status = 'AUDIT_REQUIRED';
    } else {
      status = 'SETTLED';
    }

    setSandboxVendorResult({
      success: true,
      message: 'Mongoose Pre-Save: Calculated gross turnover and net vendor margin, automated audit tags.',
      data: {
        dispatchId: 'DIS-' + Math.floor(Math.random() * 9000 + 1000),
        vendorId: 'V-MERCY',
        hubLocation: 'HUB-HARARE',
        sachetsDispatched: dispatched,
        sachetsReturnedSpoiled: returned,
        sachetsSold: sold,
        grossCollectedUsd,
        netVendorMarginUsd,
        status,
        _id: '64a938b29ce8ad2a74dd21' + Math.floor(Math.random() * 90)
      }
    });
  };

  // Interactive User Story Action simulator. Switch tabs and pre-fill form data to execute story scenarios live
  const runStorySimulation = (storyId: string) => {
    if (storyId === 'AKU-101') {
      setActiveTab('harvest');
      setHarvestWeight('45.0');
      setHarvestGrade(QualityGrade.A);
      setHarvestPayout('67.50');
      setHarvestRegion('Chimanimani');
      setHarvestHarvesterId('H-001');
      addLog("Scenario Sourced: 45.0kg Grade A in Chimanimani. Simulated offline or online state.", "info");
    } else if (storyId === 'AKU-102') {
      // Simulate multiple pending synchronization ledger records
      setActiveTab('harvest');
      setIsOnline(false);
      // Let's seed 3 offline records if queue is empty
      if (offlineQueue.length === 0) {
        const fakeHarvestRecord = {
          harvester_id: 'H-002',
          harvester_name: 'Mudzi Cooperative',
          region: 'Mudzi',
          raw_weight_kg: 50.0,
          quality_grade: QualityGrade.B,
          payout_amount_usd: 50.00,
          idempotent_uuid: `harv_demo_${Math.random().toString(36).substring(2, 6)}`,
          offline_created_at: new Date().toISOString(),
          is_synced: false
        };
        const syncObj: SyncPayload = {
          uuid: fakeHarvestRecord.idempotent_uuid,
          type: 'HARVEST',
          action: 'CREATE',
          payload: fakeHarvestRecord,
          offline_created_at: fakeHarvestRecord.offline_created_at,
          status: 'PENDING'
        };
        setOfflineQueue([syncObj]);
        addLog("Scenario Sourced: Switched network OFFLINE and seeded 1 pending record for Mudzi.", "warn");
      } else {
        addLog("Scenario Sourced: Placed app in OFFLINE mode. Press TOGGLE LIFE and SYNC when ready.", "info");
      }
    } else if (storyId === 'AKU-201') {
      setActiveTab('process');
      setProcessRawWeight('25.0');
      setProcessSachetsProduced('250');
      addLog("Scenario Sourced: Convert 25.0kg of raw pulp into 250 sachets (Optimum 10x ratio).", "info");
    } else if (storyId === 'AKU-202') {
      setActiveTab('process');
      setProcessRawWeight('25.0');
      setProcessSachetsProduced('180');
      addLog("Scenario Sourced: Convert 25.0kg pulp into 180 sachets (Anomaly variance alert).", "warn");
    } else if (storyId === 'AKU-301') {
      setActiveTab('distribute');
      setDistDispatched('80');
      setDistReturned('2');
      setDistSold('75');
      setDistVendorId('V-101');
      setDistHubId('HUB-HARARE');
      addLog("Scenario Sourced: Dispatched 80 units, 2 returns, 75 sold (Sustenance calculations loaded).", "info");
    } else if (storyId === 'AKU-302') {
      setActiveTab('distribute');
      setDistDispatched('20');
      setDistReturned('4');
      setDistSold('15');
      setDistVendorId('V-102');
      setDistHubId('HUB-HARARE');
      addLog("Scenario Sourced: Low Volume margin - 20 dispatched, 4 returns, 15 sold (Below Target alert).", "warn");
    }
  };

  const [simulatedDelay, setSimulatedDelay] = useState<number>(800); // ms
  const [systemLogs, setSystemLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>>([
    { time: new Date().toLocaleTimeString(), text: 'Akudha Agri-Logistics Engine Initialized.', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: 'Offline-First Service Worker active: IDB cached.', type: 'success' }
  ]);

  // Selected Active Payload for Details Inspector
  const [inspectedPayload, setInspectedPayload] = useState<SyncPayload | null>(null);

  // Inventories computed in real time from synced & local records
  const [rawPulpStockKg, setRawPulpStockKg] = useState<number>(315.5);
  const [processedSachetsStock, setProcessedSachetsStock] = useState<number>(420);

  // --- RE-CALCULATE INVENTORIES LIVE ---
  useEffect(() => {
    // Standard starting warehouse baseline
    // Every confirmed/synced harvest ADDs to raw pulp inventory
    // Every confirmed/synced batch DESTRUCTIVELY subtracts raw pulp and grows sachet inventory
    // Every consignment SUBTRACTS from sachet inventory
    let rawPulp = 400.0; // Starting baseline
    let sachets = 250;   // Starting baseline

    syncedHarvests.forEach(h => {
      rawPulp += h.raw_weight_kg;
    });

    syncedBatches.forEach(b => {
      rawPulp -= b.raw_weight_kg;
      sachets += b.total_175ml_sachets_produced;
    });

    syncedConsignments.forEach(c => {
      sachets -= c.sachets_dispatched;
    });

    // Also include pending sync items so the UI feels responsive & consistent immediately
    offlineQueue.forEach(q => {
      if (q.status === 'PENDING') {
        if (q.type === 'HARVEST') {
          rawPulp += q.payload.raw_weight_kg;
        } else if (q.type === 'PROCESSING') {
          rawPulp -= q.payload.raw_weight_kg;
          sachets += q.payload.total_175ml_sachets_produced;
        } else if (q.type === 'CONSIGNMENT') {
          sachets -= q.payload.sachets_dispatched;
        }
      }
    });

    setRawPulpStockKg(Math.max(0, parseFloat(rawPulp.toFixed(2))));
    setProcessedSachetsStock(Math.max(0, Math.floor(sachets)));
  }, [syncedHarvests, syncedBatches, syncedConsignments, offlineQueue]);

  // Sync state helpers
  useEffect(() => {
    localStorage.setItem('akudha_synced_harvests', JSON.stringify(syncedHarvests));
    localStorage.setItem('akudha_synced_batches', JSON.stringify(syncedBatches));
    localStorage.setItem('akudha_synced_consignments', JSON.stringify(syncedConsignments));
    localStorage.setItem('akudha_offline_queue', JSON.stringify(offlineQueue));
  }, [syncedHarvests, syncedBatches, syncedConsignments, offlineQueue]);

  // Logging Helper
  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setSystemLogs(prev => [{ time: new Date().toLocaleTimeString(), text, type }, ...prev].slice(0, 50));
  };

  // --- HARVEST FORM STATE ---
  const [harvestHarvesterId, setHarvestHarvesterId] = useState<string>('H-001');
  const [harvestRegion, setHarvestRegion] = useState<string>('Chimanimani');
  const [harvestWeight, setHarvestWeight] = useState<string>('45.0');
  const [harvestGrade, setHarvestGrade] = useState<QualityGrade>(QualityGrade.A);
  const [harvestPayout, setHarvestPayout] = useState<string>('67.50');
  const [harvestAutoPrice, setHarvestAutoPrice] = useState<boolean>(true);
  const [harvestFormError, setHarvestFormError] = useState<string | null>(null);

  // Auto-calculate payout based on fair-wage rules
  useEffect(() => {
    if (harvestAutoPrice) {
      const weight = parseFloat(harvestWeight) || 0;
      const rate = ETHICAL_BASE_PRICES[harvestGrade];
      setHarvestPayout((weight * rate).toFixed(2));
    }
  }, [harvestWeight, harvestGrade, harvestAutoPrice]);

  // --- PROCESSING FORM STATE ---
  const [processRawWeight, setProcessRawWeight] = useState<string>('25.0');
  const [processSachetsProduced, setProcessSachetsProduced] = useState<string>('250');
  const [processFormError, setProcessFormError] = useState<string | null>(null);

  // Standard yield calculations
  const [processYieldRatio, setProcessYieldRatio] = useState<number>(10);
  const [processYieldDeviation, setProcessYieldDeviation] = useState<number>(0);
  const [processYieldAnomalous, setProcessYieldAnomalous] = useState<boolean>(false);

  useEffect(() => {
    const raw = parseFloat(processRawWeight) || 0;
    const sachets = parseInt(processSachetsProduced) || 0;
    if (raw > 0) {
      const ratio = sachets / raw;
      setProcessYieldRatio(parseFloat(ratio.toFixed(2)));
      
      // Deviation from benchmark (exactly 10 sachets per 1kg)
      const dev = ((ratio - 10) / 10) * 100;
      setProcessYieldDeviation(parseFloat(dev.toFixed(1)));
      setProcessYieldAnomalous(ratio < 8.5 || ratio > 11.5);
    } else {
      setProcessYieldRatio(0);
      setProcessYieldDeviation(0);
      setProcessYieldAnomalous(false);
    }
  }, [processRawWeight, processSachetsProduced]);

  // --- OUTBOUND DISTRIBUTION FORM STATE ---
  const [distHubId, setDistHubId] = useState<string>('HUB-HARARE');
  const [distDispatcherId, setDistDispatcherId] = useState<string>('DIS-09');
  const [distVendorId, setDistVendorId] = useState<string>('V-101');
  const [distDispatched, setDistDispatched] = useState<string>('80');
  const [distReturned, setDistReturned] = useState<string>('2');
  const [distSold, setDistSold] = useState<string>('75');
  const [distFormError, setDistFormError] = useState<string | null>(null);

  // --- GENERATING AND QUEUING STATE MUTATIONS ---
  
  // Submit Harvest
  const handleHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHarvestFormError(null);

    const harvester = INITIAL_HARVESTERS.find(h => h.id === harvestHarvesterId);
    const weight = parseFloat(harvestWeight);
    const payout = parseFloat(harvestPayout);

    // Missing Field Validation check
    if (!harvestHarvesterId || !harvestRegion || isNaN(weight) || isNaN(payout)) {
      setHarvestFormError('State mutation rejected: Incomplete transaction data.');
      addLog('Validation Failure: Harvest transaction is missing mandated fields.', 'error');
      return;
    }

    if (weight <= 0) {
      setHarvestFormError('Raw weight must be greater than 0 kg.');
      return;
    }

    // Critical Rule: Payout matches or exceeds baseline ethical premium price framework
    const fairRate = ETHICAL_BASE_PRICES[harvestGrade];
    const thresholdMinPayout = weight * fairRate;
    
    if (payout < thresholdMinPayout - 0.01) { // 1 cent threshold
      const missingAmount = (thresholdMinPayout - payout).toFixed(2);
      setHarvestFormError(`ETHICAL AUDIT FAILED: Payout ($${payout.toFixed(2)} USD) is below the ethical premium floor in Zimbabwe for Grade ${harvestGrade} ($${thresholdMinPayout.toFixed(2)} USD). Minimum missing stipend: $${missingAmount} USD.`);
      addLog(`Validation Error: Harvester payout does not meet the $${fairRate}/kg ethical minimum. Payout rejected.`, 'error');
      return;
    }

    // Prepare Schema Payload
    const newRecord: HarvesterRecord = {
      harvester_id: harvestHarvesterId,
      harvester_name: harvester?.name || 'Unknown',
      region: harvestRegion,
      raw_weight_kg: weight,
      quality_grade: harvestGrade,
      payout_amount_usd: payout,
      idempotent_uuid: `harv_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline
    };

    if (isOnline) {
      // Simulate direct server write
      setSyncedHarvests(prev => [newRecord, ...prev]);
      addLog(`REST API: Success POST /api/harvests with UUID: [${newRecord.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      // Queue offline mutation
      const syncObj: SyncPayload = {
        uuid: newRecord.idempotent_uuid,
        type: 'HARVEST',
        action: 'CREATE',
        payload: newRecord,
        offline_created_at: newRecord.offline_created_at,
        status: 'PENDING'
      };
      setOfflineQueue(prev => [...prev, syncObj]);
      addLog(`ServiceWorker: Intercepted offline POST. Indexed payload idempotently with UUID ${newRecord.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    // Success reset
    setHarvestWeight('0');
    setHarvestPayout('0.00');
    addLog(`Inbound Sourced: Successfully recorded ${weight} kg harvested in ${harvestRegion}.`, 'success');
  };

  // Submit Processing Batch
  const handleProcessingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessFormError(null);

    const rawInput = parseFloat(processRawWeight);
    const sachets = parseInt(processSachetsProduced);

    if (isNaN(rawInput) || isNaN(sachets) || rawInput <= 0 || sachets < 0) {
      setProcessFormError('State mutation rejected: Weight and sachet production must be positive numeric values.');
      return;
    }

    // Critical Constraint: Cannot process more than current raw material warehouse stack
    if (rawInput > rawPulpStockKg) {
      const deficiency = (rawInput - rawPulpStockKg).toFixed(1);
      setProcessFormError(`VAULT LIMIT VIOLATION: Processing requires ${rawInput} kg of raw pulp, but current storage vault only contains ${rawPulpStockKg} kg. Deficiency: ${deficiency} kg.`);
      addLog(`Validation Reject: processing weight (${rawInput}kg) exceeds current vault stock (${rawPulpStockKg}kg).`, 'error');
      return;
    }

    // Yield Calculations
    const ratio = sachets / rawInput;
    const isAnomalous = ratio < 8.5 || ratio > 11.5;
    // deviation percentage (10 sachets/kg baseline = 100% optimum)
    const deviation = ((ratio - 10) / 10) * 100;

    const newBatch: ProcessingBatch = {
      batch_id: `B-${Math.floor(100 + Math.random() * 900)}`,
      raw_weight_kg: rawInput,
      total_175ml_sachets_produced: sachets,
      date_processed: new Date().toISOString().split('T')[0],
      idempotent_uuid: `proc_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline,
      yield_ratio: parseFloat(ratio.toFixed(2)),
      is_anomalous: isAnomalous,
      waste_percentage: isAnomalous ? Math.abs(parseFloat(deviation.toFixed(1))) : 0
    };

    if (isOnline) {
      setSyncedBatches(prev => [newBatch, ...prev]);
      addLog(`REST API: Success POST /api/batches with UUID: [${newBatch.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      const syncObj: SyncPayload = {
        uuid: newBatch.idempotent_uuid,
        type: 'PROCESSING',
        action: 'CREATE',
        payload: newBatch,
        offline_created_at: newBatch.offline_created_at,
        status: 'PENDING'
      };
      setOfflineQueue(prev => [...prev, syncObj]);
      addLog(`ServiceWorker: Queued Processing Batch offline. Idempotent UUID: ${newBatch.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    // Log yield alerts
    if (isAnomalous) {
      addLog(`YIELD DEVIATION DETECTED: Batch yield is ${ratio.toFixed(1)} sachets/kg (${deviation.toFixed(1)}% variance). Flagged in Zimbabwean Ledger.`, 'warn');
    } else {
      addLog(`Transformation Bridge: Success. Processed ${rawInput} kg pulp into ${sachets} sachets.`, 'success');
    }

    // Reset Form
    setProcessRawWeight('0');
    setProcessSachetsProduced('0');
  };

  // Submit Consignment Outbound Flow
  const handleConsignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDistFormError(null);

    const dispatched = parseInt(distDispatched);
    const returned = parseInt(distReturned);
    const sold = parseInt(distSold);
    const vendorObj = INITIAL_VENDORS.find(v => v.vendor_id === distVendorId);

    if (isNaN(dispatched) || isNaN(returned) || isNaN(sold)) {
      setDistFormError('Distribution fields must contain valid whole numbers.');
      return;
    }

    if (dispatched <= 0) {
      setDistFormError('Dispatch count must be greater than zero.');
      return;
    }

    if (sold + returned > dispatched) {
      setDistFormError(`CONSIGNMENT DISCREPANCY: Dispatched sachets counted is ${dispatched}, but Sold (${sold}) + Returned (${returned}) equals ${sold + returned}. Cumulative sum cannot exceed dispatches.`);
      return;
    }

    // Strict stock validation check
    if (dispatched > processedSachetsStock) {
      const shortfall = dispatched - processedSachetsStock;
      setDistFormError(`VAULT LIMIT VIOLATION: Dispatch request requires ${dispatched} sachets, but processed vault stock has only ${processedSachetsStock} sachets. Deficiency: ${shortfall} units.`);
      addLog(`Validation Reject: Dispatched count (${dispatched}) exceeds stock vault (${processedSachetsStock}).`, 'error');
      return;
    }

    const newConsignment: OutboundConsignment = {
      consignment_id: `C-${Math.floor(100 + Math.random() * 900)}`,
      hub_id: distHubId,
      dispatcher_id: distDispatcherId,
      vendor_id: distVendorId,
      vendor_name: vendorObj?.name || 'Unknown Vendor',
      sachets_dispatched: dispatched,
      sachets_returned_spoiled: returned,
      sachets_sold: sold,
      idempotent_uuid: `cons_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline
    };

    if (isOnline) {
      setSyncedConsignments(prev => [newConsignment, ...prev]);
      addLog(`REST API: Success POST /api/consignments with UUID: [${newConsignment.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      const syncObj: SyncPayload = {
        uuid: newConsignment.idempotent_uuid,
        type: 'CONSIGNMENT',
        action: 'CREATE',
        payload: newConsignment,
        offline_created_at: newConsignment.offline_created_at,
        status: 'PENDING'
      };
      setOfflineQueue(prev => [...prev, syncObj]);
      addLog(`ServiceWorker: Intercepted offline dispatch. Logged in IndexedDB under UUID: ${newConsignment.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    addLog(`Outbound Dispatched: Sent ${dispatched} units to ${vendorObj?.name || 'Vendor'}.`, 'success');

    // Reset fields
    setDistDispatched('0');
    setDistReturned('0');
    setDistSold('0');
  };

  // --- SYNC ENGINE PROCESSORS & IDEMPOTENCY ---
  const triggerSyncAll = async () => {
    if (!isOnline) {
      addLog('Cannot sync: Engine is currently set to OFFLINE mode.', 'error');
      return;
    }

    const pending = offlineQueue.filter(q => q.status === 'PENDING');
    if (pending.length === 0) {
      addLog('Sync completed: Queue has no pending items.', 'info');
      return;
    }

    addLog(`Offline Sync requested. Syncing ${pending.length} payloads with ${simulatedDelay}ms network latency...`, 'info');

    // Mark all as in-progress
    setOfflineQueue(prev => prev.map(p => p.status === 'PENDING' ? { ...p, status: 'PENDING' as const } : p));

    // Resolve individually with simulated network delay
    for (const item of pending) {
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));

      // IDEMPOTENCY CHECK
      // Check if this UUID already exists in our master synced database
      let alreadyExists = false;
      if (item.type === 'HARVEST') {
        alreadyExists = syncedHarvests.some(h => h.idempotent_uuid === item.uuid);
        if (!alreadyExists) {
          setSyncedHarvests(prev => [{ ...item.payload, is_synced: true }, ...prev]);
        }
      } else if (item.type === 'PROCESSING') {
        alreadyExists = syncedBatches.some(b => b.idempotent_uuid === item.uuid);
        if (!alreadyExists) {
          setSyncedBatches(prev => [{ ...item.payload, is_synced: true }, ...prev]);
        }
      } else if (item.type === 'CONSIGNMENT') {
        alreadyExists = syncedConsignments.some(c => c.idempotent_uuid === item.uuid);
        if (!alreadyExists) {
          setSyncedConsignments(prev => [{ ...item.payload, is_synced: true }, ...prev]);
        }
      }

      setOfflineQueue(prev => prev.map(p => p.uuid === item.uuid ? { ...p, status: 'SYNCED' as const } : p));

      if (alreadyExists) {
        addLog(`IDEMPOTENT DE-DUPLICATION: Payload with UUID [${item.uuid.substring(0, 8)}] was historical or duplicate code. Synced safely.`, 'warn');
      } else {
        addLog(`Sync Successful: Transmitted and cleared ${item.type} [${item.uuid.substring(0, 8)}] payload.`, 'success');
      }
    }
  };

  // Inject manual duplicate payload to demonstrate idempotency logic
  const injectDuplicatePayload = () => {
    if (syncedHarvests.length === 0) {
      addLog('Create a transaction first to duplicate and inject.', 'error');
      return;
    }
    const source = syncedHarvests[0];
    const duplicate: SyncPayload = {
      uuid: source.idempotent_uuid, // SAME IDENTICAL UUID
      type: 'HARVEST',
      action: 'CREATE',
      payload: source,
      offline_created_at: new Date().toISOString(),
      status: 'PENDING'
    };
    setOfflineQueue(prev => [...prev, duplicate]);
    addLog(`Diagnostic Trigger: Injected duplicate payload of Harvester ${source.harvester_name} with duplicate UUID: [${source.idempotent_uuid.substring(0, 8)}]. Ready to test.`, 'warn');
  };

  // Clear current active datasets
  const handleResetData = () => {
    if (confirm('Are you sure you want to restore Zimbabwe Agricultural logistics databases to default benchmarks?')) {
      setSyncedHarvests(HISTORICAL_HARVESTS);
      setSyncedBatches(HISTORICAL_BATCHES);
      setSyncedConsignments(HISTORICAL_CONSIGNMENTS);
      setOfflineQueue([]);
      setInspectedPayload(null);
      addLog('Databases reset to initial historical Zimbabwe seed values.', 'info');
    }
  };

  // Clean sync history logs
  const handleClearQueueLogs = () => {
    setOfflineQueue(prev => prev.filter(q => q.status === 'PENDING'));
    setInspectedPayload(null);
    addLog('Cleared processed transaction logs from synchronization ledger.', 'info');
  };

  // JSON Export of Complete Local System
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      version: "1.0-akudha",
      export_timestamp: new Date().toISOString(),
      harvester_ledger: syncedHarvests,
      processing_batches: syncedBatches,
      vendor_consignments: syncedConsignments,
      offline_sync_queue: offlineQueue
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `akudha_logistics_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog('Relational data package compiled and exported successfully.', 'success');
  };

  // Compute Total Metrics for Zimbabwe Visual Grid
  const totalEthicalPayoutUSD = syncedHarvests.reduce((sum, h) => sum + h.payout_amount_usd, 0);
  const totalRawWeightHarvestedKg = syncedHarvests.reduce((sum, h) => sum + h.raw_weight_kg, 0);
  const totalSachetsDistributed = syncedConsignments.reduce((sum, c) => sum + c.sachets_dispatched, 0);
  const totalSachetsSold = syncedConsignments.reduce((sum, c) => sum + c.sachets_sold, 0);
  const totalVendorRevenueUSD = totalSachetsSold * SACHET_RETAIL_PRICE;

  return (
    <div className="min-h-screen bg-charcoal-50 font-sans text-charcoal-900 selection:bg-ochre-400 selection:text-white" id="main-container">
      {/* Top Professional Header Bar */}
      <header className="border-b border-charcoal-200 bg-charcoal-900 px-6 py-4 text-white" id="header-navbar">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-ochre-500 p-2 text-charcoal-900">
              <Layers className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight">Akudha PWA</span>
                <span className="rounded bg-ochre-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-charcoal-900">ZIMBABWE v1.5</span>
              </div>
              <p className="text-xs text-charcoal-200">Agri-Logistics &amp; Informal Distribution Intelligence Engine</p>
            </div>
          </div>

          {/* Sync Engine Controller Integrated in Header */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Mode Widget */}
            <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors ${
              isOnline 
                ? 'border-emerald-600/30 bg-emerald-950/40 text-emerald-300' 
                : 'border-amber-600/30 bg-amber-950/40 text-amber-300'
            }`} id="status-badge-container">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                {isOnline ? 'Online Sync Active' : 'Offline Queue Mode'}
              </span>
              <button 
                onClick={() => {
                  setIsOnline(!isOnline);
                  addLog(`Network interface toggle: Switched to ${!isOnline ? 'OFFLINE' : 'ONLINE'} operational mode.`, !isOnline ? 'warn' : 'info');
                }}
                className={`ml-2 rounded px-2 py-0.5 font-sans text-[10px] font-bold text-white transition-all bg-charcoal-800 hover:bg-ochre-500 hover:text-charcoal-900`}
                title="Simulate network disconnect/reconnect"
                id="toggle-network-button"
              >
                TOGGLE LIFE
              </button>
            </div>

            {/* Offline sync button indicator */}
            <div className="relative">
              <button
                onClick={triggerSyncAll}
                disabled={!isOnline || offlineQueue.filter(q => q.status === 'PENDING').length === 0}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 font-mono text-xs font-bold tracking-tight transition-all uppercase ${
                  offlineQueue.filter(q => q.status === 'PENDING').length > 0 && isOnline
                    ? 'bg-ochre-500 hover:bg-ochre-600 text-charcoal-900 shadow-md animate-pulse'
                    : 'bg-charcoal-800 text-charcoal-500 cursor-not-allowed'
                }`}
                id="trigger-sync-button"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${offlineQueue.filter(q => q.status === 'PENDING').length > 0 && isOnline ? 'animate-spin' : ''}`} />
                Sync ({offlineQueue.filter(q => q.status === 'PENDING').length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        
        {/* Live Warehouse & Finance Dashboard */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" id="warehouse-vault-monitor">
          
          {/* STAT 1: Inbound Raw Baobab Vault */}
          <div className="relative overflow-hidden rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="vault-pulp-stat">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-700 uppercase tracking-wider">Raw Baobab Pulp Vault</span>
              <span className="rounded-full bg-ochre-50 px-2 py-1 font-mono text-xs font-bold text-ochre-700">Storage</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-charcoal-900" id="raw-baobab-inventory-kg">
                {rawPulpStockKg.toFixed(1)}
              </span>
              <span className="font-mono text-sm text-charcoal-700">KG</span>
            </div>
            <div className="mt-2 text-xs text-charcoal-700">
              Unprocessed gold harvested from 5 dryland regions.
            </div>
            <div className="mt-3 flex items-center justify-between gap-1 border-t border-charcoal-100 pt-2 text-[11px]">
              <span className="text-gray-500 uppercase">Input stream total:</span>
              <span className="font-mono font-semibold text-charcoal-900">+{totalRawWeightHarvestedKg.toFixed(1)} kg</span>
            </div>
            {/* Visual bottom progress filler */}
            <div className="absolute bottom-0 left-0 h-1 bg-ochre-400 transition-all" style={{ width: `${Math.min(100, (rawPulpStockKg / 1000) * 100)}%` }} />
          </div>

          {/* STAT 2: Processed Sachet Stock */}
          <div className="relative overflow-hidden rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="vault-sachets-stat">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-700 uppercase tracking-wider">Produced 175ml Sachets</span>
              <span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-700">Vault Fins</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-charcoal-900" id="sachets-inventory">
                {processedSachetsStock}
              </span>
              <span className="font-mono text-sm text-charcoal-700">Units</span>
            </div>
            <div className="mt-2 text-xs text-charcoal-700">
              Packaged beverage containers stored and ready for dispatch.
            </div>
            <div className="mt-3 flex items-center justify-between gap-1 border-t border-charcoal-100 pt-2 text-[11px]">
              <span className="text-gray-500 uppercase">Available for dispatch:</span>
              <span className={`font-mono font-semibold ${processedSachetsStock < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {processedSachetsStock} units
              </span>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-blue-400 transition-all" style={{ width: `${Math.min(100, (processedSachetsStock / 2000) * 100)}%` }} />
          </div>

          {/* STAT 3: Net Ethical Outflow */}
          <div className="relative overflow-hidden rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="payout-stewardship-stat">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-700 uppercase tracking-wider">Ethical Harvester Payouts</span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono text-xs font-bold text-emerald-700">Impact</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-sm text-charcoal-700">$</span>
              <span className="font-display text-4xl font-bold tracking-tight text-charcoal-900">
                {totalEthicalPayoutUSD.toFixed(2)}
              </span>
              <span className="font-mono text-sm text-charcoal-700">USD</span>
            </div>
            <div className="mt-2 text-xs text-charcoal-700">
              Direct premium income paid to remote rural gatherers.
            </div>
            <div className="mt-3 flex items-center justify-between gap-1 border-t border-charcoal-100 pt-2 text-[11px]">
              <span className="text-gray-500 uppercase">Zimbabwe regions active:</span>
              <span className="font-mono font-semibold text-charcoal-900">5 out of 5</span>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500" style={{ width: '100%' }} />
          </div>

          {/* STAT 4: Vendor Retail Revenue */}
          <div className="relative overflow-hidden rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="vendor-margins-stat">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-700 uppercase tracking-wider">Active Vendor Hub Turnover</span>
              <span className="rounded-full bg-purple-50 px-2 py-1 font-mono text-xs font-bold text-purple-700">Retail</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-sm text-charcoal-700">$</span>
              <span className="font-display text-4xl font-bold tracking-tight text-charcoal-900">
                {totalVendorRevenueUSD.toFixed(2)}
              </span>
              <span className="font-mono text-sm text-charcoal-700">USD</span>
            </div>
            <div className="mt-2 text-xs text-charcoal-700">
              Consumer retail volume generated of $0.50 per sachet.
            </div>
            <div className="mt-3 flex items-center justify-between gap-1 border-t border-charcoal-100 pt-2 text-[11px]">
              <span className="text-gray-500 uppercase">Sachets sold in grid:</span>
              <span className="font-mono font-semibold text-charcoal-900">{totalSachetsSold} / {totalSachetsDistributed} dispatched</span>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-purple-500" style={{ width: '100%' }} />
          </div>

        </div>

        {/* Sync Queue Warning / Real-time Notification Banner */}
        {offlineQueue.filter(q => q.status === 'PENDING').length > 0 && (
          <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row" id="pending-items-banner">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-amber-900">
                  You have {offlineQueue.filter(q => q.status === 'PENDING').length} un-synchronized data payloads queued locally
                </h4>
                <p className="text-xs text-amber-700">
                  Transactions are cached within your device service-worker registry. Complete synchronization on network recovery.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <button
                  onClick={triggerSyncAll}
                  className="rounded-lg bg-ochre-500 px-4 py-2 font-mono text-xs font-bold text-charcoal-900 hover:bg-ochre-600 transition-colors shadow-sm"
                  id="sync-now-banner-button"
                >
                  FORCE SYNCHRONIZATION NOW
                </button>
              ) : (
                <span className="rounded bg-amber-200 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-800">
                  NETWORK INTERRUPT: SWITCH ONLINE TO SYNC
                </span>
              )}
            </div>
          </div>
        )}

        {/* Twin Columns Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" id="workspace-layout-grid">
          
          {/* LEFT PANEL: Transaction Engines (Tabs) - Spans 7 columns */}
          <div className="lg:col-span-7 flex flex-col gap-6" id="left-operational-column">
            
            {/* Operational Navigation Tabs */}
            <div className="flex flex-wrap border-b border-charcoal-200 bg-white rounded-t-xl" id="tab-navigation-row">
              <button
                onClick={() => setActiveTab('harvest')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'harvest'
                    ? 'border-ochre-500 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-harvest-btn"
              >
                <Database className="h-3.5 w-3.5" />
                Sourcing
              </button>
              <button
                onClick={() => setActiveTab('process')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'process'
                    ? 'border-ochre-500 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-process-btn"
              >
                <Layers className="h-3.5 w-3.5" />
                Processing
              </button>
              <button
                onClick={() => setActiveTab('distribute')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'distribute'
                    ? 'border-ochre-500 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-distribute-btn"
              >
                <Truck className="h-3.5 w-3.5" />
                Logistics
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'diagnostics'
                    ? 'border-ochre-500 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-diagnostics-btn"
              >
                <Settings className="h-3.5 w-3.5" />
                Audit
              </button>
              <button
                onClick={() => setActiveTab('backlog')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-3 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'backlog'
                    ? 'border-ochre-700 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-backlog-btn"
              >
                <BookOpen className="h-3.5 w-3.5 text-ochre-700" />
                Agile Backlog
              </button>
              <button
                onClick={() => setActiveTab('schemas')}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-3 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'schemas'
                    ? 'border-ochre-700 text-ochre-700 font-bold bg-ochre-50/20'
                    : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
                }`}
                id="tab-schemas-btn"
              >
                <Database className="h-3.5 w-3.5 text-ochre-700" />
                DB Schemas
              </button>
            </div>

            {/* TAB PANELS CONTAINER */}
            <div className="rounded-b-xl border-x border-b border-charcoal-200 bg-white p-6 shadow-sm min-h-[500px]" id="engine-forms-card">
              
              {/* TAB 1: SOURCING LEDGER FORM */}
              {activeTab === 'harvest' && (
                <div id="harvest-ledger-panel">
                  <div className="mb-6">
                    <h3 className="font-display text-lg font-bold text-charcoal-900">Inbound Baobab Sourcing (The Harvester Ledger)</h3>
                    <p className="text-xs text-charcoal-700">
                      Record premium raw baobab fruit collections directly from rural regions in Zimbabwe. Values are subject to the ethical fair trade pricing algorithm.
                    </p>
                  </div>

                  <form onSubmit={handleHarvestSubmit} className="space-y-4" id="harvest-transaction-form">
                    
                    {/* Error Alerts */}
                    <AnimatePresence>
                      {harvestFormError && (
                        <motion.div 
                          className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          id="harvest-error-alert"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">TRANSACTION REFUSED:</span> {harvestFormError}
                            <div className="mt-1 font-mono text-[10px] bg-white/60 p-1.5 rounded border border-rose-200 text-charcoal-800">
                              <span className="font-bold">Required Parameters:</span> harvester_id, region, raw_weight_kg &ge; 0.1, payout_amount_usd &ge; Baseline Floor
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form Input Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      
                      {/* Harvester ID Select */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Harvester Profile ID *
                        </label>
                        <select
                          value={harvestHarvesterId}
                          onChange={(e) => setHarvestHarvesterId(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                          id="input-harvest-profile"
                        >
                          {INITIAL_HARVESTERS.map(h => (
                            <option key={h.id} value={h.id}>{h.id} - {h.name} ({h.region})</option>
                          ))}
                        </select>
                      </div>

                      {/* Region Input */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Harvest Sourcing Region (Zimbabwe) *
                        </label>
                        <select
                          value={harvestRegion}
                          onChange={(e) => setHarvestRegion(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                          id="input-harvest-region"
                        >
                          {ZIM_REGIONS.map(reg => (
                            <option key={reg} value={reg}>{reg}</option>
                          ))}
                        </select>
                      </div>

                      {/* Raw Weight input */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Raw Sourced Weight (KG) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 50.0"
                            value={harvestWeight}
                            onChange={(e) => setHarvestWeight(e.target.value)}
                            className="w-full rounded-lg border border-charcoal-200 pl-3 pr-10 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                            id="input-harvest-weight"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-charcoal-700">KG</span>
                        </div>
                      </div>

                      {/* Quality Grade */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Assessed Pulp Quality Grade *
                        </label>
                        <div className="grid grid-cols-3 gap-2" id="quality-grade-radio-group">
                          {Object.values(QualityGrade).map(grade => {
                            const rate = ETHICAL_BASE_PRICES[grade];
                            return (
                              <button
                                key={grade}
                                type="button"
                                onClick={() => setHarvestGrade(grade)}
                                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                                  harvestGrade === grade
                                    ? 'bg-ochre-500 border-ochre-600 text-charcoal-900 font-bold'
                                    : 'border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50'
                                }`}
                              >
                                <span className="block text-sm font-bold">Grade {grade}</span>
                                <span className="text-[10px] block opacity-80">${rate.toFixed(2)}/kg floor</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payout USD Input */}
                      <div className="sm:col-span-2">
                        <div className="rounded-xl bg-charcoal-50 border border-charcoal-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Harvester Financial Payout</span>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={harvestAutoPrice}
                                onChange={(e) => setHarvestAutoPrice(e.target.checked)}
                                className="rounded text-ochre-500 focus:ring-ochre-500"
                                id="checkbox-autoprice"
                              />
                              <span className="text-xs font-medium text-charcoal-700">Auto-Calculate Ethical Premium</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-sm font-bold text-charcoal-700">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={harvestAutoPrice}
                                  value={harvestPayout}
                                  onChange={(e) => setHarvestPayout(e.target.value)}
                                  className={`w-full rounded-lg border border-charcoal-200 pl-8 pr-16 py-2 text-sm focus:border-ochre-500 focus:outline-none bg-white ${
                                    harvestAutoPrice ? 'bg-charcoal-100 text-gray-500 cursor-not-allowed font-semibold' : ''
                                  }`}
                                  id="input-harvest-payout"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-bold text-charcoal-700">USD</span>
                              </div>
                              <p className="mt-1 text-[10px] text-gray-500">
                                Zimbabwe's ethical minimum: Grade {harvestGrade} at ${(parseFloat(harvestWeight) || 0).toFixed(1)}kg * ${ETHICAL_BASE_PRICES[harvestGrade].toFixed(2)} = <strong className="text-charcoal-800">${((parseFloat(harvestWeight) || 0) * ETHICAL_BASE_PRICES[harvestGrade]).toFixed(2)} USD</strong>.
                              </p>
                            </div>

                            <div className="flex flex-col justify-center border-l-0 sm:border-l border-charcoal-200 pl-0 sm:pl-4">
                              <span className="text-[11px] text-gray-500 uppercase tracking-widest block">Audit Status</span>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-mono text-xs font-bold text-emerald-700">
                                  Ethical Minimum Satisfied (+0.0%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider"
                      id="submit-harvest-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Commit Raw Harvest to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
                    </button>

                  </form>

                  {/* Harvest History List */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-display font-semibold text-charcoal-900">Recent Harvest Logs</h4>
                      <span className="text-slate-500 font-mono text-[11px]">Database Count: {syncedHarvests.length} records</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-charcoal-200">
                      <table className="w-full text-left text-xs text-charcoal-750">
                        <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
                          <tr>
                            <th className="px-4 py-3">UUID</th>
                            <th className="px-4 py-3">Harvester</th>
                            <th className="px-4 py-3">Locality</th>
                            <th className="px-4 py-3">Raw Weight</th>
                            <th className="px-4 py-3">Grade</th>
                            <th className="px-4 py-3">Payout</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-200" id="harvests-table-body">
                          {syncedHarvests.map((h, index) => (
                            <tr key={index} className="hover:bg-charcoal-50">
                              <td className="px-4 py-3 font-mono text-[10px] text-zinc-500" title={h.idempotent_uuid}>
                                {h.idempotent_uuid.substring(0, 8)}...
                              </td>
                              <td className="px-4 py-3 font-medium text-charcoal-900">{h.harvester_name}</td>
                              <td className="px-4 py-3">{h.region}</td>
                              <td className="px-4 py-3 font-semibold text-charcoal-900">{h.raw_weight_kg.toFixed(1)} kg</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  h.quality_grade === 'A' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  h.quality_grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  Grade {h.quality_grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-emerald-700">${h.payout_amount_usd.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${h.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${h.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {h.is_synced ? 'Cloud' : 'Cached'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: PROCESSING BRIDGE PANEL */}
              {activeTab === 'process' && (
                <div id="processing-bridge-panel">
                  <div className="mb-6">
                    <h3 className="font-display text-lg font-bold text-charcoal-900">Physical Sachet Conversion (The Transformation Bridge)</h3>
                    <p className="text-xs text-charcoal-700">
                      Govern the physical conversion of raw baobab pulp inventory into consumer sachet beverage stocks. Standard optimum yields are mapped at 10 sachets (175ml) per 1kg of raw input material.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleProcessingSubmit} className="space-y-4" id="processing-mutation-form">
                    
                    {/* Processing Form Error */}
                    <AnimatePresence>
                      {processFormError && (
                        <motion.div 
                          className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2 animate-bounce"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          id="process-error-alert"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">CONVERSION REFUSED:</span> {processFormError}
                            <div className="mt-1 font-mono text-[10px] bg-white/60 p-1.5 rounded border border-rose-200 text-charcoal-800">
                              <span className="font-bold">Deficit Reconciliation Needed:</span> Accumulate more raw pulp by sourcing harvests in Area Ledgers before processing.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      
                      {/* Pulp Weight In */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Raw Material Baobab Pulp Depleted *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={processRawWeight}
                            onChange={(e) => setProcessRawWeight(e.target.value)}
                            className="w-full rounded-lg border border-charcoal-200 pl-3 pr-10 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                            id="input-process-raw-weight"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-charcoal-700">KG</span>
                        </div>
                        <p className="mt-1 text-[10px] text-charcoal-700">
                          Primary raw warehouse balance: <strong className="font-semibold text-charcoal-950">{rawPulpStockKg.toFixed(1)} kg available.</strong>
                        </p>
                      </div>

                      {/* Sachets Out */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Produced 175ml Sachets *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={processSachetsProduced}
                            onChange={(e) => setProcessSachetsProduced(e.target.value)}
                            className="w-full rounded-lg border border-charcoal-200 pl-3 pr-12 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                            id="input-process-sachets-produced"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-charcoal-700">Sachets</span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500">
                          Target yield ratio at 10x multiplier: <strong className="font-semibold text-charcoal-800">{((parseFloat(processRawWeight) || 0) * 10).toFixed(0)} units</strong>.
                        </p>
                      </div>

                      {/* Live Process Efficiency Calculator and Warnings */}
                      <div className="sm:col-span-2">
                        <div className={`rounded-xl border p-4 transition-colors ${
                          processYieldAnomalous 
                            ? 'bg-amber-50 border-amber-300' 
                            : 'bg-charcoal-50 border-charcoal-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Yield Audit Diagnostics</span>
                            {processYieldAnomalous && (
                              <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-charcoal-950 px-2 py-0.5 rounded uppercase">
                                <AlertTriangle className="h-3 w-3" /> Yield Variance Warning
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Yield Ratio</span>
                              <span className="font-mono text-lg font-bold text-charcoal-900">{processYieldRatio || 0}</span>
                              <span className="text-[10px] text-gray-500 block">sachets per 1kg pulp</span>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Variance Benchmark</span>
                              <span className={`font-mono text-lg font-bold block ${
                                processYieldDeviation === 0 ? 'text-charcoal-900' :
                                processYieldDeviation > 0 ? 'text-emerald-700' : 'text-amber-700'
                              }`}>
                                {processYieldDeviation > 0 ? `+${processYieldDeviation}` : processYieldDeviation}%
                              </span>
                              <span className="text-[10px] text-gray-500 block">deviation from 10x baseline</span>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-charcoal-200 flex flex-col justify-center">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Process Quality Status</span>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 rounded-full ${processYieldAnomalous ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className="font-mono text-xs font-bold uppercase">
                                  {processYieldAnomalous ? 'Anomalous Waste' : 'Optimum Yield'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {processYieldAnomalous && (
                            <div className="mt-3 text-[11px] text-amber-800 leading-relaxed border-t border-amber-200 pt-2">
                              <strong>ANOMALY WARNING:</strong> Sachet yield density per kg ({processYieldRatio} / kg) deviates more than 15% from Harare baseline. This triggers automated waste monitoring metrics on Zimbabwe central node. Please audit mechanical leakage, moisture levels, or package tearing logs.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider"
                      id="submit-processing-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Commit Processing Batch to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
                    </button>

                  </form>

                  {/* Processing Batches History */}
                  <div className="mt-8">
                    <h4 className="font-display font-semibold text-charcoal-900 mb-4">Historical Processing Batches</h4>
                    <div className="overflow-x-auto rounded-lg border border-charcoal-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Batch ID</th>
                            <th className="px-4 py-3">Depleted Raw</th>
                            <th className="px-4 py-3">Sachets Output</th>
                            <th className="px-4 py-3">Yield Density</th>
                            <th className="px-4 py-3">Waste Status</th>
                            <th className="px-4 py-3">Transmitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-200" id="batches-table-body">
                          {syncedBatches.map((b, idx) => (
                            <tr key={idx} className="hover:bg-charcoal-50">
                              <td className="px-4 py-3 font-mono font-semibold text-charcoal-900">{b.batch_id}</td>
                              <td className="px-4 py-3">{b.raw_weight_kg.toFixed(1)} kg</td>
                              <td className="px-4 py-3 font-bold text-charcoal-950">{b.total_175ml_sachets_produced} units</td>
                              <td className="px-4 py-3 font-mono">{b.yield_ratio} / kg</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  b.is_anomalous 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}>
                                  {b.is_anomalous ? 'ANOMALOUS WASTE' : 'OPTIMAL'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${b.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${b.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {b.is_synced ? 'Synced' : 'Offline'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: OUTBOUND DISTRIBUTION VENDOR HUB */}
              {activeTab === 'distribute' && (
                <div id="vendor-hub-panel">
                  <div className="mb-6">
                    <h3 className="font-display text-lg font-bold text-charcoal-900">Consignment Sachet Ledger (The Vendor Hub)</h3>
                    <p className="text-xs text-charcoal-700">
                      Manage outbound consignment flow of baobab drinks assigned to the network of 1,000+ informal micro-vendors. Trace dispatches, sales, and household sustenance margins.
                    </p>
                  </div>

                  <form onSubmit={handleConsignmentSubmit} className="space-y-4" id="distribution-consignment-form">
                    
                    {/* Dispatches Error alert */}
                    <AnimatePresence>
                      {distFormError && (
                        <motion.div 
                          className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          id="dist-error-alert"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">DISPATCH REFUSED:</span> {distFormError}
                            <div className="mt-1 font-mono text-[10px] bg-white/60 p-1.5 rounded border border-rose-200 text-charcoal-800">
                              <span className="font-bold">Primary Constraint Check:</span> Outbound dispatches cannot exceed the final processed sachet stock vault of {processedSachetsStock} units.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form Inputs Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      
                      {/* Hub Selection */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Consignment Depot Hub *
                        </label>
                        <select
                          value={distHubId}
                          onChange={(e) => setDistHubId(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                          id="input-dist-hub"
                        >
                          {INITIAL_HUBS.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Dispatcher ID */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Assigned Dispatcher ID *
                        </label>
                        <select
                          value={distDispatcherId}
                          onChange={(e) => setDistDispatcherId(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                          id="input-dist-dispatcher"
                        >
                          {INITIAL_DISPATCHERS.map(d => (
                            <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Vendor ID */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Micro-Vendor Profile *
                        </label>
                        <select
                          value={distVendorId}
                          onChange={(e) => setDistVendorId(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                          id="input-dist-vendor"
                        >
                          {INITIAL_VENDORS.map(v => (
                            <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_id} - {v.name} ({v.location})</option>
                          ))}
                        </select>
                      </div>

                      {/* Dispatched Count */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Total Sachets Dispatched *
                        </label>
                        <input
                          type="number"
                          value={distDispatched}
                          onChange={(e) => setDistDispatched(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                          id="input-dist-dispatched"
                        />
                        <p className="mt-1 text-[10px] text-zinc-600">
                          Vault Stock check: <strong className="font-mono text-zinc-900">{processedSachetsStock} units available.</strong>
                        </p>
                      </div>

                      {/* Returned Spoiled Count */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Returned / Spoiled *
                        </label>
                        <input
                          type="number"
                          value={distReturned}
                          onChange={(e) => setDistReturned(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                          id="input-dist-returned"
                        />
                        <p className="mt-1 text-[10px] text-gray-500">
                          Damaged or leakage units returned.
                        </p>
                      </div>

                      {/* Sold Count */}
                      <div>
                        <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                          Sachets Confirmed Sold *
                        </label>
                        <input
                          type="number"
                          value={distSold}
                          onChange={(e) => setDistSold(e.target.value)}
                          className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none"
                          id="input-dist-sold"
                        />
                        <p className="mt-1 text-[10px] text-gray-500">
                          Reconciled consumer final sales.
                        </p>
                      </div>

                      {/* Live Economic Margin Diagnostics for active vendor */}
                      <div className="sm:col-span-3">
                        <div className="rounded-xl border border-charcoal-200 bg-charcoal-50 p-4">
                          <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2">
                            Assigned Vendor sustaining margins diagnostics
                          </label>

                          {/* Calculated Financial Logic details */}
                          {(() => {
                            const soldVal = parseInt(distSold) || 0;
                            const spoiledVal = parseInt(distReturned) || 0;
                            const dispatchedVal = parseInt(distDispatched) || 0;

                            const retailRevenue = soldVal * SACHET_RETAIL_PRICE;  // gross consumer revenue
                            // Vendor daily cost: $0.25 USD wholesale price assigned per sold sachet
                            // Spoiled loss absorbed locally: $0.25 USD debit per spoiled returned sachet
                            const vendorCostOfGoods = soldVal * SACHET_VENDOR_COST;
                            const spoilageDebit = spoiledVal * SACHET_VENDOR_COST;
                            
                            // Net income keeping in hand = revenue collected - (cost of sold + cost of spoiled returns)
                            // Standard PWA net margin is simply: (sold * (0.50 - 0.25)) - (returned * 0.25)
                            const netMarginUSD = (soldVal * (SACHET_RETAIL_PRICE - SACHET_VENDOR_COST)) - spoilageDebit;

                            // Sustenance standard target check
                            let sustenanceStatus = '';
                            let colorClass = '';
                            if (netMarginUSD < TARGET_MARGIN_MIN) {
                              sustenanceStatus = `⚠️ Below Daily Threshold (Goal: $${TARGET_MARGIN_MIN.toFixed(2)} - $${TARGET_MARGIN_MAX.toFixed(2)} USD)`;
                              colorClass = 'text-amber-700 bg-amber-50 border border-amber-300';
                            } else if (netMarginUSD >= TARGET_MARGIN_MIN && netMarginUSD <= TARGET_MARGIN_MAX) {
                              sustenanceStatus = `🏆 Sustainable Daily Threshold Met ($${TARGET_MARGIN_MIN.toFixed(2)} - $${TARGET_MARGIN_MAX.toFixed(2)} range secured)`;
                              colorClass = 'text-emerald-700 bg-emerald-50 border border-emerald-300';
                            } else {
                              sustenanceStatus = `🔥 Exceptional Daily Return (Target premium exceeded!)`;
                              colorClass = 'text-purple-700 bg-purple-50 border border-purple-300';
                            }

                            return (
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                                  <span className="text-[10px] text-gray-500 uppercase block">Consumer Turnover</span>
                                  <span className="font-mono text-base font-bold text-charcoal-900">${retailRevenue.toFixed(2)} USD</span>
                                  <span className="text-[10px] text-gray-400 block">@{SACHET_RETAIL_PRICE.toFixed(2)} / unit sold</span>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-charcoal-200 animate-pulse">
                                  <span className="text-[10px] text-emerald-600 font-bold uppercase block">Net Family Margin</span>
                                  <span className="font-mono text-base font-bold text-emerald-700">${netMarginUSD.toFixed(2)} USD</span>
                                  <span className="text-[10px] text-emerald-500 block">direct profit stipend</span>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                                  <span className="text-[10px] text-gray-500 uppercase block">Consignment Loss</span>
                                  <span className="font-mono text-base font-bold text-rose-700">-${spoilageDebit.toFixed(2)} USD</span>
                                  <span className="text-[10px] text-gray-400 block">{spoiledVal} spoiled returns</span>
                                </div>

                                <div className={`p-3 rounded-lg flex flex-col justify-center ${colorClass}`}>
                                  <span className="text-[10px] font-bold uppercase block">Sustenance Audit</span>
                                  <span className="font-mono text-[10.5px] font-bold leading-tight mt-0.5">{sustenanceStatus}</span>
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider"
                      id="submit-distribute-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Commit Consignment Ledger to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
                    </button>

                  </form>

                  {/* History of Dispatches */}
                  <div className="mt-8">
                    <h4 className="font-display font-semibold text-charcoal-900 mb-4">Current Active Consignment Flow</h4>
                    <div className="overflow-x-auto rounded-lg border border-charcoal-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Depot ID</th>
                            <th className="px-4 py-3">Vendor Account</th>
                            <th className="px-4 py-3">Dispatched</th>
                            <th className="px-4 py-3">Spoiled/Returns</th>
                            <th className="px-4 py-3">Net Sold</th>
                            <th className="px-4 py-3">Family Margin</th>
                            <th className="px-4 py-3">Network State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-200" id="consignments-table-body">
                          {syncedConsignments.map((c, index) => {
                            const profit = (c.sachets_sold * 0.25) - (c.sachets_returned_spoiled * 0.25);
                            return (
                              <tr key={index} className="hover:bg-charcoal-50">
                                <td className="px-4 py-3 font-mono font-medium text-charcoal-900">{c.consignment_id}</td>
                                <td className="px-4 py-3 font-semibold text-charcoal-950">
                                  {c.vendor_name}
                                  <span className="block text-[10px] text-gray-500">{c.hub_id}</span>
                                </td>
                                <td className="px-4 py-3 font-mono">{c.sachets_dispatched}</td>
                                <td className="px-4 py-3 font-mono text-rose-600 font-medium">-{c.sachets_returned_spoiled}</td>
                                <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{c.sachets_sold}</td>
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  ${profit.toFixed(2)} USD
                                  <span className={`block text-[10px] uppercase font-bold ${profit >= 6 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {profit >= 6 ? 'Target Secure' : 'Below Baseline'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${c.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${c.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {c.is_synced ? 'Synced' : 'Offline'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: SYSTEM AUDIT & JSON SCHEMA CONTROL */}
              {activeTab === 'diagnostics' && (
                <div id="diagnostics-panel" className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-bold text-charcoal-900">Relational Database Schemas &amp; State Controls</h3>
                    <p className="text-xs text-charcoal-700">
                      Verify structural integrity, force payload schema synchronization, and test network latency tolerances. All models are optimized for Harare and central rural logistics hubs.
                    </p>
                  </div>

                  {/* Seed & Export Action Panel */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-charcoal-50 p-4 rounded-xl border border-charcoal-200">
                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold text-charcoal-800 mb-1">State Export</span>
                      <p className="text-[11px] text-gray-500 mb-2">Compile and extract the entire synchronized offline state into a JSON backup payload.</p>
                      <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center justify-center gap-1.5 bg-charcoal-900 text-white rounded py-1.5 px-3 text-xs font-bold hover:bg-ochre-500 hover:text-charcoal-900 transition-colors uppercase"
                        id="export-state-btn"
                      >
                        <Download className="h-3 w-3" /> Export Backup
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold text-charcoal-800 mb-1">Database Sync Seed</span>
                      <p className="text-[11px] text-gray-500 mb-2">Re-initialize the offline stack database, wiping records and populating historic templates.</p>
                      <button
                        onClick={handleResetData}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-700 rounded py-1.5 px-3 text-xs font-bold hover:bg-rose-100 transition-colors uppercase"
                        id="reset-database-btn"
                      >
                        <Trash2 className="h-3 w-3" /> Reset Database
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold text-charcoal-800 mb-1">Idempotency Injector</span>
                      <p className="text-[11px] text-gray-500 mb-2">Simulate dirty network reconnects by injecting a raw JSON payload with an existing database UUID.</p>
                      <button
                        onClick={injectDuplicatePayload}
                        className="w-full flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded py-1.5 px-3 text-xs font-bold hover:bg-amber-100 transition-colors uppercase"
                        id="inject-duplicate-btn"
                      >
                        <AlertTriangle className="h-3 w-3" /> Inject Duplicate
                      </button>
                    </div>
                  </div>

                  {/* Schema Inspector */}
                  <div className="border border-charcoal-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-charcoal-900 px-4 py-3 text-white flex justify-between items-center text-xs">
                      <span className="font-mono font-bold tracking-wider uppercase">Active Persistent Data Mongoose/SQL Schemas</span>
                      <span className="text-[11px] text-ochre-400">Strict Validation Applied</span>
                    </div>
                    <div className="p-4 bg-charcoal-950 font-mono text-[11px] text-amber-100/90 overflow-x-auto space-y-4">
                      
                      <div>
                        <span className="text-emerald-400">// 1. Inbound Harvester Schema</span>
                        <pre className="mt-1">{`interface HarvesterRecord {
  harvester_id: string;        // Mandated Profile code (H-001...H-007)
  region: string;              // Zimbabwe drylands: Chimanimani, Mudzi, Binga, Mt Darwin, Chiredzi
  raw_weight_kg: number;       // Greater than 0.1 kg
  quality_grade: "A" | "B" | "C";
  payout_amount_usd: number;   // Calculated relative to fair-wage baseline metric: A ($1.50), B ($1.00), C ($0.70)
  idempotent_uuid: string;     // Unique identifier
  offline_created_at: string;  // Generated at creation timestamp
}`}</pre>
                      </div>

                      <div className="border-t border-charcoal-800 pt-3">
                        <span className="text-emerald-400">// 2. Processing Transformation Bridge Schema</span>
                        <pre className="mt-1">{`interface ProcessingBatch {
  batch_id: string;                      // Synthesized sequential alphanumeric
  raw_weight_kg: number;                 // Pulled from available Raw Pulp stockpile
  total_175ml_sachets_produced: number;  // Yield multiplier
  yield_ratio: number;                   // Standard Optimum: 10 sachets / 1kg
  is_anomalous: boolean;                 // Active warning if yield variance deviates > 15%
  idempotent_uuid: string;
}`}</pre>
                      </div>

                      <div className="border-t border-charcoal-800 pt-3">
                        <span className="text-emerald-400">// 3. Outbound Consignment Vendor Schema</span>
                        <pre className="mt-1">{`interface OutboundConsignment {
  consignment_id: string;
  vendor_id: string;
  sachets_dispatched: number;          // Strictly <= current processed sachet vault inventory
  sachets_returned_spoiled: number;
  sachets_sold: number;
  idempotent_uuid: string;
}`}</pre>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: AGILE BACKLOG INTERACTIVE VIEWER */}
              {activeTab === 'backlog' && (
                <div id="agile-backlog-panel" className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-200 pb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-charcoal-900">Agile Product Backlog &amp; User Stories</h3>
                      <p className="text-xs text-charcoal-700">
                        Production-ready backlog specifying the Akudha supply chain ecosystem. Each story supports Gherkin criteria and offline constraints.
                      </p>
                    </div>

                    {/* Standalone Markdown Resource Link */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-ochre-700/10 px-2.5 py-1 font-mono text-[10px] font-bold text-ochre-700 border border-ochre-700/25">
                        6 Stories Active
                      </span>
                    </div>
                  </div>

                  {/* Epic Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2 bg-charcoal-100 p-2 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-700 px-2">Epic Filter:</span>
                    <button
                      onClick={() => setBacklogFilter('all')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${
                        backlogFilter === 'all'
                          ? 'bg-ochre-500 text-white shadow-sm'
                          : 'text-charcoal-800 hover:bg-charcoal-200'
                      }`}
                    >
                      All Epics
                    </button>
                    <button
                      onClick={() => setBacklogFilter('sourcing')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${
                        backlogFilter === 'sourcing'
                          ? 'bg-ochre-500 text-white shadow-sm'
                          : 'text-charcoal-800 hover:bg-charcoal-200'
                      }`}
                    >
                      Sourcing
                    </button>
                    <button
                      onClick={() => setBacklogFilter('processing')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${
                        backlogFilter === 'processing'
                          ? 'bg-ochre-500 text-white shadow-sm'
                          : 'text-charcoal-800 hover:bg-charcoal-200'
                      }`}
                    >
                      Processing
                    </button>
                    <button
                      onClick={() => setBacklogFilter('distribution')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${
                        backlogFilter === 'distribution'
                          ? 'bg-ochre-500 text-white shadow-sm'
                          : 'text-charcoal-800 hover:bg-charcoal-200'
                      }`}
                    >
                      Distribution
                    </button>
                  </div>

                  {/* Backlog Stories list & interactive detail view */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    
                    {/* Story List Sidebar (5 columns on large) */}
                    <div className="lg:col-span-5 space-y-2.5 bg-charcoal-100/50 p-3 rounded-xl border border-charcoal-200 max-h-[550px] overflow-y-auto">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-charcoal-700 font-bold block mb-1">
                        Select Story to Inspect &amp; Simulate
                      </span>
                      {(() => {
                        const items = [
                          { id: "AKU-101", epic: "sourcing", priority: "CRITICAL", title: "Offline Raw Baobab Logging", path: "Field Coordinator logging raw weights offline" },
                          { id: "AKU-102", epic: "sourcing", priority: "HIGH", title: "Sourcing Queue Sync", path: "Batch sync post-reconnection de-duplication" },
                          { id: "AKU-201", epic: "processing", priority: "CRITICAL", title: "Batch Conversion Logging", path: "Convert bulk raw into 175ml freezit sachets" },
                          { id: "AKU-202", epic: "processing", priority: "MEDIUM", title: "Yield Anomaly Auditing", path: "Auto-flagging manufacture variance deviations" },
                          { id: "AKU-301", epic: "distribution", priority: "CRITICAL", title: "Outbound Consignment Flow", path: "Reconcile vendor dispatches & spoilage" },
                          { id: "AKU-302", epic: "distribution", priority: "HIGH", title: "Vendor Sustenance margins", path: "Auditing sachet profit standard $6-$18/day" }
                        ];

                        const filtered = backlogFilter === 'all' ? items : items.filter(i => i.epic === backlogFilter);

                        return filtered.map(item => (
                          <div
                            key={item.id}
                            onClick={() => setExpandedStory(item.id)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                              expandedStory === item.id
                                ? 'bg-white border-ochre-500 ring-1 ring-ochre-400 shadow-sm'
                                : 'bg-white hover:border-charcoal-350 border-charcoal-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10.5px] font-bold text-ochre-700 uppercase bg-ochre-100/50 px-1.5 py-0.2 rounded">
                                {item.id}
                              </span>
                              <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded font-extrabold ${
                                item.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                item.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {item.priority}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold font-display text-charcoal-900 leading-tight">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-charcoal-700 truncate mt-1">
                              {item.path}
                            </p>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Story Details View Area (7 columns) */}
                    <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-charcoal-200 min-h-[450px]">
                      {(() => {
                        const allStoriesDetails: Record<string, any> = {
                          "AKU-101": {
                            id: "AKU-101",
                            category: "Sourcing Epic",
                            title: "Offline Logging of Raw Baobab Collections",
                            role: "Field Sourcing Coordinator",
                            action: "log the raw weight and quality grade of baobab fruit collections at rural collection points with zero network connectivity",
                            value: "we can secure an immutable record of harvester deposits without waiting for network recovery",
                            gherkin: [
                              {
                                type: "Scenario: Successfully logging a collection under offline state",
                                lines: [
                                  "Given that the Field Coordinator's device is in Offline Queue Mode (disconnected from cellular GPRS/Edge corridors)",
                                  "And the coordinator inputs Harvester Profile H-001 (e.g., Seke Cooperative)",
                                  "And selects Region Chimanimani",
                                  "And inputs Raw Weight of 45.0 kilograms and Quality Grade A",
                                  "When they click \"Commit Sourcing Ledger\"",
                                  "Then the system calculates the fair wage payout of $67.50 USD based on the Grade A price of $1.50 USD/kg",
                                  "And stores the transaction in local cache with an offline-generated idempotent_uuid and timestamp",
                                  "And surfaces warning: \"ServiceWorker: Intercepted offline POST. Indexed payload idempotently.\"",
                                  "And increments the local Pending Sync Queue count by 1."
                                ]
                              },
                              {
                                type: "Scenario: Prevention of under-payout during manual entry",
                                lines: [
                                  "Given the coordinator attempts to override the payout calculation to $50.00 USD for the 45.0 kg of Grade A baobab",
                                  "When they attempt to submit the form",
                                  "Then the system triggers an \"ETHICAL AUDIT FAILED\" validation block",
                                  "And prompts: \"Payout is below the ethical premium floor in Zimbabwe for Grade A ($67.50 USD).\"",
                                  "And prohibits transaction commit to local storage until corrected."
                                ]
                              }
                            ],
                            offline: [
                              "Conforms to HarvesterRecord schema and caches to device localState/IndexedDB.",
                              "Encodes an idempotent_uuid client-side formatting: 'harv_[rand]_[time]' for duplication protection on reconnect.",
                              "Increments localized Raw Baobab Stock by +45.0 kg to allow immediate downstream calculations."
                            ]
                          },
                          "AKU-102": {
                            id: "AKU-102",
                            category: "Sourcing Epic",
                            title: "Sourcing Ledger Queue Synchronization",
                            role: "Field Sourcing Coordinator",
                            action: "batch-synchronize my queued offline collections once I establish a cellular data connection in regional hubs",
                            value: "the central database is updated and the financial treasury can release cash payout stipends",
                            gherkin: [
                              {
                                type: "Scenario: Automatic detection and manual synchronization triggering",
                                lines: [
                                  "Given that the coordinator has pending harvest records logged offline while in the field",
                                  "And they migrate to an area with GPRS connectivity",
                                  "And toggle network status to \"Online Sync Active\"",
                                  "When they click the \"Sync\" button in the system header",
                                  "Then the application transmits each queued package sequentially via REST API POST /api/harvests",
                                  "And performs an Idempotency De-duplication check using the unique idempotent_uuid",
                                  "And empties the local pending queue logs on completion."
                                ]
                              }
                            ],
                            offline: [
                              "If connection breaks halfway through transmission, already transmitted files transition to SYNCED while others maintain PENDING state.",
                              "De-duplication Audit: Records already present on server (duplicate UUID simulation) are merged safely with no duplicate double payouts."
                            ]
                          },
                          "AKU-201": {
                            id: "AKU-201",
                            category: "Processing Epic",
                            title: "Conversion Batch Logging",
                            role: "Processing Plant Admin",
                            action: "transition a specific quantity of raw baobab pulp weight into counted batches of 175ml beverage sachets",
                            value: "the depot stock changes can be calculated and we can measure our processing efficiency",
                            gherkin: [
                              {
                                type: "Scenario: Submitting a valid batch transformation",
                                lines: [
                                  "Given that the raw baobab pulp inventory in database stands at 315.5 kg",
                                  "And the admin inputs raw weight 25.0 kg and produced sachets 250 units",
                                  "When they click \"Submit Batch Transformation\"",
                                  "Then the system calculates the processing conversion yield ratio as 10.0 sachets/kg",
                                  "And calculates yield deviation as 0.0% relative to optimum benchmark ratio (10 sachets/kg)",
                                  "And deducts 25.0 kg from raw pulp stock stockpile",
                                  "And adds +250 units to finished 175ml sachet stock."
                                ]
                              },
                              {
                                type: "Scenario: Insufficient raw pulp inventory block",
                                lines: [
                                  "Given the current raw baobab pulp stock is 100.0 kg",
                                  "When the admin inputs raw weight 120.0 kg to process a new batch",
                                  "Then the system blocks the form submission with a \"VAULT LIMIT VIOLATION\" warning",
                                  "And refuses state storage mutation."
                                ]
                              }
                            ],
                            offline: [
                              "Direct synchronous subtraction of raw pulp stockpile and addition to processed stockpile occurs in-memory immediately for offline consistency."
                            ]
                          },
                          "AKU-202": {
                            id: "AKU-202",
                            category: "Processing Epic",
                            title: "Processing Yield Anomaly Flagging",
                            role: "Processing Controller",
                            action: "automatically flag batches where the manufacturing yield ratio deviates from the optimum benchmark of 10 sachets/1kg",
                            value: "we can debug potential bulk waste, machine leakage, or micro-theft",
                            gherkin: [
                              {
                                type: "Scenario: High-waste batch flagging",
                                lines: [
                                  "Given the admin inputs raw weight 25.0 kg and sachets produced 180 units",
                                  "When the batch is calculated",
                                  "Then the system calculates yield ratio as 7.2 sachets/kg",
                                  "And computes a yield deviation of -28.0% from optimum benchmark",
                                  "And flags the record with is_anomalous: true",
                                  "And triggers a prompt banner: \"YIELD DEVIATION DETECTED: Batch yield is 7.2 sachets/kg (-28.0% variance).\""
                                ]
                              }
                            ],
                            offline: [
                              "Anomaly markers are permanently serialized client-side and saved into the payload to guarantee non-repudiated reports during GPRS upload."
                            ]
                          },
                          "AKU-301": {
                            id: "AKU-301",
                            category: "Distribution Epic",
                            title: "Outbound Consignment & Spoilage Settlement",
                            role: "Vendor Hub Manager",
                            action: "log the evening sachet dispatch to micro-vendors and finalize their sales settlements while capturing spoilage losses",
                            value: "we can keep real-time track of vendor balances and regional sales velocity",
                            gherkin: [
                              {
                                type: "Scenario: Committing a secure distribution consignment and balancing accounts",
                                lines: [
                                  "Given the finished sachet warehouse stock has 420 units in stock",
                                  "And the manager inputs dispatch of 80 sachets to vendor V-101 (Amai Mercy Mukucha)",
                                  "And inputs 2 returned/spoiled units and 75 confirmed sold units",
                                  "When they commit the consignment ledger",
                                  "Then the system deducts 80 sachets from processed stock",
                                  "And calculates gross consumer turnover as $37.50 USD (75 * $0.50 sachet retail)",
                                  "And calculates net family margin as $18.25 USD (75 * ($0.50 retail - $0.25 wholesale) - (2 spoiled * $0.25 spoilage wholesale debit fee))"
                                ]
                              },
                              {
                                type: "Scenario: Double ledger math validation",
                                lines: [
                                  "Given a dispatch of 100 units",
                                  "When the manager enters sold units as 90 and spoiled as 15 (totaling 105 units)",
                                  "Then the system rejects submission: \"CONSIGNMENT DISCREPANCY: Sold + Returned cannot exceed dispatches.\""
                                ]
                              }
                            ],
                            offline: [
                              "Logs offline with assigned Dispatcher ID (DIS-09) and Depot Hub ID (HUB-HARARE) to ensure perfect attribution on reconnection."
                            ]
                          },
                          "AKU-302": {
                            id: "AKU-302",
                            category: "Distribution Epic",
                            title: "Vendor Profit Sustainment Auditing",
                            role: "Brand Impact Auditor",
                            action: "monitor the daily sustaining net margins of informal vendors during settlement, ensuring they hit their $6 - $18 USD profit threshold",
                            value: "we can proactively identify struggling routes and ensure our network operates above the ethical poverty line",
                            gherkin: [
                              {
                                type: "Scenario: Profit falls below daily baseline threshold",
                                lines: [
                                  "Given a consignment dispatch of 20 sachets, with 15 sold and 4 spoiled/returned",
                                  "When the ledger calculates the margins for the vendor",
                                  "Then the net vendor profit is computed as $2.75 USD (15 * $0.25 profit - 4 * $0.25 debit)",
                                  "And the systems logs status block as \"⚠️ Below Daily Threshold (Goal: $6.00 - $18.00 USD)\"",
                                  "And lists the account state inside the list table as \"Below Baseline\"."
                                ]
                              },
                              {
                                type: "Scenario: Profit meets the target range",
                                lines: [
                                  "Given a consignment dispatch of 80 sachets, with 75 sold and 2 spoiled",
                                  "When the margins are processed",
                                  "Then the net vendor profit is computed as $18.25 USD",
                                  "And the system logs status block as \"🏆 Sustainable Daily Threshold Met ($6.00 - $18.00 range secured)\""
                                ]
                              }
                            ],
                            offline: [
                              "Sums up and tracks cumulative vendor earnings across regional hubs in Zimbabwe offline to generate instant impact indicators locally."
                            ]
                          }
                        };

                        const details = allStoriesDetails[expandedStory || 'AKU-101'];
                        if (!details) {
                          return (
                            <div className="text-center py-12 text-gray-500 text-xs">
                              Select a User Story to inspect.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4" id="story-details-wrapper">
                            
                            {/* Detailed Metadata Header */}
                            <div className="border-b border-charcoal-200 pb-3">
                              <span className="text-[10px] uppercase font-mono font-bold text-ochre-700 block mb-1">
                                {details.category}
                              </span>
                              <h3 className="font-display text-base font-bold text-charcoal-900 leading-tight">
                                {details.id}: {details.title}
                              </h3>
                            </div>

                            {/* Standard Agile framework */}
                            <div className="bg-charcoal-50 p-3.5 rounded-lg border border-charcoal-200 space-y-2">
                              <span className="text-[9.5px] font-mono uppercase font-bold text-charcoal-700 block tracking-wider">
                                Agile User Story Specification
                              </span>
                              
                              <div className="grid grid-cols-1 gap-2 text-xs">
                                <div>
                                  <strong className="text-ochre-700 font-bold uppercase text-[10px] tracking-wide block">As a:</strong>
                                  <span className="text-charcoal-900 font-medium">{details.role}</span>
                                </div>
                                <div className="border-t border-charcoal-200/50 pt-1.5">
                                  <strong className="text-ochre-700 font-bold uppercase text-[10px] tracking-wide block">I want to:</strong>
                                  <span className="text-charcoal-900 font-normal">{details.action}</span>
                                </div>
                                <div className="border-t border-charcoal-200/50 pt-1.5">
                                  <strong className="text-ochre-700 font-bold uppercase text-[10px] tracking-wide block">So that:</strong>
                                  <span className="text-charcoal-800 italic font-normal">"{details.value}"</span>
                                </div>
                              </div>
                            </div>

                            {/* Acceptance Criteria */}
                            <div className="space-y-3">
                              <span className="text-[9.5px] font-mono uppercase font-bold text-charcoal-700 block tracking-wider">
                                Acceptance Criteria (Gherkin Syntax)
                              </span>
                              
                              <div className="space-y-3.5">
                                {details.gherkin.map((g: any, i: number) => (
                                  <div key={i} className="bg-zinc-50 border border-charcoal-200 rounded-lg p-3 text-xs font-sans leading-relaxed">
                                    <span className="font-bold text-[10.5px] text-charcoal-900 block mb-1.5 border-b border-charcoal-200/50 pb-1">
                                      {g.type}
                                    </span>
                                    <div className="space-y-1 pl-1">
                                      {g.lines.map((ln: string, idx: number) => {
                                        // Highlight Gherkin keywords
                                        const parts = ln.split(/(Given|And|When|Then)/);
                                        return (
                                          <div key={idx} className="text-charcoal-800">
                                            {parts.map((p, pIdx) => {
                                              if (['Given', 'And', 'When', 'Then'].includes(p)) {
                                                return <strong key={pIdx} className="text-ochre-700 font-bold">{p}</strong>;
                                              }
                                              return <span key={pIdx}>{p}</span>;
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Offline State Requirements */}
                            <div className="bg-amber-50/60 border border-amber-300 rounded-lg p-3.5 space-y-1.5 text-xs">
                              <span className="text-[9.5px] font-mono uppercase font-extrabold text-amber-800 block tracking-wider">
                                Offline State Requirements
                              </span>
                              <ul className="list-disc pl-4 space-y-1 text-charcoal-800 text-[11.5px]">
                                {details.offline.map((off: string, i: number) => (
                                  <li key={i}>{off}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Dynamic Live Simulator Box */}
                            <div className="border border-ochre-400 p-4 rounded-xl bg-ochre-50/30 text-xs space-y-2.5">
                              <div className="flex items-center gap-1.5 text-ochre-800 font-bold">
                                <Play className="h-3.5 w-3.5 fill-current" />
                                <span>QA/TPM Interactive System Simulator</span>
                              </div>
                              <p className="text-[11px] text-charcoal-700">
                                Clicking the button below will immediately toggle the application, switch to the target workflow tab, and pre-populate the corresponding operational form with exactly this story's coordinates. This allows you to test and commit the scenario flow live.
                              </p>
                              <button
                                onClick={() => runStorySimulation(details.id)}
                                className="w-full flex items-center justify-center gap-1.5 bg-ochre-500 hover:bg-ochre-600 text-white font-bold py-2 px-3 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-all shadow-sm"
                              >
                                Run Scenario for {details.id} inside Core App
                              </button>
                            </div>

                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT PANEL: Sync Ledger, Payload Inspector, and System Logs - Spans 5 columns */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="right-monitoring-column">
            
            {/* SERVICE WORKER OFFLINE SYNC LEDGER */}
            <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="offline-sync-ledger-panel">
              <div className="flex items-center justify-between border-b border-charcoal-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ochre-500"></span>
                  </span>
                  <h3 className="font-display font-bold text-charcoal-900 text-sm">Service Worker Sync Registry</h3>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-gray-500">Queue Latency:</span>
                  <select
                    value={simulatedDelay}
                    onChange={(e) => setSimulatedDelay(parseInt(e.target.value))}
                    className="rounded border border-charcoal-200 bg-charcoal-50 px-1 py-0.5 font-sans font-bold text-charcoal-900 focus:outline-none"
                    id="delay-select"
                  >
                    <option value="0">0ms (Instant)</option>
                    <option value="800">800ms (Slow edge)</option>
                    <option value="2500">2.5s (Dial-up GPRS)</option>
                    <option value="5000">5.0s (Sat link)</option>
                  </select>
                </div>
              </div>

              {/* Offline Queue Items */}
              {offlineQueue.length === 0 ? (
                <div className="py-8 text-center" id="empty-queue-display">
                  <Wifi className="h-8 w-8 mx-auto text-charcoal-200 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium text-gray-500">All local service-worker cache synced successfully.</p>
                  <p className="text-[10px] text-gray-400 mt-1">There are no pending transaction mutations.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1" id="queued-items-list">
                  {offlineQueue.map((item, index) => {
                    const statusColors = 
                      item.status === 'SYNCED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      item.status === 'FAILED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';

                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border flex flex-col gap-2 transition-all hover:border-black/25 cursor-pointer ${
                          inspectedPayload?.uuid === item.uuid ? 'ring-2 ring-ochre-500 border-transparent' : 'border-charcoal-100'
                        }`}
                        onClick={() => setInspectedPayload(item)}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-[4px] font-mono font-bold tracking-wider text-[9px] uppercase ${
                              item.type === 'HARVEST' ? 'bg-amber-100 text-amber-800' :
                              item.type === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {item.type}
                            </span>
                            <span className="font-mono text-zinc-500">[{item.uuid.substring(0, 8)}]</span>
                          </div>
                          
                          <span className={`px-1.5 py-0.3 rounded-full font-mono text-[9px] font-bold uppercase ${statusColors}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="text-[11.5px] text-charcoal-800 flex justify-between items-center">
                          <span className="font-medium truncate max-w-[200px]">
                            {item.type === 'HARVEST' && `Source raw ${item.payload.raw_weight_kg} kg pulp`}
                            {item.type === 'PROCESSING' && `Convert ${item.payload.raw_weight_kg} kg pulp`}
                            {item.type === 'CONSIGNMENT' && `Dispatch ${item.payload.sachets_dispatched} units to ${item.payload.vendor_name}`}
                          </span>
                          <span className="text-[9.5px] text-gray-500 shrink-0">
                            {new Date(item.offline_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {offlineQueue.length > 0 && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-charcoal-100 pt-3" id="queues-action-footer">
                  <button
                    onClick={handleClearQueueLogs}
                    className="text-[10px] font-bold font-mono text-gray-500 hover:text-ochre-700 uppercase"
                    id="clear-logs-btn"
                  >
                    Clear synced logs
                  </button>

                  <span className="text-[10.5px] font-mono text-charcoal-700">
                    <strong className="font-bold">{offlineQueue.filter(q => q.status === 'PENDING').length}</strong> queued &bull; <strong className="font-bold">{offlineQueue.filter(q => q.status === 'SYNCED').length}</strong> synced
                  </span>
                </div>
              )}
            </div>

            {/* RAW TRANSACTION PAYLOAD SCHEMA INSPECTOR */}
            <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="schema-payload-inspector">
              <div className="flex items-center gap-1.5 border-b border-charcoal-100 pb-3 mb-4">
                <FileJson className="h-4 w-4 text-charcoal-700" />
                <h3 className="font-display font-bold text-charcoal-900 text-sm">Service-Worker Intercepted JSON Payload</h3>
              </div>

              {inspectedPayload ? (
                <div className="space-y-3" id="active-payload-inspector">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-500">Idempotency UUID: <strong className="text-charcoal-900 font-mono">{inspectedPayload.uuid}</strong></span>
                    <button 
                      onClick={() => setInspectedPayload(null)}
                      className="p-1 rounded hover:bg-charcoal-100 text-gray-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  {/* Print JSON Code Box */}
                  <div className="relative rounded-lg bg-charcoal-950 p-3.5 font-mono text-[10.5px] text-emerald-400 overflow-x-auto border border-charcoal-200 max-h-[190px]">
                    <pre>{JSON.stringify(inspectedPayload.payload, null, 2)}</pre>
                  </div>
                  
                  <div className="text-[10.5px] text-gray-500 italic bg-amber-50 rounded p-2.5 border border-amber-200">
                    <strong>Schema Verification Protocol:</strong> Matches central Mongoose distribution validation templates. Contains immutable <code className="font-mono bg-amber-100 px-1 py-0.2 rounded text-[10px]">offline_created_at</code> and <code className="font-mono bg-amber-100 px-1 py-0.2 rounded text-[10px]">idempotent_uuid</code> variables for instant secure re-entry.
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center" id="empty-inspector-display">
                  <FileJson className="h-8 w-8 mx-auto text-charcoal-200 mb-2 stroke-[1.5]" />
                  <p className="text-xs text-gray-500">No payload selected.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Select any queued transaction above to audit exact relational properties transmitted to Zimbabwe backend.</p>
                </div>
              )}
            </div>

            {/* LIVE CONSOLE DIAGNOSTICS & SYSTEM LOGS */}
            <div className="rounded-xl border border-charcoal-200 bg-charcoal-900 text-white p-5 shadow-sm" id="zimbabwe-nodes-terminal">
              <div className="flex items-center justify-between border-b border-charcoal-800 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="font-display font-semibold text-xs tracking-wider uppercase text-charcoal-100">Live PWA Diagnostics Shell</h3>
                </div>
                <span className="font-mono text-[9px] text-charcoal-200">PORT: 3000 // HOST: LOCALHOST</span>
              </div>

              {/* Console logs box */}
              <div className="font-mono text-[10.5px] space-y-2 max-h-[150px] overflow-y-auto pr-1 flex flex-col-reverse" id="terminal-logs-window">
                {systemLogs.map((log, index) => {
                  let textColor = 'text-zinc-300';
                  if (log.type === 'success') textColor = 'text-emerald-400 font-medium';
                  if (log.type === 'warn') textColor = 'text-amber-400';
                  if (log.type === 'error') textColor = 'text-rose-400 font-semibold';
                  
                  return (
                    <div key={index} className="flex gap-2">
                      <span className="text-[9.5px] text-gray-500 shrink-0 select-none">[{log.time}]</span>
                      <span className={textColor}>{log.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Zimbabwe Region Sourcing Grid Analytics */}
        <div className="mt-8 rounded-xl border border-charcoal-200 bg-white p-6 shadow-sm" id="zimbabwe-regional-analytics">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-charcoal-900">Zimbabwe dryland districts sourcing analytics</h3>
              <p className="text-xs text-charcoal-700">Daily premium aggregation volumes tracked across Zimbabwe's designated baobab ecological collection sectors.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ochre-500"></span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal-800">Target Premium Weight Target: 50.0 KG</span>
            </div>
          </div>

          {/* Regional Visual Progress Columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5" id="regional-charts-container">
            {ZIM_REGIONS.map(region => {
              // Compute sum of weight harvested in this region
              const regionWeight = syncedHarvests
                .filter(h => h.region === region)
                .reduce((sum, h) => sum + h.raw_weight_kg, 0);

              const pendingRegionWeight = offlineQueue
                .filter(q => q.status === 'PENDING' && q.type === 'HARVEST' && q.payload.region === region)
                .reduce((sum, q) => sum + q.payload.raw_weight_kg, 0);

              const totalRegionWeight = regionWeight + pendingRegionWeight;
              const percentOfTarget = Math.round((totalRegionWeight / 300) * 100);

              return (
                <div key={region} className="rounded-lg bg-charcoal-50 p-4 border border-charcoal-200">
                  <div className="flex justify-between items-start mb-1 text-xs">
                    <span className="font-bold text-charcoal-900" id={`region-label-${region.toLowerCase()}`}>{region}</span>
                    <span className="font-mono font-bold text-ochre-700 text-[10.5px]" id={`region-percent-${region.toLowerCase()}`}>{percentOfTarget}%</span>
                  </div>
                  
                  {/* Total kgs logged */}
                  <div className="font-display font-bold text-lg text-charcoal-900 mt-2" id={`region-metric-${region.toLowerCase()}`}>
                    {totalRegionWeight.toFixed(1)} <span className="font-sans font-medium text-xs text-gray-500">KG</span>
                  </div>

                  {/* Progressive custom SVG loader bar */}
                  <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden mt-3 max-w-full">
                    <div 
                      className="bg-ochre-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(8, percentOfTarget))}%` }}
                    />
                  </div>

                  {/* Local operational stats footer */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 border-t border-charcoal-100 pt-2 font-mono">
                    <span>Pending:</span>
                    <span className={pendingRegionWeight > 0 ? "text-amber-600 font-bold" : "text-gray-400"}>
                      {pendingRegionWeight.toFixed(1)} kg
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Local Footnote */}
      <footer className="bg-charcoal-900 text-charcoal-200 px-6 py-6 border-t border-charcoal-800 mt-12 text-center text-xs" id="footer-stewardship">
        <p className="font-display font-semibold tracking-wide">AKUDHA ENTERPRISES ZIMBABWE (PVT) LTD</p>
        <p className="mt-1 text-charcoal-400 max-w-xl mx-auto leading-relaxed">
          Stewardship-driven ecological raw baobab sourcing, value chain conversion, and informal trade expansion. Bridging Chimanimani, Mudzi, Binga, Mt Darwin, and Chiredzi with Hararian retail hubs.
        </p>
        <p className="mt-4 font-mono text-[10px] text-charcoal-500">
          This system enforces ethical premium pricing protocols and sachet density metrics. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
