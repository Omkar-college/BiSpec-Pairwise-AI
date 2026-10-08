import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score, roc_curve, precision_recall_curve, average_precision_score,
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
)
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from xgboost import XGBClassifier

# Feature columns used for training
NUMERIC_FEATURES = [
    "tLung_mean_A", "tLung_mean_B", "nLung_mean_A", "nLung_mean_B",
    "safety_score_A", "safety_score_B", "specificity_A", "specificity_B",
    "expr_tnk_A", "expr_tnk_B", "expr_myeloid_A", "expr_myeloid_B",
    "expr_epithelial_A", "expr_epithelial_B",
    "diff_tumor_mean", "prod_tumor_mean", "sum_tumor_mean",
    "min_tumor_mean", "max_tumor_mean", "safety_score_min",
    "safety_score_prod", "specificity_min", "double_positive_rate",
    "target_similarity", "is_immune_engager", "is_dual_checkpoint",
    "is_angiogenic_co_target"
]

def train_and_benchmark(
    dataset_path=r"data\pairwise_dataset_features.csv",
    save_dir=r"saved_models"
):
    print("="*60)
    print("PHASE 2: MODEL TRAINING & COMPARATIVE BENCHMARK SUITE")
    print("="*60)
    
    os.makedirs(save_dir, exist_ok=True)
    df = pd.read_csv(dataset_path)
    
    X = df[NUMERIC_FEATURES].fillna(0).values
    y = df["label"].values
    
    # Calculate class weight ratio for imbalance
    pos_count = np.sum(y == 1)
    neg_count = np.sum(y == 0)
    pos_scale = neg_count / max(1, pos_count)
    print(f"Dataset samples: {len(y)} (Active/Approved: {pos_count}, Discontinued: {neg_count})")
    
    # Train/Test Split (80% Train, 20% Holdout Test with Stratification)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save scaler and feature names
    joblib.dump(scaler, os.path.join(save_dir, "scaler.pkl"))
    with open(os.path.join(save_dir, "features.json"), "w") as f:
        json.dump(NUMERIC_FEATURES, f, indent=2)

    # Model definitions
    models = {
        "Logistic Regression": {
            "model": LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced"),
            "scaled": True
        },
        "Decision Tree": {
            "model": DecisionTreeClassifier(max_depth=5, min_samples_split=6, random_state=42, class_weight="balanced"),
            "scaled": False
        },
        "Random Forest": {
            "model": RandomForestClassifier(n_estimators=150, max_depth=7, min_samples_split=4, random_state=42, class_weight="balanced"),
            "scaled": False
        },
        "GBDT": {
            "model": GradientBoostingClassifier(n_estimators=150, learning_rate=0.08, max_depth=4, random_state=42),
            "scaled": False
        },
        "DNN (Deep Neural Network)": {
            "model": MLPClassifier(hidden_layer_sizes=(128, 64, 32), max_iter=800, alpha=0.01, random_state=42, early_stopping=True),
            "scaled": True
        },
        "XGBoost + Pairwise AI": {
            "model": XGBClassifier(
                n_estimators=220,
                learning_rate=0.04,
                max_depth=5,
                subsample=0.85,
                colsample_bytree=0.85,
                scale_pos_weight=1.0,
                eval_metric="auc",
                random_state=42
            ),
            "scaled": False
        }
    }

    metrics_results = {}
    roc_curves = {}
    pr_curves = {}
    trained_baseline_models = {}

    print(f"\n{'Algorithm':<28} | {'ROC-AUC':<9} | {'PR-AUC':<9} | {'Accuracy':<9} | {'F1-Score':<9} | {'Recall':<9}")
    print("-" * 85)

    for name, item in models.items():
        clf = item["model"]
        is_scaled = item["scaled"]
        
        X_tr = X_train_scaled if is_scaled else X_train
        X_te = X_test_scaled if is_scaled else X_test
        
        # Train
        clf.fit(X_tr, y_train)
        
        # Predict Probabilities
        if hasattr(clf, "predict_proba"):
            y_proba = clf.predict_proba(X_te)[:, 1]
        else:
            y_proba = clf.decision_function(X_te)
            y_proba = (y_proba - y_proba.min()) / (y_proba.max() - y_proba.min() + 1e-6)
            
        y_pred = (y_proba >= 0.5).astype(int)
        
        # Calculate Metrics
        roc_auc = float(roc_auc_score(y_test, y_proba))
        pr_auc = float(average_precision_score(y_test, y_proba))
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

        metrics_results[name] = {
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "specificity": round(specificity, 4),
            "confusion_matrix": {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)}
        }
        
        # ROC Curve coords (downsampled for clean json transmission)
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        # Sample ~50 points for smooth frontend plotting
        idx_step = max(1, len(fpr) // 50)
        roc_curves[name] = {
            "fpr": [round(float(x), 4) for x in fpr[::idx_step]] + [1.0],
            "tpr": [round(float(x), 4) for x in tpr[::idx_step]] + [1.0],
            "auc": round(roc_auc, 4)
        }
        
        print(f"{name:<28} | {roc_auc*100:>7.2f}% | {pr_auc*100:>7.2f}% | {acc*100:>7.2f}% | {f1*100:>7.2f}% | {rec*100:>7.2f}%")
        
        if name == "XGBoost + Pairwise AI":
            clf.save_model(os.path.join(save_dir, "xgboost_pairwise_model.json"))
            joblib.dump(clf, os.path.join(save_dir, "xgboost_pairwise_model.pkl"))
        else:
            trained_baseline_models[name] = clf

    # Save baseline models
    joblib.dump(trained_baseline_models, os.path.join(save_dir, "baseline_models.pkl"))
    
    # Save metrics JSON
    with open(os.path.join(save_dir, "model_metrics.json"), "w") as f:
        json.dump(metrics_results, f, indent=2)
        
    # Save ROC curves JSON
    with open(os.path.join(save_dir, "roc_curves_data.json"), "w") as f:
        json.dump(roc_curves, f, indent=2)
        
    print("\nSaved models and evaluation metrics to 'saved_models/' directory.")
    print("Benchmarking completed successfully!")

if __name__ == "__main__":
    train_and_benchmark()
