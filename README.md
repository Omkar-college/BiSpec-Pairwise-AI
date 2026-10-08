# BiSpec Pairwise AI 🧬
### Guiding the Selection of Bispecific Antibody Target Combinations with Pairwise Learning and GPT Augmentation

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/Model-XGBoost%20%2B%20Pairwise%20AI-EB6536.svg)](https://xgboost.ai)
[![SHAP](https://img.shields.io/badge/Explainability-SHAP-blue.svg)](https://shap.readthedocs.io)
[![SingleCell](https://img.shields.io/badge/Genomics-GSE131907%20NSCLC-informational.svg)](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE131907)

---

## 📌 1. Project Background & Problem Statement
A **bispecific antibody (BsAb)** is an engineered therapeutic molecule with **two distinct antigen-binding arms**. In cancer immunotherapy, BsAbs provide revolutionary advantages:
* **T-Cell Redirection (BiTE)**: One arm binds a tumor antigen (e.g., EGFR, HER2, CD19) and the other binds CD3 on a cytotoxic T-cell, forcing the killer cell directly against the cancer cell.
* **Dual Checkpoint Inhibition**: Neutralizing two non-redundant inhibitory immune receptors (e.g., PD-1 + CTLA-4) to reverse T-cell exhaustion.
* **Dual Tumor-Antigen Targeting**: Simultaneously engaging two tumor receptors (e.g., EGFR + c-MET) to overcome mutation-driven bypass resistance and limit normal tissue damage.

### The Combinatorial Bottleneck
There are over 5,000 cell-surface antigens on human cells. Evaluating all pairs means screening:
$$\frac{5000 \times 4999}{2} \approx 12.5\text{ Million potential combinations}$$
Synthesizing and testing a single pair in laboratory animals costs tens of thousands of dollars and months of work. More crucially, selecting the wrong targets can cause lethal **on-target off-tumor toxicity** (destroying vital healthy organs) or **cytokine release syndrome (CRS)**.

**BiSpec Pairwise AI** solves this problem by combining:
1. **Single-cell RNA sequencing (scRNA-seq)** of non-small cell lung cancer (208,506 cells from GSE131907) to extract tumor vs. normal tissue expression, cell-type specificity, and safety scores.
2. **Pairwise Learning & XGBoost** to model relative target interactions, expression synergy, and clinical advancement ranking.
3. **SHAP (SHapley Additive exPlanations)** to attribute biological feature contributions.
4. **GPT Augmentation** to generate mechanistic explanations (Mechanism of Action, Biological Synergy, and Clinical Recommendations).

---

## 🏆 2. Algorithm Comparison & Benchmarks

We evaluated 6 machine learning architectures on the clinical bispecific target dataset:

| Algorithm | ROC-AUC | PR-AUC | Accuracy | F1-Score | Recall | Specificity |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **XGBoost + Pairwise AI (Hero Model)** | **81.26% - 85.0%** | **82.60%** | **80.77%** | **84.96%** | **91.13%** | **68.29%** |
| **GBDT (Gradient Boosting)** | 81.54% | 80.89% | 81.73% | 85.71% | 91.94% | 67.07% |
| **Random Forest** | 80.35% | 80.14% | 82.21% | 86.25% | 93.55% | 65.85% |
| **Logistic Regression** | 78.65% | 79.32% | 68.75% | 72.34% | 68.55% | 69.51% |
| **Decision Tree** | 78.03% | 76.66% | 82.21% | 86.35% | 94.35% | 64.63% |
| **DNN (Deep Neural Network)** | 77.90% | 77.36% | 80.29% | 84.87% | 92.74% | 62.20% |

> **Note**: Our empirical baseline metrics closely mirror the published findings of Zhang et al. (2024), where Logistic Regression baseline achieved ~78.68% AUC and XGBoost with pairwise learning achieved the top performance.

---

## 💡 3. Why ROC-AUC and PR-AUC instead of Accuracy?

1. **Extreme Class Imbalance Invariance (Accuracy Paradox)**:
   * Less than 0.1% of possible target pairings in the proteome are clinically safe and effective.
   * A trivial model predicting *"Inviable"* for every single pair achieves **99.9% Accuracy**, but discovers zero drugs. ROC-AUC is completely invariant to class frequencies.
2. **Threshold-Independent Pairwise Ranking**:
   * Researchers do not need an arbitrary 0.5 decision cutoff; they need to prioritize top candidate pairs for experimental synthesis in descending order.
   * Mathematically, ROC-AUC equals the **Wilcoxon-Mann-Whitney U statistic**: the exact probability that a randomly chosen successful drug pair ranks higher than a non-viable pair.
3. **PR-AUC Synergy for Wet-Lab Cost Reduction**:
   * Synthesizing and validating an antibody in wet-lab assays costs $50,000+ per pair. False positives waste massive resources. PR-AUC directly tracks precision over the rare positive class.
4. **Oncological Safety Asymmetry & Zero-False-Positive Tuning**:
   * A false positive can cause fatal cytokine storms in clinical trials. The ROC curve allows immunologists to choose a high-specificity operating point with near-zero false positive rate.

---

## 📂 4. Project Directory Structure

```
BISPEC Pairwise AI/
├── data/
│   ├── Lung Cancer PP.csv                  # Clinical bispecific antibody pairs (791 drugs)
│   ├── gene_single_cell_features.csv       # Extracted single-cell metrics (208k cells, GSE131907)
│   └── pairwise_dataset_features.csv       # Final engineered pairwise dataset
├── backend/
│   ├── app.py                              # FastAPI REST API server
│   ├── models_training.py                  # Model training & comparative benchmark suite
│   ├── pairwise_engine.py                  # Single-cell pairwise feature engineering & scoring
│   ├── explainability.py                   # SHAP TreeExplainer module
│   ├── gpt_augmenter.py                   # Generative AI biological rationale & MoA engine
│   └── extract_single_cell_features.py     # Single-cell UMI matrix streamer
├── saved_models/
│   ├── xgboost_pairwise_model.json         # Saved XGBoost hero model
│   ├── baseline_models.pkl                 # Serialized baseline models (LR, DT, RF, GBDT, DNN)
│   ├── model_metrics.json                  # Benchmark evaluation metrics
│   ├── roc_curves_data.json                # Interactive ROC curve points
│   └── scaler.pkl                          # Standard scaler
├── frontend/
│   ├── index.html                          # Modern bio-oncology responsive web dashboard
│   ├── css/
│   │   └── style.css                       # Dark-theme biotechnology UI styles
│   └── js/
│       ├── app.js                          # Frontend controller & API fetch orchestration
│       └── charts.js                       # Interactive Chart.js ROC and SHAP charts
├── run_server.py                           # Single-command server launcher
└── README.md                               # Project documentation
```

---

## 🚀 5. How to Run the Project

### Prerequisites
Make sure Python is installed. Dependencies installed:
```bash
python -m pip install fastapi uvicorn xgboost shap scikit-learn pandas numpy
```

### Launching the Web Dashboard
Run the startup script from the project folder:
```bash
python run_server.py
```

Open your browser and navigate to:
* **Web Dashboard**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 👥 6. Suggested Team Member Role Distribution (5 Members)

| Member | Title | Responsibilities |
| :--- | :--- | :--- |
| **Member 1 (Nominee / Lead)** | System Architect & Full-Stack Lead | FastAPI backend routing, API orchestration, connecting backend models to frontend dashboard. |
| **Member 2** | Computational Biologist & Feature Engineer | Single-cell RNA-seq feature engineering (GSE131907), tumor specificity ratios, and pairwise interaction matrices. |
| **Member 3** | Machine Learning & Benchmarking Lead | Training baseline models (Logistic Regression, Decision Tree, Random Forest, GBDT, DNN) vs. XGBoost, hyperparameter tuning, and cross-validation. |
| **Member 4** | Explainable AI & GPT Augmentation | SHAP value calculation, feature attribution, and LLM prompt engineering for biological mechanism generation. |
| **Member 5** | Frontend & Data Visualization Lead | UI/UX development (HTML5/CSS3), Chart.js implementation for multi-model ROC curves and SHAP bar charts. |

---

## 📚 7. Key References
1. **Zhang, X., Wang, H., & Sun, C.** (2024). *BiSpec Pairwise AI: guiding the selection of bispecific antibody target combinations with pairwise learning and GPT augmentation.* **Journal of Cancer Research and Clinical Oncology**, 150(5), 237.
2. **Kim, N. et al.** (2020). *Single-cell RNA sequencing demonstrates the molecular and cellular basis of non-small cell lung cancer.* **Nature Communications**, 11(1), 1-14. (GSE131907).
