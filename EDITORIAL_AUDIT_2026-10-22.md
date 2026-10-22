# Editorial and content audit — 22 October 2026

## Coverage
Reviewed nine public companion HTML pages (index, research, paper, system, methodology, findings, responses, qa, sources), the unlinked `/forme` page, the shared companion stylesheet, the pinned-research deployment workflow and the repository's site-link CI.

## Problems addressed in PR #33
| Location | Previous issue | Change |
| --- | --- | --- |
| Homepage | Dramatic question headline, claims that the diagnosis already exists, self-assigned QA verdicts | Direct topic headings, descriptive methods and observed-versus-modelled distinctions |
| Research | Slogans such as “Diagnose before prescribing” and “not one giant model” | Research questions and method workflow in factual terms |
| Paper | “There is a paper here” and language implying established journal readiness | Explicit manuscript-development status; no submitted paper or external peer review claimed |
| System | Swedish-audience scale/currency comparisons and unrelated Chavara mineral digression | Kerala population/area/electricity context; INR estimates with project-stage caveats |
| Methodology | Rhetorical headings about model complexity and evidence hierarchy | Names of data transformations, models, assumptions and verification checks |
| Findings | Sweeping diagnosis headlines and internally assigned robustness claims | Descriptions tied to individual experiments, holdouts and sensitivity cases |
| Responses | Universal-sounding sequence of recommended investments | Candidate interventions dependent on the actual constraint and further validation |
| Validation | “red-team pass” and “passes” phrasing suggesting external endorsement | Internal verification and limitations presented separately from peer review or physical validation |
| Sources | Self-certifying audit labels | Source records, archived internal QA notes and reproducibility distinctions |
| /forme | Publicly accessible but obsolete CET2026 poster coaching | Clearly archived and explicitly not access-controlled |
| Presentation | Oversized serif/italic editorial headlines, colored status declarations, decorative strip | Smaller restrained sans-serif headings and neutral status styling |

## Research-data synchronization — 22 October 2026
- Pinned the Pages deployment from source commit `81082de8787805ecd50bf0677a570352c2c75866` to `4e16836c7201637ee4a065abe259c9a47e004332`.
- Compared these commits: two newer source commits modified CI, README, CI documentation and a GIS script check, but no published research evidence files. Updating the pin therefore does **not** imply new field measurements or new modelling outputs.
- Mirrored three verified descriptive datasets into this site repository: **FY2024–25 installed generation**, **GSA2 solar PVOUT seasonality across 14 districts**, and **NIWE 150 m wind/terrain source-point screening**. All copies include source paths and the immutable source SHA.
- Reconciled the existing daily-demand ML v0.2 website summary against the original research evidence before updating its source-commit annotation. Values are unchanged.
- Added descriptive generation and renewable-resource sections to the System page, and direct raw and summarized evidence links to the Sources page.
- The generated GitHub Pages release includes the newly pinned source's dashboard build and overlays the companion pages and four referenced JSON files; older tracked dashboard snapshots in the web repository are *not* bulk-overwritten.
- Added `scripts/verify_research_mirrors.py` and checkout of the pinned research source in CI, plus pinned research-site build checks and a deployment-time evidence consistency check.
- **Data interpretation:** 4,412.14 MW is reported in-state installed capacity as of 31 March 2025; 1,493.51 kWh/kWp/year is the modelled long-term GSA2 reference PV yield median; 8,637 NIWE/GLO-90 matching sample points are an illustrative speed-and-slope screen. None gives permitted renewable capacity or a measured hourly power-supply curve.
- **Known source gap:** reuse rights for original Global Solar Atlas and NWIC spatial sources have not been independently verified; only derived aggregated numerical evidence was mirrored. No original rasters or private coordinate sets were copied.
- **CI:** successful checks must be recorded for the final pull-request head before merge; status on intermediate commits does not verify later updates.

## Boundaries of this audit
- Editorial corrections **do not constitute an independent technical revalidation** of the power-system calculations. Reported numerical results and their underlying model evidence were not altered in this PR.
- Local navigation and anchor consistency have been checked in the edited HTML. GitHub Actions runs the fuller existing site-validation script on the PR.
- Citation destinations remain in the original HTML and Sources page. A future scientific review should verify dated official source documents independently and compare every displayed figure with the current research repository.
- The public result tables still rely on the project's existing data definitions. The 8,760-hour demand series is a reconstruction, **not measured hourly demand**; the weather–demand study uses single-year, same-day reanalysis; network loading is a public-data screening result.
- The repository also retains data files and JavaScript from older dashboard releases. The Pages workflow deploys a pinned research build and overlays the nine companion pages, shared stylesheet, and archived /forme page. This editorial PR does not update older dashboards or their source snapshots, so readers should not assume every retained JSON file is a current operational record.
- The /forme archive is only marked `noindex`; it is **not private**. Removing or access-controlling obsolete public material is a separate decision.
- This audit did not test external-link availability, official publication corrections, visual rendering in browsers, accessibility conformance, or current operational conditions in Kerala.

## Ongoing editorial policy
Use `EDITORIAL_GUIDELINES.md` for future site updates. CI checks for the most prominent former presentation slogans, but tone and scientific precision still require human review.
