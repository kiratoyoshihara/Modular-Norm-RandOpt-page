# Modular Norm RandOpt

**Population-Efficient Ensembling through Architecture-Aware Perturbations**

[Kirato Yoshihara](https://kiratoyoshihara.github.io/) · [Hiroaki Hamade](https://hiroaki-hamade.github.io/#home)

The University of Osaka

## Overview

Modular Norm RandOpt builds stronger language model ensembles from fewer sampled candidates. It extends [RandOpt](https://thickets.mit.edu/), which perturbs pretrained weights, selects promising candidates, and combines their predictions by voting.

Our approach shapes perturbations using each module's natural norm, architectural role, and calibrated sensitivity. This changes how candidates are generated while preserving RandOpt's selection and voting procedure.

## Method

1. **Sample:** Draw independent Gaussian noise for each candidate.
2. **Normalize and scale:** Normalize each parameter tensor's noise using its module's natural norm, then apply fixed architecture- and sensitivity-based scales.
3. **Generate:** Add each resulting perturbation to the same pretrained weights to form **N** candidate models.
4. **Select and vote:** Evaluate candidates on a task-specific selection set, retain the best **K**, and combine their predictions by plurality voting.

## Key Results

### Population Efficiency

On Qwen2.5-1.5B-Instruct, our method achieves higher mean accuracy than RandOpt with fewer candidates. These comparisons hold for both K = 10 and K = 25.

| Task | RandOpt N | Ours N | Candidate reduction |
| :--- | ---: | ---: | ---: |
| Countdown | 300 | 100 | **3×** |
| GSM8K | 300 | 25 | **12×** |

### Across Tasks and Scales

| Evaluation | Setting / result |
| :--- | :--- |
| Tasks | 7 tasks across mathematics, chemistry, programming, and writing |
| Models | Qwen2.5-Instruct: 0.5B, 1.5B, and 3B |
| Population and ensemble | N = 100, K = 25 |
| Higher mean accuracy than RandOpt | **14 of 21 settings** |

The perturbation profile is calibrated on Countdown for each model size and reused across tasks.

### Iterative Baselines

Mean accuracy (%) on Qwen2.5-1.5B-Instruct.

| Task | Ours (N = 100, K = 25) | ES-at-Scale (N = 3,000, K = 1) |
| :--- | ---: | ---: |
| Countdown | **38.40** | 35.67 |
| GSM8K | **73.16** | 73.11 |

N counts sampled candidates for our method and perturbations for ES-at-Scale.
