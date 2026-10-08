import os
import json
import joblib
import numpy as np
import pandas as pd
import shap
from xgboost import XGBClassifier

FEATURE_DESCRIPTIONS = {
    "safety_score_min": "Minimum Safety Score (On-target Off-tumor safety floor)",
    "safety_score_prod": "Combined Safety Product (Joint safety profile)",
    "double_positive_rate": "Double Positive Cell Co-expression Rate",
    "target_similarity": "Target Cell-Type Profile Similarity (Embedding Cosine)",
    "tumor_specificity_min": "Tumor vs. Normal Specificity Ratio",
    "prod_tumor_mean": "Joint Tumor Cell Expression Synergy",
    "diff_tumor_mean": "Expression Level Disparity between Targets",
    "is_immune_engager": "T-Cell / Immune Redirection Mechanism (BiTE)",
    "is_dual_checkpoint": "Dual Immune Checkpoint Blockade",
    "is_angiogenic_co_target": "Anti-Angiogenesis / Vascular Co-targeting",
    "expr_tnk_A": "Target A Expression on T/NK Killer Cells",
    "expr_tnk_B": "Target B Expression on T/NK Killer Cells",
    "expr_epithelial_A": "Target A Tumor Parenchymal (Epithelial) Expression",
    "expr_epithelial_B": "Target B Tumor Parenchymal (Epithelial) Expression",
    "nLung_mean_A": "Target A Expression in Normal Lung (Toxicity Risk)",
    "nLung_mean_B": "Target B Expression in Normal Lung (Toxicity Risk)"
}

class BispecExplainer:
    def __init__(self, model_path=r"saved_models\xgboost_pairwise_model.pkl", features_path=r"saved_models\features.json"):
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.model = XGBClassifier()
            self.model.load_model(r"saved_models\xgboost_pairwise_model.json")
            
        with open(features_path, "r") as f:
            self.feature_names = json.load(f)
            
        # Initialize TreeExplainer
        self.explainer = shap.TreeExplainer(self.model)

    def explain_instance(self, feature_dict):
        """
        Explain a single target pair prediction with SHAP values.
        """
        feat_vector = np.array([[feature_dict.get(col, 0.0) for col in self.feature_names]], dtype=np.float32)
        
        # Prediction
        proba = float(self.model.predict_proba(feat_vector)[0, 1])
        score_pct = round(proba * 100, 2)
        
        # SHAP calculation
        shap_values = self.explainer.shap_values(feat_vector)[0]
        
        contributions = []
        for name, val, fval in zip(self.feature_names, shap_values, feat_vector[0]):
            contributions.append({
                "feature": name,
                "label": FEATURE_DESCRIPTIONS.get(name, name.replace("_", " ").title()),
                "shap_value": round(float(val), 4),
                "feature_value": round(float(fval), 4),
                "direction": "positive" if val > 0 else "negative"
            })
            
        # Sort by absolute SHAP impact
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        top_positive = [c for c in contributions if c["shap_value"] > 0][:5]
        top_negative = [c for c in contributions if c["shap_value"] < 0][:5]
        
        if score_pct >= 75:
            tier = "High Compatibility"
            badge = "success"
            summary = "Highly promising candidate pair with strong tumor co-localization and favorable safety profile."
        elif score_pct >= 50:
            tier = "Moderate Compatibility"
            badge = "warning"
            summary = "Viable combination requiring careful dosing or affinity tuning to mitigate on-target off-tumor risks."
        else:
            tier = "Low / Inviable Compatibility"
            badge = "danger"
            summary = "High risk of toxicity, normal tissue liability, or poor tumor co-expression."

        return {
            "compatibility_score": score_pct,
            "probability": proba,
            "tier": tier,
            "badge": badge,
            "summary": summary,
            "top_drivers": contributions[:8],
            "top_positive": top_positive,
            "top_negative": top_negative
        }

if __name__ == "__main__":
    explainer = BispecExplainer()
    test_feat = {f: 0.5 for f in explainer.feature_names}
    test_feat["safety_score_min"] = 0.8
    test_feat["double_positive_rate"] = 0.4
    res = explainer.explain_instance(test_feat)
    print("SHAP explanation test:", res["tier"], res["compatibility_score"])
