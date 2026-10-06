# Kerala2040 website provenance

This Pages site is the public-facing research companion for the Kerala2040 power-system stress project.

- Research repository: `abhijith-sivaprasadan/kerala2040`
- Current public research line: diagnosis-first investigation of demand chronology, hydropower flexibility, interstate transfer and internal network deliverability
- Historical scientific QA branch: `qa/scientific-validation-conference-20260928`
- Publication status: active research / publication hardening; not yet a submitted journal manuscript
- Current research source: `abhijith-sivaprasadan/kerala2040@81082de8787805ecd50bf0677a570352c2c75866`
- 6 October 2026 update: observed-daily demand ML v0.1/v0.2 added using 353 source-reported SLDC daily targets matched to verified FY2024–25 ERA5 weather, seven rolling monthly holdouts, same-family LightGBM/XGBoost weather ablations, XGBoost feature-group ablation and conditional SHAP stability.

The September 2026 QA branch is retained as an audit trail because it contains the conservative red-team review that established the current claim boundaries. The website has since been reframed away from CET 2026 and toward the project's longer-term publication goal.

The QA source state includes corrected interpretation of Shoranur, ERA5 load-validation scope, Idukki v1.3 circularity, IEX price boundary, CEA peak-context distinction, cost/finance provenance and reproducibility caveats.

The observed-daily weather–demand result now passes a within-year robustness gate: weather improves 5/7 LightGBM and 6/7 XGBoost monthly holdouts, while the Jan–Mar feature-group ablation identifies temperature as the dominant currently demonstrated weather predictor. This is retrospective same-day reanalysis modelling over one financial year, not causal inference, day-ahead forecasting or multi-year generalization.

The most important unresolved publication issue remains the absence of measured continuous Kerala interval-load telemetry in the admitted public evidence. The present 8,760-hour chronology is therefore described consistently as a reconstruction/proxy. The project is seeking stronger interval demand, generation, interchange and spatial loading evidence before final result freeze.

For current scientific status, use the website's [Paper](paper.html), [Validation](qa.html), [Methodology](methodology.html) and [Sources](sources.html) pages together with the research repository.
