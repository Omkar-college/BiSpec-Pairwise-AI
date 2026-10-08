let rocChartInstance = null;
let shapChartInstance = null;

const MODEL_COLORS = {
    "XGBoost + Pairwise AI": { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", width: 3.5 },
    "GBDT": { border: "#8b5cf6", bg: "transparent", width: 2 },
    "Random Forest": { border: "#3b82f6", bg: "transparent", width: 2 },
    "Decision Tree": { border: "#f59e0b", bg: "transparent", width: 1.8 },
    "Logistic Regression": { border: "#ec4899", bg: "transparent", width: 1.8 },
    "DNN (Deep Neural Network)": { border: "#10b981", bg: "transparent", width: 2 }
};

function renderROCChart(rocData) {
    const ctx = document.getElementById("rocChart").getContext("2d");
    
    if (rocChartInstance) {
        rocChartInstance.destroy();
    }

    const datasets = [];

    // Add random baseline diagonal
    datasets.push({
        label: "Random Chance (AUC = 0.50)",
        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        borderColor: "#64748b",
        borderDash: [6, 6],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0
    });

    for (const [modelName, info] of Object.entries(rocData)) {
        const style = MODEL_COLORS[modelName] || { border: "#94a3b8", bg: "transparent", width: 1.5 };
        const points = info.fpr.map((fprVal, idx) => ({
            x: fprVal,
            y: info.tpr[idx]
        }));

        datasets.push({
            label: `${modelName} (AUC: ${(info.auc * 100).toFixed(1)}%)`,
            data: points,
            borderColor: style.border,
            backgroundColor: style.bg,
            borderWidth: style.width,
            fill: modelName === "XGBoost + Pairwise AI",
            tension: 0.15,
            pointRadius: 0,
            pointHoverRadius: 4
        });
    }

    rocChartInstance = new Chart(ctx, {
        type: "line",
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#94a3b8",
                        font: { size: 11, family: "Inter" },
                        boxWidth: 14,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: "#131b2e",
                    titleColor: "#f8fafc",
                    bodyColor: "#94a3b8",
                    borderColor: "#233152",
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label.split('(')[0]}: FPR=${context.parsed.x.toFixed(3)}, TPR=${context.parsed.y.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: "False Positive Rate (1 - Specificity)",
                        color: "#94a3b8",
                        font: { size: 12, weight: "bold" }
                    },
                    grid: { color: "rgba(226, 232, 240, 0.8)" },
                    ticks: { color: "#475569" }
                },
                y: {
                    type: "linear",
                    min: 0,
                    max: 1.02,
                    title: {
                        display: true,
                        text: "True Positive Rate (Sensitivity / Recall)",
                        color: "#334155",
                        font: { size: 12, weight: "bold" }
                    },
                    grid: { color: "rgba(226, 232, 240, 0.8)" },
                    ticks: { color: "#475569" }
                }
            }
        }
    });
}

function renderSHAPChart(topDrivers) {
    const ctx = document.getElementById("shapChart").getContext("2d");
    
    if (shapChartInstance) {
        shapChartInstance.destroy();
    }

    const labels = topDrivers.map(d => d.label).reverse();
    const dataVals = topDrivers.map(d => d.shap_value).reverse();
    const bgColors = dataVals.map(v => v >= 0 ? "rgba(2, 132, 199, 0.85)" : "rgba(220, 38, 38, 0.85)");
    const borderColors = dataVals.map(v => v >= 0 ? "#0284c7" : "#dc2626");

    shapChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "SHAP Impact on Target Viability",
                data: dataVals,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    borderColor: "#334155",
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            return `Impact: ${val > 0 ? '+' : ''}${val.toFixed(4)} (${val > 0 ? 'Fosters Compatibility' : 'Toxicity / Risk Liability'})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "SHAP Value (Contribution to Pairwise Score)",
                        color: "#334155",
                        font: { size: 11, weight: "600" }
                    },
                    grid: { color: "rgba(226, 232, 240, 0.8)" },
                    ticks: { color: "#475569" }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: "#0f172a",
                        font: { size: 11, family: "Inter", weight: "600" }
                    }
                }
            }
        }
    });
}

let radarChartInstance = null;

function renderRadarChart(metrics) {
    const canvas = document.getElementById("radarChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    const labels = [
        "Biological Synergy",
        "Pathway Overlap",
        "Tumor Relevance",
        "Safety Profile",
        "Molecular Fit"
    ];

    const values = [
        metrics.biological_synergy !== undefined ? metrics.biological_synergy : 35,
        metrics.pathway_overlap !== undefined ? metrics.pathway_overlap : 40,
        metrics.tumor_relevance !== undefined ? metrics.tumor_relevance : 79,
        metrics.safety_profile !== undefined ? metrics.safety_profile : 55,
        metrics.molecular_fit !== undefined ? metrics.molecular_fit : 38
    ];

    radarChartInstance = new Chart(ctx, {
        type: "radar",
        data: {
            labels: labels,
            datasets: [{
                label: "Distribution Profile",
                data: values,
                backgroundColor: "rgba(34, 197, 94, 0.18)",
                borderColor: "#16a34a",
                borderWidth: 2.2,
                pointBackgroundColor: "#16a34a",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 1.5,
                pointRadius: 4.5,
                pointHoverRadius: 6.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: "rgba(148, 163, 184, 0.35)",
                        lineWidth: 1
                    },
                    grid: {
                        color: "rgba(148, 163, 184, 0.3)",
                        circular: false
                    },
                    pointLabels: {
                        color: "#1e293b",
                        font: {
                            family: "Inter",
                            size: 12,
                            weight: "600"
                        },
                        padding: 10
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        color: "#64748b",
                        backdropColor: "transparent",
                        font: { size: 10, family: "Inter" }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    bodyColor: "#94a3b8",
                    borderColor: "rgba(34, 197, 94, 0.4)",
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

