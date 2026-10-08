document.addEventListener("DOMContentLoaded", async () => {
    console.log("BiSpec Pairwise AI 2.1 initialized.");
    
    // UI Element References
    const selectTargetA = document.getElementById("selectTargetA");
    const selectTargetB = document.getElementById("selectTargetB");
    const selectIndication = document.getElementById("selectIndication");
    const predictForm = document.getElementById("predictForm");
    const btnPredict = document.getElementById("btnPredict");
    const presetContainer = document.getElementById("presetContainer");
    const benchmarkTableBody = document.getElementById("benchmarkTableBody");
    const kpiTargets = document.getElementById("kpiTargets");
    
    // Profile Elements
    const profSymbolA = document.getElementById("profSymbolA");
    const profClassA = document.getElementById("profClassA");
    const profLocA = document.getElementById("profLocA");
    const profDrugsA = document.getElementById("profDrugsA");
    
    const profSymbolB = document.getElementById("profSymbolB");
    const profClassB = document.getElementById("profClassB");
    const profLocB = document.getElementById("profLocB");
    const profDrugsB = document.getElementById("profDrugsB");
    
    // Results & Score Elements
    const scoreVal = document.getElementById("scoreVal");
    const scoreTierBadge = document.getElementById("scoreTierBadge");
    const scoreCircle = document.getElementById("scoreCircle");
    const analysisPairTitle = document.getElementById("analysisPairTitle");
    const summaryText = document.getElementById("summaryText");
    const modelCompList = document.getElementById("modelCompList");
    
    // Warning Callout Elements
    const targetWarningBox = document.getElementById("targetWarningBox");
    const warningTitle = document.getElementById("warningTitle");
    const warningDesc = document.getElementById("warningDesc");
    
    // Radar 4 Stat Cards
    const radarStatSynergy = document.getElementById("radarStatSynergy");
    const radarStatPathway = document.getElementById("radarStatPathway");
    const radarStatTumor = document.getElementById("radarStatTumor");
    const radarStatSafety = document.getElementById("radarStatSafety");
    
    // Preclinical Opportunity Box
    const oppCompatScore = document.getElementById("oppCompatScore");
    const btnAddClinicalTest = document.getElementById("btnAddClinicalTest");
    
    // Preclinical Validation Queue
    const preclinicalQueueBody = document.getElementById("preclinicalQueueBody");
    const queueCountBadge = document.getElementById("queueCountBadge");
    
    // Single-Cell Biomarker Stats
    const statSafetyA = document.getElementById("statSafetyA");
    const statSafetyB = document.getElementById("statSafetyB");
    const statSafetyMin = document.getElementById("statSafetyMin");
    const statSpecA = document.getElementById("statSpecA");
    const statSpecB = document.getElementById("statSpecB");
    const statSim = document.getElementById("statSim");
    
    // Dossier Elements
    const dossierPairTitle = document.getElementById("dossierPairTitle");
    const dossierSource = document.getElementById("dossierSource");
    const dossierIndication = document.getElementById("dossierIndication");
    const dossierDate = document.getElementById("dossierDate");
    const dossierOverview = document.getElementById("dossierOverview");
    const dossierMoA = document.getElementById("dossierMoA");
    const dossierSynergy = document.getElementById("dossierSynergy");
    const dossierSafety = document.getElementById("dossierSafety");
    const dossierRecommendation = document.getElementById("dossierRecommendation");
    
    // Catalog Elements
    const catalogTableBody = document.getElementById("catalogTableBody");
    const catalogSearchInput = document.getElementById("catalogSearchInput");
    const catalogFilters = document.getElementById("catalogFilters");
    
    // AI Modal Elements
    const btnOpenAiModal = document.getElementById("btnOpenAiModal");
    const btnCloseAiModal = document.getElementById("btnCloseAiModal");
    const aiModal = document.getElementById("aiModal");
    const apiProvider = document.getElementById("apiProvider");
    const apiKeyGroup = document.getElementById("apiKeyGroup");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const btnSaveAiSettings = document.getElementById("btnSaveAiSettings");

    // Evaluator Modal Elements
    const evaluatorModal = document.getElementById("evaluatorModal");
    const btnOpenEvaluatorGuide = document.getElementById("btnOpenEvaluatorGuide");
    const btnOpenEvaluatorBanner = document.getElementById("btnOpenEvaluatorBanner");
    const btnCloseEvaluatorModal = document.getElementById("btnCloseEvaluatorModal");
    const btnCloseEvaluatorModal2 = document.getElementById("btnCloseEvaluatorModal2");

    // State
    let currentPredictionData = null;
    let allCatalogPairs = [];
    let savedProvider = localStorage.getItem("bispec_ai_provider") || "builtin";
    let savedKey = localStorage.getItem("bispec_ai_key") || "";
    
    apiProvider.value = savedProvider;
    apiKeyInput.value = savedKey;
    apiKeyGroup.style.display = (savedProvider === "builtin") ? "none" : "block";

    // Set today's date
    if (dossierDate) {
        dossierDate.textContent = new Date().toISOString().split("T")[0];
    }

    // Modal Events - AI Settings
    btnOpenAiModal.addEventListener("click", () => aiModal.classList.add("open"));
    btnCloseAiModal.addEventListener("click", () => aiModal.classList.remove("open"));
    aiModal.addEventListener("click", (e) => { if (e.target === aiModal) aiModal.classList.remove("open"); });

    apiProvider.addEventListener("change", () => {
        apiKeyGroup.style.display = (apiProvider.value === "builtin") ? "none" : "block";
    });

    btnSaveAiSettings.addEventListener("click", () => {
        savedProvider = apiProvider.value;
        savedKey = apiKeyInput.value.trim();
        localStorage.setItem("bispec_ai_provider", savedProvider);
        localStorage.setItem("bispec_ai_key", savedKey);
        aiModal.classList.remove("open");
        alert("AI Settings successfully saved! Future predictions will use this configuration.");
    });

    // Modal Events - Evaluator Milestone 1 Guide
    if (btnOpenEvaluatorGuide) {
        btnOpenEvaluatorGuide.addEventListener("click", () => evaluatorModal.classList.add("open"));
    }
    if (btnOpenEvaluatorBanner) {
        btnOpenEvaluatorBanner.addEventListener("click", () => evaluatorModal.classList.add("open"));
    }
    if (btnCloseEvaluatorModal) {
        btnCloseEvaluatorModal.addEventListener("click", () => evaluatorModal.classList.remove("open"));
    }
    if (btnCloseEvaluatorModal2) {
        btnCloseEvaluatorModal2.addEventListener("click", () => evaluatorModal.classList.remove("open"));
    }
    if (evaluatorModal) {
        evaluatorModal.addEventListener("click", (e) => { if (e.target === evaluatorModal) evaluatorModal.classList.remove("open"); });
    }

    // Initialize Accordion
    document.querySelectorAll(".accordion-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            const isOpen = body.classList.contains("open");
            document.querySelectorAll(".accordion-body").forEach(b => b.classList.remove("open"));
            if (!isOpen) {
                body.classList.add("open");
            }
        });
    });

    // Preclinical Validation Queue state matching Footer.jpeg
    let preclinicalQueue = [
        { id: 5, pair: "ERBB2 + IL17F", indication: "Small Cell Lung Cancer (SCLC)", score: "86.2%", tier: "Tier 1 (High Synergy)", status: "None (Novel Discovery)" },
        { id: 4, pair: "F8 + ANGPT1", indication: "Small Cell Lung Cancer (SCLC)", score: "94.1%", tier: "Tier 1 (High Synergy)", status: "None (Novel Discovery)" },
        { id: 3, pair: "ACVRL1 + ANGPT1", indication: "Small Cell Lung Cancer (SCLC)", score: "94.1%", tier: "Tier 1 (High Synergy)", status: "None (Novel Discovery)" },
        { id: 2, pair: "CLDN18 + CD3E", indication: "Gastric / Stomach Adenocarcinoma", score: "84.2%", tier: "Tier 1 (High Synergy)", status: "IBI-389 / ASP2138 Preclinical" },
        { id: 1, pair: "CD274 + TNFRSF9", indication: "Non-Small Cell Lung Cancer", score: "88.4%", tier: "Tier 1 (High Synergy)", status: "Preclinical / Phase 1 Trials" }
    ];

    function renderPreclinicalQueue() {
        if (!preclinicalQueueBody) return;
        preclinicalQueueBody.innerHTML = "";
        
        preclinicalQueue.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${item.id}</strong></td>
                <td><strong style="color: #0f172a; font-size: 0.95rem;">${item.pair}</strong></td>
                <td style="color: #475569;">${item.indication}</td>
                <td style="text-align: center;"><span class="badge-queue-score">${item.score}</span></td>
                <td><span style="color: #15803d; font-weight: 700;">${item.tier}</span></td>
                <td style="color: #64748b; font-size: 0.85rem;">${item.status}</td>
                <td style="text-align: right;">
                    <button type="button" class="btn-queue-remove" onclick="window.removeQueueItem(${item.id})">
                        ✕ Remove
                    </button>
                </td>
            `;
            preclinicalQueueBody.appendChild(tr);
        });

        if (queueCountBadge) {
            queueCountBadge.textContent = `${preclinicalQueue.length} Candidates Nominated`;
        }
    }

    window.removeQueueItem = function(id) {
        preclinicalQueue = preclinicalQueue.filter(item => item.id !== id);
        renderPreclinicalQueue();
    };

    if (btnAddClinicalTest) {
        btnAddClinicalTest.addEventListener("click", () => {
            if (!currentPredictionData) {
                alert("Please run a pairwise prediction first before adding to clinical testing.");
                return;
            }
            
            const g1 = currentPredictionData.targets.target_a;
            const g2 = currentPredictionData.targets.target_b;
            const pairName = `${g1} + ${g2}`;
            const scoreStr = currentPredictionData.prediction.compatibility_score.toFixed(1) + "%";
            const tierStr = currentPredictionData.prediction.tier || "Tier 1 (High Synergy)";
            const statusStr = currentPredictionData.clinical_status.is_novel ? "None (Novel Discovery)" : (currentPredictionData.clinical_status.phase || "Clinical Pipeline");
            
            // Check if already in queue
            const exists = preclinicalQueue.some(item => item.pair === pairName);
            if (exists) {
                alert(`${pairName} is already nominated in the Preclinical Pipeline Queue.`);
                return;
            }

            const nextId = preclinicalQueue.length > 0 ? Math.max(...preclinicalQueue.map(i => i.id)) + 1 : 1;
            preclinicalQueue.unshift({
                id: nextId,
                pair: pairName,
                indication: currentPredictionData.indication,
                score: scoreStr,
                tier: tierStr,
                status: statusStr
            });

            renderPreclinicalQueue();
            
            // Smooth feedback
            const queueEl = document.getElementById("preclinical-queue-section");
            if (queueEl) {
                queueEl.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    // Helper: format markdown-like text to HTML
    function formatMarkdown(text) {
        if (!text) return "";
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p style="margin-top:0.75rem;">')
            .replace(/\n- (.*?)/g, '<li>$1</li>')
            .replace(/(<li>.*?<\/li>)/gs, '<ul style="margin: 0.5rem 0 0.75rem 1.25rem;">$1</ul>');
        return `<p>${formatted}</p>`;
    }

    // 1. Fetch Targets
    async function loadTargets() {
        try {
            const res = await fetch("/api/targets");
            const data = await res.json();
            
            if (kpiTargets) kpiTargets.textContent = data.total;
            selectTargetA.innerHTML = '<option value="">Select Target 1...</option>';
            selectTargetB.innerHTML = '<option value="">Select Target 2...</option>';
            
            data.targets.forEach(t => {
                const optA = document.createElement("option");
                optA.value = t.symbol;
                optA.textContent = `${t.symbol} (Safety: ${t.safety_score.toFixed(2)}, Spec: ${t.tumor_specificity.toFixed(1)}x)`;
                selectTargetA.appendChild(optA);
                
                const optB = document.createElement("option");
                optB.value = t.symbol;
                optB.textContent = `${t.symbol} (Safety: ${t.safety_score.toFixed(2)}, Spec: ${t.tumor_specificity.toFixed(1)}x)`;
                selectTargetB.appendChild(optB);
            });
            
            // Initial reference pair matching Uc target combination.jpeg
            selectTargetA.value = "ERBB2";
            selectTargetB.value = "IL17F";
            selectIndication.value = "Small Cell Lung Cancer (SCLC)";
        } catch (err) {
            console.error("Failed to load targets:", err);
        }
    }

    // 2. Load Presets
    async function loadPresets() {
        try {
            const res = await fetch("/api/clinical-presets");
            const presets = await res.json();
            
            presetContainer.innerHTML = "";
            presets.forEach(p => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "preset-btn";
                btn.textContent = `${p.drug} (${p.target_a} + ${p.target_b})`;
                btn.title = p.description;
                btn.addEventListener("click", () => {
                    selectTargetA.value = p.target_a;
                    selectTargetB.value = p.target_b;
                    selectIndication.value = p.indication;
                    runPrediction();
                });
                presetContainer.appendChild(btn);
            });
        } catch (err) {
            console.error("Failed to load presets:", err);
        }
    }

    // 3. Load Benchmarks
    async function loadBenchmarks() {
        try {
            const res = await fetch("/api/benchmark");
            const data = await res.json();
            
            benchmarkTableBody.innerHTML = "";
            for (const [name, m] of Object.entries(data.models)) {
                const tr = document.createElement("tr");
                const isHero = name === "XGBoost + Pairwise AI";
                if (isHero) tr.className = "table-row-highlight";
                
                tr.innerHTML = `
                    <td>${isHero ? '⭐ ' : ''}${name}</td>
                    <td class="${isHero ? 'best-metric' : ''}">${(m.roc_auc * 100).toFixed(2)}%</td>
                    <td class="${isHero ? 'best-metric' : ''}">${(m.pr_auc * 100).toFixed(2)}%</td>
                    <td>${(m.accuracy * 100).toFixed(2)}%</td>
                    <td>${(m.f1_score * 100).toFixed(2)}%</td>
                    <td>${(m.recall * 100).toFixed(2)}%</td>
                    <td>${(m.specificity * 100).toFixed(2)}%</td>
                `;
                benchmarkTableBody.appendChild(tr);
            }
        } catch (err) {
            console.error("Failed to load benchmark:", err);
        }
    }

    // 4. Load ROC Curves
    async function loadROCCurves() {
        try {
            const res = await fetch("/api/roc-curves");
            const rocData = await res.json();
            renderROCChart(rocData);
        } catch (err) {
            console.error("Failed to load ROC curves:", err);
        }
    }

    // 5. Load Clinical Catalog
    async function loadCatalog(phaseFilter = "all") {
        try {
            let url = "/api/clinical-catalog?limit=50";
            if (phaseFilter && phaseFilter !== "all") {
                url += `&phase=${encodeURIComponent(phaseFilter)}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            allCatalogPairs = data.pairs;
            renderCatalogTable(allCatalogPairs);
        } catch (err) {
            console.error("Failed to load catalog:", err);
        }
    }

    function renderCatalogTable(pairs) {
        if (!pairs || pairs.length === 0) {
            catalogTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No pairs match your search.</td></tr>';
            return;
        }

        catalogTableBody.innerHTML = "";
        pairs.forEach(p => {
            const tr = document.createElement("tr");
            const isApproved = p.phase.toLowerCase().includes("approved");
            const isDiscontinued = p.phase.toLowerCase().includes("discontinued");
            const phaseBadge = isApproved 
                ? '<span style="color: var(--success); font-weight: 700;">Approved</span>' 
                : (isDiscontinued ? '<span style="color: var(--danger); font-weight: 600;">Discontinued</span>' : p.phase);

            tr.innerHTML = `
                <td><strong>${p.drug}</strong></td>
                <td><span style="color: var(--accent-primary); font-weight: 600;">${p.target_name}</span></td>
                <td><code>${p.target_symbol}</code></td>
                <td>${phaseBadge}</td>
                <td>${p.indication}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${p.organization}</td>
                <td>
                    <button type="button" class="preset-btn" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" 
                        onclick="window.selectCatalogPair('${p.target_symbol}', '${p.indication}')">
                        🔬 Analyze
                    </button>
                </td>
            `;
            catalogTableBody.appendChild(tr);
        });
    }

    window.selectCatalogPair = function(symbolsStr, indication) {
        const cleaned = symbolsStr.replace(/[+/;]/g, ',').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (cleaned.length >= 2) {
            selectTargetA.value = cleaned[0];
            selectTargetB.value = cleaned[1];
            if (indication && indication !== "-" && indication !== "N/A") {
                selectIndication.value = indication;
            }
            runPrediction();
        } else {
            alert(`Pair symbols '${symbolsStr}' could not be cleanly separated into Target 1 and Target 2.`);
        }
    };

    catalogFilters.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            catalogFilters.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            loadCatalog(pill.getAttribute("data-phase"));
        });
    });

    catalogSearchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
            renderCatalogTable(allCatalogPairs);
            return;
        }
        const filtered = allCatalogPairs.filter(p => 
            p.drug.toLowerCase().includes(term) || 
            p.target_name.toLowerCase().includes(term) || 
            p.target_symbol.toLowerCase().includes(term) ||
            p.indication.toLowerCase().includes(term)
        );
        renderCatalogTable(filtered);
    });

    // 6. Prediction Execution
    async function runPrediction() {
        const targetA = selectTargetA.value;
        const targetB = selectTargetB.value;
        const indication = selectIndication.value;

        if (!targetA || !targetB) {
            alert("Please select both Target 1 and Target 2.");
            return;
        }

        btnPredict.disabled = true;
        btnPredict.innerHTML = '<span class="spinner"></span> Running Pairwise AI & GPT Engine...';

        try {
            const payload = {
                target_a: targetA,
                target_b: targetB,
                indication: indication,
                api_key: (savedProvider !== "builtin" && savedKey) ? savedKey : null,
                api_provider: savedProvider
            };

            const res = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Prediction request failed");
            }

            const data = await res.json();
            currentPredictionData = data;
            displayPredictionResults(data);
        } catch (err) {
            alert("Prediction Error: " + err.message);
        } finally {
            btnPredict.disabled = false;
            btnPredict.innerHTML = '⚡ Run AI Pairwise Prediction & Generate Clinical Dossier';
        }
    }

    function displayPredictionResults(data) {
        const pred = data.prediction;
        const score = pred.compatibility_score;

        // Circular score gauge
        scoreVal.textContent = score.toFixed(1);
        scoreCircle.style.background = `conic-gradient(#10b981 ${score * 3.6}deg, #e2e8f0 0deg)`;

        // Pair Header & Summary
        analysisPairTitle.textContent = `${data.targets.target_a} + ${data.targets.target_b}`;
        summaryText.textContent = pred.summary;

        // Tier Badge
        scoreTierBadge.textContent = pred.tier;
        scoreTierBadge.className = `badge-tier-recommended`;

        // Target Arm Profiles (matching Uc target combination.jpeg)
        if (data.target_profiles) {
            const pA = data.target_profiles.target_a;
            const pB = data.target_profiles.target_b;
            if (pA) {
                profSymbolA.textContent = pA.symbol;
                profClassA.textContent = pA.class;
                profLocA.textContent = pA.location;
                profDrugsA.textContent = `${pA.clinical_records} records`;
            }
            if (pB) {
                profSymbolB.textContent = pB.symbol;
                profClassB.textContent = pB.class;
                profLocB.textContent = pB.location;
                profDrugsB.textContent = `${pB.clinical_records} records`;
            }
        }

        // Warning Callout Box (matching Uc target combination.jpeg)
        if (data.clinical_status) {
            if (data.clinical_status.is_novel) {
                targetWarningBox.className = "callout-warning-novel";
                warningTitle.textContent = "⚠ Novel / Uncharacterized Target Combination";
                warningDesc.innerHTML = `No active bispecific antibody targeting <strong>${data.targets.target_a} + ${data.targets.target_b}</strong> is currently approved or under clinical investigation in the dataset.`;
            } else {
                targetWarningBox.className = "callout-info-clinical";
                warningTitle.textContent = "ℹ️ Clinically Investigated / Approved Target Combination";
                const matchedStr = data.clinical_status.matched_drugs && data.clinical_status.matched_drugs.length > 0 
                    ? ` (${data.clinical_status.matched_drugs.join(", ")})` 
                    : "";
                warningDesc.innerHTML = `Active bispecific antibody targeting <strong>${data.targets.target_a} + ${data.targets.target_b}</strong>${matchedStr} is documented in the clinical dataset (Phase: ${data.clinical_status.phase || "Clinical Investigation"}).`;
            }
        }

        // Radar Chart (matching Graph and Add.jpeg)
        if (data.radar_metrics && typeof renderRadarChart === "function") {
            renderRadarChart(data.radar_metrics);
            
            // 4 Stat Cards
            radarStatSynergy.textContent = (data.radar_metrics.biological_synergy !== undefined ? data.radar_metrics.biological_synergy : 35) + "%";
            radarStatPathway.textContent = (data.radar_metrics.pathway_overlap !== undefined ? data.radar_metrics.pathway_overlap : 40) + "%";
            radarStatTumor.textContent = (data.radar_metrics.tumor_relevance !== undefined ? data.radar_metrics.tumor_relevance : 79) + "%";
            radarStatSafety.textContent = (data.radar_metrics.safety_profile !== undefined ? data.radar_metrics.safety_profile : 55) + "%";
        }

        // Preclinical Opportunity Box (matching Graph and Add.jpeg)
        oppCompatScore.textContent = score.toFixed(1) + "%";

        // Biomarkers
        statSafetyA.textContent = data.features.safety_score_A.toFixed(2);
        statSafetyB.textContent = data.features.safety_score_B.toFixed(2);
        statSafetyMin.textContent = data.features.safety_score_min.toFixed(2);
        statSpecA.textContent = data.features.tumor_specificity_A.toFixed(2) + "x";
        statSpecB.textContent = data.features.tumor_specificity_B.toFixed(2) + "x";
        statSim.textContent = data.features.target_similarity.toFixed(2);

        // Multi-Model real-time predictions bar
        modelCompList.innerHTML = "";
        for (const [modelName, prob] of Object.entries(data.baseline_comparison)) {
            const row = document.createElement("div");
            row.className = "model-comp-row";
            const isHero = modelName.includes("XGBoost");
            
            row.innerHTML = `
                <div class="model-comp-header">
                    <span>${isHero ? '⭐ ' : ''}${modelName}</span>
                    <span style="color: ${isHero ? 'var(--accent-primary)' : 'var(--text-secondary)'}">${prob.toFixed(1)}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${isHero ? 'hero-highlight' : ''}" style="width: ${prob}%"></div>
                </div>
            `;
            modelCompList.appendChild(row);
        }

        // Render SHAP Feature Importance Chart
        if (typeof renderSHAPChart === "function") {
            renderSHAPChart(pred.top_drivers);
        }

        // Populate Comprehensive Clinical Dossier
        const gpt = data.gpt_augmentation;
        dossierPairTitle.textContent = `${data.targets.target_a} + ${data.targets.target_b} Bispecific Dossier`;
        dossierSource.textContent = gpt.source || "Biomedical Knowledge Engine";
        dossierIndication.textContent = data.indication;

        dossierOverview.innerHTML = formatMarkdown(gpt.target_overview);
        dossierMoA.innerHTML = formatMarkdown(gpt.mechanism_of_action);
        dossierSynergy.innerHTML = formatMarkdown(gpt.synergy_rationale);
        
        // Safety callout styling
        const safetyBadgeClass = (data.features.safety_score_min < 0.3) ? "danger" : (data.features.safety_score_min < 0.5 ? "warning" : "");
        dossierSafety.innerHTML = `
            <div class="callout-box ${safetyBadgeClass}">
                <strong>Toxicity Status:</strong> Minimum Safety Floor = ${data.features.safety_score_min.toFixed(2)} / 1.00. 
                ${data.features.safety_score_min < 0.3 ? 'CRITICAL WARNING: High off-tumor tissue liability detected.' : 'Acceptable therapeutic window.'}
            </div>
            ${formatMarkdown(gpt.safety_and_toxicity)}
        `;

        dossierRecommendation.innerHTML = formatMarkdown(gpt.clinical_recommendation);
    }

    predictForm.addEventListener("submit", (e) => {
        e.preventDefault();
        runPrediction();
    });

    // Render Initial Preclinical Queue
    renderPreclinicalQueue();

    // Initial sequence loads
    await loadTargets();
    await loadPresets();
    await loadBenchmarks();
    await loadROCCurves();
    await loadCatalog();
    
    // Automatically trigger initial prediction for demonstration
    runPrediction();
});
