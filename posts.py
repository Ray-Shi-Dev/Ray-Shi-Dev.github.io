"""Writing. Each post is a list of blocks rendered by build.py.
Block types: ("p", text) ("h2", text) ("ul", [items]) ("diff", file, before, after) ("code", file, code)
("table", head, rows, caption) ("bench",) ("note", text).
A post with draft=True is only built with `python3 build.py --drafts` (preview), never in the published site.
Text may use `code` spans and [label](url) links; nothing else is interpreted."""

POSTS = [
    {
        "slug": "pandas-groupby-transform-72-percent-faster",
        "title": "Making an anomaly-detection pipeline 72% faster without touching the models",
        "dek": "A prize-winning pipeline for building-energy anomalies spent most of its time in three pandas loops. Replacing them with group transforms cut runtime from 26.6 to 7.3 minutes, lowered peak memory by 1.4 GB, and surfaced a bug that had been costing accuracy.",
        "date": "2026-11-20",
        "draft": True,
        "project": "vectorized-timeseries-scaling",
        "tags": ["pandas", "performance", "time series", "anomaly detection"],
        "body": [
            ("h2", "TL;DR"),
            ("ul", [
                "The bottleneck was data preparation, not the gradient-boosting ensemble.",
                "Three per-building Python loops became `groupby().transform()` calls and one merge per lag instead of two.",
                "End to end on the same Kaggle container: 26.6 to 7.3 minutes (72% faster), and 1.4 GB lower peak memory.",
                "Checking that the rewrite matched the original exposed a fitting bug; fixed, the private leaderboard score went from 0.933 to 0.952.",
            ]),
            ("h2", "The pipeline and the problem"),
            ("p", "The Large-scale Energy Anomaly Detection (LEAD) competition asks which hourly meter readings from commercial buildings are anomalous. The winning solution, by Chun Fu, Pandarasamy Arjunan and Clayton Miller (BuildSys '22), engineers lag, ratio and smoothing features per building and averages four gradient-boosting classifiers: LightGBM, XGBoost, CatBoost and HistGradientBoosting."),
            ("p", "It runs comfortably on the competition's few hundred meters. The question I cared about was what happens at around 2,000 streams, roughly ten times the benchmark, which is closer to a real portfolio of buildings. Before changing anything I timed the notebook section by section. Model training was not where the time went. Data preparation was."),
            ("h2", "Where the time went"),
            ("p", "Three steps followed the same pattern: loop over every building, select its rows with a boolean mask, transform that slice, and stitch the pieces back together. Each mask scans the whole frame, so the cost grows with rows times buildings, and every slice allocates a temporary DataFrame that is thrown away a moment later."),
            ("h2", "1. Mean imputation without the loop"),
            ("p", "The original filled missing readings building by building. A group transform computes each building's mean and broadcasts it back to the right rows in one pass."),
            ("diff", "impute.py",
             "def impute_nulls(data):\n    mean_reading = data.groupby('building_id')['meter_reading'].mean()\n    building_id = mean_reading.index\n    values = mean_reading.values\n    for i, idx in tqdm(enumerate(building_id)):\n        data[data['building_id']==idx] = data[data['building_id']==idx].fillna(values[i])\n    return data",
             "def impute_nulls_optimized(data):\n    mean_reading = data.groupby('building_id')['meter_reading'].transform('mean')\n    data['meter_reading'] = data['meter_reading'].fillna(mean_reading)\n    return data"),
            ("h2", "2. Savitzky-Golay smoothing per group"),
            ("p", "The residual between a reading and its smoothed value is one of the strongest anomaly features. The original appended one DataFrame per building to a list and concatenated them all at the end. Running the filter inside a group transform keeps everything in the original frame, and the explicit back-fill handles a building whose first readings are missing, which forward-fill alone leaves as NaN."),
            ("diff", "smooth.py",
             "df_savgol_train = []\nfor building_id in tqdm(train_features['building_id'].unique()):\n    df_temp = train_features[train_features['building_id']==building_id]\n    df_temp['meter_reading_smooth'] = savgol_filter(df_temp['meter_reading'].fillna(method='ffill'), 5, 3)\n    df_temp['Residual_savgol_w5p3'] = (df_temp['meter_reading'] - df_temp['meter_reading_smooth'])\n    df_savgol_train.append(df_temp)\ndf_savgol_train = pd.concat(df_savgol_train, axis=0).sort_index()",
             "def apply_savgol(x):\n    filled = x.ffill()\n    if filled.isna().any():\n        filled = filled.bfill()\n    return savgol_filter(filled, 5, 3)\n\ntrain_features['meter_reading_smooth'] = train_features.groupby('building_id')['meter_reading'].transform(apply_savgol)\ntrain_features['Residual_savgol_w5p3'] = train_features['meter_reading'] - train_features['meter_reading_smooth']\ntrain_features.drop(columns=['meter_reading_smooth'], inplace=True)"),
            ("h2", "3. One merge per lag instead of two"),
            ("p", "Lag features cover 60 offsets, from one hour to a week on either side. The original made two complete passes, one for difference features and one for ratio features, and each pass re-read the CSV and converted timestamps to strings before every merge. The rewrite parses timestamps once and derives both features from a single merge per offset."),
            ("h2", "Results"),
            ("p", "Both notebooks ran end to end on the same standard Kaggle Linux container. Wall-clock time came from `time.time()` around the whole notebook and peak memory from `resource.getrusage(RUSAGE_SELF).ru_maxrss`."),
            ("table", ["Metric", "Loops", "Group transforms", "Change"],
             [["Wall-clock time", "26.64 min", "7.34 min", "72% faster"],
              ["Peak memory", "21,717 MB", "20,285 MB", "1,432 MB lower"],
              ["Kaggle private score", "0.933", "0.952", "+0.019"],
              ["Kaggle public score", "0.893", "0.914", "+0.022"]],
             "Same container, same data, one run each."),
            ("bench",),
            ("p", "The speed-up comes from doing the arithmetic in pandas' compiled backend over contiguous arrays instead of in Python, the design argument of Wes McKinney's original pandas paper. The memory saving comes from no longer creating and discarding thousands of temporary frames."),
            ("h2", "The bug the parity check found"),
            ("p", "My goal was strict parity: the rewrite should change speed, not predictions. While checking parity I found that the original notebook was fitting on a subset of the data rather than the full training set. With that fixed, the private leaderboard score rose from 0.933 to 0.952. Refactoring for speed turned out to be the review that caught it."),
            ("h2", "What I would do again, and differently"),
            ("ul", [
                "Profile the whole pipeline before touching a model. The expensive part was the least glamorous one.",
                "Treat any loop that masks a DataFrame by ID as a likely bottleneck: a group transform usually does the same job in one pass.",
                "Make output parity a test, not an assumption. It is what found the bug.",
                "Next time, report the median of several runs instead of a single run each, and track memory per step rather than only the process peak.",
            ]),
            ("note", "Code, notebooks and the leaderboard screenshot are in the [repository](https://github.com/Ray-Shi-Dev/vectorized-timeseries-scaling). The pipeline is the work of Fu, Arjunan and Miller; my contribution is the profiling, the rewrite of the preprocessing and the benchmark."),
        ],
    },
]
