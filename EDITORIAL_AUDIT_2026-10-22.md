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
