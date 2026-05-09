# 🧬 SnapseX — Huntingtin Exon 1 Analysis & Simulation Platform

<div align="center">

![SnapseX](https://img.shields.io/badge/Status-Active-brightgreen) 
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Python](https://img.shields.io/badge/Backend-Flask%20%2B%20Python-3776AB?logo=python)
![License](https://img.shields.io/badge/License-MIT-yellow)

**A comprehensive bioinformatic platform for analyzing Huntingtin (HTT) exon 1 sequence variation, protein structure dynamics, and therapeutic intervention modeling.**

[**Live Demo**](#simulation-examples) • [**Architecture**](#architecture) • [**Quick Start**](#quick-start) • [**Features**](#-key-features)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#-key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
- [Simulation Examples](#simulation-examples)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SnapseX is a sophisticated bioinformatic analysis platform designed to study **Huntingtin exon 1** — the genomic region responsible for Huntington's Disease (HD). The project combines:

- **Protein structure prediction** (ESMFold, AlphaFold integration)
- **Sequence analysis** (PCFG-based grammar modeling)
- **Molecular dynamics** (aggregation propensity, fitness landscapes)
- **Drug interaction modeling** (ChEMBL integration)
- **Interactive 3D visualization** (3Dmol.js, Three.js)
- **Clinical risk stratification** (penetrance, onset prediction)

The huntingtin protein contains a **polyglutamine (polyQ) stretch** encoded by CAG trinucleotide repeats. Individuals with **>35 CAG repeats** exhibit a dominant inherited neurodegenerative disorder. SnapseX provides tools to:

1. **Detect & classify** CAG repeat patterns
2. **Predict protein structure** for wild-type and mutant variants
3. **Model aggregation dynamics** and cellular fitness
4. **Simulate drug efficacy** against expanded huntingtin
5. **Visualize disease landscapes** across repeat ranges

---

## 🎯 Key Features

### 1. **HTT Exon 1 Detector**
- **PCFG-based sequence parsing** — grammatical analysis of CAG repeats
- **Polymorphism detection** — flanking region variants (Proline/Leucine polymorphism at position ~6)
- **CFG parse tree visualization** — structural grammar representation
- **Real-time classification** — instant risk stratification

### 2. **Protein Structure Viewer**
- **3D molecular visualization** (3Dmol.js)
- **Multiple rendering modes**: cartoon, surface, stick
- **Color schemes**: pLDDT confidence, chain ID, spectrum
- **AlphaFold DB integration** for normal huntingtin
- **ESMFold on-demand prediction** for mutant sequences

### 3. **Fitness & Risk Landscapes**
- **Composite fitness model** (40% aggregation, 30% PCFG grammar, 30% transcriptional integrity)
- **Clinical risk scoring** — continuous mapping from CAG count to disease penetrance
- **Onset age prediction** — median, 25th, 75th percentiles
- **Interactive D3.js visualizations** — brush, hover, zoom controls

### 4. **Drug Interaction Module**
- **ChEMBL integration** — real-time drug activity lookup
- **Approved vs. investigational** drugs for Huntington's Disease
- **Binding affinity prediction** — Kd-based pharmacodynamic modeling
- **Fitness landscape shift simulation** — before/after drug treatment

### 5. **Heredity & Inheritance Modeling**
- **Autosomal dominant inheritance** simulation
- **Intergenerational CAG expansion tracking**
- **Germline instability** — length changes during meiosis
- **Family pedigree risk analysis**

### 6. **Protein-Protein Interaction Network**
- **Force-directed graph** (react-force-graph-2d)
- **HTT-specific interactomes** — UBB, CASP3, TP53, PRKN, etc.
- **Dynamic network filtering**
- **Interactive node/link selection**

### 7. **Mutation & Comparison Tools**
- **Side-by-side sequence alignment** (wild-type vs. mutant)
- **Biophysical property comparison**
- **Structure superposition** (3Dmol)
- **Aggregation kinetics plots**

---

## Architecture

### **System Diagram**
