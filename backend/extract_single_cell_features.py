import gzip
import time
import pandas as pd
import numpy as np
import os

def extract_features():
    print("Step 1: Reading cell annotations...")
    t0 = time.time()
    annot_path = r"C:\Users\Omkar\Downloads\GSE131907_Lung_Cancer_cell_annotation.txt.gz"
    matrix_path = r"C:\Users\Omkar\Downloads\GSE131907_Lung_Cancer_raw_UMI_matrix.txt.gz"
    pairs_path = r"data\Lung Cancer PP.csv"

    annot_df = pd.read_csv(annot_path, sep="\t")
    print(f"Loaded {len(annot_df)} cell annotations in {time.time()-t0:.2f}s")

    # Get target genes from pairs dataset
    pairs_df = pd.read_csv(pairs_path)
    target_genes = set()
    for raw in pairs_df["Target(Gene Symbol)"].dropna():
        cleaned = str(raw).replace("+", ",").replace("/", ",").replace(";", ",")
        for g in cleaned.split(","):
            g = g.strip().upper()
            if g and g not in {"-", "#VALUE!", "N/A"}:
                target_genes.add(g)
    print(f"Target unique genes to extract: {len(target_genes)}")

    # Pre-calculate boolean masks for cell categories
    # Sample_Origin
    tLung_mask = (annot_df["Sample_Origin"] == "tLung").values
    nLung_mask = (annot_df["Sample_Origin"] == "nLung").values
    
    # Cell types
    tnk_mask = (annot_df["Cell_type.refined"] == "T/NK cells").values
    b_mask = (annot_df["Cell_type.refined"] == "B lymphocytes").values
    myeloid_mask = (annot_df["Cell_type.refined"] == "Myeloid cells").values
    epithelial_mask = (annot_df["Cell_type.refined"] == "Epithelial cells").values
    endothelial_mask = (annot_df["Cell_type.refined"] == "Endothelial cells").values

    print(f"Cell masks prepared: tLung={tLung_mask.sum()}, nLung={nLung_mask.sum()}, T/NK={tnk_mask.sum()}")

    # Now stream matrix and collect target genes
    print("Step 2: Streaming single-cell matrix and extracting expression profiles...")
    gene_profiles = {}
    found_count = 0

    with gzip.open(matrix_path, "rt", encoding="utf-8") as f:
        # First line is barcode header
        header = f.readline()
        
        for line_idx, line in enumerate(f):
            tab_pos = line.find("\t")
            if tab_pos == -1:
                continue
            gene_name = line[:tab_pos].strip().upper()
            
            if gene_name in target_genes:
                # Parse numeric counts
                # Using numpy fromstring is extremely fast
                counts_str = line[tab_pos+1:].strip()
                counts = np.fromstring(counts_str, sep="\t", dtype=np.float32)
                
                # Compute single-cell metrics
                tLung_counts = counts[tLung_mask]
                nLung_counts = counts[nLung_mask]
                
                t_mean = float(np.mean(tLung_counts))
                n_mean = float(np.mean(nLung_counts))
                t_pct = float(np.mean(tLung_counts > 0))
                n_pct = float(np.mean(nLung_counts > 0))
                
                tnk_mean = float(np.mean(counts[tnk_mask]))
                b_mean = float(np.mean(counts[b_mask]))
                myeloid_mean = float(np.mean(counts[myeloid_mask]))
                epi_mean = float(np.mean(counts[epithelial_mask]))
                endo_mean = float(np.mean(counts[endothelial_mask]))
                
                # Tumor specificity ratio
                specificity = (t_mean + 0.05) / (n_mean + 0.05)
                
                # Safety score (high expression in tumor, low in normal)
                safety = (t_mean / (t_mean + n_mean + 0.05)) * (1.0 - n_pct)

                gene_profiles[gene_name] = {
                    "gene_symbol": gene_name,
                    "tLung_mean": t_mean,
                    "nLung_mean": n_mean,
                    "tLung_pct": t_pct,
                    "nLung_pct": n_pct,
                    "tumor_specificity": specificity,
                    "safety_score": safety,
                    "expr_tnk_cells": tnk_mean,
                    "expr_b_cells": b_mean,
                    "expr_myeloid": myeloid_mean,
                    "expr_epithelial": epi_mean,
                    "expr_endothelial": endo_mean
                }
                found_count += 1
                if found_count % 20 == 0:
                    print(f"Extracted {found_count}/{len(target_genes)} genes ({time.time()-t0:.1f}s)...")
                
                if found_count == len(target_genes):
                    break

    print(f"Extraction complete in {time.time()-t0:.2f}s! Found {len(gene_profiles)}/{len(target_genes)} genes in matrix.")
    
    # Save to data/gene_single_cell_features.csv
    features_df = pd.DataFrame(list(gene_profiles.values()))
    output_path = r"data\gene_single_cell_features.csv"
    features_df.to_csv(output_path, index=False)
    print(f"Saved {len(features_df)} gene profiles to {output_path}")

if __name__ == "__main__":
    extract_features()
