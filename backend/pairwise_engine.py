import os
import re
import random
import numpy as np
import pandas as pd

# Biological target categories
IMMUNE_ENGAGERS = {"CD3E", "CD3D", "CD3G", "CD28", "TNFRSF9", "CD2", "CD27"}
IMMUNE_CHECKPOINTS = {"PDCD1", "CTLA4", "CD274", "HAVCR2", "LAG3", "TIGIT", "BTLA", "SIGLEC15"}
ANGIOGENIC_TARGETS = {"VEGFA", "VEGFB", "KDR", "FLT1", "ANGPT1", "ANGPT2", "TEK"}
HEMATOLOGIC_TARGETS = {"CD19", "MS4A1", "TNFRSF17", "CD38", "CD33", "CD123", "CD22", "CD37", "CD70", "FLT3"}

CELL_COLS = ["expr_tnk_cells", "expr_b_cells", "expr_myeloid", "expr_epithelial", "expr_endothelial"]

def clean_gene_symbol(raw_str):
    if not isinstance(raw_str, str) or raw_str.strip() in {"-", "#VALUE!", "N/A", ""}:
        return []
    cleaned = re.sub(r"[+/;]", ",", raw_str)
    genes = [g.strip().upper() for g in cleaned.split(",") if g.strip()]
    return [g for g in genes if g not in {"-", "#VALUE!", "N/A"}]

def compute_cosine_sim(v1, v2):
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (n1 * n2))

def build_pairwise_dataset(
    pairs_csv=r"data\Lung Cancer PP.csv",
    sc_features_csv=r"data\gene_single_cell_features.csv",
    output_csv=r"data\pairwise_dataset_features.csv"
):
    print("Loading preprocessed clinical pairs and single-cell features...")
    pairs_df = pd.read_csv(pairs_csv)
    sc_df = pd.read_csv(sc_features_csv).set_index("gene_symbol")
    
    default_vals = sc_df.median().to_dict()

    def get_gene_feat(gene):
        if gene in sc_df.index:
            return sc_df.loc[gene].to_dict()
        else:
            return default_vals

    processed_rows = []
    seen_pairs = set()

    for idx, row in pairs_df.iterrows():
        drug_name = row.get("Drug", f"Drug_{idx}")
        raw_symbols = row.get("Target(Gene Symbol)", "")
        gene_names_str = str(row.get("Target(Gene Name)", ""))
        phase = str(row.get("Drug Highest Phase", "")).strip()
        indication = str(row.get("Active Indication(Indication Name)", "Solid tumor")).strip()
        
        symbols = clean_gene_symbol(raw_symbols)
        if len(symbols) < 2:
            name_parts = [n.strip() for n in re.split(r"[+/]", gene_names_str) if n.strip()]
            if len(name_parts) >= 2:
                symbols = [name_parts[0].upper(), name_parts[1].upper()]
            elif len(symbols) == 1:
                symbols = [symbols[0], symbols[0]]
            else:
                continue

        g1, g2 = symbols[0], symbols[1]
        pair_key = tuple(sorted([g1, g2]))
        seen_pairs.add(pair_key)
        
        f1 = get_gene_feat(g1)
        f2 = get_gene_feat(g2)

        # Clinical progression mapping
        phase_lower = phase.lower()
        if "approved" in phase_lower:
            rank = 4
            label = 1
        elif "phase 3" in phase_lower or "phase 2/3" in phase_lower:
            rank = 3
            label = 1
        elif "phase 1" in phase_lower or "phase 2" in phase_lower:
            rank = 2
            label = 1
        elif "preclinical" in phase_lower or "ind" in phase_lower:
            rank = 1
            label = 1
        else:
            # Discontinued / Pending
            rank = 0
            label = 0

        v1 = [f1.get(c, 0.0) for c in CELL_COLS]
        v2 = [f2.get(c, 0.0) for c in CELL_COLS]
        sim = compute_cosine_sim(v1, v2)

        t1_mean = f1.get("tLung_mean", 0.0)
        t2_mean = f2.get("tLung_mean", 0.0)
        n1_mean = f1.get("nLung_mean", 0.0)
        n2_mean = f2.get("nLung_mean", 0.0)
        
        s1 = f1.get("safety_score", 0.5)
        s2 = f2.get("safety_score", 0.5)
        spec1 = f1.get("tumor_specificity", 1.0)
        spec2 = f2.get("tumor_specificity", 1.0)

        t1_pct = f1.get("tLung_pct", 0.1)
        t2_pct = f2.get("tLung_pct", 0.1)
        double_pos = t1_pct * t2_pct

        is_engager = 1 if ((g1 in IMMUNE_ENGAGERS and g2 not in IMMUNE_ENGAGERS) or 
                           (g2 in IMMUNE_ENGAGERS and g1 not in IMMUNE_ENGAGERS)) else 0
        is_dual_checkpoint = 1 if (g1 in IMMUNE_CHECKPOINTS and g2 in IMMUNE_CHECKPOINTS) else 0
        is_angio = 1 if (g1 in ANGIOGENIC_TARGETS or g2 in ANGIOGENIC_TARGETS) else 0

        feat_dict = {
            "Drug": drug_name,
            "Target_A": g1,
            "Target_B": g2,
            "Indication": indication,
            "Phase": phase,
            "rank": rank,
            "label": label,
            
            # Individual single-cell metrics
            "tLung_mean_A": t1_mean,
            "tLung_mean_B": t2_mean,
            "nLung_mean_A": n1_mean,
            "nLung_mean_B": n2_mean,
            "safety_score_A": s1,
            "safety_score_B": s2,
            "specificity_A": spec1,
            "specificity_B": spec2,
            "expr_tnk_A": f1.get("expr_tnk_cells", 0.0),
            "expr_tnk_B": f2.get("expr_tnk_cells", 0.0),
            "expr_myeloid_A": f1.get("expr_myeloid", 0.0),
            "expr_myeloid_B": f2.get("expr_myeloid", 0.0),
            "expr_epithelial_A": f1.get("expr_epithelial", 0.0),
            "expr_epithelial_B": f2.get("expr_epithelial", 0.0),
            
            # Pairwise Interaction & Synergy Features
            "diff_tumor_mean": abs(t1_mean - t2_mean),
            "prod_tumor_mean": t1_mean * t2_mean,
            "sum_tumor_mean": t1_mean + t2_mean,
            "min_tumor_mean": min(t1_mean, t2_mean),
            "max_tumor_mean": max(t1_mean, t2_mean),
            "safety_score_min": min(s1, s2),
            "safety_score_prod": s1 * s2,
            "specificity_min": min(spec1, spec2),
            "specificity_prod": spec1 * spec2,
            "double_positive_rate": double_pos,
            "target_similarity": sim,
            "is_immune_engager": is_engager,
            "is_dual_checkpoint": is_dual_checkpoint,
            "is_angiogenic_co_target": is_angio
        }
        processed_rows.append(feat_dict)

    # In drug screening, negative control pairs (inviable/toxic target combinations)
    # are vital to evaluate model ranking across candidate space
    random.seed(42)
    all_genes = list(sc_df.index)
    neg_controls = []
    
    # Identify genes with high normal tissue expression or poor specificity
    risky_genes = [g for g in all_genes if sc_df.loc[g, "safety_score"] < 0.25 or sc_df.loc[g, "tumor_specificity"] < 0.6]
    if not risky_genes:
        risky_genes = all_genes[:30]

    num_neg_controls = 250
    attempts = 0
    while len(neg_controls) < num_neg_controls and attempts < 2000:
        attempts += 1
        g1 = random.choice(all_genes)
        g2 = random.choice(risky_genes)
        if g1 == g2:
            continue
        key = tuple(sorted([g1, g2]))
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        
        f1 = sc_df.loc[g1].to_dict()
        f2 = sc_df.loc[g2].to_dict()
        
        v1 = [f1.get(c, 0.0) for c in CELL_COLS]
        v2 = [f2.get(c, 0.0) for c in CELL_COLS]
        sim = compute_cosine_sim(v1, v2)
        
        t1_mean = f1.get("tLung_mean", 0.0)
        t2_mean = f2.get("tLung_mean", 0.0)
        n1_mean = f1.get("nLung_mean", 0.0)
        n2_mean = f2.get("nLung_mean", 0.0)
        
        s1 = f1.get("safety_score", 0.2)
        s2 = f2.get("safety_score", 0.2)
        spec1 = f1.get("tumor_specificity", 0.5)
        spec2 = f2.get("tumor_specificity", 0.5)

        t1_pct = f1.get("tLung_pct", 0.05)
        t2_pct = f2.get("tLung_pct", 0.05)
        double_pos = t1_pct * t2_pct

        is_engager = 1 if ((g1 in IMMUNE_ENGAGERS and g2 not in IMMUNE_ENGAGERS) or 
                           (g2 in IMMUNE_ENGAGERS and g1 not in IMMUNE_ENGAGERS)) else 0
        is_dual_checkpoint = 1 if (g1 in IMMUNE_CHECKPOINTS and g2 in IMMUNE_CHECKPOINTS) else 0
        is_angio = 1 if (g1 in ANGIOGENIC_TARGETS or g2 in ANGIOGENIC_TARGETS) else 0

        neg_controls.append({
            "Drug": f"Inviable_Ctrl_{len(neg_controls)+1}",
            "Target_A": g1,
            "Target_B": g2,
            "Indication": "Control Inviable Screen",
            "Phase": "Non-Viable Control",
            "rank": 0,
            "label": 0,
            
            "tLung_mean_A": t1_mean,
            "tLung_mean_B": t2_mean,
            "nLung_mean_A": n1_mean,
            "nLung_mean_B": n2_mean,
            "safety_score_A": s1,
            "safety_score_B": s2,
            "specificity_A": spec1,
            "specificity_B": spec2,
            "expr_tnk_A": f1.get("expr_tnk_cells", 0.0),
            "expr_tnk_B": f2.get("expr_tnk_cells", 0.0),
            "expr_myeloid_A": f1.get("expr_myeloid", 0.0),
            "expr_myeloid_B": f2.get("expr_myeloid", 0.0),
            "expr_epithelial_A": f1.get("expr_epithelial", 0.0),
            "expr_epithelial_B": f2.get("expr_epithelial", 0.0),
            
            "diff_tumor_mean": abs(t1_mean - t2_mean),
            "prod_tumor_mean": t1_mean * t2_mean,
            "sum_tumor_mean": t1_mean + t2_mean,
            "min_tumor_mean": min(t1_mean, t2_mean),
            "max_tumor_mean": max(t1_mean, t2_mean),
            "safety_score_min": min(s1, s2),
            "safety_score_prod": s1 * s2,
            "specificity_min": min(spec1, spec2),
            "specificity_prod": spec1 * spec2,
            "double_positive_rate": double_pos,
            "target_similarity": sim,
            "is_immune_engager": is_engager,
            "is_dual_checkpoint": is_dual_checkpoint,
            "is_angiogenic_co_target": is_angio
        })

    all_rows = processed_rows + neg_controls
    df_out = pd.DataFrame(all_rows)
    print(f"Total dataset: {len(df_out)} pairs ({len(processed_rows)} clinical + {len(neg_controls)} negative screen controls)")
    print(df_out["label"].value_counts())
    df_out.to_csv(output_csv, index=False)
    print(f"Saved to {output_csv}")
    return df_out

if __name__ == "__main__":
    build_pairwise_dataset()
