"""Case-study content for the software projects.
Code excerpts are copied from the public repos; only comments and blank lines are removed and indentation is normalised."""

CASES = {
    "vectorized-timeseries-scaling": {
        "metrics": [("72%", "faster end to end"), ("1.4 GB", "lower peak memory"), ("0.952", "Kaggle private score")],
        "problem": [
            "The pipeline is the winning solution to the Large-scale Energy Anomaly Detection (LEAD) competition by Chun Fu, Pandarasamy Arjunan and Clayton Miller (BuildSys '22). It classifies anomalies in hourly building-energy meter readings with a LightGBM, XGBoost, CatBoost and HistGradientBoosting ensemble.",
            "It runs well on the benchmark's few hundred meters, but a practical deployment needed around 2,000 streams. Profiling showed the models were not the bottleneck: the data preparation was. Three steps iterated in Python over every building, sliced a sub-DataFrame, transformed it and stitched the pieces back together.",
        ],
        "approach": [
            {
                "title": "Mean imputation without the loop",
                "text": "The original filled missing readings building by building, re-filtering the whole frame on every iteration. A single groupby().transform() broadcasts each building's mean back to its rows in one pass.",
                "file": "impute.py",
                "before": """def impute_nulls(data):
    mean_reading = data.groupby('building_id')['meter_reading'].mean()
    building_id = mean_reading.index
    values = mean_reading.values
    for i, idx in tqdm(enumerate(building_id)):
        data[data['building_id']==idx] = data[data['building_id']==idx].fillna(values[i])
    return data""",
                "after": """def impute_nulls_optimized(data):
    mean_reading = data.groupby('building_id')['meter_reading'].transform('mean')
    data['meter_reading'] = data['meter_reading'].fillna(mean_reading)
    return data""",
            },
            {
                "title": "Savitzky-Golay smoothing per group",
                "text": "The smoothing residual is a key anomaly feature. Instead of appending one DataFrame per building and concatenating thousands of them, the filter runs inside a group transform, so no temporary frames are created and destroyed.",
                "file": "smooth.py",
                "before": """df_savgol_train = []
for building_id in tqdm(train_features['building_id'].unique()):
    df_temp = train_features[train_features['building_id']==building_id]
    df_temp['meter_reading_smooth'] = savgol_filter(df_temp['meter_reading'].fillna(method='ffill'), 5, 3)
    df_temp['Residual_savgol_w5p3'] = (df_temp['meter_reading'] - df_temp['meter_reading_smooth'])
    df_savgol_train.append(df_temp)
df_savgol_train = pd.concat(df_savgol_train, axis=0).sort_index()""",
                "after": """def apply_savgol(x):
    filled = x.ffill()
    if filled.isna().any():
        filled = filled.bfill()
    return savgol_filter(filled, 5, 3)

train_features['meter_reading_smooth'] = train_features.groupby('building_id')['meter_reading'].transform(apply_savgol)
train_features['Residual_savgol_w5p3'] = train_features['meter_reading'] - train_features['meter_reading_smooth']
train_features.drop(columns=['meter_reading_smooth'], inplace=True)""",
            },
            {
                "title": "One merge per lag instead of two",
                "text": "Lag features are built for 60 offsets, from one hour up to a week either side. The original made two full passes, one for difference features and one for ratio features, each re-reading the CSV and converting timestamps to strings on every merge. The rewrite parses timestamps once and computes both features from a single merge per offset.",
                "file": None,
            },
        ],
        "results": [
            "Benchmarked end to end on a standard Kaggle Linux container with an automated resource tracker. The vectorised version finished in 7.3 minutes instead of 26.6 and peaked 1.4 GB lower, because it stops allocating temporary DataFrames inside Python loops; the arithmetic runs on pandas' compiled backend over contiguous arrays, the design argument in Wes McKinney's original pandas paper.",
            "The goal was strict parity in accuracy. While checking parity I found the iterative version was fitting on subsets of the data; with that fixed, the private leaderboard score rose from 0.933 to 0.952.",
        ],
        "role": "Solo project. I reproduced the published solution on Kaggle, profiled it, rewrote the preprocessing, built the benchmark harness and verified accuracy parity.",
    },
    "rhino-wwr-automation": {
        "metrics": [("1.2 m", "section height above each slab"), ("0.1 m", "union tolerance for micro-gaps"), ("1 CSV", "per-floor output, simulation-ready")],
        "problem": [
            "Window-to-wall ratio is a basic input to every building energy model and to LEED and EEWH submissions. Measuring it by hand from a 3D model is slow and error-prone, because architectural models are built to look right, not to be measured.",
            "Three things break naive scripts: slabs are full of holes for cores and shafts, adjacent thermal zones leave gaps of 1 to 10 mm that make Boolean unions fail, and atriums and curtain walls span several floors, so their glazing belongs to more than one storey.",
        ],
        "approach": [
            {
                "title": "Find the real floors",
                "text": "The script scans layer names to separate thermal zones, underground zones and the glazing layer. Zones are grouped by base elevation with a 1.5 m tolerance; anything below ground or under 2 m tall is treated as a modelling artefact. Floor height comes from the gap to the next floor, so mezzanines and double-height levels come out right.",
                "file": None,
            },
            {
                "title": "Measure the facade, not the holes",
                "text": "Each floor is sliced 1.2 m above its slab. The section curves are unioned with a 0.1 m tolerance to close micro-gaps, and only the largest closed ring is kept as the facade perimeter, which discards cores and shafts. If the union still fails, it falls back to the bounding-box perimeter instead of crashing.",
                "file": None,
            },
            {
                "title": "Split tall glazing by overlap",
                "text": "A window spanning several storeys is divided by how much of its height overlaps each floor, so a three-storey curtain wall adds a third of its area to each level.",
                "file": "wwr_extractor.py",
                "code": """overlap_min = max(w_min_z, f_z)
overlap_max = min(w_max_z, floor_top_z)
overlap_height = overlap_max - overlap_min

if overlap_height > 0.01: # The window is inside this floor
    ratio = overlap_height / w_height
    if rs.IsCurve(w_obj) and rs.IsCurveClosed(w_obj):
        area_data = rs.CurveArea(w_obj)
        if area_data: glazing_area += (area_data[0] * ratio)
    elif rs.IsSurface(w_obj) or rs.IsPolysurface(w_obj):
        area_data = rs.SurfaceArea(w_obj)
        if area_data: glazing_area += (area_data[0] * ratio)""",
            },
        ],
        "results": [
            "Redraw is switched off while it runs, and the result is written as one CSV row per floor: elevation, height, gross perimeter, wall area, glazing area and WWR. The sample tower below ranges from 39.4% on the ground floor to 65.3% on floor 6.",
        ],
        "role": "Solo project, written for my own energy-modelling work: geometry logic, edge-case handling and the CSV export.",
    },
    "youtube-market-engine": {
        "metrics": [("0–100", "niche opportunity score"), ("2", "videos per channel at most"), ("×0.7", "penalty when giants dominate")],
        "problem": [
            "Creators usually choose topics by instinct, which fails in crowded markets. Raw view counts don't help either: a big channel gets views because it is big, not because the topic has demand.",
            "The question was how to measure demand independently of channel size, and how to flag markets that look busy but are held by a few giant channels.",
        ],
        "approach": [
            {
                "title": "Parallel ingestion",
                "text": "For a topic and region the app finds the most relevant channels, then fetches each channel's uploads and statistics concurrently. API calls are I/O-bound, so a thread pool cuts wall-clock time roughly in proportion to the number of channels.",
                "file": "app.py",
                "code": """all_outliers = []
with concurrent.futures.ThreadPoolExecutor() as executor:
    futures = [
        executor.submit(process_channel_logic, api_key, cid, vid_limit, mult, days)
        for cid in channel_ids
    ]
    for future in concurrent.futures.as_completed(futures):
        res = future.result()
        if res: all_outliers.extend(res)""",
            },
            {
                "title": "Outliers against each channel's own baseline",
                "text": "A video counts as an outlier when it beats its own channel's median by a chosen multiple. Its viral multiplier, views divided by that median, measures demand without rewarding subscriber count. News-style uploads from million-subscriber channels with few views are filtered out, and each channel contributes at most two videos so one creator can't dominate the sample.",
                "file": None,
            },
            {
                "title": "A score that needs both volume and intensity",
                "text": "Depth rewards the number of outliers, intensity rewards how far they beat their baselines, and a 30% penalty applies when channels classed as sharks make up more than half of the outliers.",
                "file": "app.py",
                "code": """outliers_count = len(df)
score_depth = min(50, outliers_count * 2.5)

avg_mult = df['performance'].median()
score_viral = 0
if avg_mult > 1:
    score_viral = min(50, avg_mult * 5)

sharks = len(df[df['Verdict'].str.contains("Shark", na=False)])
penalty_factor = 1.0
if outliers_count > 0 and (sharks / outliers_count > 0.5):
    penalty_factor = 0.7

final_score = int((score_depth + score_viral) * penalty_factor)
return max(0, min(100, final_score))""",
            },
        ],
        "results": [
            "The Streamlit app turns this into four views: a single-topic dashboard with the score gauge, an opportunity map of upload date against viral multiplier, a tag explorer for long-tail keywords, and a head-to-head comparison of two topics. In the comparison shown below, 'Robotic' scores 63 against 59 for 'AI'.",
        ],
        "role": "Solo project: data model, scoring logic, concurrency and the Streamlit interface.",
    },
    "ml-stat-arb": {
        "metrics": [("±2σ", "baseline entry signal"), ("3σ", "breakdown definition"), ("≥0.70", "veto threshold")],
        "problem": [
            "Classic pairs trading assumes the spread between two cointegrated assets reverts to its mean, so it enters when the spread's z-score passes two standard deviations. The strategy loses most when that assumption fails and the relationship breaks down.",
            "This project asks whether the gradient-boosting pipeline I studied for building-energy anomaly detection can predict those breakdowns, and veto the trades they would wreck.",
        ],
        "approach": [
            {
                "title": "Find candidate pairs",
                "text": "Daily prices for liquid US REITs from 2015 to 2023 come from Yahoo Finance. K-means on standardised returns, with the cluster count chosen by the elbow method, groups similar REITs. Within each cluster an OLS hedge ratio on log prices and an augmented Dickey-Fuller test keep the pairs whose spread is stationary.",
                "file": None,
            },
            {
                "title": "Features without look-ahead",
                "text": "The spread gets 21-day rolling statistics, lag differences and ratios, and a Savitzky-Golay smoothing that is made causal by applying the filter over a rolling window and keeping only its last point, so no feature sees the future. The target marks a breakdown when the spread five days ahead sits more than three rolling standard deviations from its mean.",
                "file": None,
            },
            {
                "title": "Ensemble as a veto, not a signal",
                "text": "XGBoost, LightGBM and CatBoost are trained on the first 70% of the history, with the majority class downsampled, and their probabilities are averaged on the remaining 30%. The baseline proposes trades at |z| > 2; the overlay vetoes any trade whose predicted breakdown probability is 0.70 or higher.",
                "file": None,
            },
        ],
        "results": [
            "The pipeline reports out-of-sample ROC-AUC and how many baseline trades the overlay vetoes. It is a research prototype: results are not yet published in the repository.",
        ],
        "role": "Solo research prototype: pair selection, feature design, model ensemble and the veto logic.",
    },
}
